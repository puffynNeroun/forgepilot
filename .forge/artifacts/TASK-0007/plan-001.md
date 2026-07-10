---
schema_version: 1
task_id: TASK-0007
artifact_type: plan
attempt: 1
producing_role: planner
outcome: READY_FOR_APPROVAL
input_artifacts:
  []
---

# TASK-0007 Plan — Decision Log MVP

## Summary

TASK-0007 adds the fourth focused ForgePilot product surface: a read-only decision log page at `/decisions`.

Current surfaces:

- `/spec` — product spec editor.
- `/tasks` — task board MVP.
- `/dogfooding` — dogfooding log MVP.
- `/decisions` — planned decision log MVP.

The goal is to expose existing product and architecture decisions from the Prisma `Decision` model without expanding into a full dashboard or write flows.

## Product intent

The page should answer:

- What product/architecture decisions exist for ForgePilot?
- What was decided?
- Why was it decided?
- What status/type/category does the decision have?
- When was the decision created or updated?

This continues the pattern of focused read-only MVP surfaces before composing a larger dashboard.

## Implementation shape

Preferred files:

- `app/decisions/page.tsx`
- `app/decisions/loading.tsx`
- `components/decisions/DecisionLog.tsx`
- `components/decisions/DecisionStatusBadge.tsx`
- `lib/db/decisions.ts`

Home page should link to `/decisions`.

## Data strategy

Use the existing Prisma schema from TASK-0003.

Builder must inspect the actual `Decision` model before writing the data access layer.

Expected behavior:

1. Load the demo product by slug `forgepilot`.
2. Load decisions for that product.
3. Render title, summary/content, status/type/category, rationale, and timestamps where available.
4. If the database is unavailable, render a database-error state.
5. If the demo product is missing, render a setup state.
6. If no decisions exist, render an empty state.
7. Keep `pnpm verify` independent from a running PostgreSQL service.

Do not change `prisma/schema.prisma` in this task.

## UI plan

The `/decisions` page should include:

- Back/home navigation.
- Page title and short explanation.
- Optional summary cards:
  - total decisions;
  - accepted/active count if status exists;
  - proposed/pending count if status exists;
  - category/type count if fields exist.
- Decision cards with:
  - status badge;
  - title;
  - summary/content;
  - rationale/reason/context where available;
  - type/category where available;
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

    ƒ /decisions

## Acceptance criteria mapping

AC-01: `/decisions` route exists and is reachable from the home page.

AC-02: Decisions are loaded through `lib/db/decisions.ts`.

AC-03: UI renders decision cards with title, summary/content, status/type/category, rationale, and timestamps where available.

AC-04: Missing-product, empty-list, and database-error states are handled gracefully.

AC-05: The feature is read-only and does not add create, edit, delete, AI, GitHub import, or dashboard expansion.

AC-06: The route is dynamic if Prisma runtime reads are used.

AC-07: README and architecture/MVP docs are updated.

AC-08: Dogfooding friction from this task is recorded when relevant.

AC-09: `pnpm verify` passes.

AC-10: Planner, Builder, Tester, and Reviewer artifacts are created before PR.

## Out of scope

TASK-0007 must not implement:

- creating decisions from UI;
- editing decisions from UI;
- deleting decisions from UI;
- AI summarization;
- GitHub import;
- full dashboard composition;
- release timeline;
- handoff generator;
- auth;
- teams;
- billing;
- deployment;
- release;
- Prisma schema changes;
- dependency changes.

## Known risks

- The exact `Decision` model fields must be inspected before implementation.
- Decision field names may differ from the planned UI language.
- The UI can easily expand into full dashboard scope. Keep it focused.
- Do not modify completed task artifacts/contracts.
- Do not change Prisma schema or dependencies.

## Dogfooding note

TASK-0007 definition had the correct task board state immediately: Now showed TASK-0007 proposed, Next showed Run Planner for TASK-0007, and Forge Next recommended planning TASK-0007.
