# Agentcy

Agentcy is an open-source operations system for a small agency: verified customer intake, human-safe AI-assisted routing, employee coordination, and grounded business reporting.

## Status

This repository is being built as a single-agency hackathon deployment. Telegram and Discord are the active channel targets. Meta adapters are deliberately gated behind `ENABLE_META=false` until credentials and business verification are ready.

## Product slice

The first end-to-end workflow is:

```text
Inbound customer message → verified/deduplicated event → contextual agent run
→ typed ticket/task/todo/reply action → policy/approval → durable delivery + audit
```

See [DECISIONS.md](DECISIONS.md) for intentional MVP boundaries and [ARCHITECTURE.md](ARCHITECTURE.md) for the runtime design.

## Local development

Prerequisites: Python 3.11+, Docker Compose v2.

```bash
cp .env.example .env
python scripts/create_dev_secrets.py
# Before enabling agent inference, place the Nebius API key in
# .secrets/nebius_api_key (mode 0600); it is not generated automatically.
docker compose up --build
```

Detailed setup, migrations, tests, and demo instructions will be added with the application scaffold.

## Safety model

- Agents can only call typed server-side tools.
- Channel payloads are verified and deduplicated before processing.
- Postgres is the durable system of record; external delivery uses an outbox.
- Sensitive/consequential customer messages require explicit policy and, by default, human approval.
- Credentials are environment variables only.
