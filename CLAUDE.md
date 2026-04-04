# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gadzby is a Next.js fullstack app (App Router, Next 16+) for managing "boquettes" (student shops) at Arts et Métiers engineering schools. It handles transactions, inventory, events, user roles, and payment integrations (Lydia, SumUp, HelloAsso).

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm test             # Vitest (jsdom environment)
npx drizzle-kit push # Apply schema changes to DB (needs DATABASE_URL)
npm run db:reset     # Drop and recreate DB with seed data (dev only)
npx tsx scripts/seed-users.ts  # Run individual seed scripts
```

Run a single test file: `npx vitest run src/path/to/file.test.ts`

## Architecture

### Directory Layout

- `src/app/` — Next.js App Router pages and API routes. All routes live under `(dashboard)/`.
- `src/features/<feature>/` — Domain logic grouped by feature (e.g. `users`, `transactions`, `shops`, `famss`). Each feature contains:
  - `actions.ts` — server actions (mutations)
  - `queries.ts` — read helpers
  - `schemas.ts` — Zod input schemas
- `src/db/schema/` — Drizzle ORM table definitions; `index.ts` re-exports all
- `src/db/index.ts` — DB connection
- `src/lib/` — Cross-cutting utilities: `actions.ts` (wrappers), `session.ts`, `email.ts`, `env.ts` (Zod-validated env vars), `payments/`
- `scripts/` — Seed and setup scripts run via `tsx`

### Server Actions Pattern

All mutations go through wrapper functions in `src/lib/actions.ts`:

- `authenticatedAction(schema, handler, options?)` — enforces session + permissions
- `publicAction(schema, handler)` — for unauthenticated actions

Canonical return shapes:
- Success: `{ success: string, data?: any }`
- Error: `{ error: string, fieldErrors?: Record<string, string[]> }`

Permission strings (e.g. `ADMIN_ACCESS`, `MANAGE_USERS`) come from `session.permissions[]`. Pass them via `{ permissions: ['PERM'] }` in the options argument.

### Session

- `createSession` / `verifySession` in `src/lib/session.ts`
- Cookie: `tyrion_session` (JWT, 2h expiry)
- `verifySession()` checks DB to confirm user is still active

### Payments

Provider adapters live in `src/lib/payments/adapters/`. Factory at `src/lib/payments/factory.ts` selects provider based on `payment_methods.slug` in DB. Webhook handler: `src/app/api/webhooks/payment/route.ts` — uses DB transactions and row-level locking (`for('update')`) to prevent double-processing.

### DB Conventions

- Schema changes: edit `src/db/schema/*`, then run `npx drizzle-kit push`
- After mutations, call `revalidatePath(...)` to bust Next.js cache
- Multi-step financial flows must use `db.transaction(...)` with row locks

### Email

Configured DB-first via `systemSettings.email_config`, falling back to env vars. Supports SMTP or Resend. See `src/lib/email.ts`.

## Environment Variables

Required in `.env.local`:
```
DATABASE_URL="postgres://..."
JWT_SECRET="..."
NEXT_PUBLIC_APP_URL="https://..."
CAMPUS_NAME="developpement"
```

Optional: `RESEND_API_KEY` or `SMTP_*` vars for email. All env vars are validated via Zod in `src/lib/env.ts`.

## Adding New Features

- **New payment provider**: implement adapter in `src/lib/payments/adapters/`, add case to factory, add `payment_methods` DB row
- **New server action**: use `authenticatedAction`/`publicAction` wrappers, define Zod schema in feature `schemas.ts`
- **DB schema change**: edit `src/db/schema/`, run `npx drizzle-kit push`, update seeds if needed
