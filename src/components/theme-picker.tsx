"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { THEMES } from "./themes";

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
              ? "border-accent-500 bg-accent-500/10"
              : "border-border hover:border-border"
          )}
        >
          {/* Mini preview */}
          <div className="flex h-12 w-full overflow-hidden rounded-lg" style={{ backgroundColor: theme.darkBg }}>
            {/* Sidebar strip */}
            <div className="w-1/4 shrink-0" style={{ backgroundColor: theme.darkSidebar }} />
            {/* Content area */}
            <div className="flex flex-1 flex-col gap-1 p-1.5">
              {/* Accent bar */}
              <div className="h-1 w-full rounded-full" style={{ backgroundColor: theme.accent }} />
              {/* Fake card rows */}
              <div className="h-1 w-3/4 rounded-full opacity-30" style={{ backgroundColor: theme.accent }} />
              <div className="h-1 w-1/2 rounded-full opacity-20" style={{ backgroundColor: theme.accent }} />
            </div>
          </div>
          <span className="text-xs font-medium text-fg-muted">{theme.name}</span>
        </button>
      ))}
    </div>
  );
}
