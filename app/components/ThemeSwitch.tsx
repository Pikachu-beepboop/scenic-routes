"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/**
 * Glasmorpher Theme-Switch im Apple-Stil.
 * Nutzt next-themes für die Logik, das Styling kommt über die CSS-Klassen
 * .theme-switch / .theme-switch-knob, die im <style>-Block der jeweiligen
 * Seite definiert sind (kein Tailwind nötig — passt sich so an Seiten an,
 * die ihr eigenes CSS-System haben, wie die Homepage).
 */
export function ThemeSwitch() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Erst nach dem Mount kennen wir das echte Theme (SSR-Hydration).
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="theme-switch-placeholder" aria-hidden="true" />;
    }

    const isLight = theme === "light";

    return (
        <button
            type="button"
            role="switch"
            aria-checked={isLight}
            aria-label={isLight ? "Zu Dark Mode wechseln" : "Zu Light Mode wechseln"}
            onClick={() => setTheme(isLight ? "dark" : "light")}
            className="theme-switch"
        >
            <span className={`theme-switch-knob ${isLight ? "is-light" : ""}`}>
                {isLight ? (
                    <svg
                        className="theme-switch-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#C9A86A"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                    </svg>
                ) : (
                    <svg
                        className="theme-switch-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0c0b09"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                )}
            </span>
        </button>
    );
}