---
schema_version: 1
task_id: TASK-0002
artifact_type: plan
attempt: 1
producing_role: planner
outcome: READY_FOR_APPROVAL
input_artifacts:
  []
---

# TASK-0002 Plan — Bootstrap Next.js App with CI and Base Layout

## Summary

TASK-0002 will create the first real application shell for ForgePilot.

This task should bootstrap a minimal Next.js App Router project inside the existing ForgePilot repository without replacing or damaging the Forge workflow files.

The result should be a working app foundation, not product feature implementation.

## Key planning decision

Do not run create-next-app directly in the repository root.

Reason:

- the repository already exists;
- it already contains Forge workflow files;
- it already has Git history;
- create-next-app may generate defaults that conflict with our existing structure;
- manual bootstrap is safer and easier to review.

Instead, Builder should manually add the minimal application files and dependencies required for a working Next.js shell.

## Planned files

Expected new or updated files:

- package.json
- pnpm-lock.yaml
- pnpm-workspace.yaml
- next.config.ts
- tsconfig.json
- eslint.config.mjs
- postcss.config.mjs
- tailwind.config.ts
- app/layout.tsx
- app/page.tsx
- app/globals.css
- components/layout/AppShell.tsx
- components/ui/StatusBadge.tsx
- lib/utils.ts
- .env.example
- README.md
- docs/ARCHITECTURE.md
- docs/MVP_SCOPE.md
- docs/DOGFOODING_LOG.md
- .forge/project.yaml
- .github/workflows/forge-contracts.yml
- .github/workflows/app-ci.yml
- docs/TASKS.md
- .forge/tasks/TASK-0002.yaml
- .forge/artifacts/TASK-0002/build-report-001.md
- .forge/artifacts/TASK-0002/test-report-001.md
- .forge/artifacts/TASK-0002/review-report-001.md

## Implementation approach

Builder should create a minimal but real app shell.

### 1. Root package setup

Add root package configuration with scripts such as:

- dev
- build
- lint
- typecheck
- app:verify
- forge:verify
- verify

The final verify command should cover:

- Forge contract validation;
- app lint/checks;
- TypeScript checking;
- Next.js build.

Exact script names can be adjusted during Builder work if the final setup is cleaner.

### 2. Dependency setup

Add only the dependencies required for the bootstrap shell.

Expected dependency groups:

Runtime:

- next
- react
- react-dom

Development:

- typescript
- eslint
- eslint-config-next
- tailwindcss
- postcss
- autoprefixer
- relevant React/Node type packages

Do not add Prisma, PostgreSQL, Zod, auth, or feature-specific libraries in TASK-0002.

### 3. App Router shell

Create a minimal App Router structure:

- app/layout.tsx
- app/page.tsx
- app/globals.css

The home page should clearly state:

- ForgePilot is an early dogfood dashboard;
- TASK-0001 completed the product foundation;
- TASK-0002 is bootstrapping the app shell;
- product features come later.

### 4. Base components

Add only tiny base components needed for the shell:

- AppShell
- StatusBadge

Avoid building dashboard feature modules in this task.

### 5. Verification manifest

Update .forge/project.yaml so ForgePilot verify uses the root project verify command once it exists.

The expected direction:

- install: pnpm install --frozen-lockfile
- build: pnpm build
- typecheck: pnpm typecheck
- test: null unless real tests exist
- verify: pnpm verify

The root verify script should call Forge validation and app checks.

### 6. CI

Update CI so GitHub PRs and pushes validate the actual app bootstrap, not just Forge contracts.

Possible approach:

- keep .github/workflows/forge-contracts.yml if useful;
- add .github/workflows/app-ci.yml for install/typecheck/lint/build/verify;
- or consolidate carefully if simpler.

The result must be clear and reproducible.

### 7. Documentation

Update README with:

- install command;
- dev command;
- verify command;
- current project stage;
- reminder that feature modules are not implemented yet.

Update architecture/MVP docs only if the bootstrap changes the planned structure.

### 8. Dogfooding

Record workflow friction if any of these happen:

- Next.js bootstrap is awkward because repo is not empty;
- Forge verify configuration is unclear;
- CI split between Forge and app is confusing;
- allowed_files needs further refinement;
- commands become too long or noisy.

## Documentation approach

Documentation should explain the difference between:

- Forge workflow infrastructure;
- ForgePilot application shell;
- future product features.

README should help a new developer understand how to install, run, and verify the project.

## Testing approach

Testing for TASK-0002 means bootstrap verification, not product behavior testing.

Required checks should include:

- pnpm install --frozen-lockfile
- pnpm verify
- pnpm build
- node tools/forge-validator/src/cli.mjs status
- node tools/forge-validator/src/cli.mjs next

If lint/typecheck are separate scripts, they should be included in pnpm verify.

## Out-of-scope boundaries

TASK-0002 must not:

- implement product dashboard data logic;
- implement product spec editor;
- implement task lifecycle board;
- implement decision log;
- implement dogfooding log UI;
- implement handoff prompt generator;
- implement release timeline UI;
- add database schema;
- add Prisma;
- add PostgreSQL;
- add auth;
- add billing;
- add GitHub import automation;
- create release;
- deploy.

## Expected outcome

After TASK-0002:

- a minimal Next.js App Router app exists;
- the app builds locally;
- root package scripts exist;
- ForgePilot verify covers both Forge contract validation and app bootstrap checks;
- CI validates the app and Forge contracts;
- README explains local usage;
- no product features are implemented yet;
- TASK-0002 is ready for PR review.
