-- ─────────────────────────────────────────────────────────────────
-- EventHub demo seed — clean slate for live demo / submission
-- 3 users (admin / organiser / student), 2 societies (Padel + Debate),
-- 21 events spread across ~7 weeks (27 May → 15 Jul 2026).
-- ─────────────────────────────────────────────────────────────────

BEGIN;

-- ─── Wipe everything ─────────────────────────────────────────────
TRUNCATE audit_logs, registrations, events, clubs, users RESTART IDENTITY CASCADE;

-- ─── Three demo accounts ─────────────────────────────────────────
INSERT INTO users (id, email, full_name, role, is_active, created_at) VALUES
  ('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'P2834837@my365.dmu.ac.uk', 'Vladislav Komarov', 'admin',     true, NOW() - INTERVAL '30 days'),
  ('bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'P2893284@my365.dmu.ac.uk', 'Maria Tsoy',        'organiser', true, NOW() - INTERVAL '25 days'),
  ('cccc3333-cccc-cccc-cccc-cccccccccccc', 'P2897992@my365.dmu.ac.uk', 'Aizhan Bekova',     'student',   true, NOW() - INTERVAL '20 days');

-- ─── Two societies, both owned by the organiser ──────────────────
INSERT INTO clubs (id, name, description, owner_id, is_active, created_at) VALUES
  ('dddd4444-dddd-dddd-dddd-dddddddddddd',
   'Padel Society',
   'Weekly padel sessions for DMU Kazakhstan students. Beginners welcome — racquets and balls are provided, no prior experience needed. Sessions run every Wednesday evening at Maqsat Sports Hall, with monthly knockout tournaments and a seasonal open-doubles ladder.',
   'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   true,
   NOW() - INTERVAL '20 days'),

  ('eeee5555-eeee-eeee-eeee-eeeeeeeeeeee',
   'Debate Society',
   'Tuesday-evening discussions for students who like to argue with their thinking before their voice. British Parliamentary format, mixed-skill rounds, and inter-faculty showdowns. Newcomers get a starter pack and a buddy round; no debating experience required.',
   'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   true,
   NOW() - INTERVAL '12 days');

-- ─── Standalone organiser events (lectures + workshops) ──────────
INSERT INTO events
  (id, title, description, event_type, location, starts_at, ends_at,
   capacity, speaker_name, club_id, organiser_id, cover_image_url,
   is_published, is_cancelled, created_at)
VALUES
  -- May 28 — original
  ('e1111111-1111-1111-1111-111111111111',
   'Intro to Machine Learning',
   'Foundational lecture covering supervised vs unsupervised learning, the role of training data, and the practical pipeline from raw input to a deployed model. No prior maths required — examples will use Python and scikit-learn.',
   'lecture', 'Room 101',
   '2026-05-28 14:00+05', '2026-05-28 16:00+05',
   50, 'Dr. Aigerim Smith',
   NULL, 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
   true, false, NOW() - INTERVAL '7 days'),

  ('e2222222-2222-2222-2222-222222222222',
   'Python Workshop: FastAPI in Practice',
   'Hands-on workshop building a small REST API with FastAPI and SQLAlchemy async. By the end you will have a working endpoint, request validation with Pydantic, and a basic test. Laptops required, Python 3.11+.',
   'workshop', 'Lab 3',
   '2026-05-29 15:00+05', '2026-05-29 18:00+05',
   20, 'Vladislav Komarov',
   NULL, 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
   true, false, NOW() - INTERVAL '6 days'),

  ('e3333333-3333-3333-3333-333333333333',
   'Web Security Fundamentals',
   'Open lecture on the OWASP Top 10, with live demos of XSS, SQL injection, and CSRF. We will look at how real frameworks defend against each, and where developer assumptions still leak through.',
   'lecture', 'Maqsat Auditorium',
   '2026-06-01 11:00+05', '2026-06-01 13:00+05',
   80, 'Dr. Rohit Patel',
   NULL, 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
   true, false, NOW() - INTERVAL '5 days'),

  ('e4444444-4444-4444-4444-444444444444',
   'Figma for Engineers',
   'Workshop aimed at developers who end up in Figma on cross-functional projects. Covers components, auto-layout, dev-mode handoff, and how to read a designer''s file without breaking it.',
   'workshop', 'Studio A',
   '2026-06-04 16:00+05', '2026-06-04 18:30+05',
   24, 'Maria Tsoy',
   NULL, 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
   true, false, NOW() - INTERVAL '4 days'),

  -- June 22 → July 15: extended catalogue
  ('e5555555-5555-5555-5555-555555555555',
   'Git for Teams: Beyond Pull and Push',
   'Workshop on the parts of Git that everyone uses badly: rebase vs merge, interactive history rewriting, recovering lost commits with reflog, and a clean PR workflow for a small team. Bring a laptop with Git installed.',
   'workshop', 'Lab 2',
   '2026-06-22 14:00+05', '2026-06-22 17:00+05',
   24, 'Mikhail Volkov',
   NULL, 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
   true, false, NOW() - INTERVAL '3 days'),

  ('e6666666-6666-6666-6666-666666666666',
   'Statistics for Data Storytelling',
   'A practitioner''s lecture on the small handful of statistical ideas you actually need to read a chart honestly: distributions, confidence intervals, base rates, and the difference between correlation and causation. Examples from real journalism.',
   'lecture', 'Room 204',
   '2026-06-25 11:00+05', '2026-06-25 13:00+05',
   60, 'Dr. Aigerim Smith',
   NULL, 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
   true, false, NOW() - INTERVAL '3 days'),

  ('e7777777-7777-7777-7777-777777777777',
   'Public Speaking for Engineers',
   'Workshop for students who would rather write a deploy script than give a 5-minute talk. Concrete techniques for structure, pacing, and handling the "what about X?" question — followed by a low-stakes 90-second round where everyone presents.',
   'workshop', 'Studio A',
   '2026-07-06 15:00+05', '2026-07-06 17:30+05',
   18, 'Dr. Rohit Patel',
   NULL, 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
   true, false, NOW() - INTERVAL '2 days'),

  ('e8888888-8888-8888-8888-888888888888',
   'UX Research Methods: Five Studies in Two Hours',
   'Workshop running five lightweight research methods back-to-back: card sort, first-click test, five-second test, guerrilla interview, and a heuristic walkthrough. Each one ends in a one-page findings doc.',
   'workshop', 'Studio B',
   '2026-07-08 16:00+05', '2026-07-08 19:00+05',
   16, 'Maria Tsoy',
   NULL, 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
   true, false, NOW() - INTERVAL '2 days'),

  ('e9999999-9999-9999-9999-999999999999',
   'Modern JavaScript Frameworks Compared',
   'Lecture comparing React, Vue, Svelte, and Solid on the dimensions that actually matter for student projects: mental model, build complexity, bundle size, and ecosystem maturity. No tribal allegiance, just trade-offs.',
   'lecture', 'Room 101',
   '2026-07-13 11:00+05', '2026-07-13 13:00+05',
   60, 'Vladislav Komarov',
   NULL, 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
   true, false, NOW() - INTERVAL '1 day'),

  ('eaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Quantum Computing: A Gentle Tour',
   'End-of-term open lecture on what quantum computers actually do, what they don''t, and what the next decade looks like through the lens of someone who builds them. Aimed at curious students with a maths-A-level background.',
   'lecture', 'Maqsat Auditorium',
   '2026-07-15 14:00+05', '2026-07-15 16:00+05',
   100, 'Dr. Yerlan Karimov',
   NULL, 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
   true, false, NOW() - INTERVAL '1 day');

-- ─── Padel Society — Wednesday evenings ──────────────────────────
INSERT INTO events
  (id, title, description, event_type, location, starts_at, ends_at,
   capacity, speaker_name, club_id, organiser_id, cover_image_url,
   is_published, is_cancelled, created_at)
VALUES
  ('c1111111-1111-1111-1111-111111111111',
   'Padel Wednesdays: Welcome Session',
   'Kickoff session for the new term. Quick rules walkthrough for first-timers, then mixed-doubles rotations. Racquets and balls provided — just bring trainers and water.',
   'club', 'Maqsat Sports Hall',
   '2026-05-27 19:00+05', '2026-05-27 21:00+05',
   12, 'Vladislav Komarov',
   'dddd4444-dddd-dddd-dddd-dddddddddddd',
   'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
   true, false, NOW() - INTERVAL '14 days'),

  ('c2222222-2222-2222-2222-222222222222',
   'Padel Wednesdays: Open Doubles',
   'Standard weekly session — open-doubles rotation across mixed skill levels. Drop in even if you missed week one. Equipment provided, bring water.',
   'club', 'Maqsat Sports Hall',
   '2026-06-03 19:00+05', '2026-06-03 21:00+05',
   16, 'Vladislav Komarov',
   'dddd4444-dddd-dddd-dddd-dddddddddddd',
   'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
   true, false, NOW() - INTERVAL '14 days'),

  ('c3333333-3333-3333-3333-333333333333',
   'Padel Wednesdays: Tournament Night',
   'Monthly knockout — pairs drawn on the night, single-elimination through to a final. Spectators welcome, refreshments provided. Last week''s winners get first seeding.',
   'club', 'Maqsat Sports Hall',
   '2026-06-10 19:00+05', '2026-06-10 21:30+05',
   20, 'Vladislav Komarov',
   'dddd4444-dddd-dddd-dddd-dddddddddddd',
   'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
   true, false, NOW() - INTERVAL '14 days'),

  ('c4444444-4444-4444-4444-444444444444',
   'Padel Wednesdays: Mixed Doubles Night',
   'Themed week — randomised mixed-doubles pairings change every set, so you play with three different partners across the night. Casual, social, no ladder pressure.',
   'club', 'Maqsat Sports Hall',
   '2026-06-17 19:00+05', '2026-06-17 21:00+05',
   16, 'Vladislav Komarov',
   'dddd4444-dddd-dddd-dddd-dddddddddddd',
   'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
   true, false, NOW() - INTERVAL '10 days'),

  ('c5555555-5555-5555-5555-555555555555',
   'Padel Wednesdays: Beginner Drill Night',
   'Coached half-hour drill block (volleys, glass play, the bandeja) followed by mini-matches. Aimed at players in their first month — but anyone wanting to clean up technique is welcome.',
   'club', 'Maqsat Sports Hall',
   '2026-06-24 19:00+05', '2026-06-24 21:00+05',
   12, 'Vladislav Komarov',
   'dddd4444-dddd-dddd-dddd-dddddddddddd',
   'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
   true, false, NOW() - INTERVAL '8 days'),

  ('c6666666-6666-6666-6666-666666666666',
   'Padel Wednesdays: Championship Qualifier',
   'Qualifying round for the end-of-term Maqsat Cup. Pairs play three short sets; top four pairs advance to the final. Sign-ups close 24 h before — show up, don''t flake.',
   'club', 'Maqsat Sports Hall',
   '2026-07-01 19:00+05', '2026-07-01 21:30+05',
   20, 'Vladislav Komarov',
   'dddd4444-dddd-dddd-dddd-dddddddddddd',
   'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
   true, false, NOW() - INTERVAL '6 days'),

  ('c7777777-7777-7777-7777-777777777777',
   'Padel Wednesdays: Summer Finals',
   'The Maqsat Cup final and consolation matches. Crimson tape, mock trophies, and a small after-party at the Maqsat café. Spectators very welcome — sign up to reserve a seat.',
   'club', 'Maqsat Sports Hall',
   '2026-07-08 19:00+05', '2026-07-08 22:00+05',
   40, 'Vladislav Komarov',
   'dddd4444-dddd-dddd-dddd-dddddddddddd',
   'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
   true, false, NOW() - INTERVAL '5 days');

-- ─── Debate Society — Tuesday evenings ───────────────────────────
INSERT INTO events
  (id, title, description, event_type, location, starts_at, ends_at,
   capacity, speaker_name, club_id, organiser_id, cover_image_url,
   is_published, is_cancelled, created_at)
VALUES
  ('d1111111-1111-1111-1111-111111111111',
   'Debate Tuesdays: Founding Resolution',
   'Inaugural meeting. After a 10-minute society charter walkthrough, the floor opens on the founding resolution — "This House believes generative AI should never be credited as an author." Newcomers get a primer on speaking order.',
   'club', 'Library Mezzanine',
   '2026-06-16 18:00+05', '2026-06-16 20:00+05',
   30, 'Maria Tsoy',
   'eeee5555-eeee-eeee-eeee-eeeeeeeeeeee',
   'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
   true, false, NOW() - INTERVAL '12 days'),

  ('d2222222-2222-2222-2222-222222222222',
   'Debate Tuesdays: Open Floor',
   'No fixed motion — speakers propose, the room votes on the top three, and we run two rounds back-to-back. Great week for first-timers; expect plenty of low-stakes practice.',
   'club', 'Library Mezzanine',
   '2026-06-23 18:00+05', '2026-06-23 20:00+05',
   30, 'Maria Tsoy',
   'eeee5555-eeee-eeee-eeee-eeeeeeeeeeee',
   'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
   true, false, NOW() - INTERVAL '10 days'),

  ('d3333333-3333-3333-3333-333333333333',
   'Debate Tuesdays: Inter-Faculty Showdown',
   'Two teams of three — Computer Science vs Business — argue a motion drawn 30 minutes before the round. Judging by a small panel of staff and society veterans. Spectators welcome.',
   'club', 'Library Mezzanine',
   '2026-06-30 18:00+05', '2026-06-30 20:30+05',
   50, 'Maria Tsoy',
   'eeee5555-eeee-eeee-eeee-eeeeeeeeeeee',
   'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
   true, false, NOW() - INTERVAL '8 days'),

  ('d4444444-4444-4444-4444-444444444444',
   'Debate Tuesdays: British Parliamentary Workshop',
   'Workshop format week, no scoring. We walk through the BP role structure (Prime Minister, Leader of the Opposition, Member, Whip) and run a single demonstration round with stop-the-clock coaching.',
   'club', 'Library Mezzanine',
   '2026-07-07 18:00+05', '2026-07-07 20:00+05',
   24, 'Maria Tsoy',
   'eeee5555-eeee-eeee-eeee-eeeeeeeeeeee',
   'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
   true, false, NOW() - INTERVAL '5 days'),

  ('d5555555-5555-5555-5555-555555555555',
   'Debate Tuesdays: End-of-Term Champions Round',
   'Two-bracket knockout — best four speakers from the term face off, plus a wildcard popular vote. Light refreshments, society trophy presentation at the end.',
   'club', 'Library Mezzanine',
   '2026-07-14 18:00+05', '2026-07-14 21:00+05',
   40, 'Maria Tsoy',
   'eeee5555-eeee-eeee-eeee-eeeeeeeeeeee',
   'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
   true, false, NOW() - INTERVAL '3 days');

COMMIT;

-- ─── Sanity check ────────────────────────────────────────────────
SELECT 'users'         AS t, COUNT(*) FROM users
UNION ALL SELECT 'clubs',         COUNT(*) FROM clubs
UNION ALL SELECT 'events',        COUNT(*) FROM events
UNION ALL SELECT 'registrations', COUNT(*) FROM registrations
UNION ALL SELECT 'audit_logs',    COUNT(*) FROM audit_logs;
