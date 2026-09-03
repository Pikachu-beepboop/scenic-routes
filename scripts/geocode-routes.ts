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
 * Umgang mit Mehrdeutigkeit: die Geocoding API liefert auch fuer unklare Orte
 * meist genau einen Treffer, ein blosser "ein Treffer"-Check reicht also nicht.
 * Deshalb wird jeder Ort zweimal abgefragt - einmal nur mit dem Ortsnamen und
 * einmal zusaetzlich mit dem Land aus routes.country. Nur wenn beide Antworten
 * eindeutig sind und weniger als AGREEMENT_TOLERANCE_KM auseinanderliegen, wird
 * geschrieben. Alle anderen Faelle bleiben NULL und werden am Ende als
 * Markdown-Tabelle ausgegeben, damit sie manuell geklaert werden koennen.
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

/** Maximaler Abstand zwischen der Abfrage mit und ohne Land, bis zu dem beide als derselbe Ort gelten. */
const AGREEMENT_TOLERANCE_KM = 25;

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

type Hit = {
  kind: "ok";
  lat: number;
  lng: number;
  formattedAddress: string;
};

type Miss = {
  kind: "ambiguous" | "not_found" | "error";
  reason: string;
  candidates?: string[];
};

type Lookup = Hit | Miss;

type Problem = {
  routeTitle: string;
  field: "start_point" | "end_point";
  query: string;
  kind: Miss["kind"];
  reason: string;
  candidates?: string[];
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Klammer-Zusaetze wie "Baddeck (loop)" oder "Queenstown (Arrow Junction)" sind
 * Routen-Metadaten und gehoeren nicht in die Geocoding-Anfrage.
 */
function cleanPlace(value: string): string {
  return value
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim()
    .replace(/\s+/g, " ");
}

function haversineKm(a: Hit, b: Hit): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
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
  // partial_match heisst: Google konnte die Anfrage nur teilweise aufloesen.
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

/**
 * Loest einen Ort auf und verifiziert das Ergebnis ueber eine zweite Abfrage
 * mit dem Land aus routes.country. Weichen beide Antworten voneinander ab
 * (z.B. weil der Ort laut Freitext in einem anderen Land liegt als country),
 * gilt der Ort als mehrdeutig.
 */
async function resolvePoint(rawPoint: string, country: string | null): Promise<Lookup> {
  const place = cleanPlace(rawPoint);
  if (!place) {
    return { kind: "not_found", reason: "Ortsname nach Bereinigung leer" };
  }

  const plain = await geocode(place);
  await sleep(REQUEST_DELAY_MS);
  if (plain.kind !== "ok") {
    return plain;
  }

  const land = country ? cleanPlace(country) : "";
  if (!land) {
    return plain;
  }

  const withCountry = await geocode(`${place}, ${land}`);
  await sleep(REQUEST_DELAY_MS);
  if (withCountry.kind !== "ok") {
    return {
      kind: "ambiguous",
      reason: `Gegenprobe mit Land "${land}" ergab ${withCountry.kind} (${withCountry.reason})`,
      candidates: [plain.formattedAddress],
    };
  }

  const distanceKm = haversineKm(plain, withCountry);
  if (distanceKm > AGREEMENT_TOLERANCE_KM) {
    return {
      kind: "ambiguous",
      reason: `Abfrage mit und ohne Land liegen ${distanceKm.toFixed(0)} km auseinander`,
      candidates: [plain.formattedAddress, withCountry.formattedAddress],
    };
  }

  // Beide stimmen ueberein - das laenderspezifische Ergebnis ist das praezisere.
  return withCountry;
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

      const shown = cleanPlace(value);
      const result = await resolvePoint(value, route.country);

      if (result.kind !== "ok") {
        problems.push({
          routeTitle: label,
          field,
          query: shown,
          kind: result.kind,
          reason: result.reason,
          candidates: result.candidates,
        });
        console.log(`  ✗ ${label} / ${field}: "${shown}" -> ${result.kind} (${result.reason})`);
        continue;
      }

      patch[latColumn] = result.lat;
      patch[lngColumn] = result.lng;
      console.log(`  ✓ ${label} / ${field}: "${shown}" -> ${result.lat}, ${result.lng} (${result.formattedAddress})`);
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
