-- EventHub — Database Schema
-- Run this in Supabase: Dashboard → SQL Editor → New query → paste → Run
--
-- Run in this order: types first, then tables, then indexes.
-- If you need to start fresh: drop tables in reverse order before re-running.


-- ============================================================
-- Custom types (enums)
-- ============================================================

create type user_role as enum ('student', 'organiser', 'admin');

create type event_type as enum ('lecture', 'club', 'workshop', 'other');


-- ============================================================
-- Users
-- ============================================================
-- We store our own users table on top of Supabase Auth.
-- The id here matches the user id from Supabase Auth (auth.users).

create table users (
    id          uuid primary key,               -- same id as in Supabase Auth
    email       text unique not null,
    role        user_role not null default 'student',
    full_name   text,
    is_active   boolean not null default true,
    created_at  timestamptz not null default now()
);


-- ============================================================
-- Clubs
-- ============================================================

create table clubs (
    id            uuid primary key default gen_random_uuid(),
    name          text not null,
    description   text,
    organiser_id  uuid references users(id),
    created_at    timestamptz not null default now()
);


-- ============================================================
-- Events
-- ============================================================

create table events (
    id               uuid primary key default gen_random_uuid(),
    title            text not null,
    description      text not null,
    event_type       event_type not null,
    location         text not null,
    starts_at        timestamptz not null,
    ends_at          timestamptz,                -- nullable: some events have no fixed end time
    capacity         integer,                    -- nullable: null means unlimited
    speaker_name     text,                       -- for lectures
    club_id          uuid references clubs(id),  -- nullable: not all events belong to a club
    organiser_id     uuid references users(id) not null,
    cover_image_url  text,
    is_published     boolean not null default false,
    is_cancelled     boolean not null default false,
    created_at       timestamptz not null default now()
);


-- ============================================================
-- Registrations
-- ============================================================
-- One student can register for one event only once.
-- The unique constraint handles duplicate registration attempts.

create table registrations (
    id             uuid primary key default gen_random_uuid(),
    event_id       uuid references events(id) not null,
    student_id     uuid references users(id) not null,
    registered_at  timestamptz not null default now(),

    unique (event_id, student_id)  -- prevents double registration
);


-- ============================================================
-- Audit logs
-- ============================================================
-- Tracks all admin actions: who did what and when.
-- metadata holds extra context as JSON, e.g. {"old_role": "student", "new_role": "organiser"}

create table audit_logs (
    id           uuid primary key default gen_random_uuid(),
    actor_id     uuid references users(id),
    action       text not null,        -- e.g. 'role_changed', 'user_deactivated'
    target_type  text not null,        -- e.g. 'user', 'event'
    target_id    uuid not null,
    metadata     jsonb,
    created_at   timestamptz not null default now()
);


-- ============================================================
-- Indexes
-- ============================================================
-- These make common queries faster, especially as data grows.

create index idx_events_starts_at       on events (starts_at);
create index idx_events_organiser       on events (organiser_id);
create index idx_registrations_event    on registrations (event_id);
create index idx_registrations_student  on registrations (student_id);
create index idx_audit_logs_actor       on audit_logs (actor_id);
create index idx_audit_logs_created_at  on audit_logs (created_at);

-- Composite index for the main listing query: WHERE is_cancelled = false (AND optionally is_published = true)
-- Covers both student view (published only) and organiser/admin view (all non-cancelled).
create index idx_events_list            on events (is_cancelled, is_published, starts_at);

-- Supports filtering by event type
create index idx_events_type            on events (event_type);


-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
-- Supabase requires RLS to be enabled. We handle access control
-- in the backend (FastAPI), so here we just allow the service role
-- full access and block everything else by default.

alter table users         enable row level security;
alter table clubs         enable row level security;
alter table events        enable row level security;
alter table registrations enable row level security;
alter table audit_logs    enable row level security;

-- Service role (used by our backend) bypasses RLS automatically.
-- These policies allow read access via the anon key if needed for testing.
-- In production you'd tighten these or remove them entirely.

create policy "service role full access - users"
    on users for all using (true);

create policy "service role full access - clubs"
    on clubs for all using (true);

create policy "service role full access - events"
    on events for all using (true);

create policy "service role full access - registrations"
    on registrations for all using (true);

create policy "service role full access - audit_logs"
    on audit_logs for all using (true);