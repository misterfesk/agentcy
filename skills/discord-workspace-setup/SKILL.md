---
name: discord-workspace-setup
description: Provision and operate Agentcy Discord work channels.
version: 0.1.0
author: Alex, Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [discord, agency, channels, agentcy]
    related_skills: []
---

# Discord Workspace Setup

Use this skill to prepare a Discord server for Agentcy's internal operations. Keep customer traffic on Telegram or approved business channels; Discord is for the agency team, agent handoffs, approvals, and CEO visibility.

## When to Use

- Setting up a new Agentcy internal server.
- Repairing or extending the Agentcy operations channel layout.
- Mapping employees to their Discord identities after onboarding.

## Prerequisites

- An Agentcy Discord bot with Manage Channels permission.
- A known home channel in the target guild.
- A verified guild ID before accepting employee or CEO commands.

## Procedure

1. Provision the `AGENTCY OPERATIONS` category and the command-center, employee-work, client-escalations, approvals, agent-activity, CEO-briefings, ops-alerts, and setup-and-context channels. Completion: provisioning is idempotent and creates no duplicates.
2. Pin the Discord guild ID in Agentcy configuration and map approved Discord user IDs to employee records. Completion: unknown users, bot messages, direct messages, and other guilds cannot invoke employee or CEO workflows.
3. Route operational events by purpose: tasks to employee-work, approvals to approvals, high-severity failures to ops-alerts, CEO material to CEO-briefings, and audit links to agent-activity. Completion: every automatic message links to its Agentcy record.
4. Keep client content scoped: post only the minimum customer summary required for internal work. Completion: no API tokens, raw sensitive attachments, or unrelated client history appears in Discord.
5. Re-run the provisioner after upgrades. Completion: existing channel names are returned as already present, not recreated.

## Pitfalls

- Discord administrator access is not a substitute for identity mapping in Agentcy.
- Never accept an employee ID chosen by an agent/model; derive it from the verified Discord user ID.
- Do not use agent-activity as a live log dump; redact secrets and use concise action summaries.

## Verification

- Each expected channel exists under `AGENTCY OPERATIONS` exactly once.
- A second provisioning run creates no channels.
- Unknown and cross-guild messages are denied before a task, todo, or agent run is created.
