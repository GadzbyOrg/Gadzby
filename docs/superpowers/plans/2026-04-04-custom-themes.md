# Custom Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 colour themes (Ocean, Forest, Sunset, Galaxy, Rose) selectable from the settings page, persisted in `localStorage`.

**Architecture:** CSS custom property overrides on `html[data-theme="X"]` — Tailwind v4 utility classes already reference these vars at runtime. A `ThemeProvider` client component (renders null, runs on mount) reads `localStorage` and sets the attribute. A `ThemePicker` client component in settings writes to `localStorage` and updates the attribute live.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4, React 19, Vitest + Testing Library (jsdom)

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/app/globals.css` | Add 5 `html[data-theme="X"]` CSS blocks |
| Create | `src/components/theme-provider.tsx` | Read localStorage on mount, set `data-theme` on `<html>` |
| Create | `src/components/theme-picker.tsx` | Theme switcher UI for settings page |
| Create | `src/components/__tests__/theme-provider.test.tsx` | Unit tests for ThemeProvider |
| Create | `src/components/__tests__/theme-picker.test.tsx` | Unit tests for ThemePicker |
| Modify | `src/app/layout.tsx` | Mount `<ThemeProvider />` once |
| Modify | `src/app/(dashboard)/settings/page.tsx` | Add "Apparence" section with `<ThemePicker />` |

---

## Task 1: Add theme CSS variables to globals.css

**Files:**
- Modify: `src/app/globals.css`

Each `html[data-theme="X"]` block overrides the same CSS custom properties used by the default `@theme`. Only the variables actually used in the app are redefined: `dark-50/100/200/300/700/800/900/950` and `primary-50` through `primary-950`.

- [ ] **Step 1: Add the 5 theme blocks to the end of `src/app/globals.css`**

Append after the last closing `}`:

```css
/* ── OCEAN ─────────────────────────────────────────── */
html[data-theme="ocean"] {
  --color-dark-50:  #f8fbff;
  --color-dark-100: #eff6ff;
  --color-dark-200: #dbeafe;
  --color-dark-300: #93c5fd;
  --color-dark-700: #1a3a5c;
  --color-dark-800: #0f2744;
  --color-dark-900: #0c1a2e;
  --color-dark-950: #030a14;

  --color-primary-50:  #ecfeff;
  --color-primary-100: #cffafe;
  --color-primary-200: #a5f3fc;
  --color-primary-300: #67e8f9;
  --color-primary-400: #22d3ee;
  --color-primary-500: #06b6d4;
  --color-primary-600: #0891b2;
  --color-primary-700: #0e7490;
  --color-primary-800: #155e75;
  --color-primary-900: #164e63;
  --color-primary-950: #083344;
}

/* ── FOREST ─────────────────────────────────────────── */
html[data-theme="forest"] {
  --color-dark-50:  #f7fef9;
  --color-dark-100: #f0fdf4;
  --color-dark-200: #dcfce7;
  --color-dark-300: #86efac;
  --color-dark-700: #166534;
  --color-dark-800: #14532d;
  --color-dark-900: #052e16;
  --color-dark-950: #020b05;

  --color-primary-50:  #f7fee7;
  --color-primary-100: #ecfccb;
  --color-primary-200: #d9f99d;
  --color-primary-300: #bef264;
  --color-primary-400: #a3e635;
  --color-primary-500: #84cc16;
  --color-primary-600: #65a30d;
  --color-primary-700: #4d7c0f;
  --color-primary-800: #3f6212;
  --color-primary-900: #365314;
  --color-primary-950: #1a2e05;
}

/* ── SUNSET ─────────────────────────────────────────── */
html[data-theme="sunset"] {
  --color-dark-50:  #fffbf5;
  --color-dark-100: #fff7ed;
  --color-dark-200: #fed7aa;
  --color-dark-300: #fdba74;
  --color-dark-700: #9a3412;
  --color-dark-800: #7c2d12;
  --color-dark-900: #431407;
  --color-dark-950: #1c0a00;

  --color-primary-50:  #fff7ed;
  --color-primary-100: #ffedd5;
  --color-primary-200: #fed7aa;
  --color-primary-300: #fdba74;
  --color-primary-400: #fb923c;
  --color-primary-500: #f97316;
  --color-primary-600: #ea580c;
  --color-primary-700: #c2410c;
  --color-primary-800: #9a3412;
  --color-primary-900: #7c2d12;
  --color-primary-950: #431407;
}

/* ── GALAXY ─────────────────────────────────────────── */
html[data-theme="galaxy"] {
  --color-dark-50:  #fefcff;
  --color-dark-100: #faf5ff;
  --color-dark-200: #ede9fe;
  --color-dark-300: #d8b4fe;
  --color-dark-700: #3b0764;
  --color-dark-800: #2e1065;
  --color-dark-900: #1a1030;
  --color-dark-950: #09090f;

  --color-primary-50:  #f5f3ff;
  --color-primary-100: #ede9fe;
  --color-primary-200: #ddd6fe;
  --color-primary-300: #c4b5fd;
  --color-primary-400: #a78bfa;
  --color-primary-500: #8b5cf6;
  --color-primary-600: #7c3aed;
  --color-primary-700: #6d28d9;
  --color-primary-800: #5b21b6;
  --color-primary-900: #4c1d95;
  --color-primary-950: #2e1065;
}

/* ── ROSE ───────────────────────────────────────────── */
html[data-theme="rose"] {
  --color-dark-50:  #fff8f8;
  --color-dark-100: #fff1f2;
  --color-dark-200: #fecdd3;
  --color-dark-300: #fda4af;
  --color-dark-700: #6d1a40;
  --color-dark-800: #4a0d2a;
  --color-dark-900: #1f0613;
  --color-dark-950: #0f0208;

  --color-primary-50:  #fff1f2;
  --color-primary-100: #ffe4e6;
  --color-primary-200: #fecdd3;
  --color-primary-300: #fda4af;
  --color-primary-400: #fb7185;
  --color-primary-500: #f43f5e;
  --color-primary-600: #e11d48;
  --color-primary-700: #be123c;
  --color-primary-800: #9f1239;
  --color-primary-900: #881337;
  --color-primary-950: #4c0519;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add 5 colour theme CSS variable blocks"
```

---

## Task 2: Create ThemeProvider (TDD)

**Files:**
- Create: `src/components/__tests__/theme-provider.test.tsx`
- Create: `src/components/theme-provider.tsx`

- [ ] **Step 1: Create the test file**

Create `src/components/__tests__/theme-provider.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";

import { ThemeProvider } from "../theme-provider";

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("applies theme from localStorage on mount", () => {
    localStorage.setItem("gadzby-theme", "ocean");
    render(<ThemeProvider />);
    expect(document.documentElement.getAttribute("data-theme")).toBe("ocean");
  });

  it("does nothing when localStorage has no theme set", () => {
    render(<ThemeProvider />);
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

```bash
npx vitest run src/components/__tests__/theme-provider.test.tsx
```

Expected: FAIL — `Cannot find module '../theme-provider'`

- [ ] **Step 3: Implement ThemeProvider**

Create `src/components/theme-provider.tsx`:

```tsx
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
```

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
npx vitest run src/components/__tests__/theme-provider.test.tsx
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/theme-provider.tsx src/components/__tests__/theme-provider.test.tsx
git commit -m "feat: add ThemeProvider client component"
```

---

## Task 3: Create ThemePicker (TDD)

**Files:**
- Create: `src/components/__tests__/theme-picker.test.tsx`
- Create: `src/components/theme-picker.tsx`

- [ ] **Step 1: Create the test file**

Create `src/components/__tests__/theme-picker.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";

import { ThemePicker } from "../theme-picker";

describe("ThemePicker", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders all 6 theme buttons", () => {
    render(<ThemePicker />);
    expect(screen.getByText("Ambre")).toBeInTheDocument();
    expect(screen.getByText("Ocean")).toBeInTheDocument();
    expect(screen.getByText("Forest")).toBeInTheDocument();
    expect(screen.getByText("Sunset")).toBeInTheDocument();
    expect(screen.getByText("Galaxy")).toBeInTheDocument();
    expect(screen.getByText("Rose")).toBeInTheDocument();
  });

  it("saves key to localStorage and sets data-theme on click", () => {
    render(<ThemePicker />);
    fireEvent.click(screen.getByRole("button", { name: /ocean/i }));
    expect(localStorage.getItem("gadzby-theme")).toBe("ocean");
    expect(document.documentElement.getAttribute("data-theme")).toBe("ocean");
  });

  it("removes localStorage key and data-theme when default (Ambre) is selected", () => {
    localStorage.setItem("gadzby-theme", "ocean");
    document.documentElement.setAttribute("data-theme", "ocean");
    render(<ThemePicker />);
    fireEvent.click(screen.getByRole("button", { name: /ambre/i }));
    expect(localStorage.getItem("gadzby-theme")).toBeNull();
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npx vitest run src/components/__tests__/theme-picker.test.tsx
```

Expected: FAIL — `Cannot find module '../theme-picker'`

- [ ] **Step 3: Implement ThemePicker**

Create `src/components/theme-picker.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const THEMES = [
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
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npx vitest run src/components/__tests__/theme-picker.test.tsx
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/theme-picker.tsx src/components/__tests__/theme-picker.test.tsx
git commit -m "feat: add ThemePicker component"
```

---

## Task 4: Wire ThemeProvider into root layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Import and render ThemeProvider in the root layout**

In `src/app/layout.tsx`, add the import and mount the component inside `<body>`:

```tsx
import "@mantine/core/styles.css";
import "./globals.css";

import type { Metadata, Viewport } from "next";
import React from "react";

import { ServiceWorkerUnregister } from "@/components/ServiceWorkerUnregister";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Gadzby",
  description: "Borgia 2.0",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/web-app-manifest-192x192.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gadzby",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,400;1,600;1,700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeProvider />
        <ServiceWorkerUnregister />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: mount ThemeProvider in root layout"
```

---

## Task 5: Add Apparence section to settings page

**Files:**
- Modify: `src/app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Add ThemePicker import and Apparence section**

In `src/app/(dashboard)/settings/page.tsx`, add the import at the top and insert the new section between the profile card and the security card:

```tsx
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { AvatarUpload } from "@/components/avatar-upload";
import { ThemePicker } from "@/components/theme-picker";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifySession } from "@/lib/session";

import { ChangePasswordForm } from "./change-password-form";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    with: {
      role: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Mon Profil</h1>
        <p className="mt-2 text-gray-400">Gérez vos informations personnelles</p>
      </div>

      <div className="rounded-xl border border-dark-800 bg-dark-900/50 p-6 shadow-xl backdrop-blur-sm">
        <div className="mb-8 flex items-center gap-4 border-b border-dark-800 pb-8">
          <AvatarUpload user={user} />
          <div>
            <h2 className="text-xl font-semibold text-white">
              {user.prenom} {user.nom}
            </h2>
            <p className="text-sm text-gray-400">@{user.username}</p>
            <div className="mt-2 text-xs font-medium text-primary-400 border border-primary-900/50 bg-primary-900/20 px-2 py-1 rounded-md w-fit">
              {user.role?.name || "Membre"}
            </div>
          </div>
        </div>

        <SettingsForm user={user} />
      </div>

      <div className="mt-8 rounded-xl border border-dark-800 bg-dark-900/50 p-6 shadow-xl backdrop-blur-sm">
        <h2 className="text-xl font-semibold text-white mb-6 pb-4 border-b border-dark-800">
          Apparence
        </h2>
        <ThemePicker />
      </div>

      <div className="mt-8 rounded-xl border border-dark-800 bg-dark-900/50 p-6 shadow-xl backdrop-blur-sm">
        <h2 className="text-xl font-semibold text-white mb-6 pb-4 border-b border-dark-800">
          Sécurité
        </h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run full test suite to confirm nothing is broken**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/settings/page.tsx
git commit -m "feat: add Apparence section with ThemePicker to settings page"
```
