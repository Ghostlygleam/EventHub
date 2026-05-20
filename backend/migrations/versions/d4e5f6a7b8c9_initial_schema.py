"""Initial schema — baseline matching live DB (without cancelled_at)

Revision ID: d4e5f6a7b8c9
Revises:
Create Date: 2026-05-20

EXISTING DATABASES: do NOT run upgrade() — stamp instead:
    alembic stamp d4e5f6a7b8c9
    alembic upgrade head

NEW DATABASES: run normally:
    alembic upgrade head
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE user_role AS ENUM ('student', 'organiser', 'admin');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE event_type AS ENUM ('lecture', 'club', 'workshop', 'other');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("role", sa.Enum("student", "organiser", "admin", name="user_role", create_type=False), nullable=False, server_default="student"),
        sa.Column("full_name", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("email"),
        if_not_exists=True,
    )

    op.create_table(
        "clubs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("organiser_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        if_not_exists=True,
    )

    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("event_type", sa.Enum("lecture", "club", "workshop", "other", name="event_type", create_type=False), nullable=False),
        sa.Column("location", sa.Text(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("capacity", sa.Integer(), nullable=True),
        sa.Column("speaker_name", sa.Text(), nullable=True),
        sa.Column("club_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("organiser_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("cover_image_url", sa.Text(), nullable=True),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_cancelled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        if_not_exists=True,
    )

    op.create_table(
        "registrations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("registered_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("event_id", "student_id"),
        if_not_exists=True,
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("target_type", sa.Text(), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        if_not_exists=True,
    )

    op.create_index("idx_events_starts_at", "events", ["starts_at"], if_not_exists=True)
    op.create_index("idx_events_organiser", "events", ["organiser_id"], if_not_exists=True)
    op.create_index("idx_registrations_event", "registrations", ["event_id"], if_not_exists=True)
    op.create_index("idx_registrations_student", "registrations", ["student_id"], if_not_exists=True)
    op.create_index("idx_audit_logs_actor", "audit_logs", ["actor_id"], if_not_exists=True)
    op.create_index("idx_audit_logs_created_at", "audit_logs", ["created_at"], if_not_exists=True)


def downgrade() -> None:
    op.drop_index("idx_audit_logs_created_at", table_name="audit_logs", if_exists=True)
    op.drop_index("idx_audit_logs_actor", table_name="audit_logs", if_exists=True)
    op.drop_index("idx_registrations_student", table_name="registrations", if_exists=True)
    op.drop_index("idx_registrations_event", table_name="registrations", if_exists=True)
    op.drop_index("idx_events_organiser", table_name="events", if_exists=True)
    op.drop_index("idx_events_starts_at", table_name="events", if_exists=True)
    op.drop_table("audit_logs", if_exists=True)
    op.drop_table("registrations", if_exists=True)
    op.drop_table("events", if_exists=True)
    op.drop_table("clubs", if_exists=True)
    op.drop_table("users", if_exists=True)
    op.execute("DROP TYPE IF EXISTS event_type")
    op.execute("DROP TYPE IF EXISTS user_role")
