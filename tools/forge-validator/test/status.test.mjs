import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  collectLifecycleStatus,
  parseTaskBoard,
  renderLifecycleStatus,
  scanStaleVerificationText,
} from '../src/status.mjs';

async function createFixture() {
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-status-'));
  await fs.mkdir(path.join(fixtureRoot, 'docs'), { recursive: true });
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

function taskBoard(nowLine = '- [ ] `TASK-0010` — Add Forge lifecycle status command (`in_progress`).') {
  return [
    '# Tasks',
    '',
    '## Now',
    '',
    nowLine,
    '',
    '## Next',
    '',
    '- [ ] Run Tester for `TASK-0010`.',
    '',
    '## Later',
    '',
    '- [ ] No later tasks.',
    '',
    '## Completed',
    '',
    '- [x] `TASK-0009` — Decide plan/build retry-chain policy (`completed`, 2026-06-27).',
    '',
  ].join('\n');
}

async function fakeCleanGit(repositoryRoot, args) {
  if (args.join(' ') === 'branch --show-current') {
    return {
      stdout: 'task/TASK-0010-forge-lifecycle-status-command\n',
      stderr: '',
    };
  }

  if (args.join(' ') === 'status --short --branch') {
    return {
      stdout: '## task/TASK-0010-forge-lifecycle-status-command\n',
      stderr: '',
    };
  }

  throw new Error(`Unexpected git command for ${repositoryRoot}: ${args.join(' ')}`);
}

async function fakeDirtyGit(repositoryRoot, args) {
  if (args.join(' ') === 'branch --show-current') {
    return {
      stdout: 'feature/status\n',
      stderr: '',
    };
  }

  if (args.join(' ') === 'status --short --branch') {
    return {
      stdout: '## feature/status\n M docs/TASKS.md\n?? .forge/tasks/TASK-0010.yaml\n',
      stderr: '',
    };
  }

  throw new Error(`Unexpected git command for ${repositoryRoot}: ${args.join(' ')}`);
}

test('parseTaskBoard returns board sections', () => {
  const parsed = parseTaskBoard(taskBoard());

  assert.equal(
    parsed.now[0],
    '- [ ] `TASK-0010` — Add Forge lifecycle status command (`in_progress`).',
  );
  assert.equal(parsed.next[0], '- [ ] Run Tester for `TASK-0010`.');
  assert.equal(parsed.later[0], '- [ ] No later tasks.');
  assert.equal(
    parsed.completed[0],
    '- [x] `TASK-0009` — Decide plan/build retry-chain policy (`completed`, 2026-06-27).',
  );
});

test('collectLifecycleStatus reports active task and clean git state', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeFile(fixtureRoot, 'docs/TASKS.md', taskBoard());

    const status = await collectLifecycleStatus({
      repositoryRoot: fixtureRoot,
      runGit: fakeCleanGit,
    });

    assert.equal(status.git.branch, 'task/TASK-0010-forge-lifecycle-status-command');
    assert.equal(status.git.clean, true);
    assert.equal(status.taskBoard.activeTaskId, 'TASK-0010');
    assert.equal(status.selectedTaskId, 'TASK-0010');
  });
});

test('collectLifecycleStatus reports no active task when board has no active task', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeFile(fixtureRoot, 'docs/TASKS.md', taskBoard('- [ ] No active task.'));

    const status = await collectLifecycleStatus({
      repositoryRoot: fixtureRoot,
      runGit: fakeCleanGit,
    });

    assert.equal(status.taskBoard.activeTaskId, null);
    assert.equal(status.selectedTaskId, null);
    assert.deepEqual(status.artifacts, []);
  });
});

test('collectLifecycleStatus reports expected artifact presence', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeFile(fixtureRoot, 'docs/TASKS.md', taskBoard());
    await writeFile(fixtureRoot, '.forge/artifacts/TASK-0010/plan-001.md', '# plan\n');
    await writeFile(fixtureRoot, '.forge/artifacts/TASK-0010/build-report-001.md', '# build\n');

    const status = await collectLifecycleStatus({
      repositoryRoot: fixtureRoot,
      runGit: fakeCleanGit,
    });

    assert.deepEqual(status.artifacts, [
      {
        file: '.forge/artifacts/TASK-0010/plan-001.md',
        present: true,
      },
      {
        file: '.forge/artifacts/TASK-0010/build-report-001.md',
        present: true,
      },
      {
        file: '.forge/artifacts/TASK-0010/test-report-001.md',
        present: false,
      },
      {
        file: '.forge/artifacts/TASK-0010/review-report-001.md',
        present: false,
      },
    ]);
  });
});

test('scanStaleVerificationText detects stale verification text', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeFile(
      fixtureRoot,
      '.forge/artifacts/TASK-0010/test-report-001.md',
      'old summary: tests 1\n',
    );

    const matches = await scanStaleVerificationText(fixtureRoot, 'TASK-0010');

    assert.deepEqual(matches, [
      {
        file: '.forge/artifacts/TASK-0010/test-report-001.md',
        line: 1,
        pattern: 'stale test count',
      },
    ]);
  });
});

test('renderLifecycleStatus includes dirty state, task, artifacts, and stale section', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeFile(fixtureRoot, 'docs/TASKS.md', taskBoard());
    await writeFile(fixtureRoot, '.forge/artifacts/TASK-0010/plan-001.md', '# plan\n');

    const status = await collectLifecycleStatus({
      repositoryRoot: fixtureRoot,
      runGit: fakeDirtyGit,
    });

    const rendered = renderLifecycleStatus(status);

    assert.match(rendered, /Forge Lifecycle Status/);
    assert.match(rendered, /Working tree: dirty/);
    assert.match(rendered, /Active task: TASK-0010/);
    assert.match(rendered, /present \.forge\/artifacts\/TASK-0010\/plan-001\.md/);
    assert.match(rendered, /missing \.forge\/artifacts\/TASK-0010\/build-report-001\.md/);
    assert.match(rendered, /Stale verification text:/);
  });
});
