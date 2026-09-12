---
name: agency-context-setup
description: Set up a marketing and creative agency business context.
version: 0.1.0
author: Alex, Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [agency, business-context, demo-data, agentcy]
    related_skills: []
---

# Agency Context Setup

Use this skill to create or revise an Agentcy agency profile, policies, services, FAQ, staff roles, and demo records. It creates explicit operational facts; it never invents customer pricing, deadlines, legal terms, or performance claims.

## When to Use

- A new Agency deployment needs business context before customer support is enabled.
- An operator wants to replace demo context with their real agency profile.
- A demo needs a coherent fictional marketing and creative agency dataset.

## Prerequisites

- Use the app's business-context import/seed interface once it is available.
- Mark every fictional record as demo data and keep it separate from live channel data.

## Procedure

1. Define agency identity: name, geography/timezone, positioning, tone, ideal clients, and services. Completion: every support answer has a grounded source for basic “what do you do?” questions.
2. Define operational policies: response hours, escalation boundaries, change/scope process, feedback/approval process, and data-handling rules. Completion: policies do not promise unsupported prices, dates, outcomes, or legal commitments.
3. Define a service catalog with deliverables, inclusions, exclusions, dependencies, and owner roles. Completion: each service has a human escalation owner.
4. Add FAQ entries with source/category tags. Completion: every FAQ answer can cite its context record.
5. Create sample employees, clients, projects, tickets, tasks, leads, and reports only in an isolated demo workspace. Completion: the dataset supports the Telegram, Discord, CEO, and dashboard demo paths.
6. Review all context for fabricated claims and secrets. Completion: no live client data, credentials, or unverified performance statements remain.

## Pitfalls

- Do not use a demo service catalog as a live contract or pricing sheet.
- Do not classify a client as active solely from a chat message; use the persisted client/project state.
- Do not expose internal escalation notes or employee availability to public customer channels.

## Verification

- Customer-support queries return only documented service/policy/FAQ facts.
- Unknown pricing, commitments, and sensitive-account requests become tickets or human escalations.
- Demo records are visibly labelled and cannot be mixed into production reporting.
