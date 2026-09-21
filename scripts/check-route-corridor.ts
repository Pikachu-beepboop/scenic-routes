/**
 * Prueft die Korridor-Mathematik aus lib/routeCorridor.ts isoliert nach —
 * ohne Browser, ohne Google-Maps-API, ohne npm install.
 *
 * Aufruf:
 *   node --experimental-strip-types scripts/check-route-corridor.ts
 *   npm run corridor:check
 *
 * Teil 1: Punkt-zu-Linie-Distanz gegen von Hand nachrechenbare Faelle
 *         (Meridian- und Aequator-Segmente, wo 1 Grad Breite = 111.195 km ist).
 *         Die Sollwerte stammen aus einer unabhaengigen Kontrollrechnung:
 *         die Linie wurde in 2000 Stuetzpunkte zerlegt und der kleinste
 *         Haversine-Abstand Punkt->Stuetzpunkt gebildet (siehe Issue #26).
 * Teil 2: die beiden Reproduktionsfaelle aus Issue #26 (Innsbruck -> Bozen und
 *         Muenchen -> Venedig) gegen echte Koordinaten aus `routes`.
 *         Die Strecken sind als grobe Stuetzpunkt-Polylinien der jeweiligen
 *         Autobahn hinterlegt (A12/A13/A22 bzw. A8/A93/A12/A13/A22/A4) — das
 *         genuegt, weil der Korridor in Zehner-Kilometern gemessen wird.
 */

import {
  CORRIDOR_DISTANCE_KM,
  MAX_DETOUR_DISTANCE_KM,
  findRoutesAlongCorridor,
  pointToLineDistanceKm,
  type LngLat,
} from "../lib/routeCorridor.ts";

let failures = 0;

function check(name: string, actualKm: number, expectedKm: number, toleranceKm: number): void {
  const ok = Math.abs(actualKm - expectedKm) <= toleranceKm;
  if (!ok) failures++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}: ${actualKm.toFixed(3)} km ` +
      `(erwartet ${expectedKm.toFixed(3)} +/- ${toleranceKm} km)`
  );
}

function checkCount(name: string, actual: number, expected: number): void {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${actual} (erwartet ${expected})`);
}

// --------------------------------------------------------------- Teil 1
console.log("\n=== Teil 1: Punkt-zu-Linie-Distanz ===\n");

/** Meridian 11 Grad Ost, von 47 nach 47.5 Grad Nord. */
const meridian: LngLat[] = [
  [11.0, 47.0],
  [11.0, 47.5],
];

// 0.0658 Grad Laenge auf 47.25 Grad Nord = 0.0658 * 111.32 km * cos(47.25) = 4.967 km.
check("Punkt ~5 km neben dem Segment", pointToLineDistanceKm([11.0658, 47.25], meridian), 4.967, 0.05);
check("Punkt exakt auf dem Segment", pointToLineDistanceKm([11.0, 47.25], meridian), 0, 0.001);
check("Punkt 1 Grad hinter dem Ende", pointToLineDistanceKm([11.0, 48.5], meridian), 111.195, 0.05);
check("Punkt 1 Grad vor dem Anfang", pointToLineDistanceKm([11.0, 46.0], meridian), 111.195, 0.05);

/** Aequator-Segment, Punkt 1 Grad noerdlich der Mitte. */
const equator: LngLat[] = [
  [0, 0],
  [10, 0],
];
check("Punkt 1 Grad noerdlich des Aequators", pointToLineDistanceKm([5, 1], equator), 111.195, 0.05);

/** Zwei Segmente — der Punkt gehoert zum zweiten. */
const elbow: LngLat[] = [
  [11.0, 47.0],
  [11.0, 47.5],
  [12.0, 47.5],
];
check("Punkt 0.1 Grad noerdlich des 2. Segments", pointToLineDistanceKm([11.5, 47.6], elbow), 10.999, 0.05);

// Achsenreihenfolge ist [lng, lat]. Vertauscht kommt Unsinn heraus — der Fall
// ist hier dokumentiert, damit der Unterschied sichtbar bleibt.
const swapped = pointToLineDistanceKm(
  [47.25, 11.0658],
  [
    [47.0, 11.0],
    [47.5, 11.0],
  ]
);
console.log(`INFO  dieselben Zahlen als [lat, lng] gelesen: ${swapped.toFixed(1)} km statt 4.967 km`);

// --------------------------------------------------------------- Teil 2
console.log("\n=== Teil 2: Reproduktionsfaelle aus Issue #26 ===\n");

type TestRoute = {
  title: string;
  start_lat: string;
  start_lng: string;
  end_lat: string;
  end_lng: string;
};

/** Auszug aus `routes` (Stand Issue #26) — nur Eintraege mit vollstaendigen Koordinaten. */
const ROUTES: TestRoute[] = [
  { title: "Arlbergstrasse (L197)", start_lat: "47.14057", start_lng: "10.56558", end_lat: "47.15991", end_lng: "9.80821" },
  { title: "Grossglockner High Alpine Road", start_lat: "47.2873025", start_lng: "12.8248556", end_lat: "47.0662295", end_lng: "12.7906808" },
  { title: "Hahntennjoch", start_lat: "47.24013", start_lng: "10.73954", end_lat: "47.3238788", end_lng: "10.5179444" },
  { title: "Nockalmstrasse", start_lat: "46.96858", start_lng: "13.726", end_lat: "46.854741", end_lng: "13.895588" },
  { title: "Black Forest High Road", start_lat: "48.76564", start_lng: "8.2285242", end_lat: "48.4644796", end_lng: "8.4179988" },
  { title: "Grande Strada delle Dolomiti", start_lat: "46.4949259", start_lng: "11.3402543", end_lat: "46.5378431", end_lng: "12.1358821" },
  { title: "Great Dolomites Road", start_lat: "46.4949259", start_lng: "11.3402543", end_lat: "46.5378431", end_lng: "12.1358821" },
  { title: "Passo Campolongo", start_lat: "46.5475716", start_lng: "11.8754005", end_lat: "46.497167", end_lng: "11.8737721" },
  { title: "Passo Pordoi", start_lat: "46.497167", start_lng: "11.8737721", end_lat: "46.476671", end_lng: "11.7705755" },
  { title: "Via Aurelia (Riviera di Levante)", start_lat: "44.4071448", start_lng: "8.9347381", end_lat: "44.1024504", end_lng: "9.8240826" },
  { title: "Albula Pass", start_lat: "46.6626876", start_lng: "9.5765413", end_lat: "46.5789952", end_lng: "9.925413" },
  { title: "Fluela Pass", start_lat: "46.8027453", start_lng: "9.8359701", end_lat: "46.7496108", end_lng: "10.0791325" },
  { title: "Gotthard Pass", start_lat: "46.6681092", start_lng: "8.5894896", end_lat: "46.5286074", end_lng: "8.6123746" },
  { title: "Col de l'Iseran", start_lat: "45.618598", start_lng: "6.769548", end_lat: "45.285561", end_lng: "6.875663" },
];

/** Grobe Stuetzpunkte der A12/A13/A22 ueber den Brenner. */
const INNSBRUCK_BOZEN: LngLat[] = [
  [11.3931, 47.2692], // Innsbruck
  [11.4006, 47.2311], // Schoenberg
  [11.4483, 47.1339], // Matrei am Brenner
  [11.5047, 47.0025], // Brennerpass
  [11.4442, 46.8964], // Sterzing
  [11.5333, 46.7833], // Freienfeld
  [11.6386, 46.7106], // Brixen
  [11.4531, 46.6153], // Klausen
  [11.3548, 46.4983], // Bozen
];

/** Grobe Stuetzpunkte der A8/A93/A12/A13/A22/A4. */
const MUENCHEN_VENEDIG: LngLat[] = [
  [11.582, 48.1351], // Muenchen
  [11.6167, 47.8667], // Holzkirchen
  [11.8833, 47.7167], // Irschenberg
  [12.1333, 47.6], // Bad Aibling
  [12.0833, 47.4667], // Rosenheim
  [12.0167, 47.3], // Kufstein
  [11.8667, 47.2833], // Woergl
  [11.6167, 47.2833], // Schwaz
  [11.3931, 47.2692], // Innsbruck
  [11.5047, 47.0025], // Brennerpass
  [11.4442, 46.8964], // Sterzing
  [11.6386, 46.7106], // Brixen
  [11.3548, 46.4983], // Bozen
  [11.1167, 46.0667], // Trient
  [10.8833, 45.8833], // Rovereto
  [10.8467, 45.65], // Ala
  [10.9928, 45.4384], // Verona
  [11.5333, 45.4], // Vicenza
  [11.8767, 45.4064], // Padua
  [12.2, 45.45], // Mestre
  [12.3155, 45.4408], // Venedig
];

function report(label: string, line: LngLat[], expectedMatches: number): void {
  console.log(`--- ${label} (Anschluss ${CORRIDOR_DISTANCE_KM} km, Abschweifung ${MAX_DETOUR_DISTANCE_KM} km) ---`);

  const matches = findRoutesAlongCorridor(ROUTES, line);
  for (const match of matches) {
    console.log(
      `      ${match.route.title.padEnd(32)} naechster ${match.nearestDistanceKm.toFixed(1).padStart(6)} km | ` +
        `Start ${match.startDistanceKm.toFixed(1).padStart(6)} km | Ende ${match.endDistanceKm.toFixed(1).padStart(6)} km`
    );
  }

  checkCount(`${label}: Treffer`, matches.length, expectedMatches);
  console.log("");
}

report("Innsbruck -> Bozen", INNSBRUCK_BOZEN, 2);
report("Muenchen -> Venedig", MUENCHEN_VENEDIG, 2);

console.log(failures === 0 ? "Alle Faelle bestanden.\n" : `${failures} Fall/Faelle fehlgeschlagen.\n`);
if (failures > 0) process.exitCode = 1;
