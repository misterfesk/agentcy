import httpx

from app.main import create_app


class ReadyProbe:
    async def check(self) -> tuple[bool, list[str]]:
        return True, []


class UnreadyProbe:
    async def check(self) -> tuple[bool, list[str]]:
        return False, ["postgres", "redis"]


async def test_readiness_reports_ready_when_all_dependencies_respond() -> None:
    app = create_app(readiness_probe=ReadyProbe())
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/readyz")

    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


async def test_readiness_does_not_report_ready_when_dependencies_are_unavailable() -> None:
    app = create_app(readiness_probe=UnreadyProbe())
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/readyz")

    assert response.status_code == 503
    assert response.json() == {"status": "not_ready", "unavailable": ["postgres", "redis"]}
