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
 * Theme state.
 *
 * Initial values are constants matching the server render exactly.
 * Reading the DOM/localStorage during render would emit different HTML
 * on the client (e.g. Sun vs Moon icon) and break hydration, so the
 * stored/OS preference is reconciled in an effect after mount instead.
 * The pre-paint FOUC script in layout.tsx already set the correct
 * <html> class, so there is no flash — only the React state catches up.
 */
export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void; resetToSystem: () => void; isSystem: boolean } {
  const [theme, setThemeState] = React.useState<Theme>("dark");
  const [isSystem, setIsSystem] = React.useState<boolean>(true);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      const stored = readStored();
      const t = resolveTheme(stored, mq.matches);
      document.documentElement.classList.toggle("light", t === "light");
      setThemeState(t);
      setIsSystem(stored == null);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
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
