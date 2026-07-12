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

### 2026-07-09 — TASK-0002 completion requires a separate post-merge PR

Observation:

After the TASK-0002 implementation PR was merged, the task remained `ready_for_pr` on main and Forge correctly recommended a separate completion PR.

Concrete friction:

- Implementation merge and lifecycle completion are two separate steps.
- This is correct for auditability, but it adds another PR after the implementation PR.
- The workflow is explicit, but operators need to understand that merge does not automatically mean task completion.

Resolution for ForgePilot:

- Created a dedicated completion branch for TASK-0002.
- Marked TASK-0002 as completed only after the implementation PR was merged and main verification passed.

Potential Forge improvement:

Project Forge could make the implementation-merge-to-completion-PR transition more guided, including a clearer post-merge command sequence.

### 2026-07-09 — Prisma bootstrap pulled another package-manager build approval case

Observation:

TASK-0003 Prisma bootstrap initially failed because `tsx` pulled `esbuild`, and pnpm blocked the esbuild build script.

Concrete friction:

- Prisma dependencies were partially added.
- The Builder stage stopped before database files were written.
- The working tree was left dirty with package and lockfile updates only.
- This is similar to the TASK-0002 sharp/unrs-resolver build approval friction.

Resolution for ForgePilot:

- Added `esbuild` to pnpm-workspace.yaml allowBuilds.
- Pinned Prisma and tsx versions exactly.
- Continued Builder only after installation recovered.

Potential Forge improvement:

Project Forge framework/bootstrap recipes should maintain known package-manager approval lists for common stacks such as Next.js, Prisma, and tsx.

### 2026-07-09 — Database bootstrap needs separate safe checks and local-service checks

Observation:

Adding Prisma/PostgreSQL introduces commands that have different runtime requirements.

Concrete friction:

- Prisma schema validation and client generation can run safely in normal verification.
- db push, seed, and studio require a local PostgreSQL service.
- If these command types are mixed together, CI becomes flaky or requires unnecessary service setup.

Resolution for ForgePilot:

- `pnpm verify` includes Prisma validation and generation.
- Database runtime commands remain explicit local commands.
- Docker Compose setup is documented but not required for normal verification.

Potential Forge improvement:

Project Forge task planning could include a standard "service-dependent checks" section so CI-safe checks and local runtime checks are not mixed accidentally.

### 2026-07-09 — Docker Compose config check needs better error capture

Observation:

TASK-0003 Builder initially blocked at `docker compose config`, but the command redirected stdout and did not show stderr in the terminal output.

Concrete friction:

- Prisma schema validation passed.
- Prisma Client generation passed.
- Docker Compose config returned a non-zero exit code.
- The first recovery output did not include the actual Docker Compose error.
- This made it unclear whether the issue was a compose-file problem or an environment/plugin/runtime problem.

Resolution for ForgePilot:

- Added a recovery step that captures Docker Compose version output and config stderr.
- Treats Docker Compose environment availability issues separately from actual compose-file validation errors.
- Keeps `pnpm verify` independent from Docker runtime availability.

Potential Forge improvement:

Project Forge database/bootstrap recipes should capture stderr for optional service checks and classify failures as either project-config failures or local-environment failures.

Docker Compose recovery classification for this run:

- Result: valid

### 2026-07-09 — Prisma package.json seed config is deprecated

Observation:

TASK-0003 verification passes, but Prisma prints a warning that `package.json#prisma` is deprecated and will be removed in Prisma 7.

Concrete friction:

- `pnpm db:validate` passes.
- `pnpm db:generate` passes.
- `pnpm verify` passes.
- The current seed configuration still creates forward-compatibility noise.

Resolution for ForgePilot:

- Kept the current Prisma 6-compatible seed setup in TASK-0003 because it is non-blocking and verification is green.
- Recorded the warning as technical debt before moving to Tester.

Potential Forge improvement:

Project Forge Prisma bootstrap recipes should prefer the current Prisma config-file pattern instead of `package.json#prisma`, or explicitly pin the recipe to Prisma 6 behavior.


### 2026-07-09 — Tester stage transition output can look like a no-op

Observation:

TASK-0003 Tester stage transitioned successfully, but the command printed status `in_progress -> in_progress`.

Concrete friction:

- The actual workflow state advanced because Forge Next changed from Tester to Reviewer.
- The printed status transition alone can look like nothing changed.
- This can confuse an operator who expects every lifecycle stage to have a distinct task status.

Resolution for ForgePilot:

- Treated the transition as successful because the tester artifact was present, verification passed, and Forge Next recommended Reviewer.

Potential Forge improvement:

Project Forge stage output could include both task status and lifecycle stage progress, for example: `stage: tester completed; next: reviewer`.

### 2026-07-10 — TASK-0003 completion follows implementation merge

Observation:

After the TASK-0003 implementation PR was merged, the task remained `ready_for_pr` on main and Forge recommended a separate completion PR.

Concrete friction:

- The implementation PR merge and lifecycle completion are separate operations.
- This is correct for auditability, but it adds one extra post-merge PR.
- Operators must wait for main push CI before creating the completion PR.

Resolution for ForgePilot:

- Verified main after implementation merge.
- Created a dedicated completion branch.
- Used the official Forge task completion command.
- Prepared a completion PR instead of silently marking the task complete on main.

Potential Forge improvement:

Project Forge could provide a guided "after implementation PR merge" command that waits for main CI, creates the completion branch, completes the task, and opens the completion PR.

### 2026-07-10 — TASK-0004 next-env generated file drift

Observation:

Before TASK-0004 Planner, `next-env.d.ts` changed from `.next/types/routes.d.ts` to `.next/dev/types/routes.d.ts`.

Concrete friction:

- The file is generated by Next.js tooling.
- It made the working tree dirty before Planner.
- The change was unrelated to TASK-0004 scope.

Resolution for ForgePilot:

- Inspected the diff.
- Restored `next-env.d.ts`.
- Continued Planner only after the working tree was clean.

Potential Forge improvement:

Project Forge could include a standard generated-file cleanup check before lifecycle stage commands.

### 2026-07-04 dynamic route avoids database-dependent build

Observation:

The product spec editor needs Prisma data at runtime, but `pnpm verify` must not require a running PostgreSQL service.

Concrete friction:

- A server component that reads from Prisma can accidentally become a build-time database dependency if it is statically prerendered.
- This would break deterministic CI.

Resolution for ForgePilot:

- Marked `/spec` as dynamic.
- Kept database runtime setup as a local demo requirement.
- Preserved `pnpm verify` as a no-database default check.

Potential Forge improvement:

Project Forge Next.js + Prisma recipes should explicitly call out dynamic route boundaries for database-backed server components.

### 2026-07-10 — TASK-0004 JSX inside try/catch lint recovery

Observation:

TASK-0004 Builder initially returned JSX directly inside a `try/catch` block in `app/spec/page.tsx`.

Concrete friction:

- TypeScript passed.
- Next.js production build passed.
- ESLint failed with `react-hooks/error-boundaries`.
- The rule correctly flagged that rendering JSX inside `try/catch` does not catch render-time errors.

Resolution for ForgePilot:

- Refactored data loading into a small safe loader function.
- Kept `try/catch` only around the Prisma read.
- Moved JSX rendering into separate state components outside the `try/catch`.

Potential Forge improvement:

Project Forge Builder prompts for Next.js server components should explicitly avoid constructing JSX inside `try/catch`; use result objects plus separate render branches instead.

### 2026-07-10 — TASK-0004 zod dependency exact-pin recovery

Observation:

TASK-0004 Reviewer blocked because the `zod` dependency was not pinned exactly in `package.json`.

Concrete friction:

- The feature implementation passed lint, typecheck, build, and full verification.
- Reviewer dependency hygiene still failed because ForgePilot expects exact dependency versions.
- This keeps dependency drift visible before the implementation PR.

Resolution for ForgePilot:

- Read the installed `zod` version from `node_modules`.
- Rewrote `package.json` to pin `zod` exactly.
- Regenerated the lockfile with `pnpm install`.
- Re-ran frozen install and verification.

Potential Forge improvement:

Project Forge builder recipes should avoid `package@major` when the repository policy requires exact pins; they should resolve and write exact package versions immediately.

### 2026-07-10 — TASK-0004 reviewer scope matcher false positive

Observation:

The first TASK-0004 Reviewer script blocked on valid changed files such as `app/spec/page.tsx` and `components/spec/ProductSpecEditor.tsx`.

Concrete friction:

- The reviewer scope check allowed directory names like `app/spec/`.
- The grep matcher compared whole file paths and therefore did not match files under those directories.
- This created a false positive even though the task scope was valid.

Resolution for ForgePilot:

- Replaced the brittle grep matcher with a Node-based exact/prefix allow-list.
- Re-ran Reviewer checks after confirming the working tree was still clean.
- Kept the actual implementation unchanged.

Potential Forge improvement:

Project Forge reviewer recipes should prefer structured exact/prefix file matching over regex-only path matching for task-scope checks.

### 2026-07-10 — TASK-0004 reviewer confirms server-rendered route boundary

Observation:

TASK-0004 adds a Prisma-backed server component route. The build output shows `/spec` as dynamic server-rendered content.

Concrete friction:

- This is correct for the feature because the route reads from the database at runtime.
- Reviewer needed to explicitly check that `/spec` did not become a static prerendered route.
- Without this check, a future refactor could accidentally turn database-backed pages into build-time database dependencies.

Resolution for ForgePilot:

- Kept `export const dynamic = "force-dynamic"` on `/spec`.
- Kept `export const runtime = "nodejs"` on `/spec`.
- Added Reviewer verification for dynamic route output.

Potential Forge improvement:

Project Forge reviewer recipes for Next.js + Prisma tasks should include route-rendering checks when a task adds database-backed App Router pages.

### 2026-07-10 — TASK-0004 completion follows implementation merge

Observation:

After the TASK-0004 implementation PR was merged, the task remained `ready_for_pr` on main and Forge recommended a separate completion PR.

Concrete friction:

- Implementation merge and lifecycle completion are separate operations.
- This preserves auditability, but it adds one extra branch, PR, CI run, and merge.
- Operators must sync main after the implementation merge before completing the task.

Resolution for ForgePilot:

- Synced main after PR #5.
- Verified main locally.
- Created a dedicated completion branch.
- Used the official Forge completion command.
- Prepared a completion PR without creating a release.

Potential Forge improvement:

Project Forge could provide a guided post-merge command that syncs main, waits for main CI, completes the task, opens the completion PR, and clearly stops before release.

### 2026-07-10 — TASK-0005 contract schema recovery

Observation:

The first TASK-0005 definition attempt replaced the Forge-generated task contract with a hand-written YAML shape that did not match the repository contract schema.

Concrete friction:

- The generated scaffold was valid, but the replacement omitted `schema_version` and `workflow`.
- Acceptance criteria used `text` instead of `description`.
- `required_checks` used `pnpm verify` instead of the project command key `verify`.
- Forge validation correctly blocked the definition before commit.

Resolution for ForgePilot:

- Recovered TASK-0005 using the existing valid workflow reference from TASK-0004.
- Rewrote acceptance criteria with `description`.
- Replaced the required check with `verify`.
- Kept the branch local and did not push or create a PR.

Potential Forge improvement:

Project Forge task-definition recipes should preserve scaffold metadata and patch only task-specific fields instead of replacing the full contract shape blindly.

### 2026-07-10 — TASK-0005 concrete task board data layer

Observation:

TASK-0005 needed a Prisma-backed read-only task board using the existing Product and ForgeTask models.

Concrete implementation detail:

- Product fields used: id, slug, name, summary.
- ForgeTask fields used: id, externalId, title, status, summary, branchName, pullRequestUrl, order, createdAt, updatedAt.
- `/tasks` is dynamic and reads runtime data through `lib/db/tasks.ts`.

Resolution for ForgePilot:

- Added a narrow task board data access layer.
- Added read-only task board UI components.
- Added graceful database, missing-product, and empty-task states.
- Kept the feature out of lifecycle-editing scope.

### 2026-07-10 — TASK-0006 definition follows completed TASK-0005

Observation:

After TASK-0005 completed, Forge Next correctly returned to defining the next task.

Concrete workflow detail:

- TASK-0005 implementation and completion PRs were merged.
- Main CI was green.
- Local `pnpm verify` passed.
- Forge status showed no active task.

Resolution for ForgePilot:

TASK-0006 is defined as the next focused product surface: a read-only dogfooding log MVP.

Potential Forge improvement:

ForgePilot should make dogfooding findings visible in-product so workflow friction is not trapped only in markdown logs.

### 2026-07-10 — TASK-0006 next-state display mismatch

Observation:

After TASK-0006 was defined, `Forge Next` correctly recommended planning TASK-0006, but the task board section still showed `Define the next task`.

Concrete friction:

- Active task existed: TASK-0006.
- Task status was `proposed`.
- `Forge Next` said `Plan TASK-0006`.
- Task board `Next` text said `Define the next task`.

Resolution for ForgePilot:

Continue with Planner because the actionable `Forge Next` recommendation is correct.

Potential Forge improvement:

Forge status rendering should keep the task board `Next` line consistent with the dedicated `Forge Next` recommendation when a proposed active task exists.

### 2026-07-10 — TASK-0006 schema-driven dogfooding data layer

Observation:

TASK-0006 needed a Prisma-backed read-only dogfooding log using the existing DogfoodingEntry model.

Concrete implementation detail:

- Builder inspected `prisma/schema.prisma`.
- Builder generated `lib/db/dogfooding.ts` against the actual DogfoodingEntry fields.
- `/dogfooding` is dynamic and reads runtime data through Prisma.

Resolution for ForgePilot:

- Added a narrow dogfooding data access layer.
- Added read-only dogfooding UI components.
- Added graceful database, missing-product, and empty-list states.
- Kept the feature out of create/edit/delete, AI, import, release, and dashboard scope.

Potential Forge improvement:

Forge should provide a safer built-in recipe for Prisma-backed read-only surfaces that first inspects schema fields and then records the selected fields in build artifacts.

### 2026-07-10 — TASK-0006 build-report scaffold path corruption

Observation:

During TASK-0006 Builder, the implementation and verification passed, but build-report artifact creation failed because the pasted command was corrupted.

Concrete friction:

- The intended Forge CLI path was `tools/forge-validator/src/cli.mjs`.
- The executed path became `tools/forge-validator/li.mjs`.
- A build report file was then left without YAML front matter.
- Forge contract validation correctly failed on the malformed artifact.

Resolution for ForgePilot:

- Recreated `build-report-001.md` through the correct Forge artifact scaffold command.
- Rewrote the build report body while preserving valid YAML front matter.
- Re-ran verification before committing Builder.

Potential Forge improvement:

Forge artifact creation commands should fail in a way that prevents a partially malformed artifact from being left behind, or provide an explicit repair command for invalid artifact front matter.

### 2026-07-10 — TASK-0006 reviewer regex false positive on Updated label

Observation:

TASK-0006 Reviewer initially blocked on the read-only UI check even though the implementation had no form, server action, mutation, or Prisma write operation.

Concrete friction:

- Reviewer static check searched for broad text like `update`.
- The UI contained the display label `Updated`.
- The check incorrectly treated that read-only timestamp label as possible update functionality.

Resolution for ForgePilot:

- Re-ran Reviewer with a narrower check:
  - no `<form>`;
  - no `formAction`;
  - no `"use server"`;
  - no Prisma `create`, `update`, `delete`, `upsert`, `createMany`, `updateMany`, or `deleteMany` operations.

Potential Forge improvement:

Forge reviewer prompts should avoid broad substring checks for forbidden capabilities. They should check concrete code constructs and mutation APIs instead.

### 2026-07-10 — TASK-0007 definition follows completed TASK-0006

Observation:

After TASK-0006 completed, Forge Next returned to defining the next task and the repository was clean on main.

Concrete workflow detail:

- TASK-0006 implementation and completion PRs were merged.
- Main CI was green.
- Local `pnpm verify` passed.
- Forge status showed no active task.

Resolution for ForgePilot:

TASK-0007 is defined as the next focused product surface: a read-only decision log MVP.

Potential Forge improvement:

ForgePilot should continue adding focused product surfaces one at a time before composing them into a larger dashboard.

### 2026-07-10 — TASK-0007 planner state is consistent

Observation:

After TASK-0007 was defined, Forge status and Forge Next were aligned.

Concrete workflow detail:

- Active task existed: TASK-0007.
- Task status was `proposed`.
- Task board `Next` showed `Run Planner for TASK-0007`.
- Forge Next showed `Plan TASK-0007`.

Resolution for ForgePilot:

Continue through Planner without manual `docs/TASKS.md` recovery.

Potential Forge improvement:

The TASK-0007 flow confirms the corrected/manual task-board state shape needed after task definition.

### 2026-07-10 — TASK-0007 schema-driven decision data layer

Observation:

TASK-0007 Builder inspected the actual Prisma Decision model before generating the data access layer and UI.

Concrete workflow detail:

- The route was generated as a dynamic Node.js route.
- The data layer maps available Decision fields into a stable UI shape.
- The implementation keeps /decisions read-only and avoids schema/dependency changes.

Resolution for ForgePilot:

Use a schema-driven adapter for early MVP surfaces when the database model exists but the UI contract needs a stable shape.

Potential Forge improvement:

Builder prompts for consumer apps should explicitly inspect existing models before assuming field names, especially for product logs such as decisions, releases, and handoffs.

### 2026-07-10 — TASK-0007 builder paste corruption recovery

Observation:

TASK-0007 Builder implementation was written successfully, but the long shell block was corrupted during paste/execution.

Concrete friction:

- A command line was merged into `dbDB_GENERATE_EXIT=0`.
- Bash later hit `syntax error near unexpected token fi`.
- The actual app verification still passed through `pnpm verify`.
- Build output confirmed `/decisions` as a dynamic route.

Resolution for ForgePilot:

Recovered by keeping the generated implementation, re-running verification, creating the build report, staging Builder, and committing the Builder stage.

Potential Forge improvement:

Large generated operator blocks should be split into smaller recovery-safe chunks, especially around verification and lifecycle stage transitions.

### 2026-07-10 — TASK-0007 tester home-link false positive

Observation:

TASK-0007 Tester initially blocked on the home link check even though `/decisions` was configured on the home page.

Concrete friction:

- The static check searched for literal JSX `href="/decisions"`.
- The home page uses a `productSurfaces` array with `href: "/decisions"` and renders links through `href={surface.href}`.
- The implementation was valid, but the test was too implementation-specific.

Resolution for ForgePilot:

Recovered Tester with a check that verifies the home surface configuration instead of requiring a specific JSX literal.

Potential Forge improvement:

Tester prompts should avoid brittle JSX string matching when the application uses configuration-driven rendering.

### 2026-07-11 — TASK-0008 definition after TASK-0007 completion

Observation:

After TASK-0007 completed, Forge returned to a clean no-active-task state on main.

Concrete workflow detail:

- TASK-0007 implementation and completion PRs were merged.
- Main CI was green.
- Local `pnpm verify` passed.
- Forge Next recommended defining the next task.

Resolution for ForgePilot:

TASK-0008 is defined as the next focused product surface: a read-only release timeline MVP.

Potential Forge improvement:

ForgePilot should keep adding narrow read-only product surfaces before composing them into a full dashboard.

### 2026-07-11 — TASK-0008 planner next-env generated-file recovery

Observation:

TASK-0008 Planner was initially blocked because `next-env.d.ts` became dirty before the Planner stage.

Concrete friction:

- Next tooling changed generated `next-env.d.ts`.
- The Planner pre-check correctly blocked on a dirty working tree.
- The file was not part of TASK-0008 scope and should not be committed.

Resolution for ForgePilot:

Restore `next-env.d.ts`, rerun verification, then continue Planner.

Potential Forge improvement:

Operator blocks should automatically restore known generated files like `next-env.d.ts` after Next build/verify when they are out of task scope.

### 2026-07-11 — TASK-0008 schema-driven release timeline

Observation:

TASK-0008 Builder inspected the actual Prisma ProductRelease model before generating the data access layer and UI.

Concrete workflow detail:

- The route was generated as a dynamic Node.js route.
- The data layer maps available ProductRelease fields into a stable UI shape.
- The implementation keeps /releases read-only and avoids schema, dependency, tag, GitHub release, deployment, and release automation changes.

Resolution for ForgePilot:

Use a schema-driven adapter for release visibility while keeping operational release actions out of scope.

Potential Forge improvement:

Builder prompts should clearly separate release visibility surfaces from release automation because the latter mutates repository or deployment state.

### 2026-07-11 — TASK-0008 builder JSX loading recovery

Observation:

TASK-0008 Builder generated the release timeline files, but `app/releases/loading.tsx` contained invalid JSX.

Concrete friction:

- The generated loading component missed a closing `>` after the wrapper div className.
- ESLint blocked with a parsing error.
- Next build also failed on the same JSX syntax issue.
- The implementation was not committed before recovery.

Resolution for ForgePilot:

Rewrite `app/releases/loading.tsx`, rerun verification, then continue Builder.

Potential Forge improvement:

Builder scripts should run a focused syntax check immediately after generating JSX files and before continuing to broader verification.

### 2026-07-11 — TASK-0008 reviewer release-automation false positive

Observation:

TASK-0008 Reviewer initially blocked on the release automation check even though the implementation did not add release automation.

Concrete friction:

- The static check searched for broad words like deploy.
- The UI contains explanatory copy saying the page does not publish releases, create tags, or deploy.
- That text is product messaging, not an operational command.
- The implementation contains no real release publishing, git tag, deployment, child process, or shell execution path.

Resolution for ForgePilot:

Recovered Reviewer with a narrower static check that searches for operational commands and execution APIs instead of plain explanatory words.

Potential Forge improvement:

Reviewer checks should distinguish forbidden behavior from user-facing copy that describes forbidden behavior as out of scope.

### 2026-07-11 — TASK-0009 definition after product surfaces

Observation:

After TASK-0008, ForgePilot has several focused read-only product surfaces: spec, tasks, dogfooding, decisions, and releases.

Concrete workflow detail:

- TASK-0008 completed cleanly.
- Main CI was green.
- Local `pnpm verify` passed.
- Forge returned to a no-active-task state.
- The next product step is a dashboard overview, not another isolated surface.

Resolution for ForgePilot:

Define TASK-0009 as a read-only dashboard overview that aggregates existing surfaces without adding new business workflows.

Potential Forge improvement:

Forge could recommend a composition milestone after several related product surfaces have been completed.

### 2026-07-11 — TASK-0009 planner composition boundary

Observation:

TASK-0009 is a composition task after several focused product surfaces were completed.

Concrete workflow detail:

- ForgePilot already has spec, tasks, dogfooding, decisions, and releases surfaces.
- The dashboard should summarize and link to those surfaces.
- It should not replace detail pages or introduce new write workflows.

Resolution for ForgePilot:

Plan /dashboard as a read-only overview layer with narrow summary counts and navigation.

Potential Forge improvement:

Planner prompts should explicitly warn when a composition task risks becoming a broad rewrite or dashboard god-page.

### 2026-07-11 — TASK-0009 dashboard composition implementation

Observation:

TASK-0009 implements the first composition surface after the spec, task, dogfooding, decision, and release pages.

Concrete workflow detail:

- The dashboard summarizes existing surfaces instead of replacing them.
- The data layer reads existing Prisma models through narrow read-only queries.
- The UI links users back into detail surfaces for deeper work.
ForgePilot:

Use /dashboard as the product-level overview while preserving focused detail pages.

Potential Forge improvement:

Builder prompts for composition tasks should enforce summary-and-link behavior instead of duplicating every detail page.

### 2026-07-11 — TASK-0009 builder cssName recovery

Observation:

TASK-0009 Builder generated the dashboard files, but one JSX prop was written as `cssName` instead of `className`.

Concrete friction:

- TypeScript blocked on `components/dashboard/DashboardOverview.tsx`.
- Next build failed on the same prop typo.
- The implementation was not committed before recovery.

Resolution for ForgePilot:

Replace `cssName` with `className`, rerun verification, then continue Builder.

Potential Forge improvement:

Builder scripts should include a targeted grep/check for common JSX prop typos before running the full verification suite.

### 2026-07-11 — TASK-0009 tester surface-summary false positive

Observation:

TASK-0009 Tester initially blocked on the dashboard surface summary check.

Concrete friction:

- The check looked for lowercase surface names directly in DashboardOverview.tsx.
- The implementation correctly defines surface data in lib/db/dashboard.ts and renders it through data.surfaces.map.
- DashboardOverview.tsx is a composition component, not the source of truth for every surface label.

Resolution for ForgePilot:

Recovered Tester with a more precise static check that validates the data layer, surface hrefs, summary totals, and rendered card composition together.

Potential Forge improvement:

Tester checks for composition tasks should validate data flow across files instead of searching for literal copy in a single component.

### 2026-07-11 — TASK-0010 definition after dashboard

Observation:

After TASK-0009, ForgePilot has a dashboard overview plus focused detail surfaces.

Concrete workflow detail:

- The app now has spec, tasks, dogfooding, decisions, releases, and dashboard surfaces.
- The next high-value workflow is a handoff summary that helps continue work in a new AI chat.
- The first MVP should be deterministic and read-only, not AI-generated.

Resolution for ForgePilot:

Define TASK-0010 as a read-only /handoff surface that produces a copyable markdown-style summary from existing product data.

Potential Forge improvement:

Forge could recommend handoff generation after a dashboard or composition milestone is completed.

### 2026-07-11 — TASK-0010 planner deterministic handoff boundary

Observation:

TASK-0010 introduces a handoff surface after the dashboard milestone.

Concrete workflow detail:

- The handoff should help start a new AI chat with accurate context.
- The first MVP should be deterministic and read-only.
- It should not use AI generation or save snapshots yet.

Resolution for ForgePilot:

Plan /handoff as a copyable markdown-style summary generated from existing product data.

Potential Forge improvement:

Planner prompts should distinguish deterministic handoff generation from AI summarization and persistent snapshot workflows.

### 2026-07-11 — TASK-0010 deterministic handoff implementation

Observation:

TASK-0010 adds a handoff surface after ForgePilot gained several focused detail pages and a dashboard.

Concrete workflow detail:

- The handoff summarizes current product state into a stable markdown-style block.
- The MVP intentionally avoids AI generation and snapshot persistence.
- The copy action is client-side only.

Resolution for ForgePilot:

Implement /handoff as a deterministic read-only continuation aid for new AI-assisted development chats.

Potential Forge improvement:

Builder prompts for handoff tasks should explicitly separate deterministic context packaging from AI summarization and persistent snapshot storage.

### 2026-07-11 — TASK-0010 builder import corruption recovery

Observation:

TASK-0010 Builder generated the handoff files, but the import in app/handoff/page.tsx was corrupted.

Concrete friction:

- The import became `HandoffSummaryrom` instead of `HandoffSummary } from`.
- ESLint failed with a parsing error.
- Next build failed on the same malformed import.
- The implementation was not committed before recovery.

Resolution for ForgePilot:

Rewrite app/handoff/page.tsx with the correct import, rerun verification, then continue Builder.

Potential Forge improvement:

Builder scripts should include a quick parser or import-sanity check immediately after generated file writes.

### 2026-07-11 — TASK-0010 tester updatedAt false positive

Observation:

TASK-0010 Tester initially blocked on a read-only check.

Concrete friction:

- The check searched for `.update` as a raw substring.
- The handoff data layer contains legitimate `updatedAt` field reads.
- The check falsely treated `updatedAt` as a Prisma write operation.

Resolution for ForgePilot:

Replace substring matching with method-call matching for write operations such as `.update(`, `.create(`, `.delete(`, and `.upsert(`.

Potential Forge improvement:

Tester prompts should avoid broad grep patterns for write-safety checks and prefer parser-like or method-call-specific checks.

### 2026-07-11 — TASK-0010 tester report metadata recovery

Observation:

TASK-0010 Tester verification passed, but the test report artifact was manually rewritten with invalid Forge metadata.

Concrete friction:

- Forge validator rejected the report because required metadata keys were missing.
- Required keys included attempt, input_artifacts, outcome, and producing_role.
- The helper script also suffered copy/paste corruption and produced a `btrip` NameError.

Resolution for ForgePilot:

Recreate the test report through Forge artifact scaffolding, preserve the generated frontmatter, and replace only the body.

Potential Forge improvement:

Artifact report recovery should provide a first-class command to rewrite artifact body while preserving valid metadata.

### 2026-07-11 — TASK-0010 reviewer stage command corruption

Observation:

TASK-0010 Reviewer checks passed, but the stage transition command was corrupted during paste/execution.

Concrete friction:

- Reviewer static checks passed.
- Docker Compose config passed.
- pnpm verify passed.
- next build passed.
- /handoff built as dynamic.
- The stage command failed because `node tools/forge-validator/src/cli.mjs` was corrupted into `notools/forge-validator/src/cli.mjs`.

Resolution for ForgePilot:

Recover by preserving the already-created review report, rerunning the Reviewer stage transition, verifying, and committing the Reviewer result.

Potential Forge improvement:

Long shell blocks should minimize command-adjacent text and maybe print critical commands before execution to make paste corruption easier to spot.

## TASK-0011 — Local Postgres Docker config failure

- Observation: After TASK-0010, DB-backed local pages loaded through Next.js but failed when Prisma attempted to query the local database.
- Friction: The `postgres:18` container entered a restart loop because `docker-compose.yml` mounted the persistent volume at `/var/lib/postgresql/data`.
- Root cause: PostgreSQL 18 Docker images use a major-version-specific directory layout and reject the old data mount target.
- Fix: Change the local persistent volume target to `/var/lib/postgresql`.
- Verification: A fresh local volume reaches healthy status, `pnpm db:push` succeeds, `pnpm db:seed` succeeds, and `pnpm verify` passes.
- Forge improvement: Future DB-backed templates should either avoid bleeding-edge Postgres major images or encode image-specific volume mount requirements in generated Docker Compose contracts.

### 2026-07-12 — TASK-0012 repeated terminal copy-paste corruption

**Observation**

Large terminal blocks were repeatedly altered while being pasted during TASK-0012. Spaces disappeared, fragments of later commands appeared inside earlier lines, and harmless text corrections became unreliable.

**Friction**

The operator could not confidently distinguish actual repository content from terminal paste corruption. This caused repeated retries and unnecessary investigation of a non-blocking acceptance-criterion typo.

**Root cause**

The workflow depended on transferring long multi-step shell blocks through the terminal instead of using smaller idempotent commands or repository-managed scripts.

**Resolution**

The task continued with smaller implementation blocks, immediate typechecking, exact file checks, and deferred cleanup of cosmetic text that did not affect contract validity.

**Forge improvement**

Project Forge should prefer short operator commands, generated script files, integrity checks, and idempotent lifecycle operations over long manual shell pastes.

**Severity**

High.

**Classification**

Operator/copy-paste issue and Forge UX friction.


### 2026-07-12 — Delayed GitHub check registration after completion PR creation

**Observation**

Immediately after TASK-0012 completion PR #22 was created,
`gh pr checks --watch` returned that no checks were reported.

**Friction**

The delivery shell block treated the temporary absence of registered checks
as a terminal failure and stopped even though both expected GitHub Actions
workflows had already been triggered.

**Root cause**

GitHub register the pull request before its check suites became visible to
`gh pr checks`. The operator workflow had no bounded grace period for this
eventual-consistency window.

**Resolution**

Retry initial check discovery for a bounded period, then start the normal
blocking watch only after at least one check row is registered.

**Forge improvement**

Use `forge pr watch -- --pr <number>` as the canonical watcher. It must
distinguish delayed registration, persistent absence, pending, failing,
passing, and unavailable states without mutating the repository or PR.

**Severity**

High.

**Classification**

CLI ergonomics and workflow-state reliability.

### 2026-07-12 — Deferred validator test-script path concatenation issue

**Observation**

TASK-0013 reconnaissance found two validator test paths concatenated in the
`tools/forge-validator/package.json` test command:

`create-implementation-guard.test.mjs./test/operator-compact-output.test.mjs`

**Friction**

The malformed command can prevent the intended validator tests from being
executed through the package-level test script.

**Resolution**

TASK-0013 runs its focused tests directly with `node --test`.

**Forge improvement**

Create a separate task to repair and verify the validator package test command.
This is intentionally deferred because TASK-0013 does not allow modifications
to `tools/forge-validator/package.json`.

**Severity**

Medium.

**Classification**

Validation quality and task-runner configuration.
