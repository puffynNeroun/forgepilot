---
schema_version: 1
task_id: TASK-0011
artifact_type: plan
attempt: 1
producing_role: planner
outcome: READY_FOR_APPROVAL
input_artifacts:
  []
---

# TASK-0011 Plan — Fix local Postgres Docker config

## Summary

Fix ForgePilot local PostgreSQL startup under postgres:18.

The issue was discovered after TASK-0010 completion while opening DB-backed local pages. The application itself was valid, but the local Postgres container entered a restart loop because docker-compose.yml mounted the persistent volume at `/var/lib/postgresql/data`.

Postgres 18 Docker images reject that old layout and require the persistent mount at `/var/lib/postgresql`.

## Current observed failure

The broken local container produced repeated errors saying that in postgres 18+ the image stores database data using major-version-specific directory names and that data in `/var/lib/postgresql/data` is an unused mount/volume.

The practical result:

- forgepilot_postgres restarted continuously;
- `pnpm db:push` could not reach localhost:5434;
- `pnpm db:seed` could not reach localhost:5434;
- DB-backed pages showed database errors in dev.

## Implementation plan

Builder should:

1. Keep the existing postgres:18 image.
2. Update docker-compose.yml volume target from:

   `/var/lib/postgresql/data`

   to:

   `/var/lib/postgresql`

3. Keep the existing port, credentials, container name, healthcheck, and volume name.
4. Document the issue and fix in docs/DOGFOODING_LOG.md.
5. Avoid Prisma schema changes, dependency changes, UI changes, and release/deploy work.

## Verification plan

Builder/Tester/Reviewer should verify:

1. `docker compose config` passes.
2. `docker compose down -v` removes the broken local dev volume.
3. `docker compose up -d postgres` starts a fresh postgres container.
4. forgepilot_postgres reaches healthy status.
5. `docker exec forgepilot_postgres pg_isready -U forgepilot -d forgepilot` succeeds.
6. `docker exec forgepilot_postgres psql -U forgepilot -d forgepilot -c "select 1;"` succeeds.
7. `pnpm db:push` succeeds.
8. `pnpm db:seed` succeeds.
9. `pnpm verify` succeeds.
10. DB-backed pages can be opened locally without DATABASE_URL or database reachability errors.

## Scope boundaries

Allowed changes:

- docker-compose.yml
- docs/DOGFOODING_LOG.md
- TASK-0011 task/artifacts
- docs/TASKS.md

Forbidden changes:

- prisma/schema.prisma
- package.json
- pnpm-lock.yaml
- application UI files
- lib data access files
- Forge validator internals
- release/deployment automation

## Risk notes

`docker compose down -v` is destructive for the local dev database volume. This is acceptable for this task because the local database is seeded demo data and the broken volume cannot be used.

No production data or remote database is involved.
