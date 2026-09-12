import pytest

from app.routing import AgentRoute, choose_agent_route


@pytest.mark.parametrize(
    ("client_status", "expected_route"),
    [
        ("lead", AgentRoute.SUPPORT),
        ("active", AgentRoute.DEDICATED),
        ("paused", AgentRoute.DEDICATED),
        ("churned", AgentRoute.DEDICATED),
    ],
)
def test_choose_agent_route_is_deterministic_for_client_status(
    client_status: str, expected_route: AgentRoute
) -> None:
    assert choose_agent_route(client_status) is expected_route


def test_choose_agent_route_rejects_unknown_client_status() -> None:
    with pytest.raises(ValueError, match="unknown client status"):
        choose_agent_route("prospect")
