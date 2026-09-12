from pathlib import Path

from app.core.config import Settings


def test_settings_treats_whitespace_secret_values_as_unconfigured(tmp_path: Path) -> None:
    postgres_secret = tmp_path / "postgres_password"
    postgres_secret.write_text(" leading-and-trailing \n")

    settings = Settings(
        database_host="postgres",
        database_password_file=postgres_secret,
    )

    assert settings.database_url is None


def test_settings_treats_non_utf8_secret_file_as_unconfigured(tmp_path: Path) -> None:
    secret_file = tmp_path / "malformed_secret"
    secret_file.write_bytes(b"\xff")

    settings = Settings(
        database_host="postgres",
        database_password_file=secret_file,
        redis_host="redis",
        redis_password_file=secret_file,
    )

    assert settings.database_url is None
    assert settings.redis_url is None
