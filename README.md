# IntualityAI Admin

Internal operations panel for the IntualityAI platform. It is a Next.js 16 App
Router app that talks to the **same Supabase project** the end-user web client
and the mobile app use, but with the **service-role key** - so it can read
every row and mutate records no ordinary user is allowed to touch.

It exists so the team can, without a redeploy or a psql session:

- inspect users, sessions and transcripts across all accounts;
- ban, unban, re-role or permanently delete an account;
- publish learn content, blog posts, personas and metric templates;
- see estimated Deepgram / LLM / bridge spend;
- flip the **access gate** - the remote kill switch the web client polls.

## Who may use it

One shared operator credential, not per-person accounts. Access is a single
username + password pair held in environment variables (`ADMIN_USERNAME`,
`ADMIN_PASSWORD_HASH`), which mints a signed 24-hour session cookie. There is
no self-service signup, no password reset, and no user table for admins.

Treat access as equivalent to database superuser: every action in this panel
runs with the Supabase service-role key, which **bypasses Row Level Security
entirely**. Read [`docs/SECURITY.md`](docs/SECURITY.md) before deploying it
anywhere reachable from the internet.

## Three-repo topology

One Supabase project (Postgres + Auth + Storage) is the shared spine. Three
codebases sit on top of it:

| Repo | Role | Supabase key it uses |
|---|---|---|
| `IntualityWeb` | End-user web client: records audio, streams Deepgram, posts transcript chunks to the bridge, renders reports | anon key, per-user session, RLS enforced |
| `admin` (this repo) | Internal operations panel | **service-role key**, server-side only, RLS bypassed |
| `IntualityAssessmentBackend` | Python "bridge" + assessment engine (hosted on Azure); scores transcript chunks and produces final analyses | its own credentials; authenticated by a shared API key |

Cross-repo couplings this panel depends on:

- **`app_config.access_gate`** - written here (Settings page), polled roughly
  every 60s by the web client. This is the version kill switch.
- **`profiles.role`** - written here (Users page). `admin` and `beta` are the
  roles the web client's access gate exempts.
- **`metric_templates`** - written here (Templates page), consumed by both the
  web and mobile clients and by the bridge's scoring prompts.
- **Module slugs** - `lib/modules.ts` mirrors `MODULE_THEMES` in
  `IntualityWeb/src/themes/modules.ts`. Adding a module means editing both.

This repo contains **no** migrations. The schema and all RLS policies live in
`IntualityWeb/supabase/migrations/`.

## Setup from a clean clone

Requires **Node.js >= 20.9** (Next.js 16 engine constraint).

```bash
git clone <this repo> admin
cd admin
npm install
cp .env.local.example .env.local   # then fill it in, see below
npm run dev                        # http://localhost:3000
```

Visiting `/` redirects to `/login`. Sign in with `ADMIN_USERNAME` and your
password, and you land on `/dashboard`.

### Environment variables

All five live in `.env.local` (gitignored; only `.env.local.example` is
committed). Only the Supabase URL is `NEXT_PUBLIC_`, and nothing secret may
ever gain that prefix.

| Variable | Required | What it is |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | The Supabase project URL, e.g. `https://abcd.supabase.co`. Falls back to `http://localhost:54321` (local Supabase CLI stack) when unset, so a missing value surfaces as connection errors rather than a startup error. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Service-role JWT for that project. **Bypasses RLS.** Server-only: `lib/supabase/client.ts` imports `server-only`, so pulling it into a `"use client"` module fails the build. Never expose it to a browser, a log, or a `NEXT_PUBLIC_` name. |
| `ADMIN_JWT_SECRET` | yes | HS256 signing key for the admin session cookie. **Must be at least 32 characters.** Missing or shorter, and every gated route returns 503 - there is deliberately no fallback secret. Generate with `openssl rand -base64 48`. |
| `ADMIN_USERNAME` | no (defaults to `admin`) | The single operator username. |
| `ADMIN_PASSWORD_HASH` | yes in production | Lowercase hex SHA-256 of the operator password. In production a missing value makes `/api/auth/login` return 503; in development only, a missing value enables the literal password `admin`. Generate with:<br>`printf '%s' 'your-password' \| shasum -a 256` |

`/dashboard/settings` renders a live "Configured / Missing" badge for the
first three, which is the fastest way to confirm a deployment picked them up.

### Scripts

```bash
npm run dev     # next dev   - local development server on :3000
npm run build   # next build - production build (also type-checks)
npm run start   # next start - serve the production build
npm run lint    # eslint     - eslint-config-next core-web-vitals + typescript
```

There is no test suite in this repo today.

## Where things live

```
app/                        routes (App Router)
  page.tsx                  / -> redirect to /login
  login/page.tsx            login screen (renders components/login-form.tsx)
  api/auth/login/route.ts   credential check, throttling, mints session cookie
  api/auth/logout/route.ts  clears the session cookie
  dashboard/
    layout.tsx              sidebar + header shell
    page.tsx                overview metrics (reads Supabase directly)
    sessions/               session list, detail, delete action
    users/                  user list, detail, role/ban/delete actions
    costs/                  overview + deepgram / ai-chat / bridge breakdowns
    content/                modules (categories) editor; app-copy (stub)
    learn/                  educational content, psychometric scales, blogs
    blog/                   dedicated blog authoring
    personas/               Persona Atlas CRUD + PDF upload
    templates/              metric_templates CRUD
    settings/               env status + access-gate kill switch
    */actions.ts            "use server" mutations - every one calls requireAdmin()

features/                   one folder per domain, the real logic
  <feature>/queries.ts      pure data access via supabaseAdmin (no React)
  <feature>/types.ts        row and view-model types for that feature
  <feature>/components/     feature-specific UI
  <feature>/index.ts        public surface of the feature

lib/
  auth.ts                   JWT mint/verify (Edge-safe: no server-only import)
  require-admin.ts          requireAdmin() guard + auditLog() - server-only
  supabase/client.ts        the service-role client - server-only
  modules.ts                authoritative module slug list (mirrors the web repo)
  utils.ts                  slugify, reading-time, cn

middleware.ts               redirect-to-login layer; fails closed on misconfig
components/                 shared UI; components/ui/* is shadcn/ui
types/supabase.ts           hand-written Database types (not generated)
hooks/                      use-mobile
```

### Feature map

| Feature | Route | Primary tables / buckets |
|---|---|---|
| `features/users` | `/dashboard/users` | `profiles`, `sessions`, `subscriptions`, `projects`, `conversations`, `messages`, plus the GoTrue auth admin API (ban / delete) |
| `features/sessions` | `/dashboard/sessions` | `sessions`, `profiles`, `transcript_segments`, `chunk_assessments` |
| `features/costs` | `/dashboard/costs/*` | `sessions` (duration, chunk_count), `messages` (token_count) - costs are **estimates** derived from the constants in `features/costs/lib/cost-calculator.ts`, not vendor invoices |
| `features/content` | `/dashboard/content/modules` | `modules`, `user_modules` |
| `features/learn` | `/dashboard/learn/*` | `educational_content`, `psychometric_scales` |
| `features/blog` | `/dashboard/blog` | `blog_posts`, storage bucket `blog-thumbnails` |
| `features/personas` | `/dashboard/personas` | `personas`, storage bucket `persona-atlas` |
| `features/templates` | `/dashboard/templates` | `metric_templates` |
| `features/config` | `/dashboard/settings` | `app_config` (`access_gate` row) |

### Conventions

- `features/*/queries.ts` are pure and React-free; they import `supabaseAdmin`
  and nothing from React. Server Actions and Server Components call them.
- Client components never import `supabaseAdmin`. They call a Server Action.
- Every dashboard page sets `export const dynamic = "force-dynamic"` - an
  operations console must never render a build-time snapshot, and the access
  gate in particular is a kill switch where a stale read is dangerous.
- Mutations validate their `FormData` with Zod (blog and personas do this
  thoroughly; the older learn / templates / content actions cast more loosely).

### Known incomplete surfaces

- **App Copy** (`/dashboard/content/app-copy`) is a stub - there is no copy
  table in Supabase yet. The sidebar labels it "Soon".
- **Flag session for review** is deliberately not implemented; `sessions` has
  no flag column and overloading `status` would corrupt live session state.
- Cost figures are modelled, not billed. See the caveat above.

## Security

See [`docs/SECURITY.md`](docs/SECURITY.md) for the authorization model, what
the service-role key may and may not be used for, the RLS assumptions this app
relies on, and the current list of known gaps.
