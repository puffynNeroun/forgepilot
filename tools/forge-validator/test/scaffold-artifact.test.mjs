import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  artifactTypes,
  parseArgs,
  renderArtifactReport,
  scaffoldArtifact,
  validateArtifactType,
  validateTaskId,
} from '../src/scaffold-artifact.mjs';

async function makeFixture({
  taskId = 'TASK-9999',
  title = 'Fixture task',
  withDocs = true,
} = {}) {
  const repositoryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-scaffold-artifact-'));
  const taskDir = path.join(repositoryRoot, '.forge', 'tasks');
  const artifactDir = path.join(repositoryRoot, '.forge', 'artifacts', taskId);
  const docsDir = path.join(repositoryRoot, 'docs');

  await fs.mkdir(taskDir, { recursive: true });
  await fs.mkdir(artifactDir, { recursive: true });

  await fs.writeFile(
    path.join(taskDir, `${taskId}.yaml`),
    [
      'schema_version: 1',
      '',
      `id: ${taskId}`,
      `title: ${title}`,
      'status: approved',
      'workflow: .forge/workflows/feature.yaml',
      '',
    ].join('\n'),
    'utf8',
  );

  if (withDocs) {
    await fs.mkdir(docsDir, { recursive: true });
    await fs.writeFile(
      path.join(docsDir, 'TASKS.md'),
      [
        '# Tasks',
        '',
        '## Now',
        '',
        `- [ ] \`${taskId}\` — ${title} (\`approved\`).`,
        '',
        '## Next',
        '',
        `- [ ] Run Builder for \`${taskId}\`.`,
        '',
      ].join('\n'),
      'utf8',
    );
  }

  return repositoryRoot;
}

test('parseArgs accepts direct arguments', () => {
  const args = parseArgs(['--id', 'TASK-0015', '--type', 'plan']);

  assert.equal(args.taskId, 'TASK-0015');
  assert.equal(args.type, 'plan');
});

test('parseArgs accepts pnpm separator arguments', () => {
  const args = parseArgs(['--', '--id', 'TASK-0015', '--type', 'build_report']);

  assert.equal(args.taskId, 'TASK-0015');
  assert.equal(args.type, 'build_report');
});

test('parseArgs rejects unknown arguments', () => {
  assert.throws(() => parseArgs(['--wat']), /Unknown argument: --wat/);
});

test('validateTaskId accepts TASK-0000 format', () => {
  assert.doesNotThrow(() => validateTaskId('TASK-0015'));
});

test('validateTaskId rejects invalid task ids', () => {
  assert.throws(() => validateTaskId('0015'), /Task ID must match TASK-0000 format/);
});

test('validateArtifactType accepts known artifact types', () => {
  for (const type of Object.keys(artifactTypes)) {
    assert.doesNotThrow(() => validateArtifactType(type));
  }
});

test('validateArtifactType rejects unknown artifact types', () => {
  assert.throws(() => validateArtifactType('release_notes'), /Artifact type must be one of/);
});

test('renderArtifactReport creates valid plan frontmatter scaffold', () => {
  const report = renderArtifactReport({
    taskId: 'TASK-9999',
    type: 'plan',
  });

  assert.match(report, /^schema_version: 1$/m);
  assert.match(report, /^task_id: TASK-9999$/m);
  assert.match(report, /^artifact_type: plan$/m);
  assert.match(report, /^producing_role: planner$/m);
  assert.match(report, /^outcome: READY_FOR_APPROVAL$/m);
  assert.match(report, /input_artifacts:\n  \[\]/);
  assert.match(report, /# Plan/);
});

test('renderArtifactReport creates valid build report frontmatter scaffold', () => {
  const report = renderArtifactReport({
    taskId: 'TASK-9999',
    type: 'build_report',
  });

  assert.match(report, /^artifact_type: build_report$/m);
  assert.match(report, /^producing_role: builder$/m);
  assert.match(report, /^outcome: READY_FOR_TEST$/m);
  assert.match(report, /- \.forge\/artifacts\/TASK-9999\/plan-001\.md/);
  assert.match(report, /# Build Report/);
});

test('renderArtifactReport creates valid test report frontmatter scaffold', () => {
  const report = renderArtifactReport({
    taskId: 'TASK-9999',
    type: 'test_report',
  });

  assert.match(report, /^artifact_type: test_report$/m);
  assert.match(report, /^producing_role: tester$/m);
  assert.match(report, /^outcome: PASS$/m);
  assert.match(report, /- \.forge\/artifacts\/TASK-9999\/plan-001\.md/);
  assert.match(report, /- \.forge\/artifacts\/TASK-9999\/build-report-001\.md/);
  assert.match(report, /# Test Report/);
});

test('renderArtifactReport creates valid review report frontmatter scaffold', () => {
  const report = renderArtifactReport({
    taskId: 'TASK-9999',
    type: 'review_report',
  });

  assert.match(report, /^artifact_type: review_report$/m);
  assert.match(report, /^producing_role: reviewer$/m);
  assert.match(report, /^outcome: ACCEPT$/m);
  assert.match(report, /- \.forge\/artifacts\/TASK-9999\/plan-001\.md/);
  assert.match(report, /- \.forge\/artifacts\/TASK-9999\/build-report-001\.md/);
  assert.match(report, /- \.forge\/artifacts\/TASK-9999\/test-report-001\.md/);
  assert.match(report, /# Review Report/);
});

test('scaffoldArtifact creates plan artifact', async () => {
  const repositoryRoot = await makeFixture();

  const result = await scaffoldArtifact({
    repositoryRoot,
    taskId: 'TASK-9999',
    type: 'plan',
  });

  const artifactPath = path.join(repositoryRoot, '.forge', 'artifacts', 'TASK-9999', 'plan-001.md');
  const report = await fs.readFile(artifactPath, 'utf8');

  assert.equal(result.taskId, 'TASK-9999');
  assert.equal(result.taskTitle, 'Fixture task');
  assert.equal(result.type, 'plan');
  assert.equal(result.artifactPath, '.forge/artifacts/TASK-9999/plan-001.md');
  assert.match(report, /^artifact_type: plan$/m);
});

test('scaffoldArtifact creates review report artifact', async () => {
  const repositoryRoot = await makeFixture();

  const result = await scaffoldArtifact({
    repositoryRoot,
    taskId: 'TASK-9999',
    type: 'review_report',
  });

  const artifactPath = path.join(
    repositoryRoot,
    '.forge',
    'artifacts',
    'TASK-9999',
    'review-report-001.md',
  );

  const report = await fs.readFile(artifactPath, 'utf8');

  assert.equal(result.artifactPath, '.forge/artifacts/TASK-9999/review-report-001.md');
  assert.match(report, /^artifact_type: review_report$/m);
  assert.match(report, /^outcome: ACCEPT$/m);
});

test('scaffoldArtifact refuses missing task contract', async () => {
  const repositoryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-scaffold-artifact-missing-'));

  await assert.rejects(
    () =>
      scaffoldArtifact({
        repositoryRoot,
        taskId: 'TASK-9999',
        type: 'plan',
      }),
    /Task contract does not exist/,
  );
});

test('scaffoldArtifact refuses to overwrite existing artifact', async () => {
  const repositoryRoot = await makeFixture();

  await scaffoldArtifact({
    repositoryRoot,
    taskId: 'TASK-9999',
    type: 'plan',
  });

  await assert.rejects(
    () =>
      scaffoldArtifact({
        repositoryRoot,
        taskId: 'TASK-9999',
        type: 'plan',
      }),
    /Artifact already exists/,
  );
});

test('scaffoldArtifact does not change docs task board', async () => {
  const repositoryRoot = await makeFixture();

  const boardPath = path.join(repositoryRoot, 'docs', 'TASKS.md');
  const before = await fs.readFile(boardPath, 'utf8');

  await scaffoldArtifact({
    repositoryRoot,
    taskId: 'TASK-9999',
    type: 'build_report',
  });

  const after = await fs.readFile(boardPath, 'utf8');

  assert.equal(after, before);
});

test('scaffoldArtifact does not change task contract', async () => {
  const repositoryRoot = await makeFixture();

  const taskPath = path.join(repositoryRoot, '.forge', 'tasks', 'TASK-9999.yaml');
  const before = await fs.readFile(taskPath, 'utf8');

  await scaffoldArtifact({
    repositoryRoot,
    taskId: 'TASK-9999',
    type: 'test_report',
  });

  const after = await fs.readFile(taskPath, 'utf8');

  assert.equal(after, before);
});
