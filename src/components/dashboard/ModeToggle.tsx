"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { THEMES } from "@/components/themes";

export function ModeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [activeTheme, setActiveTheme] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsDark(document.documentElement.getAttribute("data-mode") === "dark");
    setActiveTheme(localStorage.getItem("gadzby-theme") ?? "");
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleMode() {
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

  function applyTheme(key: string) {
    if (key) {
      localStorage.setItem("gadzby-theme", key);
      document.documentElement.setAttribute("data-theme", key);
    } else {
      localStorage.removeItem("gadzby-theme");
      document.documentElement.removeAttribute("data-theme");
    }
    setActiveTheme(key);
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Thème et mode"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-900 text-surface-700 transition-colors hover:text-accent-400"
      >
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 flex flex-col gap-2 rounded-xl border border-border bg-surface-900 p-3 shadow-lg w-44">
          {/* Theme swatches */}
          <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
            Thème
          </p>
          <div className="grid grid-cols-6 gap-1.5 px-1">
            {THEMES.map((theme) => (
              <button
                key={theme.key || "default"}
                title={theme.name}
                aria-label={theme.name}
                onClick={() => applyTheme(theme.key)}
                className={cn(
                  "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                  activeTheme === theme.key
                    ? "border-fg scale-110"
                    : "border-transparent hover:border-fg-subtle"
                )}
                style={{ backgroundColor: theme.accent }}
              />
            ))}
          </div>

          <div className="border-t border-border" />

          {/* Mode toggle */}
          <button
            onClick={toggleMode}
            className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-fg-muted hover:bg-elevated hover:text-fg transition-colors"
          >
            <span>{isDark ? "Mode clair" : "Mode sombre"}</span>
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      )}
    </div>
  );
}
