"use client";

import { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

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
  { id: "1", title: "Amalfi Coast Road",    country: "Italy",        latitude: 40.6,  longitude: 14.6  },
  { id: "2", title: "Pacific Coast Highway",country: "USA",          latitude: 36.5,  longitude: -121.9 },
  { id: "3", title: "Trollstigen",          country: "Norway",       latitude: 62.4,  longitude: 7.7   },
  { id: "4", title: "Garden Route",         country: "South Africa", latitude: -33.9, longitude: 22.4  },
  { id: "5", title: "North Coast 500",      country: "Scotland",     latitude: 57.8,  longitude: -4.2  },
  { id: "6", title: "Grossglockner",        country: "Austria",      latitude: 47.1,  longitude: 12.8  },
  { id: "7", title: "Ring Road",            country: "Iceland",      latitude: 64.9,  longitude: -18.5 },
  { id: "8", title: "Transfagarasan",       country: "Romania",      latitude: 45.6,  longitude: 24.6  },
];

export default function WorldMap() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [tooltip, setTooltip] = useState<{ title: string; country: string; x: number; y: number } | null>(null);
  const router = useRouter();

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

  return (
    <div style={{ position: "relative", background: "#0c0b09", borderRadius: "20px", border: "1px solid rgba(237,229,212,0.1)", overflow: "hidden" }}>
      <ComposableMap
  projection="geoMercator"
  projectionConfig={{ scale: 115, center: [10, -30] }}
viewBox="0 0 800 380"
  style={{ width: "100%", height: "auto" }}
>
  <Geographies geography={GEO_URL}>
    {({ geographies }) =>
      geographies.map((geo) => (
        <Geography
          key={geo.rsmKey}
          geography={geo}
          style={{
            default: { fill: "#1a1710", stroke: "#2a2518", strokeWidth: 0.5, outline: "none" },
            hover:   { fill: "#221f14", stroke: "#2a2518", strokeWidth: 0.5, outline: "none" },
            pressed: { fill: "#1a1710", outline: "none" },
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
        <circle r={5}  fill="rgba(201,168,106,0.25)" />
        <circle r={3.5} fill="#C9A86A" stroke="rgba(201,168,106,0.6)" strokeWidth={1.5} style={{ cursor: "pointer" }} />
      </Marker>
    ) : null
  ))}
</ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: "absolute",
          left: tooltip.x + 12,
          top: tooltip.y - 40,
          background: "rgba(18,16,10,0.96)",
          border: "1px solid rgba(201,168,106,0.3)",
          borderRadius: "10px",
          padding: "8px 14px",
          pointerEvents: "none",
          zIndex: 100,
          backdropFilter: "blur(12px)",
        }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#EDE5D4", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "3px" }}>{tooltip.title}</div>
          <div style={{ fontSize: "9px", color: "#C9A86A", letterSpacing: "0.15em", textTransform: "uppercase" }}>{tooltip.country}</div>
        </div>
      )}
    </div>
  );
}