# Agentcy decisions

This document records deliberate MVP defaults. It is a single-agency deployment for the hackathon, not a multi-tenant SaaS product.

## Scope and source of truth

- **Deployment model:** one agency workspace. Records are designed with UUIDs and explicit relationships so an `organization_id` migration can be added later; tenant roles, billing, and row-level security are intentionally out of scope for v1.
- **Source of truth:** Agentcy owns its workflow records: client, identity, conversation, ticket, task, todo, reminder, report, agent run, inbound event, outbound message, and audit log. External channels are transport adapters, not authoritative workflow stores.
- **First closed loop:** verified inbound customer message → durable event → client/thread resolution → bounded support or dedicated agent run → tool-mediated ticket/task/todo/reply draft → reviewed/allowed delivery → durable outcome and audit trail.

## Identity and context

- **Telegram:** `/start` creates or resolves a lead client and a Telegram `client_identities` row. A Telegram identity is sufficient for ordinary intake; it is not proof of authority to disclose sensitive financial or account data.
- **Discord:** one shared bot identity maps Discord user IDs to employees. A separate bot per employee adds setup and operational burden without value in v1.
- **Context:** rebuild context from Postgres for every inbound event. Agent prompts receive a bounded rolling summary plus the latest relevant messages/tickets/tasks, not unbounded raw history. This is deterministic, auditable, and avoids stale in-memory sessions.
- **Handoff:** `clients.status in ('active', 'churned')` selects the dedicated account agent at routing time. A support agent can still call `transfer_to_dedicated_agent`; that tool logs the handoff and sends a short, explicit customer-facing transition when appropriate.

## Agent execution and autonomy

- **Bounded execution:** agents may only propose typed tool calls. They receive no raw SQL, channel credentials, or generic network/shell tools. The server validates tool arguments, authorizes action from persisted state, enforces budgets and loop guards, executes deterministic functions, then logs the result.
- **External messages:** the UI and agents distinguish `draft`, `awaiting_approval`, `queued`, `sent`, and `failed`. The first production-safe default is approval for project commitments, pricing, timelines, scope, ticket closure, or sensitive information. Low-risk acknowledgements and narrowly approved templates may be auto-sent only through explicit policy configuration.
- **Meta:** integration code is built behind `ENABLE_META=false`. It starts read-only; no campaign or account mutation exists in the MVP.
- **CEO notifications:** a CEO alert is an internal tool event, not a substitute for task/ticket ownership.

## Durable delivery

- **Postgres is durable state.** Redis is limited to rate limits, locks, cache, and optional job transport.
- **Inbound idempotency:** normalize verified channel payloads into `inbound_events`, unique on `(channel, external_message_id)`. Duplicate delivery returns successfully without scheduling another agent run.
- **Outbox:** every inbound mutation that requires async work also writes an outbox job in the same database transaction. Workers claim jobs with locking, retry bounded transient failures, and record terminal failure as a todo/audit event.
- **Outbound idempotency:** outbound messages have a generated idempotency key and persisted channel result before the job is considered complete.
- **Reminders:** one scheduler sweep claims due pending reminders; there is no job per employee.

## Security and operations

- Verify provider signatures before accepting Meta data; Telegram webhook updates require a configured secret token before processing in webhook mode. Long polling is development-only.
- No secrets in the repository. `.env.example` contains names only; production values come from the deployment environment.
- Apply per-thread auto-reply limits. A limit breach produces a todo rather than another automated reply.
- Persist audit-oriented agent runs separately from application logs. Store content summaries/redacted payloads where possible, never credentials.
- Production deployment requires TLS termination, non-root application containers, Postgres/Redis not publicly exposed, health checks, backup/restore instructions, and a visible failed-job path.

## Known MVP limits

- There is no external CRM/project-management synchronization.
- There is no client self-service portal or granular dashboard authorization.
- There is no in-memory session cache; add one only after measured latency warrants it.
- Multi-tenant isolation must be designed explicitly before offering Agentcy to more than one agency.
