import asyncio
import time
from pathlib import Path

from app.core.config import Settings
from app.core.readiness import DependencyReadinessProbe


class SlowDependencyProbe(DependencyReadinessProbe):
    async def _check_database(self) -> None:
        await asyncio.sleep(0.08)

    async def _check_redis(self) -> None:
        await asyncio.sleep(0.08)


async def test_readiness_checks_dependencies_concurrently(tmp_path: Path) -> None:
    postgres_secret = tmp_path / "postgres_password"
    redis_secret = tmp_path / "redis_password"
    postgres_secret.write_text("safe_password")
    redis_secret.write_text("safe_password")
    probe = SlowDependencyProbe(
        Settings(
            database_host="postgres",
            database_password_file=postgres_secret,
            redis_host="redis",
            redis_password_file=redis_secret,
            healthcheck_timeout_seconds=0.2,
        )
    )

    started_at = time.perf_counter()
    ready, unavailable = await probe.check()
    elapsed_seconds = time.perf_counter() - started_at

    assert ready is True
    assert unavailable == []
    assert elapsed_seconds < 0.12
