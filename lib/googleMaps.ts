"use client";

// Clientseitiger Loader + kleine Helfer für die Google-Maps-JavaScript-API
// (Places-Autocomplete und Directions) auf /plan.
//
// WICHTIG — Key-Trennung (Issue #24):
//   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY  -> genau hier, ausschliesslich im Browser.
//                                      Per HTTP-Referrer auf die eigene Domain
//                                      beschränkt, darf deshalb ins Bundle.
//   GOOGLE_MAPS_API_KEY              -> ausschliesslich serverseitig im
//                                      Geocoding-Skript (scripts/geocode-routes.ts).
// Die beiden Keys werden nie vermischt; der Server-Key taucht in dieser Datei
// (und in keiner anderen Client-Datei) auf.

/* eslint-disable @typescript-eslint/no-explicit-any */

export const GOOGLE_MAPS_BROWSER_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

const CALLBACK_NAME = "__scenicRoutesGoogleMapsReady";
const SCRIPT_ID = "scenic-routes-google-maps";

let loaderPromise: Promise<any> | null = null;

/** true, wenn überhaupt ein Browser-Key konfiguriert ist. */
export function hasGoogleMapsKey(): boolean {
  return GOOGLE_MAPS_BROWSER_KEY.length > 0;
}

/**
 * Lädt die Maps-JS-API genau einmal und liefert `google.maps`.
 * Mehrfache Aufrufe teilen sich dasselbe Promise.
 */
export function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps läuft nur im Browser"));
  }

  const existing = (window as any).google?.maps;
  if (existing?.DirectionsService) return Promise.resolve(existing);

  if (loaderPromise) return loaderPromise;

  if (!hasGoogleMapsKey()) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ist nicht gesetzt")
    );
  }

  loaderPromise = new Promise((resolve, reject) => {
    (window as any)[CALLBACK_NAME] = () => {
      const maps = (window as any).google?.maps;
      if (maps) resolve(maps);
      else reject(new Error("Google Maps wurde geladen, ist aber nicht verfügbar"));
    };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src =
      "https://maps.googleapis.com/maps/api/js" +
      `?key=${encodeURIComponent(GOOGLE_MAPS_BROWSER_KEY)}` +
      "&libraries=places,geometry" +
      "&loading=async" +
      `&callback=${CALLBACK_NAME}`;
    script.onerror = () => {
      // Damit ein späterer Versuch (z.B. nach Netzwerk-Aussetzer) neu laden darf.
      loaderPromise = null;
      script.remove();
      reject(new Error("Google Maps konnte nicht geladen werden"));
    };

    document.head.appendChild(script);
  });

  return loaderPromise;
}

export type PlaceSuggestion = {
  /** Place-ID, falls vorhanden — sonst der Text selbst (nur als React-Key genutzt). */
  id: string;
  /** Anzeigetext, der 1:1 als origin/destination an Directions geht. */
  text: string;
};

/**
 * Autocomplete-Vorschläge für ein Freitext-Feld.
 *
 * Bevorzugt die aktuelle Places-API (`AutocompleteSuggestion`) und fällt auf
 * den klassischen `AutocompleteService` zurück, falls der Key/die geladene
 * API-Version die neue Variante nicht anbietet. Die Vorschläge werden bewusst
 * in einer eigenen Dropdown-Liste gerendert (statt mit dem Google-Widget),
 * damit das bestehende Design-/Variablensystem erhalten bleibt.
 */
export async function fetchPlaceSuggestions(
  input: string
): Promise<PlaceSuggestion[]> {
  const trimmed = input.trim();
  if (trimmed.length < 3) return [];

  const maps = await loadGoogleMaps();
  const places = maps.places;
  if (!places) return [];

  if (typeof places.AutocompleteSuggestion?.fetchAutocompleteSuggestions === "function") {
    const response = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: trimmed,
    });

    const suggestions: any[] = response?.suggestions ?? [];
    return suggestions
      .map((suggestion) => {
        const prediction = suggestion?.placePrediction;
        const text: string = prediction?.text?.toString?.() ?? prediction?.text?.text ?? "";
        return { id: prediction?.placeId || text, text };
      })
      .filter((suggestion) => suggestion.text.length > 0);
  }

  if (typeof places.AutocompleteService === "function") {
    const service = new places.AutocompleteService();
    const predictions = await new Promise<any[]>((resolve) => {
      service.getPlacePredictions({ input: trimmed }, (result: any, status: any) => {
        resolve(status === places.PlacesServiceStatus?.OK && result ? result : []);
      });
    });

    return predictions
      .map((prediction) => ({
        id: prediction.place_id || prediction.description,
        text: prediction.description as string,
      }))
      .filter((suggestion) => Boolean(suggestion.text));
  }

  return [];
}

export type DirectionsWaypoint = { lat: number; lng: number };

/**
 * Berechnet eine Fahrstrecke von `origin` nach `destination`, optional über
 * Zwischenstopps. Die Reihenfolge der Wegpunkte wird bewusst NICHT von Google
 * optimiert — sie kommt bereits sortiert aus dem Korridor-Matching
 * (siehe lib/routeCorridor.ts).
 */
export async function computeDirections(
  origin: string,
  destination: string,
  waypoints: DirectionsWaypoint[] = []
): Promise<any> {
  const maps = await loadGoogleMaps();
  const service = new maps.DirectionsService();

  return new Promise((resolve, reject) => {
    service.route(
      {
        origin,
        destination,
        travelMode: maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
        waypoints: waypoints.map((point) => ({
          location: new maps.LatLng(point.lat, point.lng),
          stopover: true,
        })),
      },
      (result: any, status: any) => {
        if (status === maps.DirectionsStatus.OK && result) resolve(result);
        else reject(new Error(String(status)));
      }
    );
  });
}

/**
 * Ein Punkt aus einer Directions-Antwort als [lng, lat].
 *
 * `overview_path` liefert normalerweise `google.maps.LatLng`-Objekte mit den
 * Methoden lat()/lng(); je nach API-Variante können es aber auch schlichte
 * `{ lat, lng }`-Literale sein. Beides wird hier akzeptiert — der frühere Code
 * rief blind `point.lng()` auf und wäre am Literal mit einem TypeError
 * ausgestiegen (Issue #26).
 */
function toLngLat(point: any): [number, number] | null {
  if (!point) return null;

  const lat = typeof point.lat === "function" ? point.lat() : point.lat;
  const lng = typeof point.lng === "function" ? point.lng() : point.lng;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lng, lat];
}

/**
 * Dekodiert eine Google-Encoded-Polyline ("overview_polyline.points").
 * Wird nur als Rückfallebene gebraucht, wenn `overview_path` fehlt.
 */
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    for (const axis of [0, 1]) {
      let result = 0;
      let shift = 0;
      let byte: number;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);

      const delta = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }

    points.push([lng / 1e5, lat / 1e5]);
  }

  return points;
}

/**
 * Die Übersichts-Polylinie einer Directions-Antwort als [lng, lat]-Paare.
 *
 * Reihenfolge der Quellen: `overview_path` (Normalfall), sonst die kodierte
 * `overview_polyline`, sonst die Stützpunkte der einzelnen Steps. Liefert eine
 * Antwort keine davon, kommt ein leeres Array zurück — und das Korridor-
 * Matching findet dann garantiert nichts, weshalb der Aufrufer diesen Fall
 * sichtbar machen sollte statt ihn als "keine Treffer" zu verkaufen.
 */
export function overviewPathToLngLat(result: any): [number, number][] {
  const route = result?.routes?.[0];

  const overviewPath: any[] = route?.overview_path ?? [];
  const fromPath = overviewPath
    .map(toLngLat)
    .filter((point): point is [number, number] => point !== null);
  if (fromPath.length >= 2) return fromPath;

  const encoded: unknown = route?.overview_polyline?.points ?? route?.overview_polyline;
  if (typeof encoded === "string" && encoded.length > 0) {
    const fromPolyline = decodePolyline(encoded);
    if (fromPolyline.length >= 2) return fromPolyline;
  }

  const fromSteps: [number, number][] = [];
  for (const leg of (route?.legs ?? []) as any[]) {
    for (const step of (leg?.steps ?? []) as any[]) {
      const stepPath: any[] = step?.path ?? [step?.start_location, step?.end_location];
      for (const point of stepPath) {
        const converted = toLngLat(point);
        if (converted) fromSteps.push(converted);
      }
    }
  }

  return fromSteps;
}

/** Gesamtstrecke (km) und Gesamtdauer (Sekunden) über alle Legs. */
export function summarizeDirections(result: any): { km: number; seconds: number } {
  const legs: any[] = result?.routes?.[0]?.legs ?? [];
  let meters = 0;
  let seconds = 0;

  for (const leg of legs) {
    meters += leg?.distance?.value ?? 0;
    seconds += leg?.duration?.value ?? 0;
  }

  return { km: meters / 1000, seconds };
}
