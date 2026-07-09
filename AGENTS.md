# AGENTS.md

## Project

ForgePilot is an AI-assisted product development dashboard built through the Project Forge workflow.

## Working rules

- Use specs-first development.
- Keep tasks small and reviewable.
- Do not skip Forge lifecycle artifacts.
- Do not mix this repository with the original Project Forge repository.
- Do not push, create PRs, merge, release, or deploy without explicit human approval.
- Record workflow friction in docs/DOGFOODING_LOG.md.

## Canonical documents

- Product spec: docs/PRODUCT_SPEC.md
- Architecture: docs/ARCHITECTURE.md
- MVP scope: docs/MVP_SCOPE.md
- Tasks: docs/TASKS.md
- Decisions: docs/DECISIONS.md
- Dogfooding log: docs/DOGFOODING_LOG.md

## Commands

Install validator dependencies:

    pnpm -C tools/forge-validator install --frozen-lockfile

Check status:

    node tools/forge-validator/src/cli.mjs status

Run verification:

    pnpm -C tools/forge-validator verify
