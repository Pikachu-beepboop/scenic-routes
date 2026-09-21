"use client";

// Zwischenspeicher für den Fall "Als Trip speichern, aber nicht eingeloggt".
//
// Ablauf: /plan legt die Auswahl hier ab, schickt den User über das bestehende
// Muster /login?redirect=/plan, und /plan legt den Trip nach der Rückkehr
// automatisch an — der User landet also nahtlos im Trip Builder, ohne seine
// Auswahl neu zusammenklicken zu müssen.
//
// sessionStorage statt localStorage: die Auswahl soll nur diesen einen
// Browser-Tab und nur diesen einen Anlauf überleben.

import type { NewTrip } from "./trips";

const STORAGE_KEY = "sr:pending-trip";

export function savePendingTrip(trip: NewTrip): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trip));
  } catch {
    // Storage nicht verfügbar (Private Mode o.ä.) — dann geht die Auswahl
    // verloren, aber nichts bricht.
  }
}

export function readPendingTrip(): NewTrip | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<NewTrip> | null;
    if (!parsed || !Array.isArray(parsed.routeIds)) return null;

    return {
      title: typeof parsed.title === "string" ? parsed.title : "",
      startLocation: typeof parsed.startLocation === "string" ? parsed.startLocation : "",
      endLocation: typeof parsed.endLocation === "string" ? parsed.endLocation : "",
      routeIds: parsed.routeIds.filter((id): id is string => typeof id === "string"),
    };
  } catch {
    return null;
  }
}

export function clearPendingTrip(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignorieren
  }
}
