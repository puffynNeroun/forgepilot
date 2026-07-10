---
schema_version: 1
task_id: TASK-0006
artifact_type: plan
attempt: 1
producing_role: planner
outcome: READY_FOR_APPROVAL
input_artifacts:
  []
---

# TASK-0006 Plan — Dogfooding Log MVP

## Summary

TASK-0006 adds the third focused ForgePilot product surface: a read-only dogfooding log page at `/dogfooding`.

TASK-0004 added `/spec`.
TASK-0005 added `/tasks`.
TASK-0006 should make workflow friction visible inside the product instead of leaving it only in markdown logs.

## Product intent

The page should answer:

- What friction did we hit while dogfooding Forge?
- How severe was it?
- What was the resolution?
- What improvement should Project Forge consider next?

This directly supports ForgePilot's purpose as a dogfooding dashboard for AI-assisted product development.

## Implementation shape

Preferred files:

- `app/dogfooding/page.tsx`
- `app/dogfooding/loading.tsx`
- `components/dogfooding/DogfoodingLog.tsx`
- `components/dogfooding/DogfoodingSeverityBadge.tsx`
- `lib/db/dogfooding.ts`

Home page should link to `/dogfooding`.

## Data strategy

Use the existing Prisma schema from TASK-0003.

Builder must inspect the actual `DogfoodingEntry` model before writing the data access layer.

Expected behavior:

1. Load the demo product by slug `forgepilot`.
2. Load dogfooding entries for that product.
3. Render severity, title, observation, resolution, and potential improvement where available.
4. If the database is unavailable, render a database-error state.
5. If the demo product is missing, render a setup state.
6. If no entries exist, render an empty state.
7. Keep `pnpm verify` independent from a running PostgreSQL service.

Do not change `prisma/schema.prisma` in this task.

## UI plan

The `/dogfooding` page should include:

- Back/home navigation.
- Page title and short explanation.
- Optional summary cards:
  - total findings;
  - high/critical count;
  - resolved count if a field exists;
  - improvement candidates.
- Finding cards with:
  - severity badge;
  - title;
  - observation;
  - resolution;
  - potential Forge improvement;
  - date/updated metadata where available.

## Route behavior

If Prisma runtime reads are used, the route must be dynamic:

- `export const dynamic = "force-dynamic"`
- `export const runtime = "nodejs"`

## Verification plan

Tester and Reviewer should verify:

- `pnpm install --frozen-lockfile`
- `pnpm db:validate`
- `pnpm db:generate`
- `docker compose -f docker-compose.yml config`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm verify`

The build output should show:

    ƒ /dogfooding

## Acceptance criteria mapping

AC-01: `/dogfooding` route exists and is reachable from the home page.

AC-02: Dogfooding entries are loaded through `lib/db/dogfooding.ts`.

AC-03: UI renders dogfooding findings with severity, title, observation, resolution, and potential Forge improvement where available.

AC-04: Missing-product, empty-list, and database-error states are handled gracefully.

AC-05: The feature is read-only and does not add create, edit, delete, AI, GitHub import, or dashboard expansion.

AC-06: The route is dynamic if Prisma runtime reads are used.

AC-07: README and architecture/MVP docs are updated.

AC-08: Dogfooding friction from this task is recorded when relevant.

AC-09: `pnpm verify` passes.

AC-10: Planner, Builder, Tester, and Reviewer artifacts are created before PR.

## Out of scope

TASK-0006 must not implement:

- creating dogfooding entries from UI;
- editing dogfooding entries from UI;
- deleting dogfooding entries from UI;
- AI summarization;
- GitHub import;
- full dashboard composition;
- release timeline;
- handoff generator;
- auth;
- teams;
- billing;
- deployment;
- release.

## Known risks

- The exact `DogfoodingEntry` model fields must be inspected before implementation.
- The UI can easily expand into full dashboard scope. Keep it focused.
- Do not modify completed task artifacts/contracts.
- Do not change Prisma schema or dependencies.

## Dogfooding note

After TASK-0006 definition, `Forge Next` correctly recommended planning TASK-0006, but the task board text showed `Define the next task`. This looks like a status rendering inconsistency worth recording.
