from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import create_async_engine

from app.db.models import Base


async def test_schema_creates_all_durable_workflow_tables() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
            table_names = await connection.run_sync(
                lambda sync_connection: inspect(sync_connection).get_table_names()
            )
    finally:
        await engine.dispose()

    assert set(table_names) >= {
        "agent_runs",
        "client_identities",
        "clients",
        "inbound_events",
        "messages",
        "threads",
        "todos",
    }
