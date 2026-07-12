---
schema_version: 1
task_id: TASK-0013
artifact_type: build_report
attempt: 1
producing_role: builder
outcome: READY_FOR_TEST
input_artifacts:
  - .forge/artifacts/TASK-0013/plan-001.md
---

# TASK-0013 Build Report — Harden PR Checks Watch

## Outcome

READY_FOR_TEST

## Summary

Implemented a bounded check-registration grace period for
`forge pr watch`.

The watcher now distinguishes:

- checks registered immediately;
- checks registered after a short delay;
- checks persistently missing;
- pending checks;
- failing checks;
- passing checks;
- malformed or unavailable GitHub check data.

## Implementation

### Registration polling

`tools/forge-validator/src/pr-watch.mjs` now checks for initial
GitHub check rows before invoking the blocking checks watch.

Defaults:

- 12 registration attempts;
- 5 seconds between attempts;
- no sleep after the final attempt.

Retry timing and sleeping are injectable for deterministic tests.

Only the explicit `no checks reported` condition and successful
empty check arrays are retried.

Authentication, network, permission, malformed JSON, and other
GitHub CLI failures remain unavailable errors.

### Watch sequencing

When at least one check is registered, the command:

1. starts the existing blocking checks watch;
2. fetches final check rows;
3. classifies the terminal result;
4. reports the next safe action.

When no checks appear within the grace period, the blocking watch
is not started and the result is `missing`.

### Diagnostics

The report now shows:

- registration state;
- attempts used;
- configured maximum attempts;
- whether registration was delayed;
- whether the blocking watch ran.

### Operator guidance

`tools/forge-validator/src/pr-status.mjs` now recommends:

`forge pr watch -- --pr <number>`

for pending or unavailable implementation and completion PR checks.

The compatibility `forge_watch_pr_ci` helper delegates to the
hardened Forge command instead of invoking `gh pr checks --watch`
directly.

## Tests

Focused tests cover:

- immediate registration;
- delayed registration;
- persistent missing checks;
- successful empty arrays;
- real GitHub CLI failures;
- malformed JSON;
- passing final checks;
- failing final checks;
- pending final checks;
- registration diagnostics;
- PR status recommendations;
- legacy operator-helper delegation.

Focused result:

- 50 tests;
- 50 passed;
- 0 failed.

## Verification

Passed:

- Node syntax checks;
- focused Node test suites;
- Forge PR watch CLI help smoke test;
- static implementation audit;
- complete `pnpm verify`;
- Forge contract validation;
- `git diff --check`;
- exact changed-file audit.

## Dogfooding evidence

Recorded the TASK-0012 completion PR incident where GitHub
temporarily reported no checks before both expected workflows
became visible.

Also recorded the malformed concatenated test path in
`tools/forge-validator/package.json` as a deferred issue.

The package test-script defect was not changed because the file is
protected and unrelated to the approved TASK-0013 implementation.

## Read-only boundary

The watcher performs only GitHub read operations.

It does not create, update, merge, close, or delete pull requests,
branches, tasks, artifacts, or repository files.

## Outcome

READY_FOR_TEST
