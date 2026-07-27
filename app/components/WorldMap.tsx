"use client";

import { useEffect, useRef, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useTheme } from "next-themes";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type Route = {
  id: string;
  title: string;
  country: string;
  latitude?: number;
  longitude?: number;
  image_url?: string;
};

const FALLBACK_MARKERS = [
  { id: "1", title: "Amalfi Coast Road", country: "Italy", latitude: 40.6, longitude: 14.6 },
  { id: "2", title: "Pacific Coast Highway", country: "USA", latitude: 36.5, longitude: -121.9 },
  { id: "3", title: "Trollstigen", country: "Norway", latitude: 62.4, longitude: 7.7 },
  { id: "4", title: "Garden Route", country: "South Africa", latitude: -33.9, longitude: 22.4 },
  { id: "5", title: "North Coast 500", country: "Scotland", latitude: 57.8, longitude: -4.2 },
  { id: "6", title: "Grossglockner", country: "Austria", latitude: 47.1, longitude: 12.8 },
  { id: "7", title: "Ring Road", country: "Iceland", latitude: 64.9, longitude: -18.5 },
  { id: "8", title: "Transfagarasan", country: "Romania", latitude: 45.6, longitude: 24.6 },
  { id: "9", title: "Col de la Bonette", country: "France", latitude: 44.3, longitude: 6.8 },
  { id: "10", title: "Milford Road", country: "New Zealand", latitude: -44.7, longitude: 168.0 },
  { id: "11", title: "D915 Road", country: "Turkey", latitude: 40, longitude: 39.7 },
  { id: "12", title: "Icefields Parkway", country: "Canada", latitude: 51.5, longitude: -116.2 },
  { id: "13", title: "Great Ocean Road", country: "Australia", latitude: -38.6, longitude: 143.1 },
  { id: "14", title: "Denali Highway", country: "USA", latitude: 63.7, longitude: -148.9 },
  { id: "15", title: "Tianmen Mountain Road", country: "China", latitude: 29.4, longitude: 110.5 },
  { id: "16", title: "Leh Manali Highway", country: "India", latitude: 32.2, longitude: 77.1 },
  { id: "17", title: "Sa Calora Road", country: "Spain", latitude: 39.1, longitude: 2.9 },
  { id: "18", title: "Ruta 40", country: "Argentina", latitude: -41.1, longitude: -71.3 },
  { id: "19", title: "Sea to Sky Highway", country: "Canada", latitude: 50.0, longitude: -122.9 },
  { id: "20", title: "Irohazaka Road", country: "Japan", latitude: 36.7, longitude: 139.5 },
];

// Sanfte Ease-Funktion für den automatischen Reset — beschleunigt erst,
// bremst dann sanft ab, statt linear oder abrupt zu springen.
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function WorldMap() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [tooltip, setTooltip] = useState<{ title: string; country: string; x: number; y: number } | null>(null);
  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Mobile: erkennt, ob wir uns unterhalb des mobilen Breakpoints befinden.
  // Nur dort wird die Karte zoom-/pan-bar; auf PC bleibt das Verhalten unverändert.
  const [isMobile, setIsMobile] = useState(false);

  // Mobile: Zoom-/Pan-Zustand für die ZoomableGroup
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([13, 30]);

  // Wird bei jedem Reset auf die Ausgangsansicht hochgezählt und als "key"
  // an die ZoomableGroup übergeben. Das erzwingt einen kompletten Neu-Render
  // der ZoomableGroup, damit deren interne Zoom/Pan-Transform sauber
  // zurückgesetzt wird. Passiert jetzt erst GANZ AM ENDE der Animation
  // (siehe animateResetToOverview), wenn Zoom/Center bereits exakt auf dem
  // Zielwert stehen — der Remount ist dadurch unsichtbar, statt den
  // Reset-Sprung selbst auszulösen.
  const [mapResetKey, setMapResetKey] = useState(0);

  // Animations-Handle für den sanften Reset, damit eine laufende Animation
  // bei einer neuen Geste sauber abgebrochen werden kann.
  const resetAnimRef = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 680px)");
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Beim Verlassen der Komponente eine eventuell noch laufende
  // Reset-Animation abbrechen, um Updates auf unmounted state zu vermeiden.
  useEffect(() => {
    return () => {
      if (resetAnimRef.current) cancelAnimationFrame(resetAnimRef.current);
    };
  }, []);

  // Mobile: ab dieser Zoomstufe werden die Routen-Titel neben den
  // Markern eingeblendet ("reinzoomen auf ein Land zeigt die Routen")
  const LABEL_ZOOM_THRESHOLD = 3.5;

  // Animiert Zoom + Center sanft zur Ausgangsansicht zurück, statt hart zu
  // springen. Läuft über ~450ms mit ease-in-out, damit der Übergang "rund"
  // statt eckig wirkt. Am Ende wird der mapResetKey hochgezählt, um die
  // ZoomableGroup einmal sauber neu zu rendern (Rundungsreste beseitigen)
  // — unsichtbar, da bereits exakt auf dem Zielwert.
  function animateResetToOverview(fromZoom: number, fromCenter: [number, number]) {
    if (resetAnimRef.current) cancelAnimationFrame(resetAnimRef.current);

    const targetZoom = 1;
    const targetCenter: [number, number] = [13, 30];
    const duration = 450;
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeInOutCubic(t);

      setZoom(fromZoom + (targetZoom - fromZoom) * eased);
      setCenter([
        fromCenter[0] + (targetCenter[0] - fromCenter[0]) * eased,
        fromCenter[1] + (targetCenter[1] - fromCenter[1]) * eased,
      ]);

      if (t < 1) {
        resetAnimRef.current = requestAnimationFrame(step);
      } else {
        setZoom(targetZoom);
        setCenter(targetCenter);
        setMapResetKey((k) => k + 1);
        resetAnimRef.current = null;
      }
    };

    resetAnimRef.current = requestAnimationFrame(step);
  }

  function handleMoveEnd(position: { coordinates: [number, number]; zoom: number }) {
    // Komplett rausgezoomt (zoom == minZoom) → sanft zurück zur
    // Ausgangsansicht animieren, damit man wieder die komplette Karte sieht,
    // statt an der letzten (verschobenen) Position "hängen" zu bleiben oder
    // hart dorthin zu springen.
    if (position.zoom <= 1) {
      animateResetToOverview(position.zoom, position.coordinates);
      return;
    }

    setCenter(position.coordinates);
    setZoom(position.zoom);
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    supabase
      .from("routes")
      .select("id, title, country, latitude, longitude, image_url")
      .not("latitude", "is", null)
      .then(({ data }) => {
        if (data && data.length > 0) setRoutes(data);
        else setRoutes(FALLBACK_MARKERS);
      });
  }, []);

  const markers = routes.length > 0 ? routes : FALLBACK_MARKERS;
  const isLight = mounted && theme === "light";

  // Theme-abhängige Map-Farben — dunkel/erdig im Dark-Mode,
  // warmes Creme im Light-Mode, passend zum restlichen Seitendesign.
  const mapColors = isLight
    ? {
        containerBg: "#F4F0E8",
        containerBorder: "rgba(43,38,32,0.14)",
        geoDefault: "#E9E2D2",
        geoStroke: "#D8CFB8",
        geoHover: "#E0D7C2",
        tooltipBg: "rgba(244,240,232,0.97)",
        tooltipBorder: "rgba(201,168,106,0.35)",
        tooltipTitle: "#2B2620",
      }
    : {
        containerBg: "#0c0b09",
        containerBorder: "rgba(255,255,255,0.2)",
        geoDefault: "#1a1710",
        geoStroke: "#2a2518",
        geoHover: "#221f14",
        tooltipBg: "rgba(18,16,10,0.96)",
        tooltipBorder: "rgba(201,168,106,0.3)",
        tooltipTitle: "#EDE5D4",
      };

  return (
    <div style={{
      position: "relative",
      background: mapColors.containerBg,
      overflow: "hidden",
      lineHeight: 0,
      margin: "0 -7%",  // ← schiebt die Karte 8% über den Rand hinaus
      border: `1px solid ${mapColors.containerBorder}`,
      borderRadius: "15px",
      transition: "background .35s, border-color .35s",
    }}>
      {/* Mobile: responsive Höhe für die Karte statt fixer 580px.
          Auf PC bleibt exakt das bisherige Verhalten (580px), nur unterhalb
          von 680px Breite wird die Höhe reduziert, damit die Karte nicht
          riesige Leerflächen erzeugt. */}
      <style>{`
        .wm-composable-map {
          width: 100%;
          height: 580px;
          display: block;
          margin-top: -4%;
        }

        @media (max-width: 680px) {
          .wm-composable-map {
            height: 300px;
            margin-top: 0;
            touch-action: none;
          }
        }

        @media (max-width: 420px) {
          .wm-composable-map {
            height: 260px;
          }
        }
      `}</style>

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 170, center: [13, 30] }}
        viewBox="-130 0 980 600"
        preserveAspectRatio="xMidYMid slice"
        className="wm-composable-map"
      >
        {isMobile ? (
          /* Mobile: zoom-/pan-bare Variante, Pannen ist über translateExtent
             begrenzt. Reinzoomen (Pinch-Geste) blendet ab
             LABEL_ZOOM_THRESHOLD die Routennamen neben den Markern ein —
             quasi "Routen erscheinen, wenn man auf ein Land zoomt". Auf PC
             wird dieser Zweig nie gerendert. */
          <ZoomableGroup
            key={mapResetKey}
            zoom={zoom}
            center={center}
            onMoveEnd={handleMoveEnd}
            minZoom={1}
            maxZoom={7}
            translateExtent={[[-150, -150], [1020, 770]]}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={{
                      default: { fill: mapColors.geoDefault, stroke: mapColors.geoStroke, strokeWidth: 0.5 / zoom, outline: "none" },
                      hover: { fill: mapColors.geoHover, stroke: mapColors.geoStroke, strokeWidth: 0.5 / zoom, outline: "none" },
                      pressed: { fill: mapColors.geoDefault, outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>

            {markers.map((route) => (
              route.latitude && route.longitude ? (
                <Marker
                  key={route.id}
                  coordinates={[route.longitude, route.latitude]}
                  onClick={() => router.push(`/routedetail/${route.id}`)}
                >
                  <circle r={10 / zoom} fill="rgba(201,168,106,0.08)" />
                  <circle r={5 / zoom} fill="rgba(201,168,106,0.25)" />
                  <circle r={3.5 / zoom} fill="#C9A86A" stroke="rgba(201,168,106,0.6)" strokeWidth={1.5 / zoom} style={{ cursor: "pointer" }} />

                  {zoom >= LABEL_ZOOM_THRESHOLD && (() => {
                    // Card-Maße grob an die Textlänge angepasst, im selben
                    // Stil wie der Desktop-Tooltip (Titel fett/uppercase,
                    // Land darunter in Gold, abgerundete Box mit Rahmen).
                    //
                    // "sizeZoom" ist der live-Zoom, aber nach oben gedeckelt.
                    // Ohne Deckel werden die Werte vor der Hochskalierung bei
                    // starkem Reinzoomen so klein, dass die Card auf dem
                    // Bildschirm trotz gleicher Rechnung kleiner/unschärfer
                    // wirkt. Mit dem Deckel bleibt sie ab dieser Zoomstufe
                    // mindestens so groß und wächst darüber hinaus sogar
                    // noch etwas mit, statt zu schrumpfen.
                    const sizeZoom = Math.min(zoom, 4);
                    const titleFontSize = 8.5;
                    const countryFontSize = 6.5;
                    // Breite bewusst großzügig berechnet (großer Faktor pro
                    // Zeichen + fester Mindest-Puffer), damit die Box den
                    // fetten Uppercase-Text nie beschneidet.
                    const longestLine = Math.max(route.title.length, route.country.length + 2);
                    const cardWidth = Math.max(85, longestLine * 5.3 + 14) / sizeZoom;
                    const cardHeight = 31 / sizeZoom;
                    const cardBottom = -10 / sizeZoom;
                    const cardTop = cardBottom - cardHeight;

                    return (
                      <g style={{ pointerEvents: "none" }}>
                        {/* Schatten für mehr Kontrast zum Kartenhintergrund */}
                        <rect
                          x={-cardWidth / 2}
                          y={cardTop + 1 / sizeZoom}
                          width={cardWidth}
                          height={cardHeight}
                          rx={6 / sizeZoom}
                          ry={6 / sizeZoom}
                          fill="rgba(0,0,0,0.18)"
                        />
                        <rect
                          x={-cardWidth / 2}
                          y={cardTop}
                          width={cardWidth}
                          height={cardHeight}
                          rx={6 / sizeZoom}
                          ry={6 / sizeZoom}
                          fill={mapColors.tooltipBg}
                          stroke="#C9A86A"
                          strokeOpacity={0.55}
                          strokeWidth={1 / sizeZoom}
                        />
                        <text
                          textAnchor="middle"
                          x={0}
                          y={cardTop + 13 / sizeZoom}
                          style={{
                            fontFamily: "Inter, system-ui, sans-serif",
                            fontSize: titleFontSize / sizeZoom,
                            fontWeight: 800,
                            letterSpacing: "0.03em",
                            fill: mapColors.tooltipTitle,
                          }}
                        >
                          {route.title.toUpperCase()}
                        </text>
                        <text
                          textAnchor="middle"
                          x={0}
                          y={cardTop + 23 / sizeZoom}
                          style={{
                            fontFamily: "Inter, system-ui, sans-serif",
                            fontSize: countryFontSize / sizeZoom,
                            fontWeight: 800,
                            letterSpacing: "0.06em",
                            fill: "#C9A86A",
                          }}
                        >
                          {route.country.toUpperCase()}
                        </text>
                      </g>
                    );
                  })()}
                </Marker>
              ) : null
            ))}
          </ZoomableGroup>
        ) : (
          <>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={{
                      default: { fill: mapColors.geoDefault, stroke: mapColors.geoStroke, strokeWidth: 0.5, outline: "none" },
                      hover: { fill: mapColors.geoHover, stroke: mapColors.geoStroke, strokeWidth: 0.5, outline: "none" },
                      pressed: { fill: mapColors.geoDefault, outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>

            {markers.map((route) => (
              route.latitude && route.longitude ? (
                <Marker
                  key={route.id}
                  coordinates={[route.longitude, route.latitude]}
                  onClick={() => router.push(`/routedetail/${route.id}`)}
                  onMouseEnter={(e: any) => {
                    const rect = e.target.closest("svg").getBoundingClientRect();
                    setTooltip({
                      title: route.title,
                      country: route.country,
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <circle r={10} fill="rgba(201,168,106,0.08)" />
                  <circle r={5} fill="rgba(201,168,106,0.25)" />
                  <circle r={3.5} fill="#C9A86A" stroke="rgba(201,168,106,0.6)" strokeWidth={1.5} style={{ cursor: "pointer" }} />
                </Marker>
              ) : null
            ))}
          </>
        )}
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: "absolute",
          left: tooltip.x > 600 ? tooltip.x - 160 : tooltip.x + 12,
          top: tooltip.y - 40,
          background: mapColors.tooltipBg,
          border: `1px solid ${mapColors.tooltipBorder}`,
          borderRadius: "10px",
          padding: "10px 14px",
          pointerEvents: "none",
          zIndex: 100,
          backdropFilter: "blur(12px)",
        }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: mapColors.tooltipTitle, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>{tooltip.title}</div>
          <div style={{ fontSize: "9px", color: "#C9A86A", letterSpacing: "0.15em", textTransform: "uppercase" }}>{tooltip.country}</div>
        </div>
      )}
    </div>
  );
}