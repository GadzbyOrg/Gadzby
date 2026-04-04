"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export const THEMES = [
  { key: "",       name: "Ambre",  bg: "#fffbf0", sidebar: "#1e293b", accent: "#f59e0b" },
  { key: "ocean",  name: "Ocean",  bg: "#eff6ff", sidebar: "#0c1a2e", accent: "#06b6d4" },
  { key: "forest", name: "Forest", bg: "#f0fdf4", sidebar: "#052e16", accent: "#84cc16" },
  { key: "sunset", name: "Sunset", bg: "#fff7ed", sidebar: "#431407", accent: "#f97316" },
  { key: "galaxy", name: "Galaxy", bg: "#faf5ff", sidebar: "#1a1030", accent: "#8b5cf6" },
  { key: "rose",   name: "Rose",   bg: "#fff1f2", sidebar: "#1f0613", accent: "#f43f5e" },
] as const;

export function ThemePicker() {
  const [activeKey, setActiveKey] = useState("");

  useEffect(() => {
    setActiveKey(localStorage.getItem("gadzby-theme") ?? "");
  }, []);

  function applyTheme(key: string) {
    if (key) {
      localStorage.setItem("gadzby-theme", key);
      document.documentElement.setAttribute("data-theme", key);
    } else {
      localStorage.removeItem("gadzby-theme");
      document.documentElement.removeAttribute("data-theme");
    }
    setActiveKey(key);
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {THEMES.map((theme) => (
        <button
          key={theme.key || "default"}
          aria-label={theme.name}
          onClick={() => applyTheme(theme.key)}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border p-3 transition-all cursor-pointer",
            activeKey === theme.key
              ? "border-primary-500 bg-primary-500/10"
              : "border-dark-800 hover:border-dark-700"
          )}
        >
          {/* Mini preview: sidebar strip + page bg + accent dot */}
          <div className="flex h-10 w-full overflow-hidden rounded-md">
            <div className="w-1/3 shrink-0" style={{ backgroundColor: theme.sidebar }} />
            <div
              className="flex flex-1 items-end justify-center pb-1"
              style={{ backgroundColor: theme.bg }}
            >
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: theme.accent }}
              />
            </div>
          </div>
          <span className="text-xs font-medium text-gray-400">{theme.name}</span>
        </button>
      ))}
    </div>
  );
}
