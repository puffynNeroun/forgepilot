import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  parseArgs,
  stageTask,
  stageTaskBoard,
  stageTaskContract,
  stageTransitions,
  validateStage,
  validateTaskId,
} from '../src/stage-task.mjs';

async function makeFixture({
  taskId = 'TASK-9999',
  title = 'Fixture task',
  status = 'proposed',
  boardStatus = status,
  nextLine = '- [ ] Run Planner for `TASK-9999`.',
} = {}) {
  const repositoryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-stage-task-'));
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

function nextLine(taskId, label) {
  if (label === 'Prepare PR') {
    return `- [ ] Prepare PR for \`${taskId}\`.`;
  }

  return `- [ ] ${label} for \`${taskId}\`.`;
}

test('parseArgs accepts direct arguments', () => {
  const args = parseArgs(['--id', 'TASK-0014', '--stage', 'planner']);

  assert.equal(args.taskId, 'TASK-0014');
  assert.equal(args.stage, 'planner');
});

test('parseArgs accepts pnpm separator arguments', () => {
  const args = parseArgs(['--', '--id', 'TASK-0014', '--stage', 'builder']);

  assert.equal(args.taskId, 'TASK-0014');
  assert.equal(args.stage, 'builder');
});

test('parseArgs rejects unknown arguments', () => {
  assert.throws(() => parseArgs(['--wat']), /Unknown argument: --wat/);
});

test('validateTaskId accepts TASK-0000 format', () => {
  assert.doesNotThrow(() => validateTaskId('TASK-0014'));
});

test('validateTaskId rejects invalid task ids', () => {
  assert.throws(() => validateTaskId('0014'), /Task ID must match TASK-0000 format/);
});

test('validateStage accepts known stages', () => {
  for (const stage of Object.keys(stageTransitions)) {
    assert.doesNotThrow(() => validateStage(stage));
  }
});

test('validateStage rejects unknown stages', () => {
  assert.throws(() => validateStage('deploy'), /Stage must be one of/);
});

test('stageTaskContract transitions planner status', () => {
  const source = [
    'schema_version: 1',
    '',
    'id: TASK-9999',
    'title: Fixture task',
    'status: proposed',
    '',
  ].join('\n');

  const result = stageTaskContract(source, {
    taskId: 'TASK-9999',
    stage: 'planner',
  });

  assert.equal(result.task.title, 'Fixture task');
  assert.match(result.contractText, /^status: approved$/m);
});

test('stageTaskContract keeps tester status in_progress', () => {
  const source = [
    'schema_version: 1',
    '',
    'id: TASK-9999',
    'title: Fixture task',
    'status: in_progress',
    '',
  ].join('\n');

  const result = stageTaskContract(source, {
    taskId: 'TASK-9999',
    stage: 'tester',
  });

  assert.match(result.contractText, /^status: in_progress$/m);
});

test('stageTaskContract rejects wrong current status', () => {
  const source = [
    'schema_version: 1',
    '',
    'id: TASK-9999',
    'title: Fixture task',
    'status: proposed',
    '',
  ].join('\n');

  assert.throws(
    () => stageTaskContract(source, { taskId: 'TASK-9999', stage: 'builder' }),
    /must be approved before builder transition/,
  );
});

test('stageTaskBoard transitions reviewer board to prepare PR', () => {
  const source = [
    '# Tasks',
    '',
    '## Now',
    '',
    '- [ ] `TASK-9999` — Fixture task (`in_progress`).',
    '',
    '## Next',
    '',
    '- [ ] Run Reviewer for `TASK-9999`.',
    '',
  ].join('\n');

  const result = stageTaskBoard(source, {
    taskId: 'TASK-9999',
    title: 'Fixture task',
    stage: 'reviewer',
  });

  assert.match(result, /- \[ \] `TASK-9999` — Fixture task \(`ready_for_pr`\)\./);
  assert.match(result, /- \[ \] Prepare PR for `TASK-9999`\./);
});

test('stageTaskBoard rejects board mismatch', () => {
  assert.throws(
    () =>
      stageTaskBoard('# Tasks\n', {
        taskId: 'TASK-9999',
        title: 'Fixture task',
        stage: 'planner',
      }),
    /does not show TASK-9999 as the active proposed task/,
  );
});

for (const [stage, transition] of Object.entries(stageTransitions)) {
  test(`stageTask applies ${stage} transition`, async () => {
    const repositoryRoot = await makeFixture({
      status: transition.fromStatus,
      boardStatus: transition.fromStatus,
      nextLine: nextLine('TASK-9999', transition.fromNext),
    });

    const result = await stageTask({
      repositoryRoot,
      taskId: 'TASK-9999',
      stage,
    });

    const contract = await fs.readFile(
      path.join(repositoryRoot, '.forge', 'tasks', 'TASK-9999.yaml'),
      'utf8',
    );

    const board = await fs.readFile(path.join(repositoryRoot, 'docs', 'TASKS.md'), 'utf8');

    assert.equal(result.stage, stage);
    assert.match(contract, new RegExp(`^status:\\s*${transition.toStatus}$`, 'm'));
    assert.match(
      board,
      new RegExp(
        `- \\[ \\] \`TASK-9999\` — Fixture task \\(\`${transition.toStatus}\`\\)\\.`,
      ),
    );
    assert.match(board, new RegExp(nextLine('TASK-9999', transition.toNext).replaceAll('[', '\\[').replaceAll(']', '\\]')));
  });
}

test('stageTask rejects missing task contract', async () => {
  const repositoryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-stage-task-missing-'));

  await fs.mkdir(path.join(repositoryRoot, 'docs'), { recursive: true });
  await fs.writeFile(path.join(repositoryRoot, 'docs', 'TASKS.md'), '# Tasks\n', 'utf8');

  await assert.rejects(
    () => stageTask({ repositoryRoot, taskId: 'TASK-9999', stage: 'planner' }),
    /Task contract does not exist/,
  );
});

test('stageTask rejects board mismatch without updating contract', async () => {
  const repositoryRoot = await makeFixture({
    status: 'approved',
    boardStatus: 'proposed',
    nextLine: '- [ ] Run Builder for `TASK-9999`.',
  });

  await assert.rejects(
    () => stageTask({ repositoryRoot, taskId: 'TASK-9999', stage: 'builder' }),
    /does not show TASK-9999 as the active approved task/,
  );

  const contract = await fs.readFile(
    path.join(repositoryRoot, '.forge', 'tasks', 'TASK-9999.yaml'),
    'utf8',
  );

  assert.match(contract, /^status: approved$/m);
});
