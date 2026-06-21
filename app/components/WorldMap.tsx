"use client";

import { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
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
];

export default function WorldMap() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [tooltip, setTooltip] = useState<{ title: string; country: string; x: number; y: number } | null>(null);
  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

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
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 170, center: [13, 30] }}
        viewBox="10 0 720 600"
        style={{ width: "100%", height: "580px", display: "block", marginTop: "-4%" }}
      >
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