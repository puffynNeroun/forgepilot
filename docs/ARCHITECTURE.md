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

## TASK-0002 application shell decision

TASK-0002 bootstraps the Next.js app manually instead of running create-next-app.

Reason:

- the repository already contains Forge workflow files;
- the repository already has Git history and public remote setup;
- manual bootstrap keeps the diff small and reviewable;
- app shell files can be aligned directly with ForgePilot architecture.

The initial app shell includes:

- app/layout.tsx
- app/page.tsx
- app/globals.css
- components/layout/AppShell.tsx
- components/ui/StatusBadge.tsx
- lib/utils.ts

Feature modules remain deferred to later tasks.

## TASK-0003 persistence foundation

TASK-0003 adds the first persistence layer for ForgePilot.

Persistence stack:

- PostgreSQL for local relational storage.
- Prisma as the ORM and schema definition layer.
- Docker Compose for local database runtime.
- Prisma Client singleton helper for future Next.js server-side usage.

Initial model set:

- Product
- ProductSpec
- ForgeTask
- Decision
- DogfoodingEntry
- ProductRelease
- HandoffSnapshot

Verification policy:

- `pnpm verify` validates the Prisma schema and generates Prisma Client.
- `pnpm verify` must not require a running PostgreSQL service.
- Runtime database commands such as `db:push`, `db:seed`, and `db:studio` remain manual local commands.

This keeps CI deterministic while still giving future feature tasks a typed persistence foundation.

## TASK-0004 product spec editor

TASK-0004 adds the first user-facing persistence-backed feature.

The `/spec` route loads the demo ForgePilot product spec through a narrow data access module and saves updates through a server action.

Implementation shape:

- `app/spec/page.tsx` loads the current product spec.
- `app/spec/actions.ts` handles server-side validation and persistence.
- `components/spec/ProductSpecEditor.tsx` renders the editable form.
- `lib/db/product-specs.ts` isolates Prisma reads/writes.
- `lib/validators/product-spec.ts` owns Zod validation.

The route is marked dynamic so the default build does not require a running local database.

## TASK-0005 task board MVP

TASK-0005 adds the second focused product surface: a read-only task board at `/tasks`.

Implementation shape:

- `app/tasks/page.tsx` renders the dynamic task board route.
- `lib/db/tasks.ts` owns task-board data access through Prisma.
- `components/tasks/*` contains the read-only board and status badge UI.
- The route is marked dynamic because it reads runtime task data.
- The feature intentionally does not edit lifecycle status from the UI.

## TASK-0006 dogfooding log MVP

TASK-0006 adds the third focused product surface: a read-only dogfooding log at `/dogfooding`.

Implementation shape:

- `app/dogfooding/page.tsx` renders the dynamic dogfooding route.
- `lib/db/dogfooding.ts` owns dogfooding data access through Prisma.
- `components/dogfooding/*` contains the read-only log and severity badge UI.
- The route is marked dynamic because it reads runtime dogfooding data.
- The feature intentionally does not create, edit, or delete dogfooding entries from the UI.

## TASK-0007 decision log MVP

TASK-0007 adds a focused read-only decision log surface.

Components:

- app/decisions/page.tsx — dynamic server route for decision log rendering.
- app/decisions/loading.tsx — loading shell.
- lib/db/decisions.ts — narrow Prisma data access for the demo product decisions.
- components/decisions/DecisionLog.tsx — read-only decision list UI.
- components/decisions/DecisionStatusBadge.tsx — normalized decision status display.

Runtime behavior:

- The route uses force-dynamic and Node.js runtime because it reads through Prisma.
- Database errors are caught and rendered as UI state.
- Missing demo product and empty decision list states are explicit.
- No Prisma schema or dependency changes are introduced.

## TASK-0008 release timeline MVP

TASK-0008 adds a focused read-only release timeline surface.

Components:

- app/releases/page.tsx — dynamic server route for release timeline rendering.
- app/releases/loading.tsx — loading shell.
- lib/db/releases.ts — narrow Prisma data access for demo product releases.
- components/releases/ReleaseTimeline.tsx — read-only release timeline UI.
- components/releases/ReleaseStatusBadge.tsx — normalized release status display.

Runtime behavior:

- The route uses force-dynamic and Node.js runtime because it reads through Prisma.
- Database errors are caught and rendered as UI state.
- Missing demo product and empty release list states are explicit.
- No Prisma schema, dependency, tag, GitHub release, deployment, or release automation changes are introduced.

## TASK-0009 dashboard overview MVP

TASK-0009 adds a read-only dashboard composition surface.

Components:

- app/dashboard/page.tsx — dynamic server route for dashboard rendering.
- app/dashboard/loading.tsx — loading shell.
- lib/db/dashboard.ts — narrow Prisma data access for product-level summary counts.
- components/dashboard/DashboardOverview.tsx — dashboard layout.
- components/dashboard/DashboardStatusCard.tsx — reusable surface summary card.

Runtime behavior:

- The route uses force-dynamic and Node.js runtime because it reads through Prisma.
- Database errors are caught and rendered as UI state.
- Missing demo product state is explicit.
- Summary cards link to existing detail surfaces instead of replacing them.
- No Prisma schema, dependency, AI, GitHub import, release automation, handoff, auth, billing, team, or deployment changes are introduced.

## TASK-0010 handoff summary MVP

TASK-0010 adds a deterministic read-only handoff surface.

Components:

- app/handoff/page.tsx — dynamic server route for handoff rendering.
- app/handoff/loading.tsx — loading shell.
- lib/db/handoff.ts — narrow Prisma reads and deterministic markdown assembly.
- components/handoff/HandoffSummary.tsx — page layout for ready handoff data.
- components/handoff/HandoffCopyBlock.tsx — client-side clipboard helper and readonly textarea.

Runtime behavior:

- The route uses force-dynamic and Node.js runtime because it reads through Prisma.
- The data layer reads existing product, spec, task, dogfooding, decision, and release data.
- Handoff text is deterministic and assembled without AI.
- Clipboard copy is client-side only and does not persist anything.
- Database errors and missing demo product states render as explicit UI states.

Boundaries:

- The existing HandoffSnapshot model is not used in this MVP.
- No Prisma schema, dependency, AI generation, GitHub import, release automation, deployment, auth, teams, billing, or permissions changes are introduced.

## TASK-0012 dogfooding insights architecture

TASK-0012 adds a deterministic read-only analysis surface at `/insights`.

Responsibilities are separated as follows:

- `lib/db/insights.ts` performs narrow Prisma reads and returns serializable source data.
- `lib/insights/analyze-dogfooding.ts` contains pure deterministic classification and aggregation logic.
- `app/insights/page.tsx` loads data and handles ready, empty, missing-product, and database-error states.
- `app/insights/loading.tsx` provides the route loading shell.
- `components/insights/DogfoodingInsights.tsx` renders breakdowns, recurring friction, suggestions, and classification evidence.

The route uses `force-dynamic` and the Node.js runtime because it performs Prisma reads at request time.

Derived insights are not persisted. The analyzer does not use Prisma, React, AI models, network APIs, or database mutation methods.

This surface still reads PostgreSQL demo data and does not resolve the architectural separation between database records and real Forge repository contracts, artifacts, Git state, or GitHub state.
