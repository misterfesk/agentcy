import asyncio
from typing import Protocol

from redis import asyncio as redis
from redis.exceptions import RedisError
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings


class ReadinessProbe(Protocol):
    """Check the dependencies required to accept durable work."""

    async def check(self) -> tuple[bool, list[str]]: ...


class DependencyReadinessProbe:
    """Perform bounded, side-effect-free PostgreSQL and Redis checks."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def check(self) -> tuple[bool, list[str]]:
        unavailable = [
            dependency
            for dependency in await asyncio.gather(
                self._probe_database(),
                self._probe_redis(),
            )
            if dependency is not None
        ]
        return not unavailable, unavailable

    async def _probe_database(self) -> str | None:
        if self._settings.database_url is None:
            return "postgres"
        try:
            await asyncio.wait_for(
                self._check_database(), timeout=self._settings.healthcheck_timeout_seconds
            )
        except (TimeoutError, OSError, SQLAlchemyError, ValueError):
            return "postgres"
        except Exception:
            return "postgres"
        return None

    async def _probe_redis(self) -> str | None:
        if self._settings.redis_url is None:
            return "redis"
        try:
            await asyncio.wait_for(
                self._check_redis(), timeout=self._settings.healthcheck_timeout_seconds
            )
        except (RedisError, TimeoutError, OSError, ValueError):
            return "redis"
        except Exception:
            return "redis"
        return None

    async def _check_database(self) -> None:
        if self._settings.database_url is None:
            raise ValueError("DATABASE_URL is required")
        engine = create_async_engine(self._settings.database_url, pool_pre_ping=True)
        try:
            async with engine.connect() as connection:
                await connection.execute(text("SELECT 1"))
        finally:
            await engine.dispose()

    async def _check_redis(self) -> None:
        if self._settings.redis_url is None:
            raise ValueError("REDIS_URL is required")
        client = redis.from_url(self._settings.redis_url)  # type: ignore[no-untyped-call]
        try:
            await client.ping()
        finally:
            await client.aclose()
