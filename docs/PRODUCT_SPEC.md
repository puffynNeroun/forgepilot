# ForgePilot Product Spec

## Problem

AI-assisted development becomes messy when product context, task status, decisions, artifacts, and handoff prompts live across many chats, markdown files, branches, and pull requests.

Project Forge solves part of this with a structured workflow. ForgePilot is the dogfood product that turns this workflow into a visible dashboard and exposes friction in the current Forge process.

## Target user

Primary user:

- solo developer building products with AI assistance
- technical founder using AI tools for planning, coding, reviewing, and release work
- developer who wants a stricter workflow than a normal todo app

Initial target user:

- this repository owner, using ForgePilot to dogfood Project Forge v0.5.0

## Value proposition

ForgePilot makes AI-assisted product development easier to control by showing the product spec, tasks, decisions, dogfooding notes, handoff context, and releases in one place.

## MVP scope

The MVP should include:

1. Product dashboard
2. Product spec editor
3. Task lifecycle board
4. Decision log
5. Dogfooding log
6. Handoff prompt generator
7. Release timeline

## Non-goals

The MVP will not include:

- authentication
- teams
- billing
- OAuth
- GitHub import automation
- multi-tenant SaaS infrastructure
- complex permissions
- AI agent execution

## Success criteria

ForgePilot v0.1.0 is successful if:

- it is built through the Forge workflow from task to release;
- it demonstrates a real product, not a toy todo app;
- it stores and displays product/task/decision/dogfooding/release data;
- it can generate a useful handoff prompt for a new AI chat;
- dogfooding produces concrete improvement candidates for Project Forge.

## Technical stack

Planned stack:

- Next.js App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma
- Zod
- pnpm
- GitHub Actions
- Docker Compose for local PostgreSQL if needed

## Risks

Main risks:

- overbuilding a SaaS instead of shipping a focused MVP;
- mixing ForgePilot with the original Forge repository;
- spending too much time polishing internal workflow instead of dogfooding it;
- creating UI before the product model is clear;
- making the data model too abstract too early.
