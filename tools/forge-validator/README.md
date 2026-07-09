# Forge Validator

This package validates the current v1 Forge contracts for this repository. It checks `.forge/project.yaml`, `.forge/workflows/feature.yaml`, referenced role files, `.forge/tasks/task.template.yaml`, active `.forge/tasks/TASK-*.yaml` files, and existing live persistent stage artifacts under `.forge/artifacts/TASK-*/`.

The validator is read-only. It does not execute project commands, run workflows, persist artifacts, mutate files, or act as a general YAML linter.

Existing live artifacts are validated strictly when present. The validator ignores `.forge/artifacts/README.md` and `.forge/artifacts/templates/` as live artifacts.

The validator also enforces status-aware artifact presence for fully valid active task contracts:

| Task status | Required structurally valid artifact types |
| --- | --- |
| `proposed` | None |
| `blocked` | None based only on status |
| `approved` | `plan` |
| `in_progress` | `plan` |
| `ready_for_pr` | `plan`, `build_report`, `test_report`, `review_report` |
| `completed` | `plan`, `build_report`, `test_report`, `review_report` |

Presence validation runs only for active task contracts that pass task-contract validation. Invalid task contracts report their own task-contract errors and do not receive secondary missing-artifact errors.

Malformed artifacts still fail structural validation. For status-aware presence, the validator selects the latest existing attempt for each task and artifact type by highest numeric filename attempt. Attempt gaps are allowed, so `plan-003.md` is latest when `plan-001.md` and `plan-003.md` exist.

The latest existing attempt must be structurally valid to satisfy presence. A malformed latest attempt is not hidden by an earlier valid attempt and produces an invalid-latest-attempt presence error. A malformed earlier attempt still reports its structural error, while a later structurally valid attempt may satisfy presence.

`TASK-0001` and `TASK-0002` are explicit legacy completed-task exemptions because they predate persistent live artifacts. No retroactive artifacts are required or fabricated for them. This exemption does not apply to `TASK-0003` or later tasks.

Artifact outcomes do not affect presence decisions. For delivery-ready statuses, the validator separately requires the latest structurally valid `test_report` to have outcome `PASS` and the latest structurally valid `review_report` to have outcome `ACCEPT`. These delivery-ready outcome gates apply to `ready_for_pr` tasks and non-legacy `completed` tasks only.

Delivery-ready outcome gates run only after the relevant latest artifact exists and is structurally valid. Missing artifacts and structurally invalid latest attempts are reported by the structural and presence checks, without secondary outcome errors.

The validator also checks referenced artifact outcome chains for exact paths listed in `input_artifacts`. This is separate from latest-attempt delivery gates and does not require input artifacts to reference the latest attempts.

| Referencing artifact type | Referenced artifact type | Required referenced outcome |
| --- | --- | --- |
| `build_report` | `plan` | `READY_FOR_APPROVAL` |
| `test_report` | `plan` | `READY_FOR_APPROVAL` |
| `test_report` | `build_report` | `READY_FOR_TEST` |
| `review_report` | `plan` | `READY_FOR_APPROVAL` |
| `review_report` | `build_report` | `READY_FOR_TEST` |
| `review_report` | `test_report` | `PASS` |

Referenced outcome-chain checks run only when both the referencing artifact and referenced artifact are structurally valid. Missing references and structurally invalid references are reported by the existing input and structural checks, without secondary referenced-outcome errors.

The validator also checks retry chains for repeated test and review artifacts:

- `test_report` attempt `1` is valid without a previous `test_report`.
- `review_report` attempt `1` is valid without a previous `review_report`.
- `test_report` attempt `N` greater than `1` requires `test_report` attempt `N-1` for the same task to exist and have outcome `FAIL`.
- `review_report` attempt `N` greater than `1` requires `review_report` attempt `N-1` for the same task to exist and have outcome `REJECT`.

Retry-chain checks apply only to `test_report` and `review_report` artifacts. Repeated `plan` and `build_report` attempts remain structurally validated, and `build_report` inputs remain referenced-outcome validated, but neither type is retry-chain validated. This is intentional policy: plan and build retry semantics are ambiguous today and may require future workflow or cross-artifact rules. Any future enforcement for `plan` or `build_report` retries must be introduced by a separate approved implementation task.

Retry-chain checks do not infer retry chains from Git history or require input artifacts to reference latest attempts. They run only when the current artifact and the required previous artifact are structurally valid and belong to a valid task contract.

The existing historical `.forge/artifacts/TASK-0004/test-report-002.md` artifact predates retry-chain enforcement and remains immutable compatibility evidence. It is narrowly exempt from retry-chain validation so completed artifacts do not need to be rewritten or fabricated.

The validator does not enforce append-only Git history, human approval evidence, runtime orchestration, or automatic status transitions.

## Install

```bash
pnpm -C tools/forge-validator install --frozen-lockfile
```

## Test

```bash
pnpm -C tools/forge-validator test
```

## Validate

```bash
pnpm -C tools/forge-validator validate
```

## Verify

```bash
pnpm -C tools/forge-validator verify
```

## Status

The package also includes a read-only lifecycle status command.

~~~bash
pnpm -C tools/forge-validator run status
~~~

The status command reports:

- current Git branch and working tree state;
- current task board state from `docs/TASKS.md`;
- active task detection from the Now section;
- expected artifact presence for the selected task;
- stale verification text matches in selected task artifacts.

The command is read-only. It does not create files, edit artifacts, commit, push, create pull requests, merge, or release anything.

A specific task can be checked with:

~~~bash
pnpm -C tools/forge-validator run status -- --task TASK-0010
~~~

## Exit Codes

Validation exits `0` when the Forge contracts are valid. It exits `1` when contract errors are found.

## CI

The repository workflow runs the same frozen install command and `verify` command documented above for pull requests targeting `main` and pushes to `main`.

## Task scaffold command

Create a new task scaffold with either supported form:

~~~bash
pnpm -C tools/forge-validator run task:new --id TASK-0012 --title "Example task title"
pnpm -C tools/forge-validator run task:new -- --id TASK-0012 --title "Example task title"
~~~

The scaffold command creates:

- `.forge/tasks/TASK-XXXX.yaml`
- `.forge/artifacts/TASK-XXXX/`

It also updates `docs/TASKS.md`:

- `Now` becomes the new task in `proposed` status.
- `Next` becomes `Run Planner for TASK-XXXX`.

The command refuses to run when:

- the task ID is invalid;
- the title is empty;
- `docs/TASKS.md` already has an active task;
- the task contract already exists;
- the artifact directory already exists.

The command does not create branches, commits, pushes, pull requests, merges, releases, plans, build reports, test reports, or review reports.

## Complete a task

After a task implementation PR has been merged and the task is still marked as `ready_for_pr`, use the completion command to perform the final lifecycle board update.

~~~bash
pnpm -C tools/forge-validator run task:complete -- --id TASK-0013
~~~

The command updates:

- `.forge/tasks/TASK-XXXX.yaml`
- `docs/TASKS.md`

It performs these lifecycle changes:

- task contract status: `ready_for_pr` -> `completed`
- task board Now: selected task -> `No active task`
- task board Next: `Prepare PR for TASK-XXXX` -> `Define the next task`
- task board Completed: selected task is inserted at the top

The command refuses to run when:

- the task ID is invalid
- the task contract does not exist
- the task is not `ready_for_pr`
- `docs/TASKS.md` does not show the selected task as the active `ready_for_pr` task
- `docs/TASKS.md` does not contain the expected `Prepare PR` next step

The command intentionally does not create branches, commits, pushes, pull requests, merges, releases, or lifecycle reports.

## Transition a task stage

Use the stage transition command to update a task contract and `docs/TASKS.md` between lifecycle stages.

~~~bash
pnpm -C tools/forge-validator run task:stage -- --id TASK-0014 --stage planner
pnpm -C tools/forge-validator run task:stage -- --id TASK-0014 --stage builder
pnpm -C tools/forge-validator run task:stage -- --id TASK-0014 --stage tester
pnpm -C tools/forge-validator run task:stage -- --id TASK-0014 --stage reviewer
~~~

Supported stages:

- `planner`: `proposed` -> `approved`, Next becomes `Run Builder`
- `builder`: `approved` -> `in_progress`, Next becomes `Run Tester`
- `tester`: keeps `in_progress`, Next becomes `Run Reviewer`
- `reviewer`: `in_progress` -> `ready_for_pr`, Next becomes `Prepare PR`

The command refuses to run when:

- the task ID is invalid
- the stage name is invalid
- the task contract does not exist
- the task contract status does not match the requested transition
- `docs/TASKS.md` does not show the expected current task line
- `docs/TASKS.md` does not show the expected current Next step

The command intentionally does not create artifact reports, branches, commits, pushes, pull requests, merges, releases, or task completion updates.

## Scaffold an artifact report

Use the artifact scaffold command to create lifecycle artifact report files with valid frontmatter.

~~~bash
pnpm -C tools/forge-validator run artifact:new -- --id TASK-0015 --type plan
pnpm -C tools/forge-validator run artifact:new -- --id TASK-0015 --type build_report
pnpm -C tools/forge-validator run artifact:new -- --id TASK-0015 --type test_report
pnpm -C tools/forge-validator run artifact:new -- --id TASK-0015 --type review_report
~~~

Supported artifact types:

- `plan`
- `build_report`
- `test_report`
- `review_report`

The command creates files under:

~~~text
.forge/artifacts/TASK-XXXX/
~~~

The command refuses to run when:

- the task ID is invalid
- the artifact type is invalid
- the task contract does not exist
- the artifact report already exists

The command intentionally does not change task status, change `docs/TASKS.md`, create branches, create commits, push, create pull requests, merge pull requests, release, or complete tasks.

## Run workflow smoke test

Use the workflow smoke command to validate the full local Forge lifecycle in a temporary fixture repository.

Command:

pnpm -C tools/forge-validator run workflow:smoke

The smoke workflow performs this lifecycle:

1. planner stage
2. plan artifact
3. builder stage
4. build_report artifact
5. tester stage
6. test_report artifact
7. reviewer stage
8. review_report artifact
9. task completion
10. final board and task state assertions

The command uses a temporary fixture repository and intentionally does not create Git branches, commits, pushes, pull requests, merges, or releases.
