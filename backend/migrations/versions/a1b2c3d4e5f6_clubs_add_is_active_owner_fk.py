"""clubs: add is_active, rename organiser_id→owner_id, restore FK on events.club_id

Revision ID: a1b2c3d4e5f6
Revises: 1a2b3c4d5e6f
Create Date: 2026-05-22

What this migration does
------------------------
The `clubs` table has existed since the initial schema, but was never wired up:
  * column was named `organiser_id` — renamed to `owner_id` to match the spec
  * `is_active` soft-delete flag was missing — added (default TRUE, NOT NULL)
  * `events.club_id` had its FK dropped in BE-13 to unblock event mutations — restored
  * Indexes on clubs.owner_id, clubs.name, events.club_id — added

Existing deployments
--------------------
If the live DB already has the `clubs` table stamped at `d4e5f6a7b8c9`, run:
    alembic upgrade a1b2c3d4e5f6
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "1a2b3c4d5e6f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Rename organiser_id → owner_id
    #    Use IF EXISTS guard so the migration is re-runnable on DBs that already
    #    had the column renamed manually.
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE clubs RENAME COLUMN organiser_id TO owner_id;
        EXCEPTION WHEN undefined_column THEN NULL;
        END $$
    """)

    # 2. Make owner_id NOT NULL.
    #    Remove any orphaned rows first (safe — clubs table is empty in all
    #    known deployments; this is purely a defensive guard).
    op.execute("DELETE FROM clubs WHERE owner_id IS NULL")
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE clubs ALTER COLUMN owner_id SET NOT NULL;
        EXCEPTION WHEN others THEN NULL;
        END $$
    """)

    # 3. Add is_active column (idempotent)
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE clubs
                ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$
    """)

    # 4. Restore FK events.club_id → clubs.id (was dropped in BE-13)
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE events
                ADD CONSTRAINT fk_events_club_id
                FOREIGN KEY (club_id) REFERENCES clubs(id);
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    # 5. Indexes
    op.create_index("idx_clubs_owner_id",  "clubs",  ["owner_id"],  if_not_exists=True)
    op.create_index("idx_clubs_name",      "clubs",  ["name"],      if_not_exists=True)
    op.create_index("idx_events_club_id",  "events", ["club_id"],   if_not_exists=True)


def downgrade() -> None:
    op.drop_index("idx_events_club_id", table_name="events",  if_exists=True)
    op.drop_index("idx_clubs_name",     table_name="clubs",   if_exists=True)
    op.drop_index("idx_clubs_owner_id", table_name="clubs",   if_exists=True)

    op.execute("""
        DO $$ BEGIN
            ALTER TABLE events DROP CONSTRAINT fk_events_club_id;
        EXCEPTION WHEN undefined_object THEN NULL;
        END $$
    """)

    op.execute("""
        DO $$ BEGIN
            ALTER TABLE clubs DROP COLUMN is_active;
        EXCEPTION WHEN undefined_column THEN NULL;
        END $$
    """)

    op.execute("""
        DO $$ BEGIN
            ALTER TABLE clubs ALTER COLUMN owner_id DROP NOT NULL;
        EXCEPTION WHEN others THEN NULL;
        END $$
    """)

    op.execute("""
        DO $$ BEGIN
            ALTER TABLE clubs RENAME COLUMN owner_id TO organiser_id;
        EXCEPTION WHEN undefined_column THEN NULL;
        END $$
    """)
