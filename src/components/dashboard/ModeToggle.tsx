"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ModeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.getAttribute("data-mode") === "dark");
  }, []);

  function toggle() {
    if (isDark) {
      document.documentElement.removeAttribute("data-mode");
      localStorage.setItem("gadzby-mode", "light");
      setIsDark(false);
    } else {
      document.documentElement.setAttribute("data-mode", "dark");
      localStorage.setItem("gadzby-mode", "dark");
      setIsDark(true);
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-900 text-surface-700 transition-colors hover:border-border hover:text-accent-400 shrink-0"
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
