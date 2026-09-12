from pathlib import Path

from app.core.config import Settings


def test_settings_constructs_encoded_connection_urls_from_secret_files(tmp_path: Path) -> None:
    postgres_secret = tmp_path / "postgres_password"
    redis_secret = tmp_path / "redis_password"
    postgres_secret.write_text("p@ss/with?reserved\n")
    redis_secret.write_text("safe_redis_password\n")

    settings = Settings(
        database_host="postgres",
        database_name="agentcy",
        database_user="agentcy",
        database_password_file=postgres_secret,
        redis_host="redis",
        redis_password_file=redis_secret,
    )

    assert settings.database_url == (
        "postgresql+asyncpg://agentcy:p%40ss%2Fwith%3Freserved@postgres:5432/agentcy"
    )
    assert settings.redis_url == "redis://:safe_redis_password@redis:6379/0"


def test_settings_treats_missing_secret_file_as_unconfigured() -> None:
    settings = Settings(
        database_host="postgres",
        database_password_file=Path("/not/a/real/secret"),
        redis_host="redis",
        redis_password_file=Path("/not/a/real/secret"),
    )

    assert settings.database_url is None
    assert settings.redis_url is None
