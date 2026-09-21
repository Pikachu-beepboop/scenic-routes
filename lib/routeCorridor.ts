// Korridor-Matching für den Route Planner (/plan).
//
// Fragestellung: Liegt eine kuratierte Route "auf dem Weg" der gerade
// berechneten Google-Directions-Strecke? Kriterium laut Issue #24: sowohl der
// Start- als auch der Endpunkt der kuratierten Route müssen innerhalb von
// CORRIDOR_DISTANCE_KM zur berechneten Strecke liegen.
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

/** Maximaler Abstand einer kuratierten Route zur berechneten Strecke. */
export const CORRIDOR_DISTANCE_KM = 20;

/** [lng, lat] — dieselbe Achsenreihenfolge wie GeoJSON/turf. */
export type LngLat = [number, number];

/** Nur die Felder, die fürs Matching gebraucht werden. */
export type CorridorRoute = {
  start_lat?: number | string | null;
  start_lng?: number | string | null;
  end_lat?: number | string | null;
  end_lng?: number | string | null;
};

export type CorridorMatch<T> = {
  route: T;
  /** Abstand des Startpunkts zur berechneten Strecke, in km. */
  startDistanceKm: number;
  /** Abstand des Endpunkts zur berechneten Strecke, in km. */
  endDistanceKm: number;
  /** Position des Startpunkts entlang der Strecke, in km ab Start. */
  alongTrackKm: number;
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
 * Filtert die kuratierten Routen auf jene, deren Start- UND Endpunkt innerhalb
 * von `maxDistanceKm` zur übergebenen Strecke liegen.
 *
 * Das Ergebnis ist nach der Position entlang der Strecke sortiert — damit die
 * Auswahl später in einer sinnvollen Reihenfolge als Wegpunkte an die
 * Directions-API gehen kann.
 */
export function findRoutesAlongCorridor<T extends CorridorRoute>(
  routes: T[],
  line: LngLat[],
  maxDistanceKm: number = CORRIDOR_DISTANCE_KM
): CorridorMatch<T>[] {
  if (line.length < 2) return [];

  const matches: CorridorMatch<T>[] = [];

  for (const route of routes) {
    const endpoints = getRouteEndpoints(route);
    // Routen ohne vollständige Koordinaten werden übersprungen, nicht gewertet.
    if (!endpoints) continue;

    const start = nearestOnLine(endpoints.start, line);
    if (start.distanceKm > maxDistanceKm) continue;

    const end = nearestOnLine(endpoints.end, line);
    if (end.distanceKm > maxDistanceKm) continue;

    matches.push({
      route,
      startDistanceKm: start.distanceKm,
      endDistanceKm: end.distanceKm,
      alongTrackKm: start.alongTrackKm,
    });
  }

  return matches.sort((a, b) => a.alongTrackKm - b.alongTrackKm);
}
