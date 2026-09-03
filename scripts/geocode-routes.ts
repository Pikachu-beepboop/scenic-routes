/**
 * Einmal-Skript: befuellt routes.start_lat / start_lng / end_lat / end_lng
 * aus den Freitext-Feldern routes.start_point / routes.end_point via
 * Google Geocoding API.
 *
 * Hintergrund: Die routes-Tabelle hatte bisher nur ein einziges Koordinatenpaar
 * (latitude/longitude) ohne Start-/End-Bezug. Fuer die Matching-Logik des Route
 * Planners (Teil 2) werden echte Start- und Endkoordinaten gebraucht.
 *
 * Aufruf:
 *   # Trockenlauf (schreibt nichts, zeigt nur, was passieren wuerde)
 *   node --experimental-strip-types scripts/geocode-routes.ts
 *
 *   # Tatsaechlich schreiben
 *   node --experimental-strip-types scripts/geocode-routes.ts --apply
 *
 * Optionen:
 *   --apply          Ergebnisse wirklich in die Datenbank schreiben (sonst Dry-Run)
 *   --all            auch Routen erneut geokodieren, die bereits Koordinaten haben
 *   --limit=<n>      nur die ersten n Routen verarbeiten (zum Testen)
 *
 * Benoetigte Umgebungsvariablen:
 *   GOOGLE_MAPS_API_KEY        API-Key mit aktivierter "Geocoding API"
 *   NEXT_PUBLIC_SUPABASE_URL   Supabase-Projekt-URL
 *   SUPABASE_SERVICE_ROLE_KEY  Service-Role-Key (routes hat RLS, der Anon-Key darf nicht schreiben)
 *
 * Mehrdeutige Orte werden bewusst NICHT geschrieben: liefert die Geocoding API
 * mehr als ein Ergebnis oder ein `partial_match`, bleibt die Spalte NULL und der
 * Fall wird am Ende als Tabelle ausgegeben, damit er manuell geklaert werden kann.
 */

import { createClient } from "@supabase/supabase-js";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const ONLY_MISSING = !args.includes("--all");
const LIMIT = (() => {
  const raw = args.find((a) => a.startsWith("--limit="));
  if (!raw) return null;
  const n = Number.parseInt(raw.split("=")[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
})();

/** Pause zwischen zwei API-Aufrufen, um das Rate-Limit nicht zu reissen. */
const REQUEST_DELAY_MS = 120;

type RouteRow = {
  id: string;
  title: string | null;
  country: string | null;
  start_point: string | null;
  end_point: string | null;
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
};

type GeocodeResult = {
  formatted_address?: string;
  partial_match?: boolean;
  geometry?: { location?: { lat: number; lng: number } };
};

type GeocodeResponse = {
  status: string;
  error_message?: string;
  results?: GeocodeResult[];
};

type Resolved = {
  kind: "ok";
  lat: number;
  lng: number;
  formattedAddress: string;
};

type Unresolved = {
  kind: "ambiguous" | "not_found" | "error";
  reason: string;
  candidates?: string[];
};

type Lookup = Resolved | Unresolved;

type Problem = {
  routeTitle: string;
  field: "start_point" | "end_point";
  query: string;
  kind: Unresolved["kind"];
  reason: string;
  candidates?: string[];
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Baut die Suchanfrage: Ortsname plus Land als Kontext. Klammer-Zusaetze wie
 * "Baddeck (loop)" sind Routen-Metadaten und kein Teil des Ortsnamens.
 */
function buildQuery(point: string, country: string | null): string {
  const place = point.replace(/\s*\([^)]*\)\s*$/, "").trim().replace(/\s+/g, " ");
  const land = (country ?? "").replace(/\s*\([^)]*\)\s*$/, "").trim();
  return land ? `${place}, ${land}` : place;
}

async function geocode(query: string): Promise<Lookup> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("key", GOOGLE_MAPS_API_KEY as string);

  let payload: GeocodeResponse;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { kind: "error", reason: `HTTP ${response.status}` };
    }
    payload = (await response.json()) as GeocodeResponse;
  } catch (error) {
    return { kind: "error", reason: error instanceof Error ? error.message : String(error) };
  }

  if (payload.status === "ZERO_RESULTS") {
    return { kind: "not_found", reason: "ZERO_RESULTS" };
  }
  if (payload.status !== "OK") {
    return {
      kind: "error",
      reason: payload.error_message ? `${payload.status}: ${payload.error_message}` : payload.status,
    };
  }

  const results = payload.results ?? [];
  const candidates = results.map((r) => r.formatted_address ?? "(ohne Adresse)");

  // Mehr als ein Treffer -> mehrdeutig, wir raten nicht.
  if (results.length !== 1) {
    return { kind: "ambiguous", reason: `${results.length} Treffer`, candidates };
  }

  const [only] = results;
  // partial_match heisst: Google hat die Anfrage nur teilweise aufloesen koennen.
  if (only.partial_match) {
    return { kind: "ambiguous", reason: "partial_match", candidates };
  }

  const location = only.geometry?.location;
  if (!location || typeof location.lat !== "number" || typeof location.lng !== "number") {
    return { kind: "error", reason: "Antwort ohne geometry.location" };
  }

  return {
    kind: "ok",
    lat: location.lat,
    lng: location.lng,
    formattedAddress: only.formatted_address ?? query,
  };
}

function markdownTable(problems: Problem[]): string {
  const header = "| Route | Feld | Anfrage | Grund | Kandidaten |\n| --- | --- | --- | --- | --- |";
  const rows = problems.map((p) => {
    const candidates = p.candidates?.length ? p.candidates.join(" · ") : "—";
    return `| ${p.routeTitle} | \`${p.field}\` | ${p.query} | ${p.kind} (${p.reason}) | ${candidates} |`;
  });
  return [header, ...rows].join("\n");
}

async function main(): Promise<void> {
  const missing = [
    !GOOGLE_MAPS_API_KEY && "GOOGLE_MAPS_API_KEY",
    !SUPABASE_URL && "NEXT_PUBLIC_SUPABASE_URL",
    !SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);

  if (missing.length > 0) {
    console.error(`Fehlende Umgebungsvariablen: ${missing.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string, {
    auth: { persistSession: false },
  });

  // Reihenfolge wichtig: .or() gibt es nur auf dem Filter-Builder, .limit() erst
  // auf dem Transform-Builder nach .order().
  let filtered = supabase
    .from("routes")
    .select("id, title, country, start_point, end_point, start_lat, start_lng, end_lat, end_lng");

  if (ONLY_MISSING) {
    filtered = filtered.or("start_lat.is.null,start_lng.is.null,end_lat.is.null,end_lng.is.null");
  }

  let query = filtered.order("title", { ascending: true });
  if (LIMIT) {
    query = query.limit(LIMIT);
  }

  const { data, error } = await query;
  if (error) {
    console.error(`Routen konnten nicht geladen werden: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const routes = (data ?? []) as RouteRow[];
  console.log(
    `${routes.length} Routen geladen (${ONLY_MISSING ? "nur ohne Koordinaten" : "alle"}, ${APPLY ? "APPLY" : "DRY RUN"}).\n`
  );

  const problems: Problem[] = [];
  let updated = 0;
  let unchanged = 0;

  for (const route of routes) {
    const label = route.title?.trim() || route.id;
    const patch: Record<string, number> = {};

    const fields = [
      { field: "start_point", value: route.start_point, latColumn: "start_lat", lngColumn: "start_lng" },
      { field: "end_point", value: route.end_point, latColumn: "end_lat", lngColumn: "end_lng" },
    ] as const;

    for (const { field, value, latColumn, lngColumn } of fields) {
      if (!value || !value.trim()) {
        problems.push({
          routeTitle: label,
          field,
          query: "—",
          kind: "not_found",
          reason: "Feld ist leer",
        });
        continue;
      }

      const q = buildQuery(value, route.country);
      const result = await geocode(q);
      await sleep(REQUEST_DELAY_MS);

      if (result.kind !== "ok") {
        problems.push({
          routeTitle: label,
          field,
          query: q,
          kind: result.kind,
          reason: result.reason,
          candidates: result.candidates,
        });
        console.log(`  ✗ ${label} / ${field}: "${q}" -> ${result.kind} (${result.reason})`);
        continue;
      }

      patch[latColumn] = result.lat;
      patch[lngColumn] = result.lng;
      console.log(`  ✓ ${label} / ${field}: "${q}" -> ${result.lat}, ${result.lng} (${result.formattedAddress})`);
    }

    if (Object.keys(patch).length === 0) {
      unchanged += 1;
      continue;
    }

    if (!APPLY) {
      updated += 1;
      continue;
    }

    const { error: updateError } = await supabase.from("routes").update(patch).eq("id", route.id);
    if (updateError) {
      console.error(`  ! Update fehlgeschlagen fuer ${label}: ${updateError.message}`);
      problems.push({
        routeTitle: label,
        field: "start_point",
        query: "—",
        kind: "error",
        reason: `UPDATE fehlgeschlagen: ${updateError.message}`,
      });
      continue;
    }
    updated += 1;
  }

  console.log(
    `\nFertig. ${updated} Routen ${APPLY ? "aktualisiert" : "waeren aktualisiert worden"}, ${unchanged} ohne verwertbares Ergebnis.`
  );

  if (problems.length > 0) {
    console.log(`\n${problems.length} ungeklaerte Faelle (nicht geschrieben):\n`);
    console.log(markdownTable(problems));
  } else {
    console.log("\nKeine mehrdeutigen oder fehlgeschlagenen Orte.");
  }
}

await main();
