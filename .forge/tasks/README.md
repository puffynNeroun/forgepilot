# Structured Tasks

`.forge/tasks/` documents the task contract for future automation. It is not runtime code and does not replace `docs/TASKS.md`, `AGENTS.md`, `.forge/project.yaml`, or the role contracts.

## Active Task Files

Active task files use `.forge/tasks/TASK-<number>.yaml`, such as `TASK-001.yaml` or `TASK-002.yaml`. The active task file `id` must match its filename stem.

`task.template.yaml` is inactive and must be ignored by automation. Copy it when creating a concrete active task; do not treat the template itself as work to execute.

## Task Fields

- `schema_version`: version of the task file structure.
- `id`: stable task identifier, matching the active task filename stem.
- `title`: short concrete task title.
- `status`: current lifecycle status.
- `workflow`: repository-relative path to the workflow definition.
- `goal`: one bounded outcome for the task.
- `in_scope`: exact work included in the task.
- `out_of_scope`: work explicitly excluded from the task.
- `allowed_files`: exact repository-relative paths the task may modify.
- `protected_files`: exact repository-relative paths the task must not modify.
- `acceptance_criteria`: measurable results with stable criterion identifiers.
- `required_checks`: command keys from `.forge/project.yaml` under `commands`.

## Path Semantics

Paths are repository-relative. The MVP supports only exact paths; glob patterns and negated patterns are not supported.

Protected paths take precedence over allowed paths.

## Acceptance Criteria

Every criterion has a stable identifier such as `AC-1`. Criteria must describe measurable results.

Tester and Reviewer use acceptance criterion identifiers when reporting results.

## Required Checks

Required check values reference keys under `.forge/project.yaml` `commands`. Values are not raw shell commands.

If a required command is `null`, Tester reports `BLOCKED`. Agents must not invent substitute commands.

## Statuses

The supported statuses are exactly:

```text
proposed
approved
in_progress
blocked
ready_for_pr
completed
```

The normal lifecycle is:

```text
proposed
-> approved
-> in_progress
-> ready_for_pr
-> completed
```

`approved` requires human approval of the Planner handoff. `blocked` requires a human decision before continuation.

`ready_for_pr` means the agent cycle is complete but no remote mutation is authorized. `completed` is used only after merge and successful post-merge verification.

No agent may mark its own task approved or completed.

## Safety Boundaries

Task files must not contain secrets, credentials, raw shell commands, deployment credentials, model tokens, unrelated product requirements, duplicated role contracts, or duplicated repository-wide policies.
