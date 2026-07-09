# Dogfooding Log

This file records friction, bugs, and improvement ideas discovered while building ForgePilot with Project Forge.

## Entries

### 2026-07-09 — Start dogfooding from Forge v0.5.0

Observation:

Forge v0.5.0 is stable enough to use as the base workflow for a real product.

Potential improvement areas to watch:

- command length;
- handoff prompt quality;
- clarity of lifecycle stages;
- whether validator catches real mistakes;
- whether PR/release flow feels too heavy for early product work;
- whether docs stay readable as product complexity grows.

### 2026-07-09 — Consumer bootstrap exposed repo-specific Forge assumptions

Observation:

Copying the Forge workflow core into ForgePilot also copied assumptions that belong to the original Forge repository, not to a consumer project.

Concrete friction:

- `pnpm -C tools/forge-validator verify` originally ran the internal Forge Validator test suite.
- Those tests expected old Forge tasks such as TASK-0030, TASK-0032, and TASK-0033.
- The copied GitHub Pages workflow was specific to the original Forge demo and not relevant to ForgePilot.

Resolution for ForgePilot:

- consumer `verify` now runs contract validation only;
- the copied Pages workflow was removed.

Potential Forge improvement:

Project Forge should eventually provide a clean consumer bootstrap command or template export that separates reusable workflow runtime from Forge's own internal validator test fixtures and demo workflows.

### 2026-07-09 — Generic task scaffold produced too narrow allowed_files

Observation:

The generated TASK-0001 contract initially allowed only the task file, task board, and lifecycle artifacts.

Concrete friction:

- The approved plan needed to update ForgePilot product docs.
- The task contract did not allow updates to docs/PRODUCT_SPEC.md, docs/ARCHITECTURE.md, docs/MVP_SCOPE.md, docs/DECISIONS.md, docs/DOGFOODING_LOG.md, or README.md.
- This created a mismatch between the plan and the task contract.

Resolution for ForgePilot:

- TASK-0001 allowed_files and acceptance criteria were expanded before Builder work started.

Potential Forge improvement:

The task scaffold command should support passing allowed files, scope, and acceptance criteria during task creation, or provide a safer guided task-definition mode for product/documentation tasks.
