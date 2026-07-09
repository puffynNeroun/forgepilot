import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  assertFinalState,
  createSmokeRepository,
  readSmokeState,
  renderSmokeResult,
  runWorkflowSmoke,
} from '../src/workflow-smoke.mjs';

test('createSmokeRepository creates minimal fixture task and board', async () => {
  const repositoryRoot = await createSmokeRepository({
    taskId: 'TASK-9001',
    title: 'Fixture smoke task',
  });

  const contractText = await fs.readFile(
    path.join(repositoryRoot, '.forge', 'tasks', 'TASK-9001.yaml'),
    'utf8',
  );

  const boardText = await fs.readFile(path.join(repositoryRoot, 'docs', 'TASKS.md'), 'utf8');

  assert.match(contractText, /^id:\s*TASK-9001$/m);
  assert.match(contractText, /^title:\s*Fixture smoke task$/m);
  assert.match(contractText, /^status:\s*proposed$/m);

  assert.match(boardText, /TASK-9001/);
  assert.match(boardText, /Run Planner for `TASK-9001`/);
});

test('readSmokeState reads fixture task contract and board', async () => {
  const repositoryRoot = await createSmokeRepository({
    taskId: 'TASK-9002',
    title: 'Read smoke state task',
  });

  const state = await readSmokeState(repositoryRoot, 'TASK-9002');

  assert.match(state.contractText, /^id:\s*TASK-9002$/m);
  assert.match(state.boardText, /TASK-9002/);
});

test('assertFinalState accepts completed workflow state', () => {
  assertFinalState(
    {
      contractText: [
        'schema_version: 1',
        'id: TASK-9003',
        'title: Final state task',
        'status: completed',
        '',
      ].join('\n'),
      boardText: [
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
        '## Completed',
        '',
        '- [x] `TASK-9003` — Final state task (`completed`, 2026-07-01).',
        '',
      ].join('\n'),
    },
    {
      taskId: 'TASK-9003',
      title: 'Final state task',
      today: '2026-07-01',
    },
  );
});

test('assertFinalState rejects incomplete task contract', () => {
  assert.throws(
    () =>
      assertFinalState(
        {
          contractText: [
            'schema_version: 1',
            'id: TASK-9004',
            'title: Incomplete task',
            'status: ready_for_pr',
            '',
          ].join('\n'),
          boardText: [
            '- [ ] No active task.',
            '- [ ] Define the next task.',
            '- [x] `TASK-9004` — Incomplete task (`completed`, 2026-07-01).',
            '',
          ].join('\n'),
        },
        {
          taskId: 'TASK-9004',
          title: 'Incomplete task',
          today: '2026-07-01',
        },
      ),
    /did not complete the task contract/,
  );
});

test('runWorkflowSmoke completes full lifecycle and creates all artifacts', async () => {
  const result = await runWorkflowSmoke({
    taskId: 'TASK-9005',
    title: 'Full smoke workflow task',
    today: '2026-07-01',
  });

  assert.deepEqual(result.steps, [
    'planner',
    'plan',
    'builder',
    'build_report',
    'tester',
    'test_report',
    'reviewer',
    'review_report',
    'complete',
  ]);

  assert.match(result.contractText, /^status:\s*completed$/m);
  assert.match(result.boardText, /No active task/);
  assert.match(result.boardText, /Define the next task/);
  assert.match(result.boardText, /TASK-9005/);

  const artifactDir = path.join(result.repositoryRoot, '.forge', 'artifacts', 'TASK-9005');

  await fs.access(path.join(artifactDir, 'plan-001.md'));
  await fs.access(path.join(artifactDir, 'build-report-001.md'));
  await fs.access(path.join(artifactDir, 'test-report-001.md'));
  await fs.access(path.join(artifactDir, 'review-report-001.md'));
});

test('renderSmokeResult prints useful summary', async () => {
  const result = await runWorkflowSmoke({
    taskId: 'TASK-9006',
    title: 'Rendered smoke workflow task',
    today: '2026-07-01',
  });

  const output = renderSmokeResult(result);

  assert.match(output, /Forge workflow smoke passed/);
  assert.match(output, /TASK-9006/);
  assert.match(output, /Rendered smoke workflow task/);
  assert.match(output, /planner/);
  assert.match(output, /complete/);
});
