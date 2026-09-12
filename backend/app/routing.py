from enum import StrEnum


class AgentRoute(StrEnum):
    SUPPORT = "support"
    DEDICATED = "dedicated"


def choose_agent_route(client_status: str) -> AgentRoute:
    """Select the bounded first-response agent for a client lifecycle state."""
    if client_status == "lead":
        return AgentRoute.SUPPORT
    if client_status in {"active", "paused", "churned"}:
        return AgentRoute.DEDICATED
    raise ValueError(f"unknown client status: {client_status}")
