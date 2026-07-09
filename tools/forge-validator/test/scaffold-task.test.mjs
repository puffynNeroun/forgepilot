import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildTaskContract,
  parseArgs,
  scaffoldTask,
  updateTaskBoard,
  validateTaskId,
} from '../src/scaffold-task.mjs';

function boardNoActive() {
  return [
    '# Tasks',
    '',
    '## Now',
    '',
    '- [ ] No active task.',
    '',
    '## Next',
    '',
    '- [ ] Define the next task.',
    '',
    '## Later',
    '',
    '- [ ] No later tasks.',
    '',
    '## Completed',
    '',
    '- [x] `TASK-0011` — Previous task (`completed`, 2026-06-27).',
    '',
  ].join('\n');
}

function boardWithActiveTask() {
  return boardNoActive()
    .replace('- [ ] No active task.', '- [ ] `TASK-0012` — Active task (`proposed`).')
    .replace('- [ ] Define the next task.', '- [ ] Run Planner for `TASK-0012`.');
}

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-scaffold-'));

  await fs.mkdir(path.join(root, 'docs'), { recursive: true });
  await fs.mkdir(path.join(root, '.forge', 'tasks'), { recursive: true });
  await fs.mkdir(path.join(root, '.forge', 'artifacts'), { recursive: true });
  await fs.writeFile(path.join(root, 'docs', 'TASKS.md'), boardNoActive());

  return root;
}

async function withFixture(callback) {
  const root = await createFixture();

  try {
    await callback(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

async function exists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

test('parseArgs accepts repo root, task id, and title', async () => {
  await withFixture(async (root) => {
    const parsed = parseArgs([
      '--repo-root',
      root,
      '--id',
      'TASK-0012',
      '--title',
      'Example task',
    ]);

    assert.equal(parsed.repositoryRoot, path.resolve(root));
    assert.equal(parsed.taskId, 'TASK-0012');
    assert.equal(parsed.title, 'Example task');
  });
});

test('parseArgs ignores a leading pnpm argument separator', async () => {
  await withFixture(async (root) => {
    const parsed = parseArgs([
      '--',
      '--repo-root',
      root,
      '--id',
      'TASK-0012',
      '--title',
      'Example task',
    ]);

    assert.equal(parsed.repositoryRoot, path.resolve(root));
    assert.equal(parsed.taskId, 'TASK-0012');
    assert.equal(parsed.title, 'Example task');
  });
});

test('parseArgs rejects unknown non-separator arguments', () => {
  assert.throws(
    () => parseArgs(['--unknown']),
    /Unknown argument: --unknown/,
  );
});

test('validateTaskId rejects invalid task IDs', () => {
  assert.throws(() => validateTaskId('TASK-12'), /TASK-0000/);
  assert.throws(() => validateTaskId('task-0012'), /TASK-0000/);
  assert.throws(() => validateTaskId('TASK-00123'), /TASK-0000/);
});

test('buildTaskContract creates proposed task contract text', () => {
  const contract = buildTaskContract({
    taskId: 'TASK-0012',
    title: 'Example task',
  });

  assert.match(contract, /id: TASK-0012/);
  assert.match(contract, /title: "Example task"/);
  assert.match(contract, /status: proposed/);
  assert.match(contract, /required_checks:\n  - verify/);
});

test('updateTaskBoard sets Now and Next for a new task', () => {
  const updated = updateTaskBoard(boardNoActive(), 'TASK-0012', 'Example task');

  assert.match(updated, /`TASK-0012` — Example task \(`proposed`\)/);
  assert.match(updated, /Run Planner for `TASK-0012`/);
  assert.match(updated, /## Completed/);
});

test('scaffoldTask creates task contract, artifact directory, and updates board', async () => {
  await withFixture(async (root) => {
    const result = await scaffoldTask({
      repositoryRoot: root,
      taskId: 'TASK-0012',
      title: 'Example task',
    });

    assert.deepEqual(result, {
      taskPath: '.forge/tasks/TASK-0012.yaml',
      artifactDirectory: '.forge/artifacts/TASK-0012',
      boardPath: 'docs/TASKS.md',
    });

    const taskContract = await fs.readFile(path.join(root, '.forge/tasks/TASK-0012.yaml'), 'utf8');
    const board = await fs.readFile(path.join(root, 'docs/TASKS.md'), 'utf8');
    const artifactStat = await fs.stat(path.join(root, '.forge/artifacts/TASK-0012'));

    assert.match(taskContract, /id: TASK-0012/);
    assert.match(taskContract, /status: proposed/);
    assert.equal(artifactStat.isDirectory(), true);
    assert.match(board, /`TASK-0012` — Example task \(`proposed`\)/);
    assert.match(board, /Run Planner for `TASK-0012`/);

    assert.equal(
      await exists(path.join(root, '.forge/artifacts/TASK-0012/plan-001.md')),
      false,
    );
  });
});

test('scaffoldTask rejects an existing active task without writing files', async () => {
  await withFixture(async (root) => {
    await fs.writeFile(path.join(root, 'docs', 'TASKS.md'), boardWithActiveTask());

    await assert.rejects(
      scaffoldTask({
        repositoryRoot: root,
        taskId: 'TASK-0012',
        title: 'Example task',
      }),
      /already has an active task/,
    );

    assert.equal(await exists(path.join(root, '.forge/tasks/TASK-0012.yaml')), false);
    assert.equal(await exists(path.join(root, '.forge/artifacts/TASK-0012')), false);
  });
});

test('scaffoldTask rejects an existing task contract', async () => {
  await withFixture(async (root) => {
    await fs.writeFile(path.join(root, '.forge/tasks/TASK-0012.yaml'), 'already exists\n');

    await assert.rejects(
      scaffoldTask({
        repositoryRoot: root,
        taskId: 'TASK-0012',
        title: 'Example task',
      }),
      /Task contract already exists/,
    );

    assert.equal(await exists(path.join(root, '.forge/artifacts/TASK-0012')), false);
  });
});

test('scaffoldTask rejects an existing artifact directory', async () => {
  await withFixture(async (root) => {
    await fs.mkdir(path.join(root, '.forge/artifacts/TASK-0012'));

    await assert.rejects(
      scaffoldTask({
        repositoryRoot: root,
        taskId: 'TASK-0012',
        title: 'Example task',
      }),
      /Task artifact directory already exists/,
    );

    assert.equal(await exists(path.join(root, '.forge/tasks/TASK-0012.yaml')), false);
  });
});
