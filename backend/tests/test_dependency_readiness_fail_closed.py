from pathlib import Path

from app.core.config import Settings
from app.core.readiness import DependencyReadinessProbe


class ExplodingDependencyProbe(DependencyReadinessProbe):
    async def _check_database(self) -> None:
        raise RuntimeError("unexpected driver failure")

    async def _check_redis(self) -> None:
        return None


async def test_readiness_fails_closed_when_a_dependency_probe_raises_unexpectedly(
    tmp_path: Path,
) -> None:
    postgres_secret = tmp_path / "postgres_password"
    redis_secret = tmp_path / "redis_password"
    postgres_secret.write_text("safe_password")
    redis_secret.write_text("safe_password")
    probe = ExplodingDependencyProbe(
        Settings(
            database_host="postgres",
            database_password_file=postgres_secret,
            redis_host="redis",
            redis_password_file=redis_secret,
        )
    )

    ready, unavailable = await probe.check()

    assert ready is False
    assert unavailable == ["postgres"]
