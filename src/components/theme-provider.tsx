"use client";

import { useEffect } from "react";

export function ThemeProvider() {
  useEffect(() => {
    const theme = localStorage.getItem("gadzby-theme");
    if (theme) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, []);

  return null;
}
