from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.readiness import DependencyReadinessProbe, ReadinessProbe
from app.inbound import (
    InboundResult,
    SessionFactory,
    TelegramInboundPayload,
    create_session_factory,
    persist_telegram_inbound,
)


def create_app(
    readiness_probe: ReadinessProbe | None = None,
    session_factory: SessionFactory | None = None,
) -> FastAPI:
    """Create an application with an injectable readiness probe for tests."""
    application = FastAPI(
        title="Agentcy",
        version="0.1.0",
        description="Durable, tool-mediated agency operations.",
    )
    settings = get_settings()
    application.state.readiness_probe = readiness_probe or DependencyReadinessProbe(settings)
    application.state.session_factory = session_factory or _configured_session_factory(
        settings.database_url
    )

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

    @application.post("/inbound/telegram", response_model=InboundResult, tags=["inbound"])
    async def receive_telegram_inbound(
        payload: TelegramInboundPayload, request: Request
    ) -> JSONResponse:
        """Persist a verified normalized Telegram message before any asynchronous processing."""
        configured_session_factory: SessionFactory | None = request.app.state.session_factory
        if configured_session_factory is None:
            raise HTTPException(status_code=503, detail="database is not configured")
        result = await persist_telegram_inbound(configured_session_factory, payload)
        return JSONResponse(
            status_code=202 if result.accepted else 200,
            content=result.model_dump(mode="json"),
        )

    return application


def _configured_session_factory(database_url: str | None) -> SessionFactory | None:
    if database_url is None:
        return None
    return create_session_factory(database_url)


app = create_app()
