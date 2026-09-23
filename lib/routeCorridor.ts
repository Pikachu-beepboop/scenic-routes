// Geografische Vorauswahl für den Route Planner (/plan) — Schritt 1 von 2.
//
// Fragestellung bis Issue #26: Liegt eine kuratierte Route "auf dem Weg"?
// Gemessen wurde das rein geometrisch als Abstand zur direkten Strecke
// (Korridor 20 km, Abschweifung max. 60 km). Genau das war laut Issue #28 zu
// streng und ging am Produktgedanken vorbei: Nutzer wollen bewusst einen Umweg
// in Kauf nehmen, um eine schöne Strecke mitzunehmen. Chișinău→Wien soll den
// Transfagarasan vorschlagen, obwohl der ~80 km neben der direkten Strecke
// liegt — ein reiner 20-km-Korridor kann das nie liefern.
//
// Seit Issue #28 entscheidet deshalb nicht mehr die Luftlinie, sondern die
// zusätzliche Fahrzeit. Das ist eine Directions-Frage, keine Geometriefrage,
// und Directions-Anfragen sind teuer — eine pro Route wären 68 Anfragen je
// Berechnung. Das Matching läuft darum zweistufig:
//
//   Schritt 1 (diese Datei, rein lokal, ohne API):
//     grobzügiger Radius CANDIDATE_RADIUS_KM um die direkte Strecke, danach
//     Deckelung auf MAX_DETOUR_CANDIDATES Kandidaten. Aus 68 Routen werden so
//     typischerweise 5–18, ohne einen einzigen Netzwerk-Request.
//
//   Schritt 2 (lib/routeDetour.ts, Directions nur für die Vorauswahl):
//     misst je Kandidat die tatsächliche Mehrfahrzeit und legt sie im
//     Frontend-State ab. Der Prozent-Regler auf /plan filtert danach nur noch
//     diese zwischengespeicherten Zahlen — ohne neue Anfragen.
//
// Die Berechnung läuft bewusst komplett im Frontend zur Laufzeit — kein
// PostGIS, und explizit kein Parsen von Koordinaten aus Google-Embed-Links.
// Grundlage sind ausschliesslich die Spalten start_lat/start_lng/end_lat/end_lng
// aus `routes`. Routen, bei denen auch nur eine dieser Spalten NULL ist
// (Stand heute 22 von 90), werden sauber übersprungen statt zu crashen.
//
// Implementierungshinweis: gerechnet wird die Great-Circle-Distanz Punkt →
// Polylinie (Cross-Track-/Along-Track-Formel), also exakt die Semantik von
// turf.js' `pointToLineDistance` in Kilometern. Die Funktion unten trägt
// deshalb bewusst dieselbe Signatur, damit ein späterer Wechsel auf
// @turf/point-to-line-distance ein Einzeiler bleibt.

/**
 * Radius um die direkte Strecke, innerhalb dessen eine kuratierte Route
 * überhaupt als Umweg-Kandidat in Frage kommt.
 *
 * Bewusst grosszügig (Issue #28 nennt 80–100 km): der Vorfilter soll nur
 * offensichtlich Unerreichbares aussortieren, die eigentliche Entscheidung
 * trifft die gemessene Mehrfahrzeit in Schritt 2. 100 km deckt den
 * Referenzfall ab — der Transfagarasan liegt rund 80 km neben der
 * E60-Strecke, die Google für Chișinău→Wien wählt.
 */
export const CANDIDATE_RADIUS_KM = 100;

/**
 * Obergrenze für die Kandidatenliste und damit für die Zahl der
 * Directions-Anfragen pro "Calculate Route"-Klick.
 *
 * Issue #28 gibt 15–20 vor. 18 liegt in der Mitte und bleibt bei der
 * Parallelität aus lib/routeDetour.ts deutlich unter dem Punkt, an dem Google
 * mit OVER_QUERY_LIMIT antwortet.
 */
export const MAX_DETOUR_CANDIDATES = 18;

/** [lng, lat] — dieselbe Achsenreihenfolge wie GeoJSON/turf. */
export type LngLat = [number, number];

/** Nur die Felder, die fürs Matching gebraucht werden. */
export type CorridorRoute = {
  start_lat?: number | string | null;
  start_lng?: number | string | null;
  end_lat?: number | string | null;
  end_lng?: number | string | null;
};

export type DetourCandidate<T> = {
  route: T;
  /** Start- und Endkoordinate der kuratierten Route, [lng, lat]. */
  start: LngLat;
  end: LngLat;
  /** Abstand des Startpunkts zur berechneten Strecke, in km. */
  startDistanceKm: number;
  /** Abstand des Endpunkts zur berechneten Strecke, in km. */
  endDistanceKm: number;
  /** Kleinster Abstand der gesamten Route zur berechneten Strecke, in km. */
  nearestDistanceKm: number;
  /**
   * Position, an der die berechnete Strecke den Abzweig erreicht, in km ab
   * Start — die kleinere der beiden Endpunkt-Projektionen. Bestimmt die
   * Reihenfolge mehrerer Kandidaten als Wegpunkte.
   */
  alongTrackKm: number;
  /**
   * true, wenn der Startpunkt der kuratierten Route entlang der Fahrtrichtung
   * vor ihrem Endpunkt liegt. Damit wird die Route in der Richtung befahren,
   * in die man ohnehin unterwegs ist, statt am Ende zurückfahren zu müssen.
   */
  startFirst: boolean;
};

const EARTH_RADIUS_KM = 6371.0088;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const clamp = (value: number, min: number, max: number) =>
  value < min ? min : value > max ? max : value;

function haversineKm(a: LngLat, b: LngLat): number {
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLat = lat2 - lat1;
  const dLng = toRad(b[0] - a[0]);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(clamp(Math.sqrt(h), -1, 1));
}

/** Initialer Kurswinkel von a nach b, in Radiant. */
function bearingRad(a: LngLat, b: LngLat): number {
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLng = toRad(b[0] - a[0]);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return Math.atan2(y, x);
}

/**
 * Abstand eines Punkts zu einem Grosskreis-Segment a→b, in km — plus die
 * Strecke entlang des Segments, an der der Lotfusspunkt liegt.
 */
function pointToSegment(
  point: LngLat,
  a: LngLat,
  b: LngLat
): { distanceKm: number; alongKm: number } {
  const segmentKm = haversineKm(a, b);

  // Entartetes Segment (zwei identische Stützpunkte)
  if (segmentKm === 0) {
    return { distanceKm: haversineKm(point, a), alongKm: 0 };
  }

  const angularA = haversineKm(a, point) / EARTH_RADIUS_KM;
  if (angularA === 0) return { distanceKm: 0, alongKm: 0 };

  const deltaBearing = bearingRad(a, point) - bearingRad(a, b);

  // Der Punkt liegt "hinter" a — dann ist a der nächstgelegene Punkt.
  if (Math.cos(deltaBearing) < 0) {
    return { distanceKm: haversineKm(point, a), alongKm: 0 };
  }

  const crossTrack = Math.asin(
    clamp(Math.sin(angularA) * Math.sin(deltaBearing), -1, 1)
  );

  const cosCrossTrack = Math.cos(crossTrack);
  const alongKm =
    cosCrossTrack === 0
      ? 0
      : Math.acos(clamp(Math.cos(angularA) / cosCrossTrack, -1, 1)) *
        EARTH_RADIUS_KM;

  // Hinter b — dann ist b der nächstgelegene Punkt.
  if (alongKm > segmentKm) {
    return { distanceKm: haversineKm(point, b), alongKm: segmentKm };
  }

  return { distanceKm: Math.abs(crossTrack) * EARTH_RADIUS_KM, alongKm };
}

function nearestOnLine(
  point: LngLat,
  line: LngLat[]
): { distanceKm: number; alongTrackKm: number } {
  if (line.length === 0) {
    return { distanceKm: Number.POSITIVE_INFINITY, alongTrackKm: 0 };
  }
  if (line.length === 1) {
    return { distanceKm: haversineKm(point, line[0]), alongTrackKm: 0 };
  }

  let best = Number.POSITIVE_INFINITY;
  let bestAlong = 0;
  let travelled = 0;

  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i];
    const b = line[i + 1];
    const { distanceKm, alongKm } = pointToSegment(point, a, b);

    if (distanceKm < best) {
      best = distanceKm;
      bestAlong = travelled + alongKm;
    }

    travelled += haversineKm(a, b);
  }

  return { distanceKm: best, alongTrackKm: bestAlong };
}

/**
 * Kürzester Abstand eines Punkts zu einer Polylinie, in Kilometern.
 * Signatur und Semantik entsprechen turf.js' `pointToLineDistance`
 * (GeoJSON-Achsenreihenfolge [lng, lat], Ergebnis in km).
 */
export function pointToLineDistanceKm(point: LngLat, line: LngLat[]): number {
  return nearestOnLine(point, line).distanceKm;
}

/**
 * Kleinster Abstand zwischen der Strecke `line` und der geraden Verbindung
 * a→b (der groben Näherung einer kuratierten Route), in Kilometern.
 *
 * Für zwei Streckenzüge wird das Minimum immer an einem Stützpunkt des einen
 * gegen ein Segment des anderen angenommen — es genügt also, beide Richtungen
 * punktweise zu prüfen. Wichtig für Routen, die den Korridor queren: dort sind
 * beide Endpunkte weit weg, die Route selbst aber mitten drin.
 */
export function segmentToLineDistanceKm(a: LngLat, b: LngLat, line: LngLat[]): number {
  let best = Math.min(pointToLineDistanceKm(a, line), pointToLineDistanceKm(b, line));
  if (best === 0) return 0;

  const routeSegment: LngLat[] = [a, b];
  for (const vertex of line) {
    const distanceKm = pointToLineDistanceKm(vertex, routeSegment);
    if (distanceKm < best) best = distanceKm;
  }

  return best;
}

/** Wandelt einen DB-Wert (numeric kommt je nach Client als number oder string) in eine endliche Zahl. */
function toFinite(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * Liefert Start- und Endkoordinate einer Route — oder null, wenn auch nur ein
 * Wert fehlt bzw. ausserhalb des gültigen Bereichs liegt.
 */
export function getRouteEndpoints(
  route: CorridorRoute
): { start: LngLat; end: LngLat } | null {
  const startLat = toFinite(route.start_lat);
  const startLng = toFinite(route.start_lng);
  const endLat = toFinite(route.end_lat);
  const endLng = toFinite(route.end_lng);

  if (startLat === null || startLng === null || endLat === null || endLng === null) {
    return null;
  }
  if (Math.abs(startLat) > 90 || Math.abs(endLat) > 90) return null;
  if (Math.abs(startLng) > 180 || Math.abs(endLng) > 180) return null;

  return { start: [startLng, startLat], end: [endLng, endLat] };
}

/** true, wenn die Route überhaupt am Matching teilnehmen kann. */
export function hasUsableCoordinates(route: CorridorRoute): boolean {
  return getRouteEndpoints(route) !== null;
}

/**
 * Schritt 1 des Umweg-Matchings: grobe geografische Vorauswahl, komplett ohne
 * Netzwerk-Request.
 *
 * Kriterium ist bewusst nur noch eine einzige, grosszügige Schranke: die Route
 * muss der berechneten Strecke auf höchstens `radiusKm` nahekommen. Gemessen
 * wird dabei nicht nur Start/Ende gegen die Strecke, sondern der kleinste
 * Abstand zwischen der Strecke und der Start→Ziel-Verbindung der kuratierten
 * Route — sonst fallen Routen durch, die den Korridor queren, deren Endpunkte
 * aber beidseits daneben liegen.
 *
 * Die frühere zweite Schranke ("kein Endpunkt weiter als 60 km weg") ist
 * entfallen: wie weit eine Route wegführen darf, beantwortet ab jetzt die
 * gemessene Mehrfahrzeit aus Schritt 2 und der Regler des Nutzers, nicht mehr
 * eine fest verdrahtete Luftlinie.
 *
 * Gedeckelt wird auf `limit` Kandidaten, weil jeder Kandidat in Schritt 2 eine
 * Directions-Anfrage kostet. Gewählt werden die `limit` Routen mit dem
 * kleinsten Abstand zur Strecke; das Ergebnis kommt nach Position entlang der
 * Strecke sortiert zurück, damit mehrere ausgewählte Routen in einer
 * sinnvollen Reihenfolge als Wegpunkte an Directions gehen.
 */
export function selectDetourCandidates<T extends CorridorRoute>(
  routes: T[],
  line: LngLat[],
  radiusKm: number = CANDIDATE_RADIUS_KM,
  limit: number = MAX_DETOUR_CANDIDATES
): DetourCandidate<T>[] {
  if (line.length < 2) return [];

  const candidates: DetourCandidate<T>[] = [];

  for (const route of routes) {
    const endpoints = getRouteEndpoints(route);
    // Routen ohne vollständige Koordinaten werden übersprungen, nicht gewertet.
    if (!endpoints) continue;

    const start = nearestOnLine(endpoints.start, line);
    const end = nearestOnLine(endpoints.end, line);

    // Der Endpunkt-Abstand genügt als Nachweis, wenn er schon klein genug ist —
    // nur sonst lohnt der teurere Vergleich der gesamten Verbindung.
    const nearestEndpointKm = Math.min(start.distanceKm, end.distanceKm);
    const nearestDistanceKm =
      nearestEndpointKm <= radiusKm
        ? nearestEndpointKm
        : segmentToLineDistanceKm(endpoints.start, endpoints.end, line);

    if (nearestDistanceKm > radiusKm) continue;

    candidates.push({
      route,
      start: endpoints.start,
      end: endpoints.end,
      startDistanceKm: start.distanceKm,
      endDistanceKm: end.distanceKm,
      nearestDistanceKm,
      alongTrackKm: Math.min(start.alongTrackKm, end.alongTrackKm),
      startFirst: start.alongTrackKm <= end.alongTrackKm,
    });
  }

  return candidates
    .sort((a, b) => a.nearestDistanceKm - b.nearestDistanceKm)
    .slice(0, limit)
    .sort((a, b) => a.alongTrackKm - b.alongTrackKm);
}
