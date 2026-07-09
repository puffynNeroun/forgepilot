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

### 2026-07-09 — Product foundation should happen before app bootstrap

Observation:

It is tempting to start TASK-0002 and create the Next.js app immediately.

Concrete friction:

- Starting implementation too early would make the architecture follow generated code instead of product decisions.
- The workflow needs a strong documentation foundation before framework setup.

Resolution for ForgePilot:

- TASK-0001 remains documentation-only.
- Next.js bootstrap is deferred to TASK-0002.

Potential Forge improvement:

Forge project templates could make the first product-definition task more explicit, with prompts that prevent premature application bootstrap.

### 2026-07-09 — First task used local-only completion because no GitHub remote existed

Observation:

TASK-0001 reached ready_for_pr, but ForgePilot did not yet have a GitHub remote.

Concrete friction:

- Forge recommended a completion PR.
- The repository was still local-only.
- TASK-0001 work had already been committed directly on local main during bootstrap.
- Creating a real PR for TASK-0001 would require artificial history manipulation.

Resolution for ForgePilot:

- TASK-0001 is completed locally as a bootstrap exception.
- Full GitHub remote and PR workflow should start before TASK-0002.

Potential Forge improvement:

Project Forge should document a clean bootstrap mode for the first local task, then switch to full GitHub Flow after the repository remote is created.

### 2026-07-09 — Local completion command failed despite visible Completed section

Observation:

The local completion command for TASK-0001 failed with:

    docs/TASKS.md is missing the Completed section.

However, manual inspection showed that docs/TASKS.md did contain a visible `## Completed` section.

Concrete friction:

- Forge contract validation passed.
- The lifecycle board reached ready_for_pr correctly.
- The completion command still refused to complete the task.
- The error message was clear, but misleading in this bootstrap state.
- Manual completion was safer than repeatedly retrying the same command.

Resolution for ForgePilot:

- TASK-0001 was completed manually by updating the task contract and task board to the canonical completed state.
- Forge validation was used as the safety check after manual completion.

Potential Forge improvement:

Project Forge should make `forge task complete` more robust around empty Completed sections and provide a clearer diagnostic showing the exact board parsing expectation.

