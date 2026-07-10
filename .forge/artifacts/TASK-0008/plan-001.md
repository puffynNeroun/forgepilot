---
schema_version: 1
task_id: TASK-0008
artifact_type: plan
attempt: 1
producing_role: planner
outcome: READY_FOR_APPROVAL
input_artifacts:
  []
---

# TASK-0008 Plan — Release Timeline MVP

## Summary

TASK-0008 adds a focused read-only release timeline page at /releases.

The goal is to expose existing ProductRelease data without publishing real releases, creating tags, deploying, or adding release automation.

## Current surfaces

- /spec — product spec editor.
- /tasks — task board MVP.
- /dogfooding — dogfooding log MVP.
- /decisions — decision log MVP.
- /releases — planned release timeline MVP.

## Product intent

The page should answer:

- What releases exist for ForgePilot?
- Which releases are planned, in progress, released, or cancelled?
- What version/name/title does each release have?
- What notes, summary, or description exists for each release?
- What date fields and timestamps are available?

## Implementation shape

Preferred files:

- app/releases/page.tsx
- app/releases/loading.tsx
- components/releases/ReleaseTimeline.tsx
- components/releases/ReleaseStatusBadge.tsx
- lib/db/releases.ts

The home page should link to /releases.

## Data strategy

Builder must inspect the actual Prisma ProductRelease model before writing code.

Expected behavior:

1. Load the demo product by slug forgepilot.
2. Load product releases for that product.
3. Map available release fields into a stable UI shape.
4. Render version/name/title, status, notes/summary, date fields, createdAt, and updatedAt where available.
5. Render database-error state if the DB is unavailable.
6. Render missing-product state if the demo product is missing.
7. Render empty state if no releases exist.
8. Keep pnpm verify independent from a running PostgreSQL service.

Do not change prisma/schema.prisma.

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

The build output should show dynamic /releases.

## Acceptance criteria mapping

AC-01: /releases route exists and is reachable from the home page.

AC-02: Releases are loaded through lib/db/releases.ts.

AC-03: UI renders release timeline/cards with name/version/title, status, notes/summary, date fields, and timestamps where available.

AC-04: Missing-product, empty-list, and database-error states are handled gracefully.

AC-05: The feature is read-only and does not add create, edit, delete, release publishing, tags, deployment, AI, GitHub import, or dashboard expansion.

AC-06: The route is dynamic if Prisma runtime reads are used.

AC-07: README and architecture/MVP docs are updated.

AC-08: Dogfooding friction from this task is recorded when relevant.

AC-09: pnpm verify passes.

AC-10: Planner, Builder, Tester, and Reviewer artifacts are created before PR.

## Out of scope

TASK-0008 must not implement:

- release creation UI;
- release editing UI;
- release deletion UI;
- GitHub release publishing;
- git tags;
- deployment;
- AI summarization;
- GitHub import;
- dashboard composition;
- handoff generator;
- auth;
- teams;
- billing;
- release automation;
- Prisma schema changes;
- dependency changes.

## Known risks

- ProductRelease field names must be inspected before implementation.
- The task must not drift into real release automation.
- Do not modify completed task artifacts/contracts.
- Do not change Prisma schema or dependencies.

## Dogfooding note

TASK-0008 is intentionally scoped as read-only release visibility. Real release automation is a separate higher-risk future task.
