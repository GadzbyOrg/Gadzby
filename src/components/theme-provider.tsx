"use client";

import { useEffect } from "react";

import { THEMES } from "./themes";

const VALID_KEYS = new Set<string>(THEMES.map((t) => t.key).filter(Boolean));

export function ThemeProvider() {
  useEffect(() => {
    const theme = localStorage.getItem("gadzby-theme");
    const mode = localStorage.getItem("gadzby-mode");
    if (theme && VALID_KEYS.has(theme)) {
      document.documentElement.setAttribute("data-theme", theme);
    }
    if (mode === "light") {
      document.documentElement.removeAttribute("data-mode");
    }
  }, []);

  return null;
}
