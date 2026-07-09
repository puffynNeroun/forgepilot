import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectPrStatus,
  completionBranchForTask,
  computePrStatusNextAction,
  extractTaskStatusFromLifecycleStatus,
  notApplicablePrStatus,
  renderPrStatus,
  summarizeChecks,
  taskIdFromCompletionBranch,
} from '../src/pr-status.mjs';

function lifecycleState({
  branch = 'task/TASK-0042-example',
  clean = true,
  activeTaskId = 'TASK-0042',
  taskStatus = 'ready_for_pr',
} = {}) {
  return {
    repositoryRoot: '/tmp/forge-pr-status-test',
    git: {
      branch,
      clean,
      status: [`## ${branch}`],
    },
    taskBoard: {
      path: 'docs/TASKS.md',
      activeTaskId,
      board: {
        now: activeTaskId
          ? [`- [ ] \`${activeTaskId}\` — Example task (\`${taskStatus}\`).`]
          : ['- [ ] No active task.'],
        next: activeTaskId
          ? [`- [ ] Prepare PR for \`${activeTaskId}\`.`]
          : ['- [ ] Define the next task.'],
        later: ['- [ ] No later tasks.'],
        completed: [],
      },
    },
    selectedTaskId: activeTaskId,
    artifacts: [],
    staleVerificationMatches: [],
  };
}

function prStatus({
  lifecycleStatus = lifecycleState(),
  taskId = lifecycleStatus.taskBoard.activeTaskId,
  taskStatus = extractTaskStatusFromLifecycleStatus(lifecycleStatus),
  implementationPr = notApplicablePrStatus('implementation'),
  completionPr = notApplicablePrStatus('completion', taskId ? completionBranchForTask(taskId) : null),
} = {}) {
  return {
    lifecycleStatus,
    taskId,
    taskStatus,
    implementationPr,
    completionPr,
  };
}

function missingPr(kind, headBranch) {
  return {
    kind,
    headBranch,
    lookupState: 'missing',
    pr: null,
    checks: {
      status: 'not_applicable',
      total: 0,
      passing: 0,
      failing: 0,
      pending: 0,
      skipped: 0,
    },
  };
}

function openPr(kind, headBranch, checks, mergeable = 'MERGEABLE') {
  return {
    kind,
    headBranch,
    lookupState: 'resolved',
    pr: {
      number: kind === 'implementation' ? 12 : 13,
      title: kind === 'implementation' ? 'TASK-0042: Implementation' : 'Complete TASK-0042',
      url: `https://example.test/${kind}`,
      state: 'OPEN',
      headRefName: headBranch,
      baseRefName: 'main',
      mergeable,
      reviewDecision: '',
      isDraft: false,
    },
    checks,
  };
}

function mergedPr(kind, headBranch) {
  return {
    ...openPr(kind, headBranch, {
      status: 'passing',
      total: 1,
      passing: 1,
      failing: 0,
      pending: 0,
      skipped: 0,
    }),
    pr: {
      ...openPr(kind, headBranch, {
        status: 'passing',
        total: 1,
        passing: 1,
        failing: 0,
        pending: 0,
        skipped: 0,
      }).pr,
      state: 'MERGED',
    },
  };
}

test('completionBranchForTask returns the conventional completion branch', () => {
  assert.equal(completionBranchForTask('TASK-0042'), 'chore/complete-TASK-0042');
});

test('extractTaskStatusFromLifecycleStatus reads the active board status', () => {
  assert.equal(extractTaskStatusFromLifecycleStatus(lifecycleState({ taskStatus: 'approved' })), 'approved');
  assert.equal(extractTaskStatusFromLifecycleStatus(lifecycleState({ activeTaskId: null })), null);
});

test('summarizeChecks classifies passing, failing, pending, and skipped checks', () => {
  assert.deepEqual(
    summarizeChecks([
      { bucket: 'pass' },
      { conclusion: 'FAILURE' },
      { state: 'IN_PROGRESS' },
      { conclusion: 'CANCELLED' },
    ]),
    {
      status: 'failing',
      total: 4,
      passing: 1,
      failing: 1,
      pending: 1,
      skipped: 1,
    },
  );
});

test('renderPrStatus handles no active task', () => {
  const report = renderPrStatus(prStatus({
    lifecycleStatus: lifecycleState({
      branch: 'main',
      activeTaskId: null,
      taskStatus: null,
    }),
  }));

  assert.match(report, /Forge PR Status/);
  assert.match(report, /Active task: none/);
  assert.match(report, /Define the next task/);
  assert.match(report, /forge task new/);
});

test('ready_for_pr task branch with missing implementation PR recommends Forge create-implementation', () => {
  const status = prStatus({
    implementationPr: missingPr('implementation', 'task/TASK-0042-example'),
  });

  const action = computePrStatusNextAction(status);

  assert.equal(action.action, 'Create implementation PR for TASK-0042.');
  assert.equal(action.suggestedCommand, 'forge pr create-implementation -- --id TASK-0042 --title "TASK-0042: Implementation"');
});

test('ready_for_pr task branch with pending implementation PR recommends waiting', () => {
  const status = prStatus({
    implementationPr: openPr('implementation', 'task/TASK-0042-example', {
      status: 'pending',
      total: 1,
      passing: 0,
      failing: 0,
      pending: 1,
      skipped: 0,
    }),
  });

  const action = computePrStatusNextAction(status);

  assert.equal(action.action, 'Wait for implementation PR #12 checks.');
  assert.equal(action.suggestedCommand, 'gh pr checks 12 --watch');
});

test('ready_for_pr task branch with passing implementation PR recommends Forge merge-implementation', () => {
  const status = prStatus({
    implementationPr: openPr('implementation', 'task/TASK-0042-example', {
      status: 'passing',
      total: 1,
      passing: 1,
      failing: 0,
      pending: 0,
      skipped: 0,
    }),
  });

  const action = computePrStatusNextAction(status);

  assert.equal(action.action, 'Merge implementation PR #12 for TASK-0042.');
  assert.equal(action.suggestedCommand, 'forge pr merge-implementation -- --pr 12 --id TASK-0042 --branch task/TASK-0042-example');
});

test('ready_for_pr main branch with missing completion PR recommends Forge create-completion', () => {
  const status = prStatus({
    lifecycleStatus: lifecycleState({ branch: 'main' }),
    completionPr: missingPr('completion', 'chore/complete-TASK-0042'),
  });

  const action = computePrStatusNextAction(status);

  assert.equal(action.action, 'Create completion PR for TASK-0042.');
  assert.equal(action.suggestedCommand, 'forge pr create-completion -- --id TASK-0042 --branch chore/complete-TASK-0042');
});

test('ready_for_pr main branch with passing completion PR recommends Forge merge-completion', () => {
  const status = prStatus({
    lifecycleStatus: lifecycleState({ branch: 'main' }),
    completionPr: openPr('completion', 'chore/complete-TASK-0042', {
      status: 'passing',
      total: 1,
      passing: 1,
      failing: 0,
      pending: 0,
      skipped: 0,
    }),
  });

  const action = computePrStatusNextAction(status);

  assert.equal(action.action, 'Merge completion PR #13 for TASK-0042.');
  assert.equal(action.suggestedCommand, 'forge pr merge-completion -- --pr 13 --id TASK-0042 --branch chore/complete-TASK-0042');
});

test('dirty working tree blocks remote PR action recommendations', () => {
  const status = prStatus({
    lifecycleStatus: lifecycleState({ clean: false }),
    implementationPr: missingPr('implementation', 'task/TASK-0042-example'),
  });

  const action = computePrStatusNextAction(status);

  assert.equal(action.action, 'Review or clean local changes before remote PR actions.');
  assert.equal(action.suggestedCommand, 'git status --short --branch');
});

test('non-ready task delegates to forge next', () => {
  const status = prStatus({
    lifecycleStatus: lifecycleState({ taskStatus: 'approved' }),
  });

  const action = computePrStatusNextAction(status);

  assert.equal(action.action, 'Follow forge next for TASK-0042.');
  assert.equal(action.suggestedCommand, 'forge next');
});

test('unknown GitHub PR data is rendered and recommends manual inspection', () => {
  const status = prStatus({
    implementationPr: {
      kind: 'implementation',
      headBranch: 'task/TASK-0042-example',
      lookupState: 'unknown',
      pr: null,
      error: 'gh not found',
      checks: {
        status: 'not_applicable',
        total: 0,
        passing: 0,
        failing: 0,
        pending: 0,
        skipped: 0,
      },
    },
  });

  const report = renderPrStatus(status);

  assert.match(report, /State: unknown \(gh not found\)/);
  assert.match(report, /Inspect implementation PR state manually/);
  assert.match(report, /gh pr list --state all --head task\/TASK-0042-example/);
});

test('taskIdFromCompletionBranch detects conventional completion branches', () => {
  assert.equal(taskIdFromCompletionBranch('chore/complete-TASK-0042'), 'TASK-0042');
  assert.equal(taskIdFromCompletionBranch('task/TASK-0042-example'), null);
  assert.equal(taskIdFromCompletionBranch('main'), null);
});

test('completion branch with missing completion PR recommends inspection', () => {
  const status = prStatus({
    lifecycleStatus: lifecycleState({
      branch: 'chore/complete-TASK-0042',
      activeTaskId: null,
      taskStatus: null,
    }),
    taskId: 'TASK-0042',
    taskStatus: 'completed',
    completionPr: missingPr('completion', 'chore/complete-TASK-0042'),
  });

  const action = computePrStatusNextAction(status);

  assert.equal(action.action, 'Inspect or create completion PR for TASK-0042.');
  assert.equal(action.suggestedCommand, 'gh pr list --state all --head chore/complete-TASK-0042');
});

test('completion branch with pending completion PR recommends waiting', () => {
  const status = prStatus({
    lifecycleStatus: lifecycleState({
      branch: 'chore/complete-TASK-0042',
      activeTaskId: null,
      taskStatus: null,
    }),
    taskId: 'TASK-0042',
    taskStatus: 'completed',
    completionPr: openPr('completion', 'chore/complete-TASK-0042', {
      status: 'pending',
      total: 1,
      passing: 0,
      failing: 0,
      pending: 1,
      skipped: 0,
    }),
  });

  const action = computePrStatusNextAction(status);

  assert.equal(action.action, 'Wait for completion PR #13 checks.');
  assert.equal(action.suggestedCommand, 'gh pr checks 13 --watch');
});

test('completion branch with failing completion PR recommends inspecting checks', () => {
  const status = prStatus({
    lifecycleStatus: lifecycleState({
      branch: 'chore/complete-TASK-0042',
      activeTaskId: null,
      taskStatus: null,
    }),
    taskId: 'TASK-0042',
    taskStatus: 'completed',
    completionPr: openPr('completion', 'chore/complete-TASK-0042', {
      status: 'failing',
      total: 1,
      passing: 0,
      failing: 1,
      pending: 0,
      skipped: 0,
    }),
  });

  const action = computePrStatusNextAction(status);

  assert.equal(action.action, 'Inspect failing checks on completion PR #13.');
  assert.equal(action.suggestedCommand, 'gh pr checks 13');
});

test('completion branch with passing mergeable completion PR recommends Forge merge-completion', () => {
  const status = prStatus({
    lifecycleStatus: lifecycleState({
      branch: 'chore/complete-TASK-0042',
      activeTaskId: null,
      taskStatus: null,
    }),
    taskId: 'TASK-0042',
    taskStatus: 'completed',
    completionPr: openPr('completion', 'chore/complete-TASK-0042', {
      status: 'passing',
      total: 1,
      passing: 1,
      failing: 0,
      pending: 0,
      skipped: 0,
    }),
  });

  const action = computePrStatusNextAction(status);

  assert.equal(action.action, 'Merge completion PR #13 for TASK-0042.');
  assert.equal(action.suggestedCommand, 'forge pr merge-completion -- --pr 13 --id TASK-0042 --branch chore/complete-TASK-0042');
});

test('completion branch with merged completion PR recommends Forge task check', () => {
  const status = prStatus({
    lifecycleStatus: lifecycleState({
      branch: 'chore/complete-TASK-0042',
      activeTaskId: null,
      taskStatus: null,
    }),
    taskId: 'TASK-0042',
    taskStatus: 'completed',
    completionPr: mergedPr('completion', 'chore/complete-TASK-0042'),
  });

  const action = computePrStatusNextAction(status);

  assert.equal(action.action, 'Run post-task check for TASK-0042.');
  assert.equal(action.suggestedCommand, 'forge task check -- --id TASK-0042');
});

test('no active task on main still recommends defining the next task', () => {
  const status = prStatus({
    lifecycleStatus: lifecycleState({
      branch: 'main',
      activeTaskId: null,
      taskStatus: null,
    }),
    taskId: null,
    taskStatus: null,
  });

  const action = computePrStatusNextAction(status);

  assert.equal(action.action, 'Define the next task.');
  assert.equal(action.suggestedCommand, 'forge task new -- --id TASK-XXXX --title "Task title"');
});

test('collectPrStatus derives workflow task and completion PR on completion branch', async () => {
  const lifecycleStatus = lifecycleState({
    branch: 'chore/complete-TASK-0042',
    activeTaskId: null,
    taskStatus: null,
  });

  async function fakeGh(_repositoryRoot, args) {
    const command = args.join(' ');

    if (command.startsWith('pr list')) {
      return {
        stdout: JSON.stringify([
          {
            number: 13,
            title: 'Complete TASK-0042',
            url: 'https://example.test/completion',
            state: 'OPEN',
            isDraft: false,
            headRefName: 'chore/complete-TASK-0042',
            baseRefName: 'main',
            mergeable: 'MERGEABLE',
            reviewDecision: '',
          },
        ]),
        stderr: '',
      };
    }

    if (command.startsWith('pr checks 13')) {
      return {
        stdout: JSON.stringify([
          {
            name: 'Forge Contracts',
            state: 'SUCCESS',
            bucket: 'pass',
            link: 'https://example.test/check',
          },
        ]),
        stderr: '',
      };
    }

    throw new Error(`Unexpected gh command: ${command}`);
  }

  const status = await collectPrStatus({
    repositoryRoot: '/tmp/forge-pr-status-test',
    lifecycleStatus,
    runGh: fakeGh,
  });

  assert.equal(status.activeTaskId, null);
  assert.equal(status.completionBranchTaskId, 'TASK-0042');
  assert.equal(status.taskId, 'TASK-0042');
  assert.equal(status.taskStatus, 'completed');
  assert.equal(status.completionPr.pr.number, 13);
  assert.equal(status.nextAction.action, 'Merge completion PR #13 for TASK-0042.');
});
