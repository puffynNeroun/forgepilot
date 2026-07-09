# Forge Prompt Templates

Reusable prompts for running the Forge workflow with an AI assistant.

Use these templates to keep AI work inside the controlled lifecycle:

1. Define task contract
2. Plan
3. Build
4. Test
5. Review
6. Implementation PR
7. Completion PR

## Templates

| File | Purpose |
| --- | --- |
| planner.md | Plan an approved task before implementation |
| builder.md | Implement approved scope and produce build evidence |
| tester.md | Verify acceptance criteria and required checks |
| reviewer.md | Review scope, artifacts, evidence, and readiness |
| recovery.md | Diagnose broken workflow state safely |
| implementation-pr.md | Guide implementation PR flow |
| completion-pr.md | Guide completion PR flow |

## Placeholders

Replace before use:

- {{TASK_ID}}
- {{TASK_TITLE}}
- {{REPO_PATH}}
- {{BRANCH_NAME}}
- {{PR_NUMBER}}

## Rules

- The task contract is the source of truth.
- Respect allowed_files.
- Respect out_of_scope.
- Produce required artifacts.
- Run required checks.
- Do not bypass Forge lifecycle stages.
- Do not mark tasks completed early.
- Do not create or merge PRs without explicit operator action.
