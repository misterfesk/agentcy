# Agentcy architecture

## Runtime flow

```text
Telegram / Discord / Meta (gated)
             │ verified, normalized, deduplicated
             ▼
      FastAPI channel adapters
             │ transaction: inbound event + thread/message + outbox job
             ▼
          PostgreSQL  ◀──── audit events, agent runs, tool calls
             │
             ├──── Redis: rate limits, locks, optional worker broker
             ▼
        Async worker
             │ scoped context from Postgres
             ▼
    Bounded agent orchestrator
             │ typed tool proposal only
             ▼
     Policy-enforced tool library
        │              │
        ▼              ▼
Postgres workflow   Channel outbox/send adapter
        │              │
        └─────── durable result + audit ────────┘
```

## Modules

```text
backend/app/
  api/             HTTP routes and request/response schemas
  core/            settings, logging, errors, security helpers
  db/              async engine, migrations, repositories
  domain/          SQLAlchemy models and service-level invariants
  events/          inbound normalization, idempotency, transactional outbox
  agents/          prompts, context building, model gateway, bounded runner
  tools/           Pydantic tool schemas, policies, deterministic handlers
  integrations/    Telegram, Discord, Meta channel adapters
  workers/         outbox/retry/reminder processing
  reports/         CEO aggregates and report generation
```

## Trust boundaries

1. Channel payloads and user text are untrusted.
2. Signature validation and idempotency happen before workflow processing.
3. The model proposes actions but never authenticates, authorizes, queries raw SQL, or sends a message directly.
4. Tool handlers enforce persisted-state policy and log the result.
5. Only the outbound adapter may call a channel API.
6. Dashboard REST/SSE endpoints return server-derived data; browser state is not authority.

## Development mode

- Docker Compose runs Postgres and Redis, while the application can run locally in a Python virtual environment or as the `app` service.
- Telegram uses long polling only when `ENV=development`. Production uses TLS + webhook secret token.
- Meta routes are mounted only when `ENABLE_META=true`; signature validation remains mandatory.
