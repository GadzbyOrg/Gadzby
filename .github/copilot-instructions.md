# Copilot / Agent Instructions for Gadzby

Short, actionable guidance so an AI coding agent can be immediately productive in this repo.

## Big picture

- This is a Next.js (App Router, Next 16+) app with server components and server actions; UI lives under `src/app` and domain code is organized in `src/features/*`.
- Database: Postgres via Drizzle ORM. Schema files are under `src/db/schema/*`, DB connection in `src/db/index.ts`.
- Business logic is grouped by **feature** (e.g., `users`, `transactions`, `shops`) with patterns:
  - `actions.ts` — server actions and mutations
  - `queries.ts` — read/query helpers
  - `schemas.ts` — Zod schemas for inputs
- Integrations:
  - Email: `src/lib/email.ts` (DB-first `systemSettings.email_config` fallback to env; supports SMTP or Resend)
  - Payments: provider adapters in `src/lib/payments/adapters/*` and factory at `src/lib/payments/factory.ts` (provider selected by `payment_methods.slug` in DB)
  - Webhooks: `app/api/webhooks/payment/route.ts` — providers must verify signature and handlers use DB transactions and row-level locking to avoid double-processing.

## Key development workflows & commands

- Run dev server: `npm run dev` (or `pnpm/bun` equivalents)
- Build: `npm run build` / `npm run start`
- Lint: `npm run lint` (uses `eslint`)
- Migrations: uses `drizzle-kit` — run migrations with `npx drizzle-kit push` (ensure `DATABASE_URL` set)
- Seeds: seed scripts live in `scripts/` and are executed with `tsx`, e.g.:
  - `npx tsx scripts/seed-users.ts`
  - `npx tsx scripts/seed-admin.ts`
- Local env: put secrets in `.env.local`. `src/lib/env.ts` parses and validates these via Zod (required: `DATABASE_URL`, `JWT_SECRET`, etc.)

## Project-specific conventions & patterns (must follow)

- Server Actions wrapper functions (use these):
  - `authenticatedAction(schema, handler, options?)` — use for any action that needs session & permission checks. Located at `src/lib/actions.ts`.
  - `publicAction(schema, handler)` — use for unauthenticated server actions.
  - These wrappers accept either `FormData` (from forms) or plain objects; they auto-parse arrays and return Zod field errors when validation fails.
- Always return the canonical action result shape:
  - Success: `{ success: string, data?: any }`
  - Error: `{ error: string, fieldErrors?: Record<string, string[]> }`
  - The wrappers will return `{ error: 'Données invalides', fieldErrors: ... }` on Zod validation failure automatically
  - Example: `return { success: 'Utilisateur mis à jour avec succès' }` or `return { error: 'Non autorisé' }`.
- Permissions: session contains a `permissions: string[]` array; common strings include `ADMIN_ACCESS`, `MANAGE_USERS`. Use `authenticatedAction(..., { permissions: ['PERM'] })` to enforce.
- Session handling: `createSession`, `verifySession` live in `src/lib/session.ts`. Cookie name: **`tyrion_session`**; JWT expires in 2h. `verifySession()` checks DB for user still active.
- DB changes frequently followed by `revalidatePath(...)` where needed (see `src/features/*/actions.ts`). Use this to trigger Next cache invalidation for SSR pages.
- Transactions: for multi-step money-related or webhook flows, use `db.transaction(...)` and lock rows (see `for('update')` usage) to avoid race conditions.

## Integrations & secrets to be aware of

- Email: `RESEND_API_KEY` for Resend or `SMTP_*` env vars for SMTP (also can be configured in `systemSettings` in DB with key `email_config`). See `src/lib/email.ts`.
- Payments: add new providers by implementing an adapter in `src/lib/payments/adapters` and ensuring a `payment_methods` DB row with `slug` matches factory switch cases.
- Webhook verification must be implemented by provider adapters (see `verifyWebhook` usage in webhook route).

## Code style & small conventions

- Domain-first organization: prefer adding feature-level helpers under `src/features/<feature>`.
- Validation: prefer Zod schemas in `schemas.ts` and wire them into action wrappers (gives consistent error shape).
- Error handling: handlers should return safe strings via the action result shape rather than throwing when possible; thrown errors are caught and converted to `{ error }` by wrappers.
- `use server` is used at the top of server-action files where applicable.

## Files to consult for examples

- Action wrapper + form parsing: `src/lib/actions.ts` ✅
- Session creation/verification: `src/lib/session.ts` ✅
- DB setup: `src/db/index.ts` and `src/db/schema/*` ✅
- Email fallback & provider selection: `src/lib/email.ts` ✅
- Payment factory + adapters: `src/lib/payments/factory.ts` + `src/lib/payments/adapters/*` ✅
- Webhook handler pattern: `src/app/api/webhooks/payment/route.ts` ✅
- Seed scripts: `scripts/seed-*.ts` ✅

## When to open a PR vs making a quick fix

- Small UI/typo fixes that don't change logic: single PR to `main` is fine.
- DB schema changes: create a migration (using Drizzle), run it locally (`npx drizzle-kit push`), and include seed/migration tests if applicable.
- New integrations (email, payments, webhooks): add an adapter + tests and update docs; ensure env vars referenced in `src/lib/env.ts` are validated.

---

If anything above is unclear or you want more examples (e.g., a step-by-step example of adding a new payment provider or expanding a schema + migration), tell me which area and I’ll expand the file with one or two concrete code snippets. ✅
