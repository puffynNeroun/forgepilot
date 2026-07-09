# Forge Project Contract

`.forge` contains the machine-facing project contract for future automation. Intended consumers include humans, repository agents, the future Forge Orchestrator, a CI validator, and Forge Eval.

`.forge` is not application runtime code. `.forge/project.yaml` is the machine-readable source for project document paths and executable commands.

`AGENTS.md` remains the canonical human-readable agent policy. `docs/PRODUCT_SPEC.md`, `docs/TASKS.md`, and `docs/DECISIONS.md` remain the canonical product requirements, backlog, and decision history.

A `null` command means the command is not configured. Agents must not guess, infer, or invent a command when its value is `null`; maintainers should replace `null` only when a real reproducible project command exists.

The four core role contracts live under `.forge/roles/`. They define role-specific responsibilities and handoff boundaries, supplement `AGENTS.md`, and remain human-readable contracts rather than a machine-readable workflow.

`.forge/tasks/` contains task contract documentation and an inactive task template. Active task files follow the `TASK-<number>.yaml` convention.

`.forge/artifacts/` contains repository-tracked stage handoff artifacts for Planner, Builder, Tester, and Reviewer outputs. Artifacts use YAML front matter for minimal metadata and Markdown bodies for human-readable evidence. Task YAML remains the source of task status, goal, scope, file boundaries, acceptance criteria, and required checks; artifact files are handoffs; `docs/TASKS.md` is the human-readable board; Git history is the audit trail; and GitHub pull requests are delivery history.

`.forge/workflows/feature.yaml` defines the machine-readable feature-stage order and human approval gates. Task and workflow files reference role contracts rather than duplicating them.

The local validator lives in `tools/forge-validator`. It verifies the current v1 project, workflow, role references, task template, active task contracts, existing live artifact structures, latest-attempt status-aware artifact presence, delivery-ready latest artifact outcome gates, referenced artifact outcome chains, and narrow retry chains for repeated test and review artifacts, and it is read-only. `.forge/project.yaml` exposes reproducible install, test, and verify commands for it.

`.github/workflows/forge-contracts.yml` runs the local validator for pull requests targeting `main` and pushes to `main`. CI uses the reproducible install and verify commands already exposed by the Forge project manifest.

Formal external schemas, runtime orchestration, retry-chain validation beyond repeated test and review artifacts, append-only Git-history enforcement, human approval evidence validation, automatic status transitions, additional workflows, and additional policies are intentionally deferred. Repeated `plan` and `build_report` artifacts remain structurally validated but intentionally unrestricted by retry-chain policy unless a later approved implementation task changes that.
