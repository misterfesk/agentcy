from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.readiness import DependencyReadinessProbe, ReadinessProbe


def create_app(readiness_probe: ReadinessProbe | None = None) -> FastAPI:
    """Create an application with an injectable readiness probe for tests."""
    application = FastAPI(
        title="Agentcy",
        version="0.1.0",
        description="Durable, tool-mediated agency operations.",
    )
    application.state.readiness_probe = readiness_probe or DependencyReadinessProbe(get_settings())

    @application.get("/health", tags=["operations"])
    async def health() -> dict[str, str]:
        """Report process liveness without exposing configuration or secrets."""
        return {"status": "ok"}

    @application.get("/readyz", tags=["operations"])
    async def readyz(request: Request) -> JSONResponse:
        """Accept traffic only when durable dependencies are available."""
        ready, unavailable = await request.app.state.readiness_probe.check()
        if ready:
            return JSONResponse({"status": "ready"})
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "unavailable": unavailable},
        )

    return application


app = create_app()
