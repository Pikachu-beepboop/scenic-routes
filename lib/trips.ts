"use client";

// Datenzugriff für Route Planner (/plan), Trip Builder (/trip) und die
// Trip-Liste auf /my-trips.
//
// Alle Queries laufen über den Auth-Client `supabase` — die RLS-Policies von
// trips / trip_days / trip_stops hängen an auth.uid(), der anonyme
// `supabasePublic`-Client sähe also grundsätzlich nichts.

import { supabase, safeQuery, withTimeout, isAuthError, resetAuthState } from "./supabase";

/** Die Routen-Felder, die Trip-Liste und Builder anzeigen. */
export type TripRoute = {
  id: string;
  title: string | null;
  title_en?: string | null;
  title_de?: string | null;
  title_ru?: string | null;
  country: string | null;
  distance_km: string | number | null;
  duration: string | null;
  image_url: string | null;
};

export type TripStop = {
  id: string;
  position: number;
  route_id: string;
  routes: TripRoute | null;
};

export type TripDay = {
  id: string;
  day_number: number;
  label: string | null;
  trip_stops: TripStop[];
};

export type Trip = {
  id: string;
  title: string;
  start_location: string | null;
  end_location: string | null;
  updated_at: string | null;
  trip_days: TripDay[];
};

const TRIP_SELECT = `
  id, title, start_location, end_location, updated_at,
  trip_days (
    id, day_number, label,
    trip_stops (
      id, position, route_id,
      routes ( id, title, title_en, title_de, title_ru, country, distance_km, duration, image_url )
    )
  )
`;

/** Sortiert Tage nach day_number und Stopps nach position (PostgREST garantiert keine Reihenfolge). */
function normalizeTrip(trip: Trip): Trip {
  const days = [...(trip.trip_days ?? [])]
    .sort((a, b) => a.day_number - b.day_number)
    .map((day) => ({
      ...day,
      trip_stops: [...(day.trip_stops ?? [])].sort((a, b) => a.position - b.position),
    }));

  return { ...trip, trip_days: days };
}

/**
 * Alle Trips eines Users, neueste Änderung zuerst.
 *
 * `null` = die Abfrage ist fehlgeschlagen. Vorher wurde daraus ein leeres
 * Array, und /my-trips zeigte "noch keinen Trip geplant" — ein Lesefehler sah
 * damit exakt so aus wie ein Speicherfehler (Issue #30).
 */
export async function fetchTrips(userId: string): Promise<Trip[] | null> {
  const data = await safeQuery<Trip[]>(
    supabase
      .from("trips")
      .select(TRIP_SELECT)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    "fetchTrips"
  );

  return data ? data.map(normalizeTrip) : null;
}

/** Ein einzelner Trip inkl. Tagen und Stopps. */
export async function fetchTrip(tripId: string, userId: string): Promise<Trip | null> {
  const data = await safeQuery<Trip>(
    supabase
      .from("trips")
      .select(TRIP_SELECT)
      .eq("id", tripId)
      .eq("user_id", userId)
      .single(),
    "fetchTrip"
  );

  return data ? normalizeTrip(data) : null;
}

export type NewTrip = {
  title: string;
  startLocation: string;
  endLocation: string;
  /** Die auf /plan ausgewählten Routen — landen als Tag 1 im Builder. */
  routeIds: string[];
};

export type CreateTripResult = {
  /** Die ID des angelegten Trips — null, wenn schon der trips-Insert scheiterte. */
  tripId: string | null;
  /**
   * Der tatsächliche Fehler des ersten fehlgeschlagenen Schritts.
   *
   * Vorher hat `safeQuery` jeden Fehler in ein stilles `null` verwandelt und
   * /plan hat daraus ein generisches "konnte nicht gespeichert werden"
   * gemacht — die Ursache war aus der laufenden App nicht mehr zu erkennen
   * (Issue #28). Deshalb wird sie jetzt nach oben durchgereicht.
   */
  error: unknown;
};

/**
 * Legt einen Trip mit einem vorbefüllten Tag 1 an.
 *
 * Bewusst in drei Schritten statt per RPC: die RLS-Policies der Kindtabellen
 * prüfen jeweils gegen den bereits existierenden Elterndatensatz, die
 * Reihenfolge trips -> trip_days -> trip_stops ist also zwingend.
 *
 * Ein Fehler in Schritt 2 oder 3 lässt den bereits angelegten Trip stehen und
 * liefert trotzdem dessen ID zurück — ein halb befüllter Trip im Builder ist
 * für den Nutzer besser reparierbar als ein Trip, den er nirgends wiederfindet.
 * Der Fehler wird aber mitgegeben, damit die Oberfläche ihn zeigen kann.
 */
export async function createTrip(
  userId: string,
  trip: NewTrip
): Promise<CreateTripResult> {
  try {
    const { data: created, error: tripError } = await withTimeout(
      supabase
        .from("trips")
        .insert({
          user_id: userId,
          title: trip.title,
          start_location: trip.startLocation || null,
          end_location: trip.endLocation || null,
        })
        .select("id")
        .single()
    );

    if (tripError) throw tripError;
    if (!created?.id) throw new Error("createTrip: Insert lieferte keine ID zurück");

    const { data: day, error: dayError } = await withTimeout(
      supabase
        .from("trip_days")
        .insert({ trip_id: created.id, day_number: 1, label: null })
        .select("id")
        .single()
    );

    if (dayError) return { tripId: created.id, error: dayError };
    if (!day?.id) return { tripId: created.id, error: new Error("createTrip: kein Tag angelegt") };

    if (trip.routeIds.length > 0) {
      const { error: stopsError } = await withTimeout(
        supabase.from("trip_stops").insert(
          trip.routeIds.map((routeId, index) => ({
            trip_day_id: day.id,
            route_id: routeId,
            position: index,
          }))
        )
      );

      if (stopsError) return { tripId: created.id, error: stopsError };
    }

    return { tripId: created.id, error: null };
  } catch (err) {
    console.error("createTrip failed:", err);
    // Gleiche Regel wie in safeQuery: nur ein echter Auth-Fehler verwirft die
    // Session. /plan schickt den Nutzer dann beim nächsten Klick sauber über
    // /login und legt den gemerkten Trip danach automatisch an.
    if (isAuthError(err)) await resetAuthState();
    return { tripId: null, error: err };
  }
}

/** Titel ändern (debounced aufgerufen). `updated_at` setzt der DB-Trigger. */
export async function updateTripTitle(tripId: string, title: string): Promise<boolean> {
  try {
    const { error } = await withTimeout(
      supabase.from("trips").update({ title }).eq("id", tripId)
    );
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("updateTripTitle failed:", err);
    return false;
  }
}

/** Neuen Tag am Ende anhängen und die erzeugte Zeile zurückgeben. */
export async function addTripDay(
  tripId: string,
  dayNumber: number
): Promise<{ id: string } | null> {
  return safeQuery<{ id: string }>(
    supabase
      .from("trip_days")
      .insert({ trip_id: tripId, day_number: dayNumber, label: null })
      .select("id")
      .single(),
    "addTripDay"
  );
}

export async function deleteTripDay(dayId: string): Promise<boolean> {
  try {
    // trip_stops hängen per ON DELETE CASCADE dran und verschwinden mit.
    const { error } = await withTimeout(
      supabase.from("trip_days").delete().eq("id", dayId)
    );
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("deleteTripDay failed:", err);
    return false;
  }
}

export async function deleteTripStop(stopId: string): Promise<boolean> {
  try {
    const { error } = await withTimeout(
      supabase.from("trip_stops").delete().eq("id", stopId)
    );
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("deleteTripStop failed:", err);
    return false;
  }
}

/** Nummerierung der Tage nach einem Umbau wieder lückenlos machen. */
export async function persistDayNumbers(
  days: { id: string; dayNumber: number }[]
): Promise<boolean> {
  try {
    await Promise.all(
      days.map(async ({ id, dayNumber }) => {
        const { error } = await withTimeout(
          supabase.from("trip_days").update({ day_number: dayNumber }).eq("id", id)
        );
        if (error) throw error;
      })
    );
    return true;
  } catch (err) {
    console.error("persistDayNumbers failed:", err);
    return false;
  }
}

/**
 * Schreibt Tageszuordnung + Position aller übergebenen Stopps zurück.
 * Wird nach jedem Drag & Drop, Pfeil-Klick und Entfernen aufgerufen (Autosave).
 */
export async function persistStopOrder(
  stops: { id: string; dayId: string; position: number }[]
): Promise<boolean> {
  if (stops.length === 0) return true;

  try {
    await Promise.all(
      stops.map(async ({ id, dayId, position }) => {
        const { error } = await withTimeout(
          supabase
            .from("trip_stops")
            .update({ trip_day_id: dayId, position })
            .eq("id", id)
        );
        if (error) throw error;
      })
    );
    return true;
  } catch (err) {
    console.error("persistStopOrder failed:", err);
    return false;
  }
}

/**
 * Berührt den Trip, damit `updated_at` (DB-Trigger) auch bei rein
 * strukturellen Änderungen nachzieht — davon lebt die Sortierung auf /my-trips.
 */
export async function touchTrip(tripId: string, title: string): Promise<void> {
  try {
    await withTimeout(supabase.from("trips").update({ title }).eq("id", tripId));
  } catch (err) {
    console.error("touchTrip failed:", err);
  }
}
