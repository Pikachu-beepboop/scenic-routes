"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type DistanceUnit = "km" | "mi";

interface UnitContextValue {
  unit: DistanceUnit;
  setUnit: (u: DistanceUnit) => void;
}

const UnitContext = createContext<UnitContextValue>({
  unit: "km",
  setUnit: () => {},
});

const STORAGE_KEY = "distanceUnit";

export function UnitProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<DistanceUnit>("km");

  // Beim ersten Laden die gespeicherte Einheit aus localStorage übernehmen
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "km" || saved === "mi") {
      setUnitState(saved);
    }
  }, []);

  const setUnit = (u: DistanceUnit) => {
    setUnitState(u);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, u);
    }
  };

  return (
    <UnitContext.Provider value={{ unit, setUnit }}>
      {children}
    </UnitContext.Provider>
  );
}

// Hook, um in jeder Client-Komponente auf die aktuelle Einheit zuzugreifen
export function useUnit() {
  return useContext(UnitContext);
}