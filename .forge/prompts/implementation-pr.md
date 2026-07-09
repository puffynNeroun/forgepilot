# Forge Implementation PR Prompt

You are guiding the Implementation PR flow for {{TASK_ID}}.

Repository: {{REPO_PATH}}
Branch: {{BRANCH_NAME}}
Title: {{TASK_TITLE}}

## Required state

- current branch is task branch
- working tree is clean
- task status is ready_for_pr
- plan/build/test/review artifacts exist
- review outcome is ACCEPT
- required checks pass

## Preferred commands

Create or reuse implementation PR:

    forge pr create-implementation -- --id {{TASK_ID}} --title "{{TASK_ID}}: {{TASK_TITLE}}"

Check PR:

    forge pr watch -- --pr {{PR_NUMBER}}

Merge only after explicit operator approval:

    forge pr merge-implementation -- --pr {{PR_NUMBER}} --id {{TASK_ID}} --branch {{BRANCH_NAME}}

## Rules

- Do not complete the task in implementation PR.
- Do not create completion branch before implementation PR merge.
- Do not merge if CI fails.
- Do not bypass operator scripts unless necessary.

## Expected result after merge

- main is updated
- task remains ready_for_pr on main
- Forge verify passes
- next step is completion PR

## Canonical ready_for_pr Board Requirement

Before creating the implementation PR, confirm `docs/TASKS.md` uses the canonical `ready_for_pr` board format expected by `complete-task.mjs`:

    ## Now

    - [ ] `{{TASK_ID}}` — {{TASK_TITLE}} (`ready_for_pr`).

    ## Next

    - [ ] Prepare PR for `{{TASK_ID}}`.

The implementation PR must merge the task work while preserving this `ready_for_pr` state on `main`.

Do not complete the task in the implementation PR. Completion belongs to the separate completion PR.
