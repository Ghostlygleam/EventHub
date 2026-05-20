"""Add cancelled_at to events + performance indexes

Revision ID: 1a2b3c4d5e6f
Revises: d4e5f6a7b8c9
Create Date: 2026-05-20

cancelled_at was added to the Event model but was missing from the live DB.
The new indexes (composite list index, type index, composite registration index,
and trigram indexes for ILIKE search) were added to schema.sql but not yet applied.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "1a2b3c4d5e6f"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "events",
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        schema=None,
    )

    # Composite index for the main listing query
    op.create_index(
        "idx_events_list",
        "events",
        ["is_cancelled", "is_published", "starts_at"],
        if_not_exists=True,
    )

    # Filter by event type
    op.create_index("idx_events_type", "events", ["event_type"], if_not_exists=True)

    # Composite for registration lookup (event + user)
    op.create_index(
        "idx_registrations_event_user",
        "registrations",
        ["event_id", "student_id"],
        if_not_exists=True,
    )

    # Trigram indexes for ILIKE title/description search
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute("""
        DO $$ BEGIN
            CREATE INDEX idx_events_title_trgm ON events USING gin(title gin_trgm_ops);
        EXCEPTION WHEN duplicate_table THEN NULL;
        END $$
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE INDEX idx_events_description_trgm ON events USING gin(description gin_trgm_ops);
        EXCEPTION WHEN duplicate_table THEN NULL;
        END $$
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_events_description_trgm")
    op.execute("DROP INDEX IF EXISTS idx_events_title_trgm")
    op.drop_index("idx_registrations_event_user", table_name="registrations", if_exists=True)
    op.drop_index("idx_events_type", table_name="events", if_exists=True)
    op.drop_index("idx_events_list", table_name="events", if_exists=True)
    op.drop_column("events", "cancelled_at")
