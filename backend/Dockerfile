FROM python:3.11-slim@sha256:9534e5a8e315485d4061ed659af0fd78a284c015f9b73661b41d6bab25604534 AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PATH="/opt/venv/bin:$PATH"

RUN python -m venv /opt/venv \
    && groupadd --gid 10001 agentcy \
    && useradd --uid 10001 --gid 10001 --create-home agentcy

WORKDIR /app
COPY pyproject.toml README.md ./
COPY backend/app ./backend/app
RUN pip install .

USER agentcy
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--app-dir", "backend", "--host", "0.0.0.0", "--port", "8000"]
