import re
from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal
from urllib.parse import quote

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL

_REDIS_SECRET_PATTERN = re.compile(r"[A-Za-z0-9_-]+")
_HOST_PATTERN = re.compile(
    r"(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*"
)
_IDENTIFIER_PATTERN = r"[A-Za-z_][A-Za-z0-9_-]{0,62}"
ConnectionIdentifier = Annotated[
    str,
    Field(min_length=1, max_length=63, pattern=f"^{_IDENTIFIER_PATTERN}$"),
]
Port = Annotated[int, Field(ge=1, le=65535)]
PositiveFiniteTimeout = Annotated[float, Field(gt=0, le=30, allow_inf_nan=False)]


class Settings(BaseSettings):
    """Environment-backed runtime settings with file-based secret support."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_host: str | None = None
    database_port: Port = 5432
    database_name: ConnectionIdentifier = "agentcy"
    database_user: ConnectionIdentifier = "agentcy"
    database_password_file: Path | None = None

    redis_host: str | None = None
    redis_port: Port = 6379
    redis_db: Annotated[int, Field(ge=0, le=15)] = 0
    redis_password_file: Path | None = None

    healthcheck_timeout_seconds: PositiveFiniteTimeout = 2.0

    llm_provider: Literal["nebius"] = "nebius"
    nebius_base_url: Literal["https://api.tokenfactory.nebius.com/v1/"] = (
        "https://api.tokenfactory.nebius.com/v1/"
    )
    nebius_model: Literal["glm5.3flash"] = "glm5.3flash"
    nebius_api_key_file: Path | None = None

    @field_validator("database_host", "redis_host")
    @classmethod
    def validate_host(cls, value: str | None) -> str | None:
        if value is not None and _HOST_PATTERN.fullmatch(value) is None:
            raise ValueError("must be a DNS host name or IPv4 address")
        return value

    @property
    def database_url(self) -> str | None:
        password = self._read_secret(self.database_password_file)
        if self.database_host is None or password is None:
            return None
        return URL.create(
            "postgresql+asyncpg",
            username=self.database_user,
            password=password,
            host=self.database_host,
            port=self.database_port,
            database=self.database_name,
        ).render_as_string(hide_password=False)

    @property
    def redis_url(self) -> str | None:
        password = self._read_secret(self.redis_password_file)
        if (
            self.redis_host is None
            or password is None
            or _REDIS_SECRET_PATTERN.fullmatch(password) is None
        ):
            return None
        encoded_password = quote(password, safe="")
        return f"redis://:{encoded_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"

    @property
    def nebius_api_key(self) -> str | None:
        return self._read_secret(self.nebius_api_key_file)

    @staticmethod
    def _read_secret(path: Path | None) -> str | None:
        if path is None:
            return None
        try:
            secret = path.read_text(encoding="utf-8")
        except (OSError, UnicodeError):
            return None
        secret = secret.removesuffix("\r\n").removesuffix("\n")
        if not secret or any(character.isspace() for character in secret):
            return None
        return secret


@lru_cache
def get_settings() -> Settings:
    return Settings()
