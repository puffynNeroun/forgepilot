---
schema_version: 1
task_id: TASK-0005
artifact_type: plan
attempt: 1
producing_role: planner
outcome: READY_FOR_APPROVAL
input_artifacts:
  []
---

# TASK-0005 Plan — Task Board MVP

## Summary

TASK-0005 will add the second focused ForgePilot product surface: a task board MVP at `/tasks`.

TASK-0004 created the product spec editor. TASK-0005 should now make ForgePilot feel more like a Forge workspace by showing task lifecycle state in the UI.

This task must stay narrow. It should not add lifecycle editing, GitHub import, AI generation, auth, teams, billing, release UI, or a full dashboard.

## Planning decision

Implement `/tasks` as a read-only, database-backed page where practical.

Preferred shape:

- Server component route: `app/tasks/page.tsx`.
- Dynamic route because task data is runtime state.
- Server-side data access module: `lib/db/tasks.ts`.
- UI components:
  - `components/tasks/TaskBoard.tsx`
  - `components/tasks/TaskCard.tsx`
  - `components/tasks/TaskStatusBadge.tsx`
  - `components/tasks/TaskBoardEmptyState.tsx`
- Home page link to `/tasks`.
- README/docs updates.
- Dogfooding log updates for any workflow friction.

## Data strategy

Use the existing Prisma schema from TASK-0003.

Preferred behavior:

1. Try to load the demo ForgePilot product by slug `forgepilot`.
2. Load its Forge tasks ordered by lifecycle relevance and creation/update time.
3. Render task title, status, task id, and useful metadata.
4. If the database or seeded data is unavailable, render a graceful setup/empty state.
5. Do not require the database for `pnpm verify`.

Do not change `prisma/schema.prisma` in this task unless a hard blocker appears.

## UI plan

The `/tasks` page should include:

- Back/home navigation.
- Page title and short explanation.
- Task summary strip if cheap:
  - total tasks;
  - active/in-progress count;
  - completed count.
- Task cards grouped or listed by status.
- Status badge with clear visual distinction.
- Empty state with local setup commands.

Recommended status order:

1. proposed
2. approved
3. in_progress
4. ready_for_pr
5. completed
6. cancelled

## Runtime setup commands in empty state

Use the same local demo pattern as `/spec`:

    docker compose up -d postgres
    pnpm db:push
    pnpm db:seed
    pnpm dev

## Verification plan

Builder/Tester/Reviewer should verify:

- pnpm install --frozen-lockfile
- pnpm db:validate
- pnpm db:generate
- docker compose -f docker-compose.yml config
- pnpm lint
- pnpm typecheck
- pnpm build
- pnpm verify

The build output should show `/tasks` as dynamic if it performs Prisma runtime reads.

## Acceptance criteria mapping

AC-01: Add `/tasks` route and link it from home.

AC-02: Render task board/list UI with id, title, status, and useful metadata.

AC-03: Load task data through `lib/db/tasks.ts`.

AC-04: Add graceful empty/database-error state.

AC-05: Keep the feature read-only and avoid lifecycle editing or dashboard expansion.

AC-06: Mark route dynamic if Prisma runtime reads are used.

AC-07: Update README and architecture/MVP docs.

AC-08: Record dogfooding friction.

AC-09: Keep `pnpm verify` green.

AC-10: Create Planner, Builder, Tester, and Reviewer artifacts.

AC-11: Do not modify completed task contracts/artifacts.

## Out-of-scope boundaries

TASK-0005 must not implement:

- task creation from UI;
- task status editing from UI;
- task deletion from UI;
- GitHub issue/PR import;
- AI generation;
- full dashboard;
- decision log UI;
- dogfooding log UI;
- release timeline;
- handoff generator;
- auth;
- teams;
- billing;
- deployment;
- release.

## Known risks

- Prisma model field names may differ from assumptions. Builder should inspect `prisma/schema.prisma` before writing the data access layer.
- A database-backed route can accidentally become static. Keep `dynamic = "force-dynamic"` if using Prisma in the page.
- Task board UI can easily expand into dashboard scope. Keep it read-only and focused.
- Do not break the existing `/spec` route.

## Expected outcome

After TASK-0005, ForgePilot should have:

- Home page with links to `/spec` and `/tasks`.
- Read-only task board MVP at `/tasks`.
- Runtime DB-backed loading where available.
- Graceful setup/error/empty states.
- Green verification.
- Complete Forge lifecycle artifacts through Reviewer.
