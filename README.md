# Agentcy

Agentcy is an open-source operations workspace for a marketing and creative agency. It turns inbound client conversations into visible, durable operational work: contextual support, internal routing, follow-up, and reporting.

> **MVP scope:** this is a single-agency deployment, not a multi-tenant SaaS product. Telegram and Discord are active integrations. Meta adapters remain deliberately gated behind `ENABLE_META=false` until business verification is complete.

## Quick start (local development)

### Prerequisites

- Docker Engine and Docker Compose v2
- Git
- Python 3.11+ only if running tests or local scripts outside Docker
- Node.js 20+ only if developing the frontend outside Docker

### 1. Clone and configure

```bash
git clone https://github.com/misterfesk/agentcy.git
cd agentcy
cp .env.example .env
python3 scripts/create_dev_secrets.py
```

`create_dev_secrets.py` creates local database and Redis secrets under `.secrets/`. Those files are ignored by Git.

### 2. Add real channel and model credentials

Create these files with restrictive permissions:

```bash
printf '%s' 'YOUR_NEBIUS_API_KEY' > .secrets/nebius_api_key
printf '%s' 'YOUR_TELEGRAM_BOT_TOKEN' > .secrets/telegram_bot_token
chmod 600 .secrets/nebius_api_key .secrets/telegram_bot_token
```

Keep the following values in `.env` (already present in the example):

```dotenv
LLM_PROVIDER=nebius
NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1/
NEBIUS_MODEL=zai-org/GLM-5.3-Flash
NEBIUS_API_KEY_FILE=.secrets/nebius_api_key
```

For Discord provisioning, add `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID` to `.env`. Never put API keys or bot tokens in source code, commits, screenshots, or issue text.

### 3. Start the stack

```bash
docker compose up --build --detach --wait
```

This starts PostgreSQL, Redis, migrations, FastAPI, the Telegram worker, the frontend, and Caddy. The local dashboard is served through Caddy at `http://localhost` when port 80 is available.

### 4. Check runtime health

```bash
docker compose ps
curl -fsS http://127.0.0.1:8000/health
curl -fsS http://127.0.0.1:8000/readyz
```

Expected health response:

```json
{"status":"ok"}
```

### 5. Seed a safe demo workspace (optional)

```bash
docker compose exec app python -m app.seed_mvp_demo
```

This creates clearly demo-oriented work items for the fictional agency context. Replace it with real agency data before production use.

### 6. Test Telegram

Message the bot from any Telegram account. Try a multi-turn flow:

```text
What services do you offer for a hospitality launch?
We already have a brand but need paid media and content.
What would you need from us first?
```

The worker writes messages to PostgreSQL and sends recent thread history to the support agent. If it ever replies with the exact fallback *“Thanks for reaching out to Agentcy. We have your message and will reply shortly.”*, inspect the worker logs:

```bash
docker compose logs --tail=100 telegram-worker
```

That fallback means the provider call failed or returned no customer-facing content; it is intentionally safe rather than pretending an AI answer was generated.

## What it does

- Accepts Telegram messages from anyone; `/start` creates a lead identity.
- Stores clients, channel identities, threads, inbound/outbound messages, todos, and agent activity in PostgreSQL.
- Routes new leads to customer support; clients with `active`, `paused`, or `churned` status route to the dedicated-account path.
- Uses Nebius Token Factory's OpenAI-compatible API with `zai-org/GLM-5.3-Flash` for customer-support replies.
- Supplies the support agent with the latest persisted conversation history so follow-up messages do not restart the conversation.
- Runs a Discord operations workspace for command-center, employee work, escalations, approvals, agent activity, CEO briefings, and operational alerts.
- Provides a React dashboard served behind Caddy.
- Keeps Meta integration configuration in place but disabled by default.

## Architecture

```text
Telegram / Discord
        │
        ▼
  channel worker
        │  normalize + deduplicate
        ▼
FastAPI application ───────────────► PostgreSQL
        │                              clients, identities, threads,
        │                              messages, todos, agent runs
        ├────────► Nebius / GLM-5.3-Flash
        │          contextual support response
        ▼
     Redis
  rate-limit / queue utility
        │
        ▼
React dashboard ◄── Caddy reverse proxy
```

The Telegram worker never sends model output without first persisting the inbound message. After a successful send, it persists the outbound reply as well. The next response receives bounded recent thread history.

Read [ARCHITECTURE.md](ARCHITECTURE.md) for the intended agent stack and [DECISIONS.md](DECISIONS.md) for MVP trade-offs.

## What an agency needs to provide

Before deploying Agentcy for a real agency, gather these items:

1. **Agency profile**
   - agency name, website, location/time zone
   - services offered and concise service descriptions
   - approved tone of voice
   - FAQs, working hours, response expectations, escalation rules
   - any topics the agent must never answer autonomously: pricing, contracts, guarantees, timelines, legal claims, etc.

2. **Team and workflow map**
   - employees, roles, responsibilities, and stable Discord user IDs
   - which kinds of requests go to which role
   - who approves client-facing replies, scope changes, refunds, and commitments
   - daily digest recipients and reminder schedule

3. **Client and project data**
   - client names and lifecycle status: `lead`, `active`, `paused`, or `churned`
   - current projects, open tickets, key contacts, and approved history import
   - clear definition of when a lead becomes an active client

4. **Channel credentials**
   - Telegram bot token from BotFather
   - Discord application/bot token and guild ID
   - Nebius Token Factory API key
   - optionally later: Meta app secret, webhook verification token, access token, and the relevant WhatsApp/Instagram/Facebook IDs

5. **Deployment basics**
   - a Linux host with Docker Compose v2, a DNS name, and TLS-capable reverse proxy access
   - backups for the PostgreSQL volume
   - a private secrets-management process; do not commit credentials into Git

## Development and verification

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -e '.[dev]'
ruff check backend scripts
pytest -q
```

Frontend checks:

```bash
cd frontend
npm ci
npm run lint
npm run build
```

## Production checklist

- Use a stable domain and Caddy/another TLS reverse proxy; do not use a temporary tunnel as production infrastructure.
- Keep Postgres and Redis private to Docker/internal networks.
- Store all secrets outside Git and rotate any token ever exposed accidentally.
- Enable backups and periodically test restoring PostgreSQL data.
- Set practical auto-reply limits and escalation policies.
- Review model replies, provider failures, and agent activity before enabling automatic external actions.
- Map employees by immutable Discord IDs, not display names.
- Keep `ENABLE_META=false` until Meta verification and webhook signature checks are fully configured.

## Safety model

- Postgres is the durable system of record.
- Inbound events are deduplicated.
- Agents are intended to act through typed server-side tools rather than raw database or channel access.
- The current support agent is constrained not to invent prices, delivery dates, policies, guarantees, or client facts.
- Sensitive commitments require approval workflows; do not treat the MVP as an unattended autonomous sales or support system.

## License and contribution

This project is being prepared as an open-source hackathon MVP. Contributions should include tests for any changed routing, provider, or channel behavior.
