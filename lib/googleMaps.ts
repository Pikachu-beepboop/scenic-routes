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

/** Die Übersichts-Polylinie einer Directions-Antwort als [lng, lat]-Paare. */
export function overviewPathToLngLat(result: any): [number, number][] {
  const path: any[] = result?.routes?.[0]?.overview_path ?? [];
  return path
    .map((point): [number, number] => [point.lng(), point.lat()])
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
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
