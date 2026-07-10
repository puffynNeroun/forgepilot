---
schema_version: 1
task_id: TASK-0009
artifact_type: plan
attempt: 1
producing_role: planner
outcome: READY_FOR_APPROVAL
input_artifacts:
  []
---

# TASK-0009 Plan — Dashboard Overview MVP

## Summary

TASK-0009 adds a read-only dashboard overview page at /dashboard.

The dashboard should compose the existing ForgePilot product surfaces into one overview without replacing them and without adding new business workflows.

Existing surfaces:

- /spec — product spec editor.
- /tasks — task board MVP.
- /dogfooding — dogfooding log MVP.
- /decisions — decision log MVP.
- /releases — release timeline MVP.

New surface:

- /dashboard — overview of current ForgePilot product state.

## Product intent

The dashboard should answer:

- What product is currently being tracked?
- Is a product spec available?
- How many tasks exist and what are their status counts?
- How many dogfooding entries exist and what are their severity counts?
- How many decisions exist?
- How many releases exist and what are their status counts?
- Where should the user go next for deeper detail?

The dashboard is a navigation and summary layer, not an editing workspace.

## Implementation shape

Preferred files:

- app/dashboard/page.tsx
- app/dashboard/loading.tsx
- components/dashboard/DashboardOverview.tsx
- components/dashboard/DashboardStatusCard.tsx
- lib/db/dashboard.ts

The home page should link to /dashboard.

## Data strategy

Builder must inspect the actual Prisma models before writing the dashboard data layer.

Expected behavior:

1. Load the demo product by slug forgepilot.
2. Read summary data from existing models:
   - Product
   - ProductSpec
   - ForgeTask
   - DogfoodingEntry
   - Decision
   - ProductRelease
3. Return a stable dashboard data shape from lib/db/dashboard.ts.
4. Render missing-product and database-error states.
5. Keep all dashboard operations read-only.
6. Keep pnpm verify independent from a running PostgreSQL service.

Do not change prisma/schema.prisma.

## UI plan

The /dashboard page should include:

- Back/home navigation.
- Page title and short explanation.
- Product identity summary.
- Summary cards for:
  - Product spec state.
  - Tasks.
  - Dogfooding entries.
  - Decisions.
  - Releases.
- Links to existing surfaces:
  - /spec
  - /tasks
  - /dogfooding
  - /decisions
  - /releases
- Optional compact status breakdowns where data exists.

## Route behavior

If Prisma runtime reads are used, the route must be dynamic:

- export const dynamic = "force-dynamic"
- export const runtime = "nodejs"

## Verification plan

Tester and Reviewer should verify:

- pnpm install --frozen-lockfile
- pnpm db:validate
- pnpm db:generate
- docker compose -f docker-compose.yml config
- pnpm lint
- pnpm typecheck
- pnpm build
- pnpm verify

The build output should show dynamic /dashboard.

## Acceptance criteria mapping

AC-01: /dashboard route exists and is reachable from the home page.

AC-02: Dashboard data is loaded through lib/db/dashboard.ts.

AC-03: Dashboard summarizes product spec, tasks, dogfooding entries, decisions, and releases using read-only data.

AC-04: Missing-product and database-error states are handled gracefully.

AC-05: The dashboard links to the existing product surfaces.

AC-06: The feature is read-only and does not add create, edit, delete, AI, GitHub import, release automation, handoff generation, auth, teams, billing, deployment, schema, or dependency changes.

AC-07: The route is dynamic if Prisma runtime reads are used.

AC-08: README, architecture, MVP scope, and dogfooding docs are updated.

AC-09: pnpm verify passes.

AC-10: Planner, Builder, Tester, and Reviewer artifacts are created before PR.

## Out of scope

TASK-0009 must not implement:

- dashboard editing;
- creating tasks, decisions, releases, dogfooding entries, or specs;
- deleting data;
- AI summarization;
- GitHub import;
- release automation;
- handoff generator;
- auth;
- teams;
- billing;
- deployment;
- Prisma schema changes;
- dependency changes;
- replacing existing detail pages.

## Known risks

- Dashboard can easily become a bloated “god page”.
- Builder must keep it as an overview, not a second implementation of every detail page.
- The exact Prisma relation names and model fields must be inspected before implementation.
- Do not modify completed task artifacts/contracts.
- Do not change Prisma schema or dependencies.

## Dogfooding note

TASK-0009 is the first composition milestone after multiple narrow product surfaces. This is the right moment to test whether Forge can help compose product value without drifting into uncontrolled scope expansion.
