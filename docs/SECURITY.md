# Security model

How authorization works in the admin panel **as the code stands today**, after
the hardening pass. Anything still weak is listed under
[Known gaps](#known-gaps) rather than glossed over.

The threat this document is written against: this app holds the Supabase
service-role key. Anyone who reaches an authenticated route can read every
user's transcripts, permanently delete auth accounts, and flip the kill switch
that governs the production web client. There is no "read-only admin" tier.

---

## 1. Identity: what an "admin" is here

An admin is **whoever knows the operator password**, not a row in a database.

```
POST /api/auth/login  { username, password }
  -> username must equal ADMIN_USERNAME (default "admin")
  -> SHA-256(password) hex must equal ADMIN_PASSWORD_HASH
  -> mint HS256 JWT { sub: "admin", username } signed with ADMIN_JWT_SECRET
  -> Set-Cookie: intuality-admin-session  (httpOnly, sameSite=strict,
                                           secure in production, 24h)
```

`lib/auth.ts` mints and verifies that token. Three properties matter:

- **No fallback secret.** The module previously defaulted to the literal
  `"dev-bypass-secret"` when `ADMIN_JWT_SECRET` was unset - a published signing
  key. It now throws `AdminAuthNotConfiguredError` instead, and the secret must
  be **at least 32 characters** (an HS256 key shorter than the digest is cheap
  to brute force).
- **Issuer and audience are pinned** to `intuality-admin`, and
  `algorithms: ["HS256"]` is asserted at verify time, so a token minted for
  another service - or an `alg` downgrade - cannot verify here.
- **The payload is validated, not cast.** `verifySessionToken` returns `null`
  unless `sub` and `username` are both non-empty strings. The earlier version
  cast the raw JWT payload straight to `AdminPayload`, so a validly-signed
  token with no `sub` produced an "authenticated" caller with an undefined
  identity.

Every failure mode - bad signature, expiry, wrong issuer, wrong algorithm,
missing claims, missing secret - collapses to `null`. Callers cannot
accidentally treat a partial success as a success.

### Why the admin role does **not** come from a profile row

It would be natural to reuse `public.profiles.role` - the web app already has
`admin` and `beta` roles there. **Do not.** That column is user-writable in
principle and is the wrong trust anchor for this panel:

- The audit confirmed (`AUDIT-FINDINGS.md`, "Access-gate exemption is decided
  client-side from a profile row the user can update") that `profiles` carried
  an RLS `UPDATE` policy scoped to the row's own `id` with **no column
  restriction**. Any signed-in user could run
  `supabase.from('profiles').update({ role: 'admin' })` on themselves from the
  browser console. Had this panel keyed off that column, self-service admin
  would have been one PostgREST call away.
- `IntualityWeb/supabase/migrations/0007_lock_profiles_role_column.sql` closes
  that hole with **column privileges** (RLS cannot express column-level rules):
  the table-level `UPDATE` grant is revoked from `anon`/`authenticated` and
  granted back only on the non-privileged columns, with `role`, `id` and
  `created_at` deliberately excluded. `service_role` is untouched, which is why
  `updateUserRoleAction` still works.
- Even so, a column grant is a *database* control that can be undone by a later
  migration, a schema reset, or a `grant update on public.profiles` typo. The
  admin panel's own gate must not depend on it. Authorization here rests on a
  **secret the operator holds** and a **signature this app verifies**, which is
  independent of anything a user can write.

Consequence to keep in mind: `profiles.role` is *data this panel edits*, never
*input to this panel's authorization decision*. If per-person admin accounts
are ever introduced, they belong in a table with **no** client write policy at
all (or in an identity provider), not in `profiles`.

---

## 2. Two layers, and which one is the boundary

### Layer 1 - `middleware.ts`: redirect-to-login, fails **closed**

```ts
matcher: ["/dashboard/:path*", "/api/((?!auth/).*)"]
```

Order of checks:

1. `isAdminAuthConfigured()` - if `ADMIN_JWT_SECRET` is absent or under 32
   chars, return **503** with an explicit message. This now applies in **every
   environment**. The previous build returned `next()` whenever
   `NODE_ENV !== "production"`, which published the entire dashboard on any
   preview deployment or misconfigured container where the secret was missing.
   A misconfigured deployment is now unusable, not open.
2. No cookie → redirect to `/login`.
3. Cookie present but `verifySessionToken` returns `null` → redirect to
   `/login` **and clear the cookie** (`maxAge: 0`), so a stale or forged token
   does not cause a redirect loop.
4. Otherwise `next()`.

The matcher covers everything under `/dashboard` plus any current or future
`/api` route **except** `/api/auth/*`. Login must stay reachable to
unauthenticated callers; it does its own throttling.

### Layer 2 - `requireAdmin()` in `lib/require-admin.ts`: the actual gate

Middleware is a UX layer, **not** the authorization boundary. Reasons, recorded
in the module's own docblock:

- Server Actions are POST endpoints addressable by action id - they are not
  "inside" a page.
- A matcher that misses a path silently unprotects everything beneath it, and
  the miss is invisible until someone finds it.
- The Next.js middleware-bypass vulnerability class (CVE-2025-29927) is exactly
  "attacker skips middleware, reaches the handler". (This repo runs Next 16.2.5,
  which is past the patched versions, but the design should not depend on that.)

So every mutation enforces authorization at itself:

```ts
export async function deleteUserAction(id: string) {
  const actor = await requireAdmin();          // throws if no valid session
  auditLog(actor, "user.delete", String(id));
  await deleteUserAccount(id);
}
```

`requireAdmin()` reads the cookie via `next/headers`, verifies it, and
**throws** on failure - it does not return a boolean. A caller that forgets to
check the result still fails closed. The module imports `server-only`, so it
can never be pulled into a client bundle.

**Current coverage: all 27 exported Server Actions across all 8 `actions.ts`
files call `requireAdmin()` as their first statement.** That invariant is the
one thing to check in review when an action is added.

`auditLog(actor, action, target, detail?)` writes an attributable
`[admin-audit]` line to the server log for privileged and destructive actions
(`user.delete`, `user.ban`, `user.role_change`, `session.delete`,
`template.delete`, `learn.delete`, `access_gate.update`, blog/persona deletes).
It is deliberately best-effort: a logging failure must never reverse a mutation
the operator asked for.

---

## 3. The service-role key

`lib/supabase/client.ts` creates one client with `SUPABASE_SERVICE_ROLE_KEY`,
`autoRefreshToken: false`, `persistSession: false`, and - critically - the file
begins with:

```ts
import "server-only";
```

That is a structural guard, not a convention: importing this module from any
`"use client"` file **fails the build** rather than leaking the key at runtime.

### Where it may be used

- `features/*/queries.ts` - pure, React-free data access modules.
- Server Components (dashboard pages) that render read-only views.
- `"use server"` Server Actions - **after** `requireAdmin()` has returned.

### Where it may **not** be used

- Any file with `"use client"`, directly or transitively.
- Any Route Handler that is reachable without a verified admin session. Today
  the only unauthenticated handlers are `/api/auth/login` and
  `/api/auth/logout`, and neither touches Supabase.
- Any code path that echoes raw Supabase errors, rows, or the key itself into
  a client response or a shared log sink.
- Anything under a `NEXT_PUBLIC_` environment variable name. Ever.

### What using it actually means

The service role **bypasses RLS entirely**. Practical consequences that the
code relies on and that reviewers must keep in mind:

- Read queries are **not** scoped to a tenant or a user. `getSessions()` returns
  every session in the database. Any filtering is application logic, and a
  missing `.eq()` is a data-exposure bug, not a UX bug.
- `features/users/queries.ts` reaches past PostgREST into the GoTrue admin API:
  `auth.admin.getUserById`, `auth.admin.updateUserById` (ban via
  `ban_duration: "876600h"`, unban via `"none"`), and `auth.admin.deleteUser`.
  Account deletion is permanent and has no undo. Sessions, projects and
  conversation rows are intentionally left behind so historical analytics keep
  working, so they become orphaned rows keyed by a deleted user id unless their
  own FKs cascade.
- Storage writes (`blog-thumbnails`, `persona-atlas`) also run as service role
  and produce **public** URLs. Do not upload anything that is not intended to be
  world-readable.

---

## 4. RLS assumptions this app relies on

This repo ships no migrations; the schema and policies live in
`IntualityWeb/supabase/migrations/`. The admin panel assumes:

1. **RLS is enabled on all public tables.** The platform audit
   (`IntualityWeb/docs/audit-data-security.md` §4) confirms all 20 public tables
   have RLS on. This panel is correct *only because* ordinary users cannot do
   what it does; if RLS were disabled, the anon key in the web client would
   grant much of the same reach.
2. **`app_config` is read-by-all, write-by-service-role-only.** Migration
   `0004_app_config.sql` enables RLS with a `SELECT` policy for `anon` and
   `authenticated` and defines **no** `INSERT`/`UPDATE`/`DELETE` policy. So the
   kill switch is world-readable (the login page needs
   `registrations_enabled` before any session exists) but writable only from
   here. `updateAccessGateAction` is the only writer.
3. **`profiles.role` is not user-writable.** Migration
   `0007_lock_profiles_role_column.sql` revokes the table-level `UPDATE` grant
   from `anon`/`authenticated` and re-grants only non-privileged columns. Note
   the ordering constraint recorded in that file: a table-level grant implies
   every column and Postgres ignores column-level revokes underneath it, so the
   table grant must be dropped **before** columns are granted back. If someone
   re-adds a blanket `grant update on public.profiles`, users can self-promote
   again and the web app's access gate becomes cosmetic.
4. **`service_role` retains full table rights.** Every mutation in this panel
   depends on it. A migration that revokes rights from `service_role` breaks the
   admin panel rather than degrading gracefully.
5. **Storage bucket policies** allow service-role writes to `blog-thumbnails`
   and `persona-atlas`, with public read.

If any of these change, this panel silently changes behaviour - it will not
warn you. Treat migrations touching `app_config`, `profiles`, or `service_role`
grants as changes to this app's security model.

---

## 5. Login hardening

`app/api/auth/login/route.ts`:

- **Throttle:** 5 failures per IP per 15-minute window, tracked in an in-memory
  `Map`, returning 429. Goal is stopping unattended brute force on a
  single-admin panel, not building a WAF.
- **Production fails closed:** with `ADMIN_PASSWORD_HASH` unset and
  `NODE_ENV === "production"`, the route returns 503. The literal-`admin`
  password path is reachable only in development, and the cookie it sets is
  explicitly non-`secure` because that branch cannot run in production.
- **Uniform errors:** unknown username and wrong password both return
  `401 { error: "Invalid credentials." }`, so the response does not confirm
  whether `ADMIN_USERNAME` was guessed correctly.
- **Cookie flags:** `httpOnly`, `sameSite: "strict"`, `secure` in production,
  `path: "/"`, 24-hour `maxAge`. `sameSite: "strict"` is what stands between
  the Server Actions and cross-site request forgery; there is no separate CSRF
  token.

`app/api/auth/logout/route.ts` clears the cookie with `maxAge: 0`.

---

## 6. Known gaps

Honest list of what is still weak. None of these are hypothetical; each is
visible in the current source.

**Authentication**

1. **Password hashing is unsalted SHA-256, not a KDF.** `ADMIN_PASSWORD_HASH`
   is a plain `SHA-256(password)` hex digest, so a leaked hash is trivially
   attacked with a rainbow table or GPU cracking. bcrypt/scrypt/argon2 with a
   per-install salt is the fix.
2. **Hash comparison is `!==` on strings, not constant-time.** A timing oracle
   on a digest comparison is a stretch to exploit over a network, but it is a
   real deviation from the standard practice.
3. **One shared credential, no per-person identity.** `sub` is always the
   literal `"admin"`, so every audit-log line attributes to the same actor.
   There is no way to tell which operator deleted an account, and revoking one
   person's access means rotating the password for everyone.
4. **No session revocation.** Logout only clears the browser cookie. A copied
   token stays valid for its full 24 hours; the only true revocation is
   rotating `ADMIN_JWT_SECRET`, which logs everyone out.
5. **Throttle state is per-process and in-memory.** It resets on restart and
   does not exist across instances, so on a serverless/multi-instance deploy the
   effective limit is 5 failures *per instance per window*.
6. **Throttle key is a spoofable header.** The IP comes from the first entry of
   `x-forwarded-for` with no trusted-proxy validation, so an attacker who varies
   that header gets a fresh bucket each request.
7. **`POST /api/auth/login` calls `await request.json()` unguarded.** A
   malformed body throws and produces a 500 instead of a 400.
8. **No MFA, no IP allowlist.** For a panel with service-role reach, either
   would be a large gain relative to effort. Network-level restriction (Vercel
   deployment protection, a VPN, or Cloudflare Access) is the cheapest.

**Authorization**

9. **Server Components / dashboard pages are protected by middleware only.**
   `requireAdmin()` covers every *mutation*, but read pages such as
   `app/dashboard/page.tsx`, `/dashboard/users`, and `/dashboard/sessions/[id]`
   query Supabase with the service-role key without their own guard. If the
   middleware layer is ever bypassed, mutations still fail closed but
   cross-tenant **reads** would be exposed. Adding `await requireAdmin()` at the
   top of each page (or in `app/dashboard/layout.tsx`) closes it.
10. **No authorization tiers.** Every authenticated operator can permanently
    delete accounts and flip the kill switch. There is no read-only mode and no
    second-person confirmation for destructive actions beyond client-side
    `ConfirmationDialog` UI.
11. **The audit trail is `console.info` only.** `auditLog` writes to the server
    log. There is no durable, queryable, tamper-evident record - log retention
    is whatever the host provides, and an operator with deploy access can drop
    it.

**Configuration and messaging**

12. **`app/page.tsx` still contains a vestigial dev bypass:** when
    `ADMIN_JWT_SECRET` is unset it redirects `/` to `/dashboard` instead of
    `/login`. This no longer grants access - middleware answers `/dashboard`
    with 503 in that state - but it sends operators to a confusing dead end and
    should be deleted.
13. **`/dashboard/settings` still renders "Dev mode (no auth)"** as the badge
    for a missing `ADMIN_JWT_SECRET`. That copy describes the pre-hardening
    behaviour; the app now refuses to serve at all. It should read something
    like "Missing - app disabled".
14. **`lib/supabase/client.ts` falls back to `"placeholder"` / localhost**
    rather than failing fast when `SUPABASE_SERVICE_ROLE_KEY` or
    `NEXT_PUBLIC_SUPABASE_URL` is missing, so misconfiguration shows up as
    confusing per-query errors instead of one clear startup error.
15. **Input validation is uneven.** `blog` and `personas` actions validate
    `FormData` with Zod and return structured field errors; `learn`, `content`,
    and `templates` actions largely `as string`-cast form fields. These run
    behind `requireAdmin()`, so the risk is data corruption and 500s rather than
    privilege escalation - but they write rows the public web client renders.

**Downstream, outside this repo** (tracked here because this panel is the UI
that operators believe controls them):

16. **The access gate is not enforced server-side in the web app.** Flipping
    `mode` to `paid_only` or `maintenance` only changes which React subtree the
    web client renders; the user's Supabase session and the `/api/*` routes keep
    working. The kill switch is advisory, not a shutdown.
17. **`registrations_enabled: false` does not stop sign-ups.** The web app
    enforces it only by hiding the "Create account" tab; `supabase.auth.signUp`
    with the public anon key still succeeds. Closing registrations requires
    disabling public sign-ups in Supabase Auth settings as well.

See `IntualityWeb/AUDIT-FINDINGS.md` for the full write-ups of items 16 and 17.
