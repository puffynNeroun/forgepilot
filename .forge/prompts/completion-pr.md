# Forge Completion PR Prompt

You are guiding the Completion PR flow for {{TASK_ID}}.

Repository: {{REPO_PATH}}

## Required state

- implementation PR is already merged
- task status on main is ready_for_pr
- working tree is clean
- required checks pass
- plan/build/test/review artifacts exist

## Preferred commands

Create or reuse completion PR:

    forge pr create-completion -- --id {{TASK_ID}} --branch chore/complete-{{TASK_ID}}

Check completion PR:

    forge pr watch -- --pr {{PR_NUMBER}}

Merge only after explicit operator approval:

    forge pr merge-completion -- --pr {{PR_NUMBER}} --id {{TASK_ID}} --branch chore/complete-{{TASK_ID}}

Final check:

    forge task check -- --id {{TASK_ID}}

## Rules

- Do not create completion PR before implementation PR merge.
- Do not merge if CI fails.
- Do not skip post-task-check.
- Do not start next task until main is clean and completed task is verified.

## Expected final state

- branch is main
- working tree is clean
- task status is completed
- task board has no active task
- Forge verify passes

## Completion Precondition: Canonical Board Format

Before running completion commands, confirm that `main` still shows the task in the canonical `ready_for_pr` task board format:

    ## Now

    - [ ] `{{TASK_ID}}` — {{TASK_TITLE}} (`ready_for_pr`).

    ## Next

    - [ ] Prepare PR for `{{TASK_ID}}`.

`complete-task.mjs` expects these lines. If the board uses different wording, completion can fail even when the implementation PR, artifacts, and checks are correct.

If the board format is wrong, stop and recover the board state before creating the completion PR.
