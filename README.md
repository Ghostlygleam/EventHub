# EventHub

> A student event management platform built for **De Montfort University Kazakhstan** as part of the **IMAT2718K Integrated Project** module (2025–2026).

EventHub gives students a single place to discover lectures, workshops, and society events on campus. It lets organisers publish and manage their own events from an editorial-style composer, and gives administrators a real-time wire feed of every privileged action across the system.

The project is deployed on Railway and uses a Supabase Postgres database in the Frankfurt region for low-latency access from Kazakhstan.

---

## Highlights

- **Three role-based interfaces**, each with its own visual language and information density:
  - **Campus Pass** (student) — warm, skeuomorphic, magazine-card catalogue with editorial dek under each title.
  - **Editor's Desk** (organiser) — editorial newspaper aesthetic for event publication, with a workflow of statuses (Galley → Live → On Air → Archived → Spiked).
  - **Ops Console** (admin) — technical, monospace, audit-log first.
- **Real-time audit trail** — every privileged mutation (role changes, user deactivation, club founded / amended / disbanded) lands on `/admin/logs` with full per-field diffs.
- **University-grade auth** — passwordless 6-digit OTP sent to verified university emails via Brevo. JWT-based session, 24h TTL, with `is_active` embedded so deactivation propagates without a per-request DB lookup.
- **Optimistic UI with rollback** — TanStack Query throughout; registrations, cancellations, role changes and club amends update instantly and revert on backend rejection.
- **Code-split routes** — students never download the admin or organiser chunks; initial JS bundle is ~110 KB gzipped.

---

## Tech stack

### Frontend
- **React 18 + TypeScript + Vite**
- **React Router v6** with route-level code-splitting via `React.lazy` + `<Suspense>`
- **TanStack Query** for data fetching and optimistic mutations
- **CSS Modules** (one stylesheet per page/component) with **Tailwind v3** + **shadcn/ui** primitives
- **Sonner** for toasts, **Lucide** for icons
- **Typography:** DM Sans (body), DM Serif Display (display), DM Mono (data)

### Backend
- **Python 3.12 + FastAPI + Pydantic v2**
- **SQLAlchemy 2.0 async + asyncpg** against PostgreSQL
- **httpx** for outbound HTTP calls (Brevo)
- **python-jose** for JWT
- **slowapi** for per-IP rate limiting

### Data & external services
- **Supabase PostgreSQL** (Frankfurt — `eu-central-1`) via transaction-mode pooler
- **Brevo** for transactional email (OTP delivery, registration confirmations, cancellation notices)
- **In-memory OTP store** with 10-minute TTL — single-instance; a horizontal-scale deployment would swap this for Redis

### Infrastructure
- **Docker Compose** for local development with separate dev / production targets in the frontend Dockerfile
- **Railway** for production deployment (two services: backend + static frontend)
- Vite production build served via `serve -s` with SPA fallback

---

## Features by role

### Student
- Browse the catalogue with filters (event type, upcoming/past, free-text search) and paginated results.
- Mobile-first event cards with editorial dek pulled from each description; "hosted by" society chip on club events.
- One-tap register / cancel; receive an email confirmation through Brevo.
- "My Events" dashboard tabbed into upcoming and past registrations.

### Organiser
- "Editor's Desk" composer for new events, with status workflow (Galley → Live → Happening → Archived).
- Attach an event to one of their own societies via a `my-societies` dropdown.
- Spike (cancel) action with an explicit confirmation dialog; all registered students receive an email.
- Per-event registrations table with CSV export.

### Admin
- Roster view: change role, deactivate / reactivate users (with an "elevating privileges" dialog when promoting to admin).
- Societies registry: found / amend / disband; soft-delete protected by a 409 if upcoming events are still linked.
- Wire feed of every privileged action: chronological, action-coloured chips, per-field diff for amend operations.

---

## Local development

**Prerequisites:** Docker Desktop, Git.

```bash
git clone https://github.com/Ghostlygleam/EventHub.git
cd EventHub

# Configure secrets locally — never commit .env
cp backend/.env.example backend/.env
# Fill in DATABASE_URL, SUPABASE_*, JWT_SECRET, BREVO_API_KEY, EMAIL_FROM

docker compose up -d --build
```

- Frontend: <http://localhost:3000>
- Backend API: <http://localhost:8000>
- API docs (Swagger): <http://localhost:8000/docs>

### Demo accounts (after seeding)

| Email | Role |
| --- | --- |
| `P2834837@my365.dmu.ac.uk` | Admin |
| `P2893284@my365.dmu.ac.uk` | Organiser |
| `P2897992@my365.dmu.ac.uk` | Student |

With `DEV_AUTH_BYPASS=true`, the OTP code `000000` is always accepted for any university email. The real 6-digit code is also sent through Brevo in parallel, so live email delivery can be demonstrated alongside the fast-login shortcut.

### Seeding the database

```bash
docker run --rm -v "$(pwd)":/sql postgres:17 \
  psql -d "$DATABASE_URL_DIRECT" -f /sql/seed_demo.sql
```

The seed wipes `users / clubs / events / registrations / audit_logs` and re-creates the three demo accounts, two societies (Padel Society + Debate Society), and a 7-week event calendar with 21 entries spanning lectures, workshops, and recurring society sessions.

---

## Production deployment (Railway)

### Backend service

- **Root Directory:** `backend` (Railway auto-detects the Dockerfile)
- **Required environment variables:**
  - `DATABASE_URL` — Supabase pooler URL with `postgresql+asyncpg://` prefix
  - `SUPABASE_URL`, `SUPABASE_KEY` — kept for compatibility; auth flow no longer depends on Supabase Auth
  - `JWT_SECRET` — at least 32 random bytes (64 hex chars)
  - `BREVO_API_KEY`, `EMAIL_FROM` (format: `"Name <verified@sender>"`)
  - `ALLOWED_EMAIL_DOMAINS` (default: `ac.uk,edu`)
  - `CORS_ORIGINS` — comma-separated list including the frontend Railway URL
  - `APP_ENV` (`development` or `production`)
  - `DEV_AUTH_BYPASS` — leave unset (defaults to `false`) for production-grade behaviour; the config validator refuses to start with both `APP_ENV=production` and `DEV_AUTH_BYPASS=true`

### Frontend service

- **Root Directory:** `frontend`
- **Multi-stage Dockerfile:** `builder` stage runs `npm run build`, `production` stage serves the static `dist/` via `serve -s` (SPA fallback) on port 3000.
- **Build-time env:** `VITE_API_URL` — must point at the deployed backend URL. Vite bakes this into the bundle; missing in a production build will throw at module load thanks to the guard in `lib/api.ts`.

---

## Project structure

```
EventHub/
├── backend/
│   ├── core/                # config, database, security, audit, rate limiters
│   ├── models/              # SQLAlchemy ORM (users, clubs, events, registrations, audit_logs)
│   ├── schemas/             # Pydantic request / response shapes
│   ├── routers/             # FastAPI route handlers (auth, events, clubs, registrations, admin)
│   ├── services/            # email (Brevo), otp_store, storage
│   ├── main.py              # app entrypoint, CORS, middleware
│   └── Dockerfile
├── frontend/
│   ├── public/              # static assets (DMU crest)
│   ├── src/
│   │   ├── pages/           # top-level route components
│   │   ├── components/      # reusable UI grouped by domain (admin, events, organiser, dashboard, layout, ui)
│   │   ├── hooks/           # TanStack Query wrappers
│   │   ├── lib/             # API client, type guards, helpers
│   │   └── styles/          # globals.css + design tokens
│   └── Dockerfile           # multi-stage: builder + dev + production
├── docker-compose.yml
├── seed_demo.sql            # clean-slate demo dataset
└── README.md
```

---

## Architectural decisions worth noting

- **Stateless JWT with `is_active` embedded** — removes a per-request Supabase round trip on every protected endpoint. A change to the user's active state propagates within one token cycle (24 h). This reduced per-request latency from 5–7 s to under 1 s on the Frankfurt deployment.
- **Region-matched database** — the Supabase project was moved from `ap-southeast-2` (Sydney) to `eu-central-1` (Frankfurt) for a 3–4× latency improvement from Kazakhstan.
- **Single-sender Brevo over Resend** — chosen because Brevo allows verifying a single email address as a sender, with no domain ownership required. This unblocked email delivery to arbitrary `@my365.dmu.ac.uk` recipients without buying a domain.
- **Code-split admin / organiser routes** — students never download admin chunks; the initial bundle drops from 135 KB to 110 KB gzipped, with admin/organiser pages loaded on first navigation as 4–7 KB gz chunks.
- **Own OTP flow over Supabase Auth** — gives full control of the email template, the recipient policy, and the rate-limiting strategy, without depending on Supabase Auth's project-level email allowlist.

---

## Team

- **Frontend:** Vladislav Karelin (sole developer)
- **Backend:** Viktoriya Turaeva, Mikhail Ogai
- **Module:** IMAT2718K Integrated Project — De Montfort University Kazakhstan, 2025–2026
