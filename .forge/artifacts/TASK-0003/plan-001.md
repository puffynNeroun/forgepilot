---
schema_version: 1
task_id: TASK-0003
artifact_type: plan
attempt: 1
producing_role: planner
outcome: READY_FOR_APPROVAL
input_artifacts:
  []
---

# TASK-0003 Plan — Database Schema for ForgePilot MVP

## Summary

TASK-0003 will add the first persistence foundation for ForgePilot.

The task should introduce Prisma, PostgreSQL-oriented local configuration, database models, safe database scripts, and documentation. It should not implement product UI features.

The key constraint is that the normal project verification command must remain green without requiring a running PostgreSQL container.

## Planning decision

TASK-0003 should separate two categories of checks:

1. Always-safe verification checks that run in CI and local verify without a database.
2. Optional local database checks that require Docker/PostgreSQL.

This keeps CI reliable while still giving developers clear database commands.

## Planned technical direction

Use Prisma as the ORM and PostgreSQL as the target database.

Expected additions:

- Prisma schema.
- Prisma client generation.
- Local Docker Compose PostgreSQL service.
- Environment example with DATABASE_URL.
- Prisma client helper for future server-side usage.
- Database scripts in package.json.
- Documentation for local database setup.

## Planned data model

The initial schema should support the ForgePilot MVP, not a full SaaS system.

Expected models:

### Product

Represents a product/workspace being developed through ForgePilot.

Candidate fields:

- id
- slug
- name
- summary
- status
- createdAt
- updatedAt

Relations:

- productSpecs
- tasks
- decisions
- dogfoodingEntries
- releases
- handoffSnapshots

### ProductSpec

Represents product specification snapshots or editable spec records.

Candidate fields:

- id
- productId
- title
- content
- version
- createdAt
- updatedAt

### Task

Represents a task in the product development lifecycle.

Candidate fields:

- id
- productId
- externalId
- title
- status
- summary
- branchName
- pullRequestUrl
- order
- createdAt
- updatedAt

Status should be represented with an enum, but keep it simple.

Expected status values:

- proposed
- approved
- in_progress
- ready_for_pr
- completed
- cancelled

### Decision

Represents architecture/product decisions.

Candidate fields:

- id
- productId
- title
- context
- decision
- consequences
- createdAt
- updatedAt

### DogfoodingEntry

Represents findings from using Project Forge through ForgePilot.

Candidate fields:

- id
- productId
- title
- observation
- friction
- resolution
- forgeImprovement
- severity
- createdAt
- updatedAt

Severity should be an enum if useful, but avoid overengineering.

### Release

Represents releases in the product timeline.

Candidate fields:

- id
- productId
- version
- title
- summary
- status
- releasedAt
- createdAt
- updatedAt

### HandoffSnapshot

Represents generated handoff prompts or state snapshots for new AI chats.

Candidate fields:

- id
- productId
- title
- content
- createdAt
- updatedAt

## Prisma and package scripts

Expected safe scripts:

- db:generate
- db:push
- db:seed
- db:studio
- db:reset, only if clearly local and documented

Expected verification behavior:

- pnpm verify should not require a live database.
- pnpm verify may include Prisma schema validation and Prisma generate if these do not require a running database.
- db:push and db:seed should remain manual local commands.

## Docker Compose direction

Add docker-compose.yml with one PostgreSQL service for local development.

Suggested service behavior:

- service name: postgres
- database: forgepilot
- user: forgepilot
- password: forgepilot
- port: avoid assuming 5432 is always free; use a host port such as 5434 unless a better existing project convention is chosen.
- named volume for persistence.

Do not add production database deployment.

## Environment direction

Update .env.example with:

- DATABASE_URL

Use a local-only example value.

Do not commit real secrets.

## Prisma client helper

Add lib/prisma.ts using a Next.js development-safe singleton pattern.

The helper should be ready for future server-side usage but should not be wired into product UI yet.

## Seed data

Seed data is allowed only if it is minimal and reproducible.

Expected seed direction:

- one demo product;
- one spec snapshot;
- example tasks aligned with TASK-0001 to TASK-0003;
- example decisions;
- example dogfooding entries;
- no huge fixtures.

If seed setup becomes noisy, Builder may defer seed implementation and document why.

## Documentation approach

Update README with:

- local database setup;
- Docker Compose command;
- DATABASE_URL example;
- Prisma generate/push/seed commands;
- verify command explanation;
- note that verify does not require a running DB.

Update docs/ARCHITECTURE.md with:

- persistence layer;
- model relationships;
- database command policy;
- no-auth/no-multi-tenant limitation.

Update docs/MVP_SCOPE.md only if needed to clarify TASK-0003 boundaries.

Update docs/DOGFOODING_LOG.md with any bootstrap friction.

## CI approach

CI must remain deterministic.

CI should:

- install dependencies;
- run pnpm verify;
- not require Docker/PostgreSQL unless explicitly added and justified.

TASK-0003 should not introduce flaky database service dependencies into CI.

## Testing approach

Tester should verify:

- pnpm install --frozen-lockfile
- pnpm verify
- Prisma schema validation or generation if included in verify
- pnpm build
- db scripts exist
- README database instructions exist
- docker-compose.yml exists and is local-only
- no product UI features were added

Optional manual check:

- docker compose config

Avoid starting containers unless the task explicitly decides to test Docker runtime.

## Out-of-scope boundaries

TASK-0003 must not implement:

- product dashboard UI;
- product spec editor UI;
- task lifecycle board UI;
- decision log UI;
- dogfooding log UI;
- release timeline UI;
- handoff prompt generator UI;
- authentication;
- billing;
- teams;
- OAuth;
- GitHub import automation;
- AI agent execution;
- production deployment;
- release.

## Risk notes

Main risks:

- adding DB checks to pnpm verify that require a running database;
- over-modeling a SaaS-grade multi-tenant schema too early;
- committing secrets by accident;
- adding Prisma/Next integration in a way that breaks build or lint;
- Docker port conflicts.

The Builder should choose the smallest schema that supports the MVP and future tasks.

## Expected outcome

After TASK-0003:

- Prisma/PostgreSQL foundation exists;
- initial data model is defined;
- local Docker database setup is documented;
- database scripts exist;
- Prisma client helper exists;
- pnpm verify remains green without a running database;
- no product UI feature is implemented;
- TASK-0003 is ready for Builder.
