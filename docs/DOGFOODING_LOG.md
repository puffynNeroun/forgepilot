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


### 2026-07-09 — Public dogfood repo needs explicit early-stage positioning

Observation:

Publishing ForgePilot before application code exists can look confusing unless the repository clearly explains that it is an early dogfood project.

Concrete friction:

- The repository currently contains workflow infrastructure, product docs, and lifecycle artifacts before app code.
- This is intentional for Forge dogfooding, but it may look unusual to outside readers.
- README positioning matters before public release.

Resolution for ForgePilot:

- Public publication is documented as a deliberate decision.
- README already states that TASK-0001 is product/architecture foundation and that no Next.js app exists yet.

Potential Forge improvement:

Project Forge templates could include a public-readiness checklist for dogfood/demo repositories, including README positioning, secret scan, remote setup, and first push checks.

### 2026-07-09 — Manual Next.js bootstrap is safer than create-next-app in a Forge repo

Observation:

ForgePilot already had Forge workflow files, Git history, task artifacts, and a public remote before the app existed.

Concrete friction:

- Running create-next-app directly in a non-empty Forge repository could create noisy or conflicting defaults.
- The task contract initially missed next-env.d.ts, a framework-required TypeScript file.
- Bootstrap tasks need extra care around framework-generated files and verification scripts.

Resolution for ForgePilot:

- TASK-0002 uses manual Next.js bootstrap.
- next-env.d.ts was added to TASK-0002 allowed_files.
- Root verification now covers Forge validation and application checks.

Potential Forge improvement:

Project Forge could provide framework bootstrap recipes that include common generated files, CI patterns, and verify script conventions.

### 2026-07-09 — pnpm strict build approval blocked Next.js bootstrap

Observation:

The first TASK-0002 Builder attempt failed during `pnpm install` because pnpm blocked dependency build scripts for sharp and unrs-resolver.

Concrete friction:

- The app shell files were created successfully.
- Installation still exited non-zero due to ignored build scripts.
- The Forge task remained approved and dirty, requiring recovery.
- Bootstrap instructions need to account for pnpm 11 build approval behavior.

Resolution for ForgePilot:

- Added explicit `allowBuilds` entries in pnpm-workspace.yaml for sharp and unrs-resolver.
- Re-ran installation and verification before staging Builder.

Potential Forge improvement:

Project Forge framework bootstrap recipes should include package-manager-specific supply-chain approval steps for common framework dependencies.

### 2026-07-09 — Avoid unpinned latest dependencies in generated app bootstrap

Observation:

The first TASK-0002 bootstrap used `latest` dependency ranges.

Concrete friction:

- `latest` makes future installs less reproducible.
- A public dogfood repo should make dependency resolution stable and reviewable.

Resolution for ForgePilot:

- Pinned the initially resolved package versions in package.json.

Potential Forge improvement:

Forge bootstrap guidance should prefer pinned versions or documented version policy instead of `latest` ranges.

### 2026-07-09 — Initial Next.js ESLint flat config used the wrong compatibility path

Observation:

TASK-0002 verification failed at `pnpm lint` with a circular JSON structure error inside ESLint.

Concrete friction:

- The app shell and dependency install recovered successfully.
- Forge contract validation passed.
- ESLint failed before TypeScript and Next build could run.
- The initial config used `FlatCompat` with Next configs, which is not the clean setup for the selected Next/ESLint version.

Resolution for ForgePilot:

- Replaced the ESLint config with the direct Next flat config style using `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.
- Re-ran full verification before staging Builder.

Potential Forge improvement:

Project Forge framework bootstrap recipes should include verified ESLint config templates for the current framework version instead of hand-written compatibility guesses.

### 2026-07-09 — Using latest ESLint pulled an incompatible major version

Observation:

TASK-0002 verification failed at lint after the first ESLint config recovery.

Concrete friction:

- `pnpm lint` used ESLint 10.6.0.
- The lint run failed inside eslint-plugin-react with `contextOrFilename.getFilename is not a function`.
- TypeScript checking passed.
- Next.js production build passed.
- The issue was isolated to the lint dependency/config combination.

Resolution for ForgePilot:

- Pinned ESLint to a stable 9.x version instead of using the latest major.
- Kept the direct Next flat config style.
- Added `*.tsbuildinfo` to .gitignore because Next/TypeScript generated it during build.

Potential Forge improvement:

Project Forge framework bootstrap recipes should avoid `latest` for lint/tooling dependencies and should include generated build-cache ignores such as `*.tsbuildinfo`.

### 2026-07-09 — Reviewer stage rerun is not idempotent

Observation:

After TASK-0002 had already reached `ready_for_pr`, rerunning the Reviewer stage command produced a failure message because the task was no longer `in_progress`.

Concrete friction:

- The repository state was already correct.
- TASK-0002 already had the review artifact.
- The task board already pointed to PR preparation.
- The rerun still printed a blocking-looking error: the task must be `in_progress` before reviewer transition.

Resolution for ForgePilot:

- Treated the error as harmless because the task was already in the expected `ready_for_pr` state.
- Continued to PR preparation after verifying the repository state.

Potential Forge improvement:

Project Forge stage commands could be idempotent for already-completed stages, or they could return a clearer message such as: "No action needed: task is already ready_for_pr."
