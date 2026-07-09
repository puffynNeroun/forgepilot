import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  collectForgeNext,
  detectNextPhase,
  extractTaskStatusFromBoardLine,
  renderForgeNext,
} from '../src/next.mjs';

async function createFixture() {
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-next-'));
  await fs.mkdir(path.join(fixtureRoot, 'docs'), { recursive: true });
  await fs.mkdir(path.join(fixtureRoot, '.forge', 'tasks'), { recursive: true });
  await fs.mkdir(path.join(fixtureRoot, '.forge', 'artifacts'), { recursive: true });
  return fixtureRoot;
}

async function withFixture(callback) {
  const fixtureRoot = await createFixture();

  try {
    await callback(fixtureRoot);
  } finally {
    await fs.rm(fixtureRoot, { recursive: true, force: true });
  }
}

async function writeFile(fixtureRoot, relativePath, content) {
  const absolutePath = path.join(fixtureRoot, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content);
}

function taskBoard(nowLine, nextLine) {
  return [
    '# Tasks',
    '',
    '## Now',
    '',
    nowLine,
    '',
    '## Next',
    '',
    nextLine,
    '',
    '## Later',
    '',
    '- [ ] No later tasks.',
    '',
    '## Completed',
    '',
  ].join('\n');
}

function taskContract(taskId, status) {
  return [
    'schema_version: 1',
    '',
    `id: ${taskId}`,
    'title: "Example task"',
    `status: ${status}`,
    'workflow: .forge/workflows/feature.yaml',
    '',
  ].join('\n');
}

async function fakeCleanGit(repositoryRoot, args) {
  if (args.join(' ') === 'branch --show-current') {
    return { stdout: 'task/TASK-0042-example\n', stderr: '' };
  }

  if (args.join(' ') === 'status --short --branch') {
    return { stdout: '## task/TASK-0042-example\n', stderr: '' };
  }

  throw new Error(`Unexpected git command for ${repositoryRoot}: ${args.join(' ')}`);
}

function lifecycleState(taskStatus, nextLine = '- [ ] Run Builder for `TASK-0042`.', branch = 'task/TASK-0042-example') {
  return {
    repositoryRoot: '/tmp/forge-next-test',
    git: {
      branch,
      clean: true,
      status: [`## ${branch}`],
    },
    taskBoard: {
      path: 'docs/TASKS.md',
      activeTaskId: 'TASK-0042',
      board: {
        now: [`- [ ] \`TASK-0042\` — Example task (\`${taskStatus}\`).`],
        next: [nextLine],
        later: ['- [ ] No later tasks.'],
        completed: [],
      },
    },
    selectedTaskId: 'TASK-0042',
    artifacts: [],
    staleVerificationMatches: [],
    taskStatus,
  };
}

test('extractTaskStatusFromBoardLine returns known task statuses', () => {
  assert.equal(
    extractTaskStatusFromBoardLine('- [ ] `TASK-0042` — Example (`ready_for_pr`).'),
    'ready_for_pr',
  );
  assert.equal(
    extractTaskStatusFromBoardLine('- [ ] `TASK-0042` — Example (approved).'),
    'approved',
  );
  assert.equal(extractTaskStatusFromBoardLine('- [ ] No active task.'), null);
});

test('renderForgeNext handles no active task', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeFile(
      fixtureRoot,
      'docs/TASKS.md',
      taskBoard('- [ ] No active task.', '- [ ] Define the next task.'),
    );

    const status = await collectForgeNext({
      repositoryRoot: fixtureRoot,
      runGit: fakeCleanGit,
    });

    const rendered = renderForgeNext(status);

    assert.match(rendered, /Forge Next/);
    assert.match(rendered, /Active task: none/);
    assert.match(rendered, /Define the next task\./);
    assert.match(rendered, /forge task new/);
  });
});

test('collectForgeNext reads task status from the task contract', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeFile(
      fixtureRoot,
      'docs/TASKS.md',
      taskBoard(
        '- [ ] `TASK-0042` — Example task (`proposed`).',
        '- [ ] Run Planner for `TASK-0042`.',
      ),
    );
    await writeFile(fixtureRoot, '.forge/tasks/TASK-0042.yaml', taskContract('TASK-0042', 'approved'));

    const status = await collectForgeNext({
      repositoryRoot: fixtureRoot,
      runGit: fakeCleanGit,
    });

    assert.equal(status.taskStatus, 'approved');
  });
});

test('detectNextPhase maps proposed tasks to planner prompts', () => {
  assert.deepEqual(detectNextPhase(lifecycleState('proposed')), {
    action: 'Plan TASK-0042.',
    suggestedCommand: 'forge prompt planner TASK-0042',
  });
});

test('detectNextPhase maps approved tasks to builder prompts', () => {
  assert.deepEqual(detectNextPhase(lifecycleState('approved')), {
    action: 'Build TASK-0042.',
    suggestedCommand: 'forge prompt builder TASK-0042',
  });
});

test('detectNextPhase maps in-progress tester board state to tester prompt', () => {
  assert.deepEqual(
    detectNextPhase(lifecycleState('in_progress', '- [ ] Run Tester for `TASK-0042`.')),
    {
      action: 'Test TASK-0042.',
      suggestedCommand: 'forge prompt tester TASK-0042',
    },
  );
});

test('detectNextPhase maps in-progress reviewer board state to reviewer prompt', () => {
  assert.deepEqual(
    detectNextPhase(lifecycleState('in_progress', '- [ ] Run Reviewer for `TASK-0042`.')),
    {
      action: 'Review TASK-0042.',
      suggestedCommand: 'forge prompt reviewer TASK-0042',
    },
  );
});

test('detectNextPhase maps ready-for-pr task branches to Forge implementation PR commands', () => {
  assert.deepEqual(detectNextPhase(lifecycleState('ready_for_pr')), {
    action: 'Create implementation PR for TASK-0042.',
    suggestedCommand: 'forge pr create-implementation -- --id TASK-0042 --title "TASK-0042: Implementation"',
  });
});

test('detectNextPhase maps ready-for-pr main branch to Forge completion PR commands', () => {
  assert.deepEqual(
    detectNextPhase(lifecycleState('ready_for_pr', '- [ ] Prepare PR for `TASK-0042`.', 'main')),
    {
      action: 'Create completion PR for TASK-0042.',
      suggestedCommand: 'forge pr create-completion -- --id TASK-0042 --branch chore/complete-TASK-0042',
    },
  );
});

test('renderForgeNext keeps dirty working tree state with completion PR guidance', () => {
  const state = lifecycleState('ready_for_pr', '- [ ] Prepare PR for `TASK-0042`.', 'main');
  state.git.clean = false;
  state.git.status = ['## main', ' M docs/TASKS.md'];

  const rendered = renderForgeNext(state);

  assert.match(rendered, /Working tree: dirty/);
  assert.match(rendered, /Create completion PR for TASK-0042\./);
  assert.match(rendered, /forge pr create-completion -- --id TASK-0042 --branch chore\/complete-TASK-0042/);
});

test('detectNextPhase maps blocked tasks to recovery prompts', () => {
  assert.deepEqual(detectNextPhase(lifecycleState('blocked')), {
    action: 'Resolve the blocker for TASK-0042 or run recovery.',
    suggestedCommand: 'forge prompt recovery TASK-0042',
  });
});
