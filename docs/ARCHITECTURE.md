# ForgePilot Architecture

## Current architecture status

Not implemented yet.

This document will be finalized in TASK-0001.

## Planned application shape

ForgePilot is expected to become a Next.js App Router application with:

- server-rendered dashboard pages;
- product/task/decision/release data stored in PostgreSQL;
- Prisma as database access layer;
- Zod schemas for validation;
- Tailwind CSS for UI;
- GitHub Actions for verification.

## Planned core modules

Initial modules:

- product dashboard
- product spec
- task lifecycle
- decision log
- dogfooding log
- handoff prompt generator
- release timeline

## Data model draft

Potential entities:

- Product
- ProductSpec
- Task
- Decision
- DogfoodingEntry
- Release
- HandoffSnapshot

The exact schema is deferred until the architecture plan is approved.
