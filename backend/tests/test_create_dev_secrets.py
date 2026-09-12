import runpy
from pathlib import Path


def test_create_dev_secrets_creates_private_files_without_overwriting_existing_values(
    tmp_path: Path,
) -> None:
    script = runpy.run_path("scripts/create_dev_secrets.py")
    create_dev_secrets = script["create_dev_secrets"]

    created = create_dev_secrets(tmp_path)
    postgres_secret = tmp_path / "postgres_password"
    redis_secret = tmp_path / "redis_password"
    nebius_secret = tmp_path / "nebius_api_key"
    first_postgres_value = postgres_secret.read_text()
    first_redis_value = redis_secret.read_text()

    assert created is True
    assert first_postgres_value
    assert first_redis_value
    assert postgres_secret.stat().st_mode & 0o777 == 0o600
    assert redis_secret.stat().st_mode & 0o777 == 0o600
    assert nebius_secret.read_text() == ""
    assert nebius_secret.stat().st_mode & 0o777 == 0o600
    assert create_dev_secrets(tmp_path) is False
    assert postgres_secret.read_text() == first_postgres_value
    assert redis_secret.read_text() == first_redis_value
