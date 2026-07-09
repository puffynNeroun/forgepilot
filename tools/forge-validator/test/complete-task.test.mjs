import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  completeTask,
  completeTaskBoard,
  completeTaskContract,
  formatDate,
  parseArgs,
  validateTaskId,
} from '../src/complete-task.mjs';

async function makeFixture({
  taskId = 'TASK-9999',
  title = 'Fixture task',
  status = 'ready_for_pr',
  boardStatus = 'ready_for_pr',
  nextLine = '- [ ] Prepare PR for `TASK-9999`.',
} = {}) {
  const repositoryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-complete-task-'));
  const taskDir = path.join(repositoryRoot, '.forge', 'tasks');
  const docsDir = path.join(repositoryRoot, 'docs');

  await fs.mkdir(taskDir, { recursive: true });
  await fs.mkdir(docsDir, { recursive: true });

  await fs.writeFile(
    path.join(taskDir, `${taskId}.yaml`),
    [
      'schema_version: 1',
      '',
      `id: ${taskId}`,
      `title: ${title}`,
      `status: ${status}`,
      'workflow: .forge/workflows/feature.yaml',
      '',
    ].join('\n'),
    'utf8',
  );

  await fs.writeFile(
    path.join(docsDir, 'TASKS.md'),
    [
      '# Tasks',
      '',
      '## Now',
      '',
      `- [ ] \`${taskId}\` — ${title} (\`${boardStatus}\`).`,
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
      '- [x] `TASK-0001` — Old task (`completed`, 2026-06-16).',
      '',
    ].join('\n'),
    'utf8',
  );

  return repositoryRoot;
}

test('parseArgs accepts direct task id argument', () => {
  assert.equal(parseArgs(['--id', 'TASK-0013']).taskId, 'TASK-0013');
});

test('parseArgs accepts pnpm separator before task id argument', () => {
  assert.equal(parseArgs(['--', '--id', 'TASK-0013']).taskId, 'TASK-0013');
});

test('parseArgs rejects unknown arguments', () => {
  assert.throws(() => parseArgs(['--wat']), /Unknown argument: --wat/);
});

test('validateTaskId accepts TASK-0000 format', () => {
  assert.doesNotThrow(() => validateTaskId('TASK-0013'));
});

test('validateTaskId rejects invalid task ids', () => {
  assert.throws(() => validateTaskId('0013'), /Task ID must match TASK-0000 format/);
});

test('formatDate renders local YYYY-MM-DD date', () => {
  assert.equal(formatDate(new Date(2026, 5, 27)), '2026-06-27');
});

test('completeTaskContract marks ready_for_pr task as completed', () => {
  const source = [
    'schema_version: 1',
    '',
    'id: TASK-9999',
    'title: Fixture task',
    'status: ready_for_pr',
    '',
  ].join('\n');

  const result = completeTaskContract(source, 'TASK-9999');

  assert.equal(result.task.id, 'TASK-9999');
  assert.equal(result.task.title, 'Fixture task');
  assert.match(result.contractText, /^status: completed$/m);
});

test('completeTaskContract rejects non-ready task', () => {
  const source = [
    'schema_version: 1',
    '',
    'id: TASK-9999',
    'title: Fixture task',
    'status: proposed',
    '',
  ].join('\n');

  assert.throws(
    () => completeTaskContract(source, 'TASK-9999'),
    /must be ready_for_pr before completion/,
  );
});

test('completeTaskBoard clears active task and prepends completed line', () => {
  const board = [
    '# Tasks',
    '',
    '## Now',
    '',
    '- [ ] `TASK-9999` — Fixture task (`ready_for_pr`).',
    '',
    '## Next',
    '',
    '- [ ] Prepare PR for `TASK-9999`.',
    '',
    '## Later',
    '',
    '- [ ] No later tasks.',
    '',
    '## Completed',
    '',
    '- [x] `TASK-0001` — Old task (`completed`, 2026-06-16).',
    '',
  ].join('\n');

  const result = completeTaskBoard(board, {
    taskId: 'TASK-9999',
    title: 'Fixture task',
    completedDate: '2026-06-27',
  });

  assert.match(result, /- \[ \] No active task/);
  assert.match(result, /- \[ \] Define the next task/);
  assert.match(
    result,
    /## Completed\n\n- \[x\] `TASK-9999` — Fixture task \(`completed`, 2026-06-27\)\./,
  );
});

test('completeTaskBoard rejects board mismatch', () => {
  assert.throws(
    () => completeTaskBoard('# Tasks\n', {
      taskId: 'TASK-9999',
      title: 'Fixture task',
      completedDate: '2026-06-27',
    }),
    /does not show TASK-9999 as the active ready_for_pr task/,
  );
});

test('completeTask updates task contract and docs task board', async () => {
  const repositoryRoot = await makeFixture();

  const result = await completeTask({
    repositoryRoot,
    taskId: 'TASK-9999',
    today: '2026-06-27',
  });

  const contract = await fs.readFile(
    path.join(repositoryRoot, '.forge', 'tasks', 'TASK-9999.yaml'),
    'utf8',
  );

  const board = await fs.readFile(path.join(repositoryRoot, 'docs', 'TASKS.md'), 'utf8');

  assert.equal(result.taskId, 'TASK-9999');
  assert.match(contract, /^status: completed$/m);
  assert.match(board, /- \[ \] No active task/);
  assert.match(board, /- \[ \] Define the next task/);
  assert.match(board, /- \[x\] `TASK-9999` — Fixture task \(`completed`, 2026-06-27\)\./);
});

test('completeTask rejects missing task contract before writing board', async () => {
  const repositoryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-complete-task-missing-'));

  await fs.mkdir(path.join(repositoryRoot, 'docs'), { recursive: true });
  await fs.writeFile(path.join(repositoryRoot, 'docs', 'TASKS.md'), '# Tasks\n', 'utf8');

  await assert.rejects(
    () => completeTask({ repositoryRoot, taskId: 'TASK-9999' }),
    /Task contract does not exist/,
  );
});

test('completeTask rejects non-ready task without updating files', async () => {
  const repositoryRoot = await makeFixture({ status: 'approved' });

  await assert.rejects(
    () => completeTask({ repositoryRoot, taskId: 'TASK-9999' }),
    /must be ready_for_pr before completion/,
  );

  const contract = await fs.readFile(
    path.join(repositoryRoot, '.forge', 'tasks', 'TASK-9999.yaml'),
    'utf8',
  );

  assert.match(contract, /^status: approved$/m);
});

test('completeTask rejects board mismatch without updating contract', async () => {
  const repositoryRoot = await makeFixture({ boardStatus: 'approved' });

  await assert.rejects(
    () => completeTask({ repositoryRoot, taskId: 'TASK-9999' }),
    /does not show TASK-9999 as the active ready_for_pr task/,
  );

  const contract = await fs.readFile(
    path.join(repositoryRoot, '.forge', 'tasks', 'TASK-9999.yaml'),
    'utf8',
  );

  assert.match(contract, /^status: ready_for_pr$/m);
});
