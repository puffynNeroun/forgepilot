---
schema_version: 1
task_id: TASK-0013
artifact_type: plan
attempt: 1
producing_role: planner
outcome: READY_FOR_APPROVAL
input_artifacts:
  []
---

# TASK-0013 Plan — Harden PR Checks Watch

## Summary

Harden the existing read-only `forge pr watch` workflow against the short
period after pull-request creation when GitHub Actions has started processing
the event but `gh pr checks` still reports that no checks exist.

The command must wait for initial check registration within a bounded grace
period, then use the existing blocking watch and final classification flow.

The implementation must remain fail-closed:

- a short registration delay is retried;
- persistent absence becomes `missing`;
- real GitHub CLI or parsing failures become `unavailable`;
- failed or pending checks never become passing;
- only a passing terminal summary returns exit code zero.

## Current behavior

`collectPrWatchStatus` currently performs:

1. `gh pr view`;
2. `gh pr checks <pr> --watch`;
3. `gh pr checks <pr> --json ...`;
4. final classification.

This allows the blocking watch command to run before GitHub has registered any
check suites. GitHub CLI can then exit immediately with `no checks reported`.

The current failure test verifies that this becomes `unavailable`, but it does
not model checks appearing shortly afterward.

## Planned files

### Implementation

- `tools/forge-validator/src/pr-watch.mjs`
- `tools/forge-validator/src/pr-status.mjs`
- `scripts/operator/lib.sh`

### Tests

- `tools/forge-validator/test/pr-watch.test.mjs`
- `tools/forge-validator/test/pr-status.test.mjs`
- `tools/forge-validator/test/operator-compact-output.test.mjs`

### Documentation and lifecycle evidence

- `docs/DOGFOODING_LOG.md`
- `.forge/tasks/TASK-0013.yaml`
- `docs/TASKS.md`
- TASK-0013 lifecycle artifacts

## Implementation approach

### 1. Registration polling

Add a bounded registration phase before invoking `gh pr checks --watch`.

Use conservative internal defaults:

- maximum registration attempts: 12;
- delay between attempts: 5 seconds;
- no delay after the final attempt.

This creates an approximately one-minute grace window while remaining bounded.

The retry configuration and sleep function will be injectable through
`collectPrWatchStatus` options so tests do not wait in real time.

### 2. Retry classification

Introduce focused helpers that distinguish:

- successful JSON containing one or more check rows: registered;
- successful empty JSON array: not registered yet;
- GitHub CLI `no checks reported`: not registered yet;
- malformed JSON: unavailable;
- authentication, permission, network, repository, or other CLI errors:
  unavailable.

Only the explicit no-checks condition is retryable.

### 3. Watch sequencing

After registration succeeds:

1. invoke `gh pr checks <pr> --watch`;
2. fetch final JSON check rows;
3. normalize and classify the final rows;
4. render the existing safe next action.

If registration never succeeds:

- do not invoke the blocking watch;
- return state `missing`;
- include attempts and timeout diagnostics;
- exit non-zero.

### 4. Result and report model

Extend the result with registration information such as:

- registration state;
- attempts used;
- configured maximum attempts;
- whether checks were immediately available or delayed.

Render this in a separate report section without removing current PR metadata,
watch result, check counts, diagnostics, or next action.

### 5. PR status guidance

For implementation and completion PR states:

- pending checks should recommend
  `forge pr watch -- --pr <number>`;
- unavailable check data should also recommend the hardened Forge command;
- failing checks may continue recommending direct inspection with
  `gh pr checks <number>`.

### 6. Compatibility operator helper

Change `forge_watch_pr_ci` in `scripts/operator/lib.sh` to delegate to:

`node tools/forge-validator/src/cli.mjs pr watch -- --pr <number>`

Keep the non-watching `forge_check_pr_ci` helper unchanged.

## Testing approach

Add deterministic runner and injected-sleep tests for:

1. checks available on the first registration query;
2. one or more no-check responses followed by registered pending checks;
3. persistent no-check responses through the maximum attempts;
4. successful empty arrays followed by registered checks;
5. malformed check JSON;
6. non-registration GitHub CLI failure;
7. watch returning non-zero with final failing checks;
8. watch completing with passing and skipped checks;
9. pending final checks remaining non-passing;
10. report output for immediate, delayed, missing, and unavailable states;
11. PR status recommendations using `forge pr watch`;
12. compatibility operator helper delegation.

Focused tests will be invoked directly with `node --test` so TASK-0013 does
not depend on unrelated package-script defects.

Required verification:

- focused PR watch tests;
- focused PR status tests;
- focused operator compatibility tests;
- Forge contract validation;
- repository `pnpm verify`;
- `git diff --check`;
- changed-file and protected-file audits.

## Documentation approach

Add a dogfooding entry describing the TASK-0012 completion PR incident:

- `gh pr checks --watch` initially reported no checks;
- both expected GitHub Actions checks appeared seconds later;
- retrying then succeeded.

Also record the malformed concatenated validator test path discovered during
TASK-0013 reconnaissance as a separate deferred issue. It will not be fixed
inside TASK-0013 because it is outside the approved feature scope.

## Out-of-scope boundaries

TASK-0013 will not:

- alter GitHub Actions workflows;
- change branch protection or required checks;
- merge or mutate PRs;
- add automatic CI-to-merge behavior;
- persist watcher state;
- add new services or dependencies;
- fix unrelated package test-script defects;
- modify completed task evidence;
- create a release.

## Expected outcome

`forge pr watch` tolerates normal GitHub check-registration latency, remains
bounded and fail-closed, produces clear diagnostics, and becomes the preferred
watch path throughout Forge operator guidance.

## Outcome

READY_FOR_APPROVAL
