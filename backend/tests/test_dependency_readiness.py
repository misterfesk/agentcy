from pathlib import Path

from app.core.config import Settings
from app.core.readiness import DependencyReadinessProbe


async def test_dependency_probe_treats_unconfigured_secret_files_as_not_ready() -> None:
    probe = DependencyReadinessProbe(
        Settings(
            database_host="postgres",
            database_password_file=Path("/not/a/real/secret"),
            redis_host="redis",
            redis_password_file=Path("/not/a/real/secret"),
        )
    )

    ready, unavailable = await probe.check()

    assert ready is False
    assert unavailable == ["postgres", "redis"]
