# skl8 Support Platform

skl8 is a Next.js 16 support platform for educational institutions. It includes:

- A customer-facing support experience with a floating chat widget and a full support page
- A human agent queue with severity-first triage, assignment, notes, and resolution tools
- An admin dashboard for queue health, CSAT, escalations, agent workload, and database operations
- An AI support route powered by the OpenAI AI SDK
- A Supabase + Postgres + Redis backend foundation, with demo-mode fallback when credentials are not configured
- A built-in Supabase auth UI for sign-in and customer sign-up, while preserving the existing mock role switcher

## Stack

- Next.js 16 App Router
- React 19
- OpenAI AI SDK
- Supabase Auth + Postgres
- Redis via `ioredis`

## Routes

- `/` landing page + floating support widget + Supabase auth UI
- `/support` learner support workspace
- `/support/agent` human agent console
- `/support/admin` admin KPI dashboard + Postgres operations panel
- `/api/chat` AI streaming support endpoint
- `/api/sessions` Supabase-backed support session persistence endpoint
- `/api/admin/db` admin-only Postgres stats, seed, and clear operations

## Local Development

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm start
```

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values you need.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
REDIS_URL=
OPENAI_API_KEY=
```

### What each variable does

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: browser/server publishable key for auth and RLS-backed reads/writes
- `SUPABASE_SERVICE_ROLE_KEY`: reserved for future admin/server automation work
- `REDIS_URL`: Redis connection string for rate limiting and transient support state
- `OPENAI_API_KEY`: required for `/api/chat`

## Demo Mode vs Backend Mode

This repo supports two operating modes:

### Demo mode

If Supabase is not configured, the app falls back to local demo behavior:

- mock role switching
- seeded support sessions
- localStorage-backed session persistence
- the AI chat route still works if `OPENAI_API_KEY` is present

### Backend mode

If Supabase is configured and the user is signed in:

- auth resolves through Supabase
- the landing page exposes sign-in and sign-up UI
- route gating uses the signed-in user role from `profiles`
- support sessions load and persist through `/api/sessions`
- the admin dashboard can inspect Postgres stats and run basic data operations through `/api/admin/db`
- Next.js `proxy.ts` refreshes auth cookies for SSR-compatible access
- Redis rate limiting protects `/api/chat` when `REDIS_URL` is set

## Supabase Setup

1. Create a Supabase project.
2. Run the SQL in [schema.sql](/E:/skl8/supabase/schema.sql).
3. If your Supabase project predates the RAG update, run [knowledge-rag-patch.sql](/E:/skl8/supabase/knowledge-rag-patch.sql) or re-run the full [schema.sql](/E:/skl8/supabase/schema.sql).
4. Optional but recommended for demos: run the SQL in [seed.sql](/E:/skl8/supabase/seed.sql).
5. Add the Supabase env vars to `.env.local`.
6. Restart the dev server.

### Seeded demo users

If you run [seed.sql](/E:/skl8/supabase/seed.sql), these auth users and roles are created:

- `ava.learner@skl8.demo` / `Password123!` / `customer`
- `jordan.agent@skl8.demo` / `Password123!` / `agent`
- `priya.admin@skl8.demo` / `Password123!` / `admin`

The seed also inserts realistic support sessions for the learner profile so the agent queue and admin dashboard are populated immediately.

## Auth UI

The landing page now contains a Supabase auth panel that supports:

- sign in with email and password
- customer sign-up
- sign out
- backend readiness status
- keeping the existing mock role switcher available when Supabase is not active

## Database Operations UI

The admin dashboard now includes a Postgres operations panel for admins. It can:

- load profile and support-session counts from Supabase
- inspect recent profiles and recent support sessions
- seed sample support sessions into Postgres
- clear support sessions from Postgres
- refresh the in-app session dataset after database operations

## Database Design

The initial persisted model is intentionally simple and optimized for migration speed:

- `profiles`
  - one row per authenticated user
  - stores `role` and display name
- `support_sessions`
  - stores title, owner, satisfaction, and timestamps
  - stores `messages` as `jsonb`
  - stores `agent_case` as `jsonb`

This keeps the current UI moving without a full relational ticket/message refactor yet. A later migration can split messages, attachments, ratings, and case events into dedicated tables.

## RLS Model

The SQL schema includes row-level security policies for the three app roles:

- `customer`: can manage only their own support sessions
- `agent`: can read and update all support sessions
- `admin`: can read all sessions, update all sessions, delete sessions, and update user roles in `profiles`

New sign-ups are intentionally created as `customer`, and the schema prevents users from self-promoting to `agent` or `admin` through their own profile row.

## Redis Usage

Redis is currently used for chat request rate limiting on `/api/chat`.

Current behavior:

- if `REDIS_URL` is present, requests are limited per client IP
- if Redis is not configured, the limiter becomes a safe no-op

Redis is the right place for future additions like:

- queue counters
- agent presence
- typing indicators
- short-lived cache entries
- background job coordination

## Important Files

- [app/page.tsx](/E:/skl8/app/page.tsx)
- [app/components/AuthPanel.tsx](/E:/skl8/app/components/AuthPanel.tsx)
- [app/components/DatabaseOperationsPanel.tsx](/E:/skl8/app/components/DatabaseOperationsPanel.tsx)
- [app/api/admin/db/route.ts](/E:/skl8/app/api/admin/db/route.ts)
- [app/api/chat/route.ts](/E:/skl8/app/api/chat/route.ts)
- [app/api/sessions/route.ts](/E:/skl8/app/api/sessions/route.ts)
- [app/lib/session-utils.ts](/E:/skl8/app/lib/session-utils.ts)
- [app/lib/supabase/browser.ts](/E:/skl8/app/lib/supabase/browser.ts)
- [app/lib/supabase/server.ts](/E:/skl8/app/lib/supabase/server.ts)
- [app/lib/rate-limit.ts](/E:/skl8/app/lib/rate-limit.ts)
- [hooks/useAppAuth.ts](/E:/skl8/hooks/useAppAuth.ts)
- [hooks/useSessions.ts](/E:/skl8/hooks/useSessions.ts)
- [proxy.ts](/E:/skl8/proxy.ts)
- [schema.sql](/E:/skl8/supabase/schema.sql)
- [seed.sql](/E:/skl8/supabase/seed.sql)

## Current Limitations

- There is not yet a dedicated password reset or email verification screen
- Session persistence uses a single `support_sessions` table with JSON payloads, not a fully normalized schema
- Attachments and storage are not wired yet
- Agent/admin analytics still run from the session dataset rather than dedicated warehouse-style reporting tables

## Recommended Next Steps

1. Add password reset and verification UX for Supabase auth.
2. Add attachment upload support with Supabase Storage.
3. Normalize `messages`, `attachments`, `ratings`, and `case_events` into separate tables.
4. Add Redis-backed presence, queue counters, and live agent state.
5. Add server-side admin reporting views or materialized views for KPI queries.

