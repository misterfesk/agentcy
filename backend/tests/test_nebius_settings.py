from pathlib import Path

import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_settings_rejects_excessive_healthcheck_timeout() -> None:
    with pytest.raises(ValidationError):
        Settings(healthcheck_timeout_seconds=31)


def test_settings_reads_nebius_api_key_from_private_file(tmp_path: Path) -> None:
    key_file = tmp_path / "nebius_api_key"
    key_file.write_text("nebius-secret\n")

    settings = Settings(nebius_api_key_file=key_file)

    assert settings.llm_provider == "nebius"
    assert settings.nebius_base_url == "https://api.tokenfactory.nebius.com/v1/"
    assert settings.nebius_model == "glm5.3flash"
    assert settings.nebius_api_key == "nebius-secret"


def test_settings_treats_empty_nebius_key_file_as_unconfigured(tmp_path: Path) -> None:
    key_file = tmp_path / "nebius_api_key"
    key_file.write_text("")

    assert Settings(nebius_api_key_file=key_file).nebius_api_key is None
