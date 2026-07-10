---
schema_version: 1
task_id: TASK-0004
artifact_type: plan
attempt: 1
producing_role: planner
outcome: READY_FOR_APPROVAL
input_artifacts:
  []
---

# TASK-0004 Plan — Product Spec Editor

## Summary

TASK-0004 will implement the first real ForgePilot product feature: a product spec editor.

The feature should let the user open a dedicated product spec page, view the current ForgePilot demo product spec, edit title/content, validate the input, save changes through server-side persistence, and keep the app verification pipeline green.

The task must stay focused. It should not become a full dashboard, auth system, AI generation feature, task board, or multi-product management interface.

## Planning decision

Implement the editor as a small Next.js App Router feature using the existing Prisma foundation from TASK-0003.

Preferred direction:

- Use a dedicated route: `/spec`.
- Use a server component page for loading initial data.
- Use a server action for saving updates.
- Use a small client component for the editable form.
- Use a Zod validator for product spec title/content.
- Use a narrow data access module in `lib/db/product-specs.ts`.

This keeps the feature simple, testable, and aligned with the existing architecture.

## Data behavior

TASK-0004 should work with the existing seeded/demo ForgePilot product.

Expected behavior:

1. Find the demo product by slug `forgepilot`.
2. Load its latest product spec by version or createdAt.
3. Render the spec editor.
4. Save title/content updates to the existing spec record.
5. If no product/spec exists, show a graceful empty state with local setup guidance.

Do not create multi-product UX in this task.

## Route and component plan

Expected files:

- `app/spec/page.tsx`
- `app/spec/actions.ts`
- `components/spec/ProductSpecEditor.tsx`
- `components/spec/ProductSpecStatus.tsx`
- `lib/db/product-specs.ts`
- `lib/validators/product-spec.ts`

Optional if useful:

- `app/api/spec/route.ts`

Prefer server actions over route handlers unless route handlers make the implementation clearer.

## Validation plan

Use Zod for validation.

Suggested schema:

- title: string, trimmed, minimum length 3, maximum length 120.
- content: string, trimmed, minimum length 20, maximum length suitable for MVP demo usage.

Validation should run server-side before persistence.

Client-side validation can be minimal; do not overbuild form libraries.

## UX plan

The editor should be simple but useful.

Expected page sections:

- Page title.
- Short explanation of what the product spec is.
- Current spec status/version.
- Editable title input.
- Editable content textarea.
- Save button.
- Success/error message.
- Empty state when demo data is missing.

The editor should be reachable from the existing home page or app shell.

## Persistence plan

Use Prisma through existing `lib/prisma.ts`.

Data access should be isolated in `lib/db/product-specs.ts`.

Suggested exported functions:

- `getCurrentProductSpec()`
- `updateCurrentProductSpec(input)`

Keep the functions narrow and explicit.

Do not add migrations or schema changes unless absolutely necessary. TASK-0003 schema should already support the required behavior.

## Documentation plan

Update README with:

- how to access the product spec editor;
- note that database must be running and seeded for the full editor demo;
- commands:
  - `docker compose up -d postgres`
  - `pnpm db:push`
  - `pnpm db:seed`
  - `pnpm dev`

Update docs only if needed:

- `docs/ARCHITECTURE.md` for first feature/data access layer note.
- `docs/MVP_SCOPE.md` for product spec editor boundary.
- `docs/DOGFOODING_LOG.md` for any friction.

## Verification plan

Builder should verify:

- `pnpm install --frozen-lockfile`
- `pnpm db:validate`
- `pnpm db:generate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm verify`

Optional local database runtime checks are allowed only if safe:

- `docker compose config`
- do not require `db:push` or `db:seed` inside default verification.

## Acceptance criteria mapping

AC-01: Add reachable `/spec` page and link it from the app.

AC-02: Load current/demo ForgePilot product spec through the data layer.

AC-03: Add editable title/content form and save behavior.

AC-04: Use Prisma server-side persistence safely.

AC-05: Add Zod validation for title/content.

AC-06: Add graceful empty/error/success states.

AC-07: Avoid unrelated features: auth, dashboard, task board, decision log, release timeline, AI generation, etc.

AC-08: Keep `pnpm verify` green.

AC-09: Update README/docs.

AC-10: Record workflow friction in dogfooding log.

AC-11: Create Planner, Builder, Tester, and Reviewer artifacts.

## Out-of-scope boundaries

TASK-0004 must not implement:

- full dashboard;
- task lifecycle board;
- decision log UI;
- dogfooding log UI;
- release timeline UI;
- handoff prompt generator;
- multi-product CRUD;
- authentication;
- teams;
- billing;
- AI spec generation;
- GitHub import automation;
- production deployment;
- release.

## Risks

Main risks:

- accidentally requiring a running database for `pnpm verify`;
- overbuilding the editor into a dashboard;
- adding schema changes unnecessarily;
- making the client component too complex;
- introducing server action typing issues with Next.js;
- Prisma warning noise still appearing during verify.

## Expected outcome

After TASK-0004:

- ForgePilot has its first real editable product feature.
- The app has a reachable product spec editor.
- The editor persists updates through Prisma.
- Validation and basic states are implemented.
- Documentation explains local usage.
- Verification remains green.
- The feature is ready for Builder.
