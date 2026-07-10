---
schema_version: 1
task_id: TASK-0010
artifact_type: plan
attempt: 1
producing_role: planner
outcome: READY_FOR_APPROVAL
input_artifacts:
  []
---

# TASK-0010 Plan — Handoff Summary MVP

## Summary

TASK-0010 adds a read-only handoff summary page at /handoff.

The feature should create a deterministic, copyable markdown-style summary of the current ForgePilot product state. It must not use AI, must not persist handoff snapshots, and must not introduce new write workflows.

## Product intent

The page should help continue ForgePilot work in a new AI chat.

It should answer:

- What is this product?
- What surfaces exist?
- What is the current spec state?
- What tasks exist and how many are in each status?
- What dogfooding entries exist and how many are in each severity?
- How many decisions exist?
- How many releases exist and how many are in each status?
- Is the dashboard available?
- What should a new AI chat know before continuing work?

## Existing surfaces

Current ForgePilot surfaces:

- /spec
- /tasks
- /dogfooding
- /decisions
- /releases
- /dashboard

New surface:

- /handoff

## Implementation shape

Preferred files:

- app/handoff/page.tsx
- app/handoff/loading.tsx
- components/handoff/HandoffSummary.tsx
- components/handoff/HandoffCopyBlock.tsx
- lib/db/handoff.ts

The home page should link to /handoff.

## Data strategy

Builder must inspect actual Prisma models before implementing the data layer.

Expected behavior:

1. Load demo product by slug forgepilot.
2. Read summary data from existing models:
   - Product
   - ProductSpec
   - ForgeTask
   - DogfoodingEntry
   - Decision
   - ProductRelease
3. Return a stable handoff data shape from lib/db/handoff.ts.
4. Build a deterministic markdown-style handoff string from the loaded data.
5. Render that summary in a copyable block.
6. Handle missing-product and database-error states.
7. Keep the feature read-only.

Do not change prisma/schema.prisma.

Do not use the existing HandoffSnapshot model in this MVP, because the task explicitly excludes persistence.

## UI plan

The /handoff page should include:

- Back/home navigation.
- Page title and short explanation.
- Product identity summary.
- Copyable markdown-style handoff block.
- Small helper text explaining that the output is deterministic and not AI-generated.
- Links back to dashboard and detail surfaces.

The copyable block can be a readonly textarea or preformatted block. A client-side copy button is acceptable if it does not introduce persistence or server actions.

## Handoff content shape

The generated handoff text should include sections like:

- Product
- Current surfaces
- Product spec
- Task summary
- Dogfooding summary
- Decisions
- Releases
- Suggested next step

The text should be stable and predictable so it can be pasted into a new AI chat.

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

The build output should show dynamic /handoff.

## Acceptance criteria mapping

AC-01: /handoff route exists and is reachable from the home page.

AC-02: Handoff data is loaded through lib/db/handoff.ts.

AC-03: The page renders a copyable markdown-style handoff summary.

AC-04: The handoff summarizes product identity, spec state, tasks, dogfooding, decisions, releases, and dashboard availability.

AC-05: Missing-product and database-error states are handled gracefully.

AC-06: The feature is read-only and does not add AI generation, persistence, create, edit, delete, GitHub import, release automation, deployment, schema, or dependency changes.

AC-07: The route is dynamic if Prisma runtime reads are used.

AC-08: README, architecture, MVP scope, and dogfooding docs are updated.

AC-09: pnpm verify passes.

AC-10: Planner, Builder, Tester, and Reviewer artifacts are created before PR.

## Out of scope

TASK-0010 must not implement:

- AI-generated summaries;
- saving handoff snapshots;
- editing handoff snapshots;
- deleting handoff snapshots;
- database writes;
- GitHub import;
- release automation;
- deployment;
- auth;
- teams;
- billing;
- permissions;
- Prisma schema changes;
- dependency changes;
- replacing the dashboard;
- replacing detail pages.

## Known risks

- The feature can accidentally drift into AI summarization. Keep it deterministic.
- The existing HandoffSnapshot model can tempt persistence. Do not use it in this MVP.
- Copy-to-clipboard UI may require a client component, but the data loading should stay server-side.
- Handoff text should not become a giant dump. Keep it concise and useful.
- Builder must inspect actual schema fields before implementation.

## Dogfooding note

TASK-0010 tests whether ForgePilot can support the practical “new chat handoff” workflow without relying on AI generation. This is useful because handoff quality is one of the biggest productivity bottlenecks in long AI-assisted development sessions.
