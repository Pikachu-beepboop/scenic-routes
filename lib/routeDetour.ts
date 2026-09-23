"use client";

// Umweg-Messung für den Route Planner (/plan) — Schritt 2 von 2.
//
// Schritt 1 (lib/routeCorridor.ts) hat aus 68 kuratierten Routen eine
// überschaubare Kandidatenliste gemacht, rein lokal und ohne Netzwerk. Hier
// wird für jeden dieser Kandidaten gemessen, was er tatsächlich kostet:
// Start- und Endpunkt der kuratierten Route gehen als Wegpunkte in eine
// Directions-Anfrage, und die resultierende Gesamtfahrzeit wird mit der
// direkten Fahrzeit verglichen.
//
// WICHTIG für die Performance-Vorgabe aus Issue #28: Diese Funktion läuft
// ausschliesslich beim Klick auf "Calculate Route". Ihr Ergebnis landet im
// Frontend-State von /plan und bleibt für die aktuelle Start/Ziel-Kombination
// liegen. Der Prozent-Regler filtert danach nur noch dieses zwischen-
// gespeicherte Ergebnis — er ruft hier nichts mehr auf.

import {
  computeDirections,
  summarizeDirections,
  waypointsWereSwapped,
  type DirectionsWaypoint,
} from "./googleMaps";
import type { DetourCandidate } from "./routeCorridor";

/** Voreinstellung des Reglers: 20 % zusätzliche Fahrzeit (Issue #28). */
export const DEFAULT_DETOUR_LIMIT_PCT = 20;
/** Untere Reglergrenze — darunter bliebe faktisch nur die direkte Strecke übrig. */
export const MIN_DETOUR_LIMIT_PCT = 5;
/** Obere Reglergrenze — mehr als die Hälfte Aufschlag ist kein "Umweg" mehr. */
export const MAX_DETOUR_LIMIT_PCT = 50;

/**
 * Wie viele Directions-Anfragen gleichzeitig laufen dürfen.
 *
 * Nacheinander wären 18 Kandidaten spürbar langsam, alle 18 auf einmal
 * beantwortet Google gerne mit OVER_QUERY_LIMIT. Vier parallel ist der
 * Kompromiss, mit dem die Messung im Sekundenbereich bleibt.
 */
export const DETOUR_REQUEST_CONCURRENCY = 4;

export type ScoredCandidate<T> = DetourCandidate<T> & {
  /**
   * Zusätzliche Fahrzeit gegenüber der direkten Strecke, in Sekunden.
   * null = die Directions-Anfrage für diesen Kandidaten ist fehlgeschlagen.
   */
  detourSeconds: number | null;
  /** Dieselbe Zahl als Anteil der direkten Fahrzeit (0.2 = +20 %). */
  detourRatio: number | null;
  /** Gesamte Fahrzeit inklusive Umweg, in Sekunden. */
  totalSeconds: number | null;
};

/** Die beiden Wegpunkte eines Kandidaten, in Fahrtrichtung sortiert. */
export function candidateWaypoints<T>(candidate: DetourCandidate<T>): DirectionsWaypoint[] {
  const [first, second] = candidate.startFirst
    ? [candidate.start, candidate.end]
    : [candidate.end, candidate.start];

  return [
    { lat: first[1], lng: first[0] },
    { lat: second[1], lng: second[0] },
  ];
}

/** Arbeitet `items` mit höchstens `limit` gleichzeitig laufenden Aufgaben ab. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}

/**
 * Misst für jeden Kandidaten die Mehrfahrzeit gegenüber `baselineSeconds`.
 *
 * Das Ergebnis ist nach Mehrfahrzeit aufsteigend sortiert: der günstigste
 * Umweg steht oben. Kandidaten, deren Anfrage fehlschlägt, fallen nicht raus,
 * sondern behalten `detourSeconds: null` und landen am Ende der Liste — ein
 * einzelner Google-Fehler soll keine Route unsichtbar machen.
 *
 * `isCancelled` wird vor jeder Anfrage geprüft, damit ein zweiter Klick auf
 * "Calculate Route" die noch laufenden Anfragen des ersten Laufs nicht weiter
 * abarbeitet.
 */
export async function scoreDetourCandidates<T>(
  origin: string,
  destination: string,
  baselineSeconds: number,
  candidates: DetourCandidate<T>[],
  options: { concurrency?: number; isCancelled?: () => boolean } = {}
): Promise<ScoredCandidate<T>[]> {
  const { concurrency = DETOUR_REQUEST_CONCURRENCY, isCancelled } = options;

  const scored = await mapWithConcurrency(
    candidates,
    concurrency,
    async (candidate): Promise<ScoredCandidate<T>> => {
      if (isCancelled?.()) {
        return { ...candidate, detourSeconds: null, detourRatio: null, totalSeconds: null };
      }

      try {
        // optimizeWaypoints: Google wählt bei genau zwei Wegpunkten die
        // günstigere der beiden Fahrtrichtungen. Welche das war, übernehmen
        // wir in `startFirst` — dann fährt der später angezeigte Trip
        // dieselbe Richtung, für die hier die Zeit gemessen wurde.
        const result = await computeDirections(
          origin,
          destination,
          candidateWaypoints(candidate),
          { optimizeWaypoints: true }
        );
        const { seconds } = summarizeDirections(result);
        const startFirst = waypointsWereSwapped(result)
          ? !candidate.startFirst
          : candidate.startFirst;

        // Ein Umweg kann rechnerisch nie schneller sein als die direkte
        // Strecke; minimale negative Werte kommen nur aus Rundung bzw. daher,
        // dass Google für die Variante eine andere Hauptroute wählt.
        const detourSeconds = Math.max(0, seconds - baselineSeconds);

        return {
          ...candidate,
          startFirst,
          detourSeconds,
          detourRatio: baselineSeconds > 0 ? detourSeconds / baselineSeconds : null,
          totalSeconds: seconds,
        };
      } catch (err) {
        console.warn("plan: Umweg-Messung fehlgeschlagen", err);
        return { ...candidate, detourSeconds: null, detourRatio: null, totalSeconds: null };
      }
    }
  );

  return scored.sort((a, b) => {
    if (a.detourSeconds === null) return b.detourSeconds === null ? 0 : 1;
    if (b.detourSeconds === null) return -1;
    return a.detourSeconds - b.detourSeconds;
  });
}

/**
 * Clientseitiger Filter des Reglers — bewusst eine reine Funktion ohne jeden
 * Netzwerkzugriff, damit das Verschieben des Reglers nachweislich nichts
 * nachlädt.
 *
 * Bereits ausgewählte Routen bleiben immer sichtbar, auch wenn sie über der
 * eingestellten Grenze liegen: sonst würde ein Regler-Zug eine getroffene
 * Auswahl aus der Liste kippen, während sie auf der Karte und im späteren Trip
 * weiterhin drinsteckt.
 */
export function filterByDetourLimit<
  T extends { route: { id: string }; detourRatio: number | null },
>(
  candidates: T[],
  limitPct: number,
  selectedIds: string[] = []
): T[] {
  return candidates.filter(
    (candidate) =>
      candidate.detourRatio === null ||
      candidate.detourRatio * 100 <= limitPct ||
      selectedIds.includes(candidate.route.id)
  );
}
