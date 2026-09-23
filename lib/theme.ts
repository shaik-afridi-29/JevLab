"use client";

import React from "react";

export type Theme = "light" | "dark";
/** null/undefined = no stored preference, follow the OS. */
export type StoredTheme = Theme | null | undefined;

export const THEME_KEY = "jev-lab-theme";

export function resolveTheme(stored: StoredTheme, systemDark: boolean): Theme {
  if (stored === "light" || stored === "dark") return stored;
  return systemDark ? "dark" : "light";
}

function readStored(): StoredTheme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

function systemDark(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return true;
  }
}

export function applyTheme(t: Theme) {
  document.documentElement.classList.toggle("light", t === "light");
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* private mode etc. — theme just won't persist */
  }
}

/**
 * Theme state. Initialized from the <html> class set pre-paint by the
 * FOUC script in layout.tsx, so server and client render agree.
 */
export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void; resetToSystem: () => void; isSystem: boolean } {
  const [theme, setThemeState] = React.useState<Theme>(() =>
    typeof document === "undefined" ? "dark" : document.documentElement.classList.contains("light") ? "light" : "dark"
  );
  const [isSystem, setIsSystem] = React.useState<boolean>(() =>
    typeof document === "undefined" ? true : readStored() == null
  );

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readStored() == null) {
        const t = resolveTheme(null, mq.matches);
        document.documentElement.classList.toggle("light", t === "light");
        setThemeState(t);
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = React.useCallback((t: Theme) => {
    applyTheme(t);
    setThemeState(t);
    setIsSystem(false);
  }, []);

  const resetToSystem = React.useCallback(() => {
    try {
      localStorage.removeItem(THEME_KEY);
    } catch { /* ignore */ }
    const t = resolveTheme(null, systemDark());
    document.documentElement.classList.toggle("light", t === "light");
    setThemeState(t);
    setIsSystem(true);
  }, []);

  return { theme, setTheme, resetToSystem, isSystem };
}
