<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# IntualityAI Admin - agent guide

Internal operations panel. Next.js 16 (App Router) + TypeScript strict +
Tailwind v4 + shadcn/ui, reading and writing the shared Supabase project with
the **service-role key**.

Read [`README.md`](README.md) for what the app is and where things live, and
[`docs/SECURITY.md`](docs/SECURITY.md) for the authorization model **before**
touching anything under `app/api/`, `lib/auth.ts`, `lib/require-admin.ts`,
`lib/supabase/`, or `middleware.ts`.

## The one thing that must never regress

This app runs every query with the Supabase service-role key, which **bypasses
RLS entirely**. A single unguarded entry point exposes every user's transcripts
and can permanently delete auth accounts. Concretely:

1. **Every `"use server"` action starts with `await requireAdmin()`** - first
   statement, before reading `FormData`, before any Supabase call. It throws on
   failure so a caller that ignores the result still fails closed. Today all 27
   exported actions across the 8 `actions.ts` files do this; keep it at 100%.
2. **`middleware.ts` is a UX layer, not the boundary.** Never move a check out
   of an action and into middleware. Server Actions are addressable POST
   endpoints, matchers silently miss new paths, and CVE-2025-29927 is the
   "attacker skips middleware" vulnerability class.
3. **Never remove a fail-closed branch.** Missing or short `ADMIN_JWT_SECRET`
   → 503 in every environment. Missing `ADMIN_PASSWORD_HASH` in production →
   503. No fallback signing secret, ever - an earlier build shipped
   `"dev-bypass-secret"` as a default and that was a full authentication bypass.
4. **Admin identity never comes from a database row a user can write.**
   `profiles.role` is *data this panel edits*, not input to its authorization
   decision. See `docs/SECURITY.md` §1.
5. **`lib/supabase/client.ts` and `lib/require-admin.ts` import `server-only`.**
   Do not remove those imports; they are the structural guard that turns a
   runtime key leak into a build failure. `lib/auth.ts` deliberately does *not*
   import `server-only` because middleware runs it on the Edge runtime - so keep
   that file free of Node-specific APIs too.

When adding a destructive or privileged action, also call
`auditLog(actor, "<noun>.<verb>", targetId)` from `lib/require-admin.ts`.

## Architecture rules

- **Feature-first.** One folder per domain under `features/`:
  `queries.ts` (pure data access, no React imports), `types.ts`,
  `components/`, `index.ts`. Routes under `app/` stay thin.
- **`features/*/queries.ts` is the only place `supabaseAdmin` is used**, plus
  `app/dashboard/page.tsx`. Client components never import it - they call a
  Server Action.
- Each route's `actions.ts` holds the `"use server"` mutations: guard, validate,
  delegate to a feature query, `revalidatePath`.
- Types live in `types/supabase.ts` (hand-written `Database` interface - there
  are **no** generated Supabase types in this repo; extend it when you touch a
  new table or column).
- Module slugs come from `lib/modules.ts`, never free text. It mirrors
  `MODULE_THEMES` in the `IntualityWeb` repo; changing one means changing both.
- shadcn/ui primitives live in `components/ui/` - treat them as vendored and
  prefer composing over editing.

## Code quality

- TypeScript strict. Avoid `any`; `as` only where a Supabase row shape needs it.
- Validate `FormData` with Zod (zod@4) and return structured field errors. Use
  `app/dashboard/blog/actions.ts` and `app/dashboard/personas/actions.ts` as the
  reference; the older `learn` / `content` / `templates` actions predate this
  and should be brought up rather than copied.
- JSDoc on every exported function, hook, and service. Inline comments explain
  **why**, not what - several security decisions in this repo are only legible
  because the reasoning is recorded next to the code. Keep that habit.
- Every dashboard page sets `export const dynamic = "force-dynamic"`. An
  operations console must not render a build-time snapshot, and the access gate
  is a kill switch where a stale read is dangerous.

## This repo has no migrations

The schema and all RLS policies live in `IntualityWeb/supabase/migrations/`.
If a change here needs a schema change, it belongs in that repo - and if it
touches `app_config`, `profiles`, or `service_role` grants, it is a change to
this app's security model (see `docs/SECURITY.md` §4).

## Honesty about unfinished work

If a feature can't be built (no table, no column), ship an explicit "Coming
soon" empty state and badge it in the sidebar - do not fake it and do not
overload an existing column. Precedents: `/dashboard/content/app-copy`, and
session flagging, which was left unbuilt because `sessions` has no flag column.

Cost figures are **estimates** computed from constants in
`features/costs/lib/cost-calculator.ts`, not vendor invoices. Keep the
`CostEstimateNote` disclosure on any page that shows them.

## Commit convention

`feat:` · `fix:` · `refactor:` · `style:` · `chore:` · `docs:`

## Commands

```bash
npm run dev     # next dev on :3000
npm run build   # production build (type-checks)
npm run lint    # eslint
```

No test suite exists yet. Verify changes by running the app.
