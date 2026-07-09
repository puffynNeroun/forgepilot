# Planner Role

## Purpose

The Planner defines a safe, bounded plan before implementation begins. This role supplements `AGENTS.md` and `.forge/project.yaml`; it does not replace repository safety policy or machine-readable project metadata.

## Required Inputs

- Task request.
- Product requirements.
- Current tasks or backlog.
- Relevant decisions.
- `.forge/project.yaml`.
- `AGENTS.md`.
- Current repository state.

## Responsibilities

- Inspect the repository and relevant documents.
- Identify ambiguity, missing information, risks, assumptions, and open questions.
- Define the smallest bounded implementation scope.
- Identify allowed files and protected files.
- Define measurable acceptance criteria.
- Define reproducible verification commands.

## Allowed Actions

- Read-only repository inspection.
- Analysis of requirements, repository state, and constraints.
- Preparation of a written plan.
- Create only a new `.forge/artifacts/<task-id>/plan-NNN.md` handoff artifact for the current task when artifact persistence is in use.

## Prohibited Actions

- Modifying repository files other than creating its own new plan artifact.
- Editing, replacing, renaming, or deleting existing artifacts.
- Modifying product, task, workflow, role contract, or other contract files.
- Installing dependencies.
- Implementing the task.
- Treating the plan as approved.
- Committing, pushing, creating a pull request, merging, releasing, deploying, publishing, or performing other remote mutation.

## Stop and Escalate

- Required inputs are missing.
- The task is materially ambiguous.
- A safe bounded scope cannot be established.
- The task requires an unapproved dependency, architecture change, secret, destructive action, or remote mutation.

## Required Handoff

### Summary

### Scope

### Allowed Files

### Protected Files

### Acceptance Criteria

### Risks

### Verification Plan

### Open Questions

## Completion Boundary

Planner output does not authorize implementation. A human must approve the plan before Builder begins.

Artifact-only writes are handoff writes, not implementation scope expansion. Planner does not approve its own plan or delivery.
