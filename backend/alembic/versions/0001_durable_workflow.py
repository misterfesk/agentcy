"""create durable workflow schema

Revision ID: 0001_durable_workflow
Revises:
Create Date: 2026-09-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_durable_workflow"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    uuid = sa.Uuid()
    timestamp = sa.DateTime(timezone=True)
    op.create_table(
        "clients",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=True),
        sa.Column("business_context", sa.JSON(), nullable=False),
        sa.Column(
            "created_at", timestamp, nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.Column(
            "updated_at", timestamp, nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
    )
    op.create_index("ix_clients_status", "clients", ["status"])
    op.create_table(
        "client_identities",
        sa.Column("id", uuid, primary_key=True),
        sa.Column(
            "client_id", uuid, sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("channel", sa.String(length=32), nullable=False),
        sa.Column("external_user_id", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at", timestamp, nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.UniqueConstraint("channel", "external_user_id"),
    )
    op.create_table(
        "threads",
        sa.Column("id", uuid, primary_key=True),
        sa.Column(
            "client_id", uuid, sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("channel", sa.String(length=32), nullable=False),
        sa.Column("external_thread_id", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at", timestamp, nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.Column(
            "updated_at", timestamp, nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.UniqueConstraint("channel", "external_thread_id"),
    )
    op.create_index("ix_threads_client_id", "threads", ["client_id"])
    op.create_table(
        "inbound_events",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("channel", sa.String(length=32), nullable=False),
        sa.Column("external_message_id", sa.String(length=255), nullable=False),
        sa.Column(
            "client_id", uuid, sa.ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column(
            "thread_id", uuid, sa.ForeignKey("threads.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("received_at", timestamp, nullable=False),
        sa.Column(
            "created_at", timestamp, nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.UniqueConstraint("channel", "external_message_id"),
    )
    op.create_table(
        "messages",
        sa.Column("id", uuid, primary_key=True),
        sa.Column(
            "thread_id", uuid, sa.ForeignKey("threads.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "inbound_event_id",
            uuid,
            sa.ForeignKey("inbound_events.id", ondelete="SET NULL"),
            nullable=True,
            unique=True,
        ),
        sa.Column("direction", sa.String(length=16), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("external_message_id", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at", timestamp, nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
    )
    op.create_index("ix_messages_thread_id", "messages", ["thread_id"])
    op.create_table(
        "agent_runs",
        sa.Column("id", uuid, primary_key=True),
        sa.Column(
            "client_id", uuid, sa.ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column(
            "thread_id", uuid, sa.ForeignKey("threads.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column(
            "inbound_event_id",
            uuid,
            sa.ForeignKey("inbound_events.id", ondelete="RESTRICT"),
            nullable=False,
            unique=True,
        ),
        sa.Column("route", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column(
            "created_at", timestamp, nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.Column("completed_at", timestamp, nullable=True),
    )
    op.create_table(
        "todos",
        sa.Column("id", uuid, primary_key=True),
        sa.Column(
            "client_id", uuid, sa.ForeignKey("clients.id", ondelete="SET NULL"), nullable=True
        ),
        sa.Column(
            "thread_id", uuid, sa.ForeignKey("threads.id", ondelete="SET NULL"), nullable=True
        ),
        sa.Column(
            "agent_run_id", uuid, sa.ForeignKey("agent_runs.id", ondelete="SET NULL"), nullable=True
        ),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("due_at", timestamp, nullable=True),
        sa.Column(
            "created_at", timestamp, nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.Column("completed_at", timestamp, nullable=True),
    )


def downgrade() -> None:
    op.drop_table("todos")
    op.drop_table("agent_runs")
    op.drop_index("ix_messages_thread_id", table_name="messages")
    op.drop_table("messages")
    op.drop_table("inbound_events")
    op.drop_index("ix_threads_client_id", table_name="threads")
    op.drop_table("threads")
    op.drop_table("client_identities")
    op.drop_index("ix_clients_status", table_name="clients")
    op.drop_table("clients")
