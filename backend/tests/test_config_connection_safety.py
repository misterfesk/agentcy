import math

import pytest
from pydantic import ValidationError

from app.core.config import Settings


@pytest.mark.parametrize("timeout", [0, -1, math.inf, math.nan])
def test_settings_rejects_non_positive_or_non_finite_healthcheck_timeout(timeout: float) -> None:
    with pytest.raises(ValidationError):
        Settings(healthcheck_timeout_seconds=timeout)


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("database_host", "postgres?sslmode=disable"),
        ("redis_host", "redis/path"),
        ("database_name", "agentcy?sslmode=disable"),
        ("database_user", "agentcy@other"),
        ("database_port", 0),
        ("redis_port", 70000),
    ],
)
def test_settings_rejects_connection_fields_that_could_change_url_semantics(
    field: str, value: str | int
) -> None:
    with pytest.raises(ValidationError):
        Settings(**{field: value})
