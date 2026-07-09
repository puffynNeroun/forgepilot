---
schema_version: 1
task_id: TASK-0001
artifact_type: plan
attempt: 1
producing_role: planner
outcome: READY_FOR_APPROVAL
input_artifacts:
  []
---

# TASK-0001 Plan — Define ForgePilot product spec and architecture

## Summary

TASK-0001 will turn the initial ForgePilot idea into a clear product and architecture foundation.

This task will not implement the Next.js application. It will define the product boundaries, architecture direction, MVP model, decision history, and dogfooding rules required before application bootstrap work starts.

## Planned files

Expected documentation updates:

- docs/PRODUCT_SPEC.md
- docs/ARCHITECTURE.md
- docs/MVP_SCOPE.md
- docs/DECISIONS.md
- docs/DOGFOODING_LOG.md
- docs/TASKS.md
- .forge/tasks/TASK-0001.yaml
- .forge/artifacts/TASK-0001/plan-001.md

No application runtime files should be introduced in this task.

## Implementation approach

The Builder stage should refine the product foundation, not build UI or backend code.

The work should define:

1. Product direction

   - what ForgePilot is;
   - who it is for;
   - what problem it solves;
   - why it exists as a dogfood project for Project Forge.

2. MVP scope

   - what must be included in v0.1.0;
   - what must stay out of v0.1.0;
   - how to avoid overbuilding a SaaS too early.

3. Architecture direction

   - expected Next.js App Router structure;
   - planned modules;
   - planned data entities;
   - validation/database/UI boundaries;
   - local development expectations.

4. Dogfooding policy

   - what types of Forge workflow friction should be recorded;
   - how dogfooding findings should later become Forge improvement tasks.

5. Task roadmap

   - confirm or adjust the initial ForgePilot roadmap;
   - keep TASK-0002 focused on bootstrap only, not full product implementation.

## Documentation approach

Documentation should be written as practical working docs, not marketing text.

The docs should help a future AI chat or developer understand:

- current product state;
- what has already been decided;
- what is intentionally out of scope;
- how future tasks should be sliced;
- what risks must be watched during implementation.

## Testing approach

Since this is a planning/documentation task, testing means contract and workflow verification.

Required checks:

- node tools/forge-validator/src/cli.mjs status
- pnpm -C tools/forge-validator verify
- node tools/forge-validator/src/cli.mjs next

The expected result is that Forge contract validation passes and TASK-0001 moves from proposed to approved.

## Out-of-scope boundaries

TASK-0001 must not:

- create the Next.js app;
- install Next.js, React, Tailwind, Prisma, or Zod;
- create database schema files;
- create GitHub remote;
- push commits;
- create PRs;
- release anything;
- build auth, billing, teams, or GitHub import logic.

## Expected outcome

After TASK-0001 planning:

- plan-001.md exists with outcome READY_FOR_APPROVAL;
- TASK-0001 is approved;
- docs/TASKS.md points to the Builder stage;
- verification passes;
- the repository is ready for the Builder stage of TASK-0001.
