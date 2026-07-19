import type { DistanceUnit } from "@/app/UnitContext";

const KM_TO_MI = 0.621371;

/**
 * Formatiert eine in Supabase gespeicherte Distanz (immer in km) je nach
 * gewünschter Einheit als lesbaren String, z.B. "120 km" oder "75 mi".
 * Die Datenbank bleibt dabei die einzige Quelle der Wahrheit (nur km) —
 * die Umrechnung passiert ausschließlich hier, beim Anzeigen.
 */
export function formatDistance(
  km?: number | null,
  unit: DistanceUnit = "km"
): string {
  if (km == null || Number.isNaN(km)) return "—";

  if (unit === "mi") {
    const miles = km * KM_TO_MI;
    return `${Math.round(miles).toLocaleString("en-US")} mi`;
  }

  return `${Math.round(km).toLocaleString("en-US")} km`;
}

/** Liefert nur die reine Zahl (ohne Einheit), z.B. für kompakte Anzeigen wie "120 KM". */
export function convertDistance(
  km?: number | null,
  unit: DistanceUnit = "km"
): number {
  if (km == null || Number.isNaN(km)) return 0;
  return unit === "mi" ? Math.round(km * KM_TO_MI) : Math.round(km);
}