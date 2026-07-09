# ForgePilot Architecture

## Architecture status

This document defines the planned architecture direction for ForgePilot before application bootstrap.

No application runtime code exists yet. The Next.js app will be created in a later task.

## Architectural goal

ForgePilot should be a small, production-minded dashboard application that proves the Project Forge workflow can guide real product development.

The architecture should be simple enough to ship quickly, but structured enough to grow after v0.1.0.

## Planned stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma
- Zod
- pnpm
- GitHub Actions
- Docker Compose for local PostgreSQL if needed

## Planned application shape

Expected future structure:

    app/
      layout.tsx
      page.tsx
      products/
      tasks/
      decisions/
      dogfooding/
      releases/
      handoff/

    components/
      ui/
      layout/
      dashboard/

    features/
      products/
      product-spec/
      tasks/
      decisions/
      dogfooding/
      releases/
      handoff/

    lib/
      prisma.ts
      validators/
      utils/

    prisma/
      schema.prisma
      seed.ts

    docs/
      PRODUCT_SPEC.md
      ARCHITECTURE.md
      MVP_SCOPE.md
      DECISIONS.md
      DOGFOODING_LOG.md
      TASKS.md

This structure is a direction, not a finalized implementation contract. The actual app bootstrap will be handled in TASK-0002.

## Core modules

### Product dashboard

Purpose:

Show a compact overview of the product.

Expected data:

- product name;
- stage;
- goal;
- repository link;
- current release;
- current task summary.

### Product spec

Purpose:

Store structured product thinking.

Expected sections:

- problem;
- target user;
- value proposition;
- MVP scope;
- non-goals;
- success criteria;
- technical stack;
- risks.

### Task lifecycle

Purpose:

Represent Forge-style task progress in UI.

Expected statuses:

- proposed;
- approved;
- in_progress;
- ready_for_pr;
- completed.

Initial implementation should be manual/database-backed. GitHub import can come later.

### Decision log

Purpose:

Preserve product and architecture reasoning.

Expected fields:

- title;
- decision;
- rationale;
- alternatives;
- date;
- optional related task.

### Dogfooding log

Purpose:

Track Forge workflow friction found while building ForgePilot.

Expected fields:

- title;
- observation;
- friction;
- resolution;
- potential Forge improvement;
- date;
- severity.

### Handoff prompt generator

Purpose:

Generate a copyable prompt for a new AI chat.

Expected inputs:

- product summary;
- task board;
- current task;
- decisions;
- dogfooding findings;
- known issues;
- next steps;
- restrictions.

### Release timeline

Purpose:

Show release history.

Expected fields:

- version;
- date;
- highlights;
- GitHub release URL;
- related tasks.

## Data model direction

Potential initial entities:

### Product

Represents one product workspace.

Fields:

- id
- name
- slug
- stage
- goal
- repoUrl
- currentRelease
- createdAt
- updatedAt

### ProductSpec

Stores structured product spec for a product.

Fields:

- id
- productId
- problem
- targetUser
- valueProposition
- mvpScope
- nonGoals
- successCriteria
- technicalStack
- risks
- createdAt
- updatedAt

### Task

Represents a Forge-style task.

Fields:

- id
- productId
- taskKey
- title
- status
- summary
- currentStage
- branchName
- prUrl
- createdAt
- updatedAt
- completedAt

### Decision

Represents a product or architecture decision.

Fields:

- id
- productId
- taskId
- title
- decision
- rationale
- alternatives
- decidedAt
- createdAt
- updatedAt

### DogfoodingEntry

Represents a workflow friction note.

Fields:

- id
- productId
- taskId
- title
- observation
- friction
- resolution
- potentialForgeImprovement
- severity
- createdAt
- updatedAt

### Release

Represents a product release.

Fields:

- id
- productId
- version
- title
- date
- highlights
- githubReleaseUrl
- createdAt
- updatedAt

### HandoffSnapshot

Represents generated handoff context.

Fields:

- id
- productId
- taskId
- content
- createdAt

## Validation direction

Use Zod schemas for all form/server boundaries.

Initial validation should cover:

- product spec fields;
- task status enum;
- decision fields;
- dogfooding entry fields;
- release fields;
- handoff generation input.

## Persistence direction

Use PostgreSQL with Prisma.

For the MVP, use a single local product workspace and seed/demo data if it helps development.

Do not introduce multi-tenant complexity in v0.1.0.

## UI direction

Use Tailwind CSS and simple reusable components.

Priorities:

- readable dashboard;
- clean forms;
- clear task status visualization;
- copyable handoff prompt;
- useful empty states.

Avoid heavy component architecture before real screens exist.

## GitHub integration direction

GitHub import should not be part of v0.1.0.

Later versions may import:

- commits;
- pull requests;
- releases;
- task branch names;
- issue links.

For v0.1.0, manual data is acceptable.

## Security and auth direction

No authentication in v0.1.0 unless product needs change.

This is initially a local dogfood dashboard, not a public SaaS.

## Testing direction

Early tasks should use:

- TypeScript checks;
- lint/build checks once Next.js exists;
- Forge contract validation;
- focused validation tests if business logic becomes complex.

## Architecture risks

### Risk: schema too abstract

Keep the schema close to actual ForgePilot screens.

### Risk: too much GitHub automation too early

Keep GitHub integration manual until the dashboard proves useful.

### Risk: dashboard becomes passive documentation

The handoff prompt generator and dogfooding log must make the product actively useful, not just a document viewer.
