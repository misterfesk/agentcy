from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


async def test_initial_alembic_migration_creates_durable_workflow_schema(tmp_path: Path) -> None:
    database_path = tmp_path / "agentcy.db"
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", f"sqlite:///{database_path}")

    command.upgrade(config, "head")

    engine = create_engine(f"sqlite:///{database_path}")
    try:
        table_names = set(inspect(engine).get_table_names())
    finally:
        engine.dispose()
    assert {
        "clients",
        "client_identities",
        "threads",
        "messages",
        "inbound_events",
        "agent_runs",
        "todos",
    } <= table_names
