import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { validateRepository } from '../src/validate.mjs';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(packageDir, '..', '..');

async function createFixture() {
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-validator-'));

  await fs.cp(path.join(repositoryRoot, '.forge'), path.join(fixtureRoot, '.forge'), {
    recursive: true,
  });
  await fs.cp(path.join(repositoryRoot, 'docs'), path.join(fixtureRoot, 'docs'), {
    recursive: true,
  });
  await fs.copyFile(path.join(repositoryRoot, 'AGENTS.md'), path.join(fixtureRoot, 'AGENTS.md'));

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

async function readFixtureFile(fixtureRoot, relativePath) {
  return fs.readFile(path.join(fixtureRoot, relativePath), 'utf8');
}

async function writeFixtureFile(fixtureRoot, relativePath, content) {
  await fs.mkdir(path.dirname(path.join(fixtureRoot, relativePath)), { recursive: true });
  await fs.writeFile(path.join(fixtureRoot, relativePath), content);
}

async function removeFixturePath(fixtureRoot, relativePath) {
  await fs.rm(path.join(fixtureRoot, relativePath), { recursive: true, force: true });
}

function artifactContent(metadata, body = '# Artifact\n') {
  const lines = ['---'];

  for (const [key, value] of Object.entries(metadata)) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${item}`);
        }
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push('---', '', body);
  return `${lines.join('\n')}\n`;
}

function planMetadata(overrides = {}) {
  return {
    schema_version: 1,
    task_id: 'TASK-0003',
    artifact_type: 'plan',
    attempt: 3,
    producing_role: 'planner',
    outcome: 'READY_FOR_APPROVAL',
    input_artifacts: [],
    ...overrides,
  };
}

function buildReportMetadata(overrides = {}) {
  return {
    schema_version: 1,
    task_id: 'TASK-0003',
    artifact_type: 'build_report',
    attempt: 1,
    producing_role: 'builder',
    outcome: 'READY_FOR_TEST',
    input_artifacts: ['.forge/artifacts/TASK-0003/plan-002.md'],
    ...overrides,
  };
}

function testReportMetadata(overrides = {}) {
  return {
    schema_version: 1,
    task_id: 'TASK-0003',
    artifact_type: 'test_report',
    attempt: 1,
    producing_role: 'tester',
    outcome: 'PASS',
    input_artifacts: [
      '.forge/artifacts/TASK-0003/plan-002.md',
      '.forge/artifacts/TASK-0003/build-report-001.md',
    ],
    ...overrides,
  };
}

function reviewReportMetadata(overrides = {}) {
  return {
    schema_version: 1,
    task_id: 'TASK-0003',
    artifact_type: 'review_report',
    attempt: 1,
    producing_role: 'reviewer',
    outcome: 'ACCEPT',
    input_artifacts: [
      '.forge/artifacts/TASK-0003/plan-002.md',
      '.forge/artifacts/TASK-0003/build-report-001.md',
      '.forge/artifacts/TASK-0003/test-report-001.md',
    ],
    ...overrides,
  };
}

async function writeArtifact(fixtureRoot, relativePath, metadata, body) {
  await writeFixtureFile(fixtureRoot, relativePath, artifactContent(metadata, body));
}

async function writeTask(fixtureRoot, taskId, status, transform = (content) => content) {
  const template = await readFixtureFile(fixtureRoot, '.forge/tasks/task.template.yaml');
  const content = transform(
    template
      .replace('id: TASK-XXX', `id: ${taskId}`)
      .replace('title: Replace with a concrete task title', 'title: Fixture task')
      .replace('status: proposed', `status: ${status}`)
      .replace('goal: Replace with one bounded outcome.', 'goal: Exercise fixture validation.'),
  );

  await writeFixtureFile(fixtureRoot, `.forge/tasks/${taskId}.yaml`, content);
}

function artifactPath(taskId, slug, attempt = 1) {
  return `.forge/artifacts/${taskId}/${slug}-${String(attempt).padStart(3, '0')}.md`;
}

async function writeValidPlan(fixtureRoot, taskId, attempt = 1, outcome = 'READY_FOR_APPROVAL') {
  await writeArtifact(
    fixtureRoot,
    artifactPath(taskId, 'plan', attempt),
    planMetadata({ task_id: taskId, attempt, outcome }),
  );
}

async function writeValidBuildReport(fixtureRoot, taskId, attempt = 1, planAttempt = 1, outcome = 'READY_FOR_TEST') {
  await writeArtifact(
    fixtureRoot,
    artifactPath(taskId, 'build-report', attempt),
    buildReportMetadata({
      task_id: taskId,
      attempt,
      outcome,
      input_artifacts: [artifactPath(taskId, 'plan', planAttempt)],
    }),
  );
}

async function writeValidTestReport(fixtureRoot, taskId, attempt = 1, planAttempt = 1, buildAttempt = 1, outcome = 'PASS') {
  await writeArtifact(
    fixtureRoot,
    artifactPath(taskId, 'test-report', attempt),
    testReportMetadata({
      task_id: taskId,
      attempt,
      outcome,
      input_artifacts: [
        artifactPath(taskId, 'plan', planAttempt),
        artifactPath(taskId, 'build-report', buildAttempt),
      ],
    }),
  );
}

async function writeValidReviewReport(
  fixtureRoot,
  taskId,
  attempt = 1,
  planAttempt = 1,
  buildAttempt = 1,
  testAttempt = 1,
  outcome = 'ACCEPT',
) {
  await writeArtifact(
    fixtureRoot,
    artifactPath(taskId, 'review-report', attempt),
    reviewReportMetadata({
      task_id: taskId,
      attempt,
      outcome,
      input_artifacts: [
        artifactPath(taskId, 'plan', planAttempt),
        artifactPath(taskId, 'build-report', buildAttempt),
        artifactPath(taskId, 'test-report', testAttempt),
      ],
    }),
  );
}

async function writeCompleteArtifactChain(fixtureRoot, taskId, options = {}) {
  const {
    planAttempt = 1,
    testOutcome = 'PASS',
    reviewOutcome = 'ACCEPT',
  } = options;

  await writeValidPlan(fixtureRoot, taskId, planAttempt);
  await writeValidBuildReport(fixtureRoot, taskId, 1, planAttempt);
  await writeValidTestReport(fixtureRoot, taskId, 1, planAttempt, 1, testOutcome);
  await writeValidReviewReport(fixtureRoot, taskId, 1, planAttempt, 1, 1, reviewOutcome);
}

async function assertInvalid(fixtureRoot, expectedMessage) {
  const result = await validateRepository(fixtureRoot);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), expectedMessage);
}

test('current repository passes', async () => {
  const result = await validateRepository(repositoryRoot);
  assert.deepEqual(result, { ok: true, errors: [] });
});

test('a missing document reference fails', async () => {
  await withFixture(async (fixtureRoot) => {
    const project = await readFixtureFile(fixtureRoot, '.forge/project.yaml');
    await writeFixtureFile(
      fixtureRoot,
      '.forge/project.yaml',
      project.replace('docs/PRODUCT_SPEC.md', 'docs/MISSING.md'),
    );

    await assertInvalid(fixtureRoot, /documents\.product_spec does not reference an existing regular file/);
  });
});

test('malformed YAML produces a parse error', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, '.forge/project.yaml', 'schema_version: [\n');
    await assertInvalid(fixtureRoot, /YAML parse error in \.forge\/project\.yaml/);
  });
});

test('an unknown workflow stage target fails', async () => {
  await withFixture(async (fixtureRoot) => {
    const workflow = await readFixtureFile(fixtureRoot, '.forge/workflows/feature.yaml');
    await writeFixtureFile(
      fixtureRoot,
      '.forge/workflows/feature.yaml',
      workflow.replace('next: approve_plan', 'next: missing_stage'),
    );

    await assertInvalid(fixtureRoot, /unknown next stage 'missing_stage'/);
  });
});

test('a missing role-contract reference fails', async () => {
  await withFixture(async (fixtureRoot) => {
    const workflow = await readFixtureFile(fixtureRoot, '.forge/workflows/feature.yaml');
    await writeFixtureFile(
      fixtureRoot,
      '.forge/workflows/feature.yaml',
      workflow.replace('.forge/roles/planner.md', '.forge/roles/missing.md'),
    );

    await assertInvalid(fixtureRoot, /role_contract does not reference an existing regular file/);
  });
});

test('an active task whose id does not match its filename fails', async () => {
  await withFixture(async (fixtureRoot) => {
    const template = await readFixtureFile(fixtureRoot, '.forge/tasks/task.template.yaml');
    await writeFixtureFile(
      fixtureRoot,
      '.forge/tasks/TASK-001.yaml',
      template.replace('id: TASK-XXX', 'id: TASK-002'),
    );

    await assertInvalid(fixtureRoot, /active task id must match filename stem 'TASK-001'/);
  });
});

test('an active task using glob syntax in allowed_files fails', async () => {
  await withFixture(async (fixtureRoot) => {
    const template = await readFixtureFile(fixtureRoot, '.forge/tasks/task.template.yaml');
    await writeFixtureFile(
      fixtureRoot,
      '.forge/tasks/TASK-001.yaml',
      template
        .replace('id: TASK-XXX', 'id: TASK-001')
        .replace('allowed_files: []', 'allowed_files:\n  - "src/*.js"'),
    );

    await assertInvalid(fixtureRoot, /allowed_files\[0\] must be an exact path and must not use glob syntax/);
  });
});

test('duplicate acceptance criterion IDs fail', async () => {
  await withFixture(async (fixtureRoot) => {
    const template = await readFixtureFile(fixtureRoot, '.forge/tasks/task.template.yaml');
    await writeFixtureFile(
      fixtureRoot,
      '.forge/tasks/TASK-001.yaml',
      template
        .replace('id: TASK-XXX', 'id: TASK-001')
        .replace(
          'acceptance_criteria:\n  - id: AC-1\n    description: Replace with a measurable result.',
          'acceptance_criteria:\n  - id: AC-1\n    description: First result.\n  - id: AC-1\n    description: Second result.',
        ),
    );

    await assertInvalid(fixtureRoot, /acceptance criterion id 'AC-1' is duplicated/);
  });
});

test('an unknown required_checks key fails', async () => {
  await withFixture(async (fixtureRoot) => {
    const template = await readFixtureFile(fixtureRoot, '.forge/tasks/task.template.yaml');
    await writeFixtureFile(
      fixtureRoot,
      '.forge/tasks/TASK-001.yaml',
      template
        .replace('id: TASK-XXX', 'id: TASK-001')
        .replace('required_checks: []', 'required_checks:\n  - missing_check'),
    );

    await assertInvalid(fixtureRoot, /required_checks\[0\] references unknown project command key 'missing_check'/);
  });
});

test('a known required check whose command is null remains valid', async () => {
  await withFixture(async (fixtureRoot) => {
    const template = await readFixtureFile(fixtureRoot, '.forge/tasks/task.template.yaml');
    await writeFixtureFile(
      fixtureRoot,
      '.forge/tasks/TASK-001.yaml',
      template
        .replace('id: TASK-XXX', 'id: TASK-001')
        .replace('required_checks: []', 'required_checks:\n  - build'),
    );

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('a Windows-style traversal path fails', async () => {
  await withFixture(async (fixtureRoot) => {
    const project = await readFixtureFile(fixtureRoot, '.forge/project.yaml');
    await writeFixtureFile(
      fixtureRoot,
      '.forge/project.yaml',
      project.replace('docs/PRODUCT_SPEC.md', String.raw`..\outside.md`),
    );

    await assertInvalid(fixtureRoot, /must use forward slashes and must not contain backslashes/);
  });
});

test('an invalid or missing stage actor fails', async () => {
  await withFixture(async (fixtureRoot) => {
    const workflow = await readFixtureFile(fixtureRoot, '.forge/workflows/feature.yaml');
    await writeFixtureFile(
      fixtureRoot,
      '.forge/workflows/feature.yaml',
      workflow.replace('id: plan\n    actor: agent', 'id: plan\n    actor: human'),
    );

    await assertInvalid(fixtureRoot, /stage 'plan' actor must be 'agent'/);
  });
});

test('swapping Planner and Builder role contracts fails', async () => {
  await withFixture(async (fixtureRoot) => {
    const workflow = await readFixtureFile(fixtureRoot, '.forge/workflows/feature.yaml');
    await writeFixtureFile(
      fixtureRoot,
      '.forge/workflows/feature.yaml',
      workflow
        .replace('role_contract: .forge/roles/planner.md', 'role_contract: __PLANNER__')
        .replace('role_contract: .forge/roles/builder.md', 'role_contract: .forge/roles/planner.md')
        .replace('role_contract: __PLANNER__', 'role_contract: .forge/roles/builder.md'),
    );

    await assertInvalid(fixtureRoot, /stage 'plan' role_contract must be \.forge\/roles\/planner\.md/);
  });
});

test('a task status is checked against the workflow referenced by that task', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeFixtureFile(
      fixtureRoot,
      '.forge/workflows/custom.yaml',
      'task_statuses:\n  - custom_status\n',
    );

    const template = await readFixtureFile(fixtureRoot, '.forge/tasks/task.template.yaml');
    await writeFixtureFile(
      fixtureRoot,
      '.forge/tasks/TASK-001.yaml',
      template
        .replace('id: TASK-XXX', 'id: TASK-001')
        .replace('status: proposed', 'status: custom_status')
        .replace('workflow: .forge/workflows/feature.yaml', 'workflow: .forge/workflows/custom.yaml'),
    );

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('a task with approved top-level keys in a different order remains valid', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeFixtureFile(
      fixtureRoot,
      '.forge/tasks/TASK-001.yaml',
      `required_checks: []
acceptance_criteria:
  - description: Replace with a measurable result.
    id: AC-1
protected_files: []
allowed_files: []
out_of_scope: []
in_scope: []
goal: Replace with one bounded outcome.
workflow: .forge/workflows/feature.yaml
status: proposed
title: Replace with a concrete task title
id: TASK-001
schema_version: 1
`,
    );

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('a proposed task without artifacts passes', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('a blocked task without artifacts passes', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'blocked');

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('a blocked task with a malformed existing artifact still fails structural validation', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'blocked');
    await writeFixtureFile(fixtureRoot, '.forge/artifacts/TASK-0090/plan-001.md', 'not front matter');

    await assertInvalid(fixtureRoot, /artifact must start with YAML front matter delimiter/);
  });
});

test('an approved task without a plan fails', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'approved');

    await assertInvalid(
      fixtureRoot,
      /task TASK-0090 has status 'approved' and requires at least one structurally valid plan artifact/,
    );
  });
});

test('a malformed required artifact does not satisfy presence', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'approved');
    await writeFixtureFile(fixtureRoot, '.forge/artifacts/TASK-0090/plan-001.md', 'not front matter');

    const result = await validateRepository(fixtureRoot);
    const errors = result.errors.join('\n');

    assert.equal(result.ok, false);
    assert.match(errors, /artifact must start with YAML front matter delimiter/);
    assert.match(
      errors,
      /task TASK-0090 has status 'approved' and latest plan artifact attempt 1 at \.forge\/artifacts\/TASK-0090\/plan-001\.md must be structurally valid to satisfy presence/,
    );
  });
});

test('a later valid artifact still satisfies presence after an earlier malformed artifact', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'approved');
    await writeFixtureFile(fixtureRoot, '.forge/artifacts/TASK-0090/plan-001.md', 'not front matter');
    await writeValidPlan(fixtureRoot, 'TASK-0090', 2);

    const result = await validateRepository(fixtureRoot);
    const errors = result.errors.join('\n');

    assert.equal(result.ok, false);
    assert.match(errors, /artifact must start with YAML front matter delimiter/);
    assert.doesNotMatch(
      errors,
      /task TASK-0090 has status 'approved' and requires at least one structurally valid plan artifact/,
    );
    assert.doesNotMatch(errors, /latest plan artifact attempt 2/);
  });
});

test('a latest valid attempt satisfies required presence when earlier attempts exist', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'approved');
    await writeValidPlan(fixtureRoot, 'TASK-0090', 1);
    await writeValidPlan(fixtureRoot, 'TASK-0090', 2);

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('the highest numeric artifact attempt is selected instead of an earlier discovered path', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'approved');
    await writeValidPlan(fixtureRoot, 'TASK-0090', 9);
    await writeFixtureFile(fixtureRoot, '.forge/artifacts/TASK-0090/plan-010.md', 'not front matter');

    const result = await validateRepository(fixtureRoot);
    const errors = result.errors.join('\n');

    assert.equal(result.ok, false);
    assert.match(errors, /artifact must start with YAML front matter delimiter/);
    assert.match(
      errors,
      /task TASK-0090 has status 'approved' and latest plan artifact attempt 10 at \.forge\/artifacts\/TASK-0090\/plan-010\.md must be structurally valid to satisfy presence/,
    );
  });
});

test('attempt gaps are allowed when selecting the latest artifact attempt', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'approved');
    await writeValidPlan(fixtureRoot, 'TASK-0090', 1);
    await writeValidPlan(fixtureRoot, 'TASK-0090', 3);

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('a latest malformed required artifact is not hidden by an earlier valid attempt', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'approved');
    await writeValidPlan(fixtureRoot, 'TASK-0090', 1);
    await writeFixtureFile(fixtureRoot, '.forge/artifacts/TASK-0090/plan-002.md', 'not front matter');

    const result = await validateRepository(fixtureRoot);
    const errors = result.errors.join('\n');

    assert.equal(result.ok, false);
    assert.match(errors, /artifact must start with YAML front matter delimiter/);
    assert.match(
      errors,
      /task TASK-0090 has status 'approved' and latest plan artifact attempt 2 at \.forge\/artifacts\/TASK-0090\/plan-002\.md must be structurally valid to satisfy presence/,
    );
    assert.doesNotMatch(
      errors,
      /task TASK-0090 has status 'approved' and requires at least one structurally valid plan artifact/,
    );
  });
});

test('an approved task with a valid plan passes', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'approved');
    await writeValidPlan(fixtureRoot, 'TASK-0090');

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('an in-progress task without a plan fails', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'in_progress');

    await assertInvalid(
      fixtureRoot,
      /task TASK-0090 has status 'in_progress' and requires at least one structurally valid plan artifact/,
    );
  });
});

test('an in-progress task with a valid plan passes', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'in_progress');
    await writeValidPlan(fixtureRoot, 'TASK-0090');

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('a ready-for-pr task missing a plan fails', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'ready_for_pr');

    await assertInvalid(
      fixtureRoot,
      /task TASK-0090 has status 'ready_for_pr' and requires at least one structurally valid plan artifact/,
    );
  });
});

test('a ready-for-pr task missing a build report fails', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'ready_for_pr');
    await writeValidPlan(fixtureRoot, 'TASK-0090');

    await assertInvalid(
      fixtureRoot,
      /task TASK-0090 has status 'ready_for_pr' and requires at least one structurally valid build_report artifact/,
    );
  });
});

test('a ready-for-pr task missing a test report fails', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'ready_for_pr');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');

    await assertInvalid(
      fixtureRoot,
      /task TASK-0090 has status 'ready_for_pr' and requires at least one structurally valid test_report artifact/,
    );
  });
});

test('a ready-for-pr task missing a review report fails', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'ready_for_pr');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');
    await writeValidTestReport(fixtureRoot, 'TASK-0090');

    await assertInvalid(
      fixtureRoot,
      /task TASK-0090 has status 'ready_for_pr' and requires at least one structurally valid review_report artifact/,
    );
  });
});

test('a ready-for-pr task with all required artifact types passes', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'ready_for_pr');
    await writeCompleteArtifactChain(fixtureRoot, 'TASK-0090');

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('a ready-for-pr task with latest test report FAIL fails delivery outcome validation', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'ready_for_pr');
    await writeCompleteArtifactChain(fixtureRoot, 'TASK-0090', { testOutcome: 'FAIL' });

    await assertInvalid(
      fixtureRoot,
      /task TASK-0090 has status 'ready_for_pr' and latest test_report artifact attempt 1 at \.forge\/artifacts\/TASK-0090\/test-report-001\.md has outcome 'FAIL' but must have outcome 'PASS'/,
    );
  });
});

test('a ready-for-pr task with latest review report REJECT fails delivery outcome validation', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'ready_for_pr');
    await writeCompleteArtifactChain(fixtureRoot, 'TASK-0090', { reviewOutcome: 'REJECT' });

    await assertInvalid(
      fixtureRoot,
      /task TASK-0090 has status 'ready_for_pr' and latest review_report artifact attempt 1 at \.forge\/artifacts\/TASK-0090\/review-report-001\.md has outcome 'REJECT' but must have outcome 'ACCEPT'/,
    );
  });
});

test('a completed non-legacy task with all required artifact types passes', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'completed');
    await writeCompleteArtifactChain(fixtureRoot, 'TASK-0090');

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('a completed non-legacy task with latest test report FAIL fails delivery outcome validation', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'completed');
    await writeCompleteArtifactChain(fixtureRoot, 'TASK-0090', { testOutcome: 'FAIL' });

    await assertInvalid(
      fixtureRoot,
      /task TASK-0090 has status 'completed' and latest test_report artifact attempt 1 at \.forge\/artifacts\/TASK-0090\/test-report-001\.md has outcome 'FAIL' but must have outcome 'PASS'/,
    );
  });
});

test('a completed non-legacy task with latest review report REJECT fails delivery outcome validation', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'completed');
    await writeCompleteArtifactChain(fixtureRoot, 'TASK-0090', { reviewOutcome: 'REJECT' });

    await assertInvalid(
      fixtureRoot,
      /task TASK-0090 has status 'completed' and latest review_report artifact attempt 1 at \.forge\/artifacts\/TASK-0090\/review-report-001\.md has outcome 'REJECT' but must have outcome 'ACCEPT'/,
    );
  });
});

test('a completed non-legacy task missing a required artifact type fails', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'completed');

    await assertInvalid(
      fixtureRoot,
      /task TASK-0090 has status 'completed' and requires at least one structurally valid plan artifact/,
    );
  });
});

test('an earlier failed test report does not fail when the latest test report is PASS', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'ready_for_pr');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 'FAIL');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 2, 1, 1, 'PASS');
    await writeValidReviewReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 2, 'ACCEPT');

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('an earlier rejected review report does not fail when the latest review report is ACCEPT', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'ready_for_pr');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');
    await writeValidTestReport(fixtureRoot, 'TASK-0090');
    await writeValidReviewReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 1, 'REJECT');
    await writeValidReviewReport(fixtureRoot, 'TASK-0090', 2, 1, 1, 1, 'ACCEPT');

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('an earlier passing test report is hidden by a latest failed test report', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'ready_for_pr');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 'PASS');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 2, 1, 1, 'FAIL');
    await writeValidReviewReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 2, 'ACCEPT');

    await assertInvalid(
      fixtureRoot,
      /task TASK-0090 has status 'ready_for_pr' and latest test_report artifact attempt 2 at \.forge\/artifacts\/TASK-0090\/test-report-002\.md has outcome 'FAIL' but must have outcome 'PASS'/,
    );
  });
});

test('an earlier accepted review report is hidden by a latest rejected review report', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'ready_for_pr');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');
    await writeValidTestReport(fixtureRoot, 'TASK-0090');
    await writeValidReviewReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 1, 'ACCEPT');
    await writeValidReviewReport(fixtureRoot, 'TASK-0090', 2, 1, 1, 1, 'REJECT');

    await assertInvalid(
      fixtureRoot,
      /task TASK-0090 has status 'ready_for_pr' and latest review_report artifact attempt 2 at \.forge\/artifacts\/TASK-0090\/review-report-002\.md has outcome 'REJECT' but must have outcome 'ACCEPT'/,
    );
  });
});

test('legacy TASK-0001 remains valid without retroactive artifacts', async () => {
  await withFixture(async (fixtureRoot) => {
    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('legacy TASK-0002 remains valid without retroactive artifacts', async () => {
  await withFixture(async (fixtureRoot) => {
    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('TASK-0003 and later completed tasks do not receive the legacy exemption', async () => {
  await withFixture(async (fixtureRoot) => {
    await removeFixturePath(fixtureRoot, '.forge/artifacts/TASK-0003');

    await assertInvalid(
      fixtureRoot,
      /task TASK-0003 has status 'completed' and requires at least one structurally valid plan artifact/,
    );
  });
});

test('TASK-0003 and later completed tasks must satisfy delivery outcome gates', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeArtifact(
      fixtureRoot,
      '.forge/artifacts/TASK-0003/test-report-002.md',
      testReportMetadata({ attempt: 2, outcome: 'FAIL' }),
    );

    await assertInvalid(
      fixtureRoot,
      /task TASK-0003 has status 'completed' and latest test_report artifact attempt 2 at \.forge\/artifacts\/TASK-0003\/test-report-002\.md has outcome 'FAIL' but must have outcome 'PASS'/,
    );
  });
});

test('a valid non-001 positive attempt satisfies artifact presence', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'approved');
    await writeValidPlan(fixtureRoot, 'TASK-0090', 2);

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

for (const status of ['proposed', 'blocked', 'approved', 'in_progress']) {
  test(`${status} tasks do not require delivery-ready test or review outcomes`, async () => {
    await withFixture(async (fixtureRoot) => {
      await writeTask(fixtureRoot, 'TASK-0090', status);
      await writeValidPlan(fixtureRoot, 'TASK-0090');
      await writeValidBuildReport(fixtureRoot, 'TASK-0090');
      await writeValidTestReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 'FAIL');
      await writeValidTestReport(fixtureRoot, 'TASK-0090', 2, 1, 1, 'PASS');
      await writeValidReviewReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 2, 'REJECT');

      const result = await validateRepository(fixtureRoot);
      assert.deepEqual(result, { ok: true, errors: [] });
    });
  });
}

test('plan and build report outcomes do not drive delivery-ready outcome validation', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'ready_for_pr');
    await writeValidPlan(fixtureRoot, 'TASK-0090', 1, 'READY_FOR_APPROVAL');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090', 1, 1, 'READY_FOR_TEST');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 'PASS');
    await writeValidReviewReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 1, 'ACCEPT');
    await writeValidPlan(fixtureRoot, 'TASK-0090', 2, 'BLOCKED');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090', 2, 1, 'BLOCKED');

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('missing delivery artifacts do not produce secondary invalid-outcome errors', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'ready_for_pr');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');

    const result = await validateRepository(fixtureRoot);
    const errors = result.errors.join('\n');

    assert.equal(result.ok, false);
    assert.match(errors, /requires at least one structurally valid test_report artifact/);
    assert.match(errors, /requires at least one structurally valid review_report artifact/);
    assert.doesNotMatch(errors, /has outcome/);
  });
});

test('a missing review report does not produce a secondary invalid-outcome error', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'ready_for_pr');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');
    await writeValidTestReport(fixtureRoot, 'TASK-0090');

    const result = await validateRepository(fixtureRoot);
    const errors = result.errors.join('\n');

    assert.equal(result.ok, false);
    assert.match(errors, /requires at least one structurally valid review_report artifact/);
    assert.doesNotMatch(errors, /has outcome/);
  });
});

test('a structurally invalid latest test report does not produce a secondary invalid-outcome error', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'ready_for_pr');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 'PASS');
    await writeFixtureFile(fixtureRoot, '.forge/artifacts/TASK-0090/test-report-002.md', 'not front matter');
    await writeValidReviewReport(fixtureRoot, 'TASK-0090');

    const result = await validateRepository(fixtureRoot);
    const errors = result.errors.join('\n');

    assert.equal(result.ok, false);
    assert.match(errors, /artifact must start with YAML front matter delimiter/);
    assert.match(errors, /latest test_report artifact attempt 2/);
    assert.doesNotMatch(errors, /has outcome/);
  });
});

test('a structurally invalid latest review report does not produce a secondary invalid-outcome error', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'ready_for_pr');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');
    await writeValidTestReport(fixtureRoot, 'TASK-0090');
    await writeValidReviewReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 1, 'ACCEPT');
    await writeFixtureFile(fixtureRoot, '.forge/artifacts/TASK-0090/review-report-002.md', 'not front matter');

    const result = await validateRepository(fixtureRoot);
    const errors = result.errors.join('\n');

    assert.equal(result.ok, false);
    assert.match(errors, /artifact must start with YAML front matter delimiter/);
    assert.match(errors, /latest review_report artifact attempt 2/);
    assert.doesNotMatch(errors, /has outcome/);
  });
});

test('missing-artifact errors include task id, status, and artifact type', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'approved');

    await assertInvalid(
      fixtureRoot,
      /task TASK-0090 has status 'approved' and requires at least one structurally valid plan artifact/,
    );
  });
});

test('invalid task contracts do not produce secondary missing-artifact errors', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(
      fixtureRoot,
      'TASK-0099',
      'approved',
      (content) => content.replace('required_checks: []', 'required_checks:\n  - missing_check'),
    );

    const result = await validateRepository(fixtureRoot);
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /required_checks\[0\] references unknown project command key 'missing_check'/);
    assert.doesNotMatch(result.errors.join('\n'), /task TASK-0099 has status 'approved' and requires at least one structurally valid plan artifact/);
  });
});

test('invalid task contracts do not produce secondary invalid-latest-attempt errors', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(
      fixtureRoot,
      'TASK-0099',
      'approved',
      (content) => content.replace('required_checks: []', 'required_checks:\n  - missing_check'),
    );
    await writeValidPlan(fixtureRoot, 'TASK-0099', 1);
    await writeFixtureFile(fixtureRoot, '.forge/artifacts/TASK-0099/plan-002.md', 'not front matter');

    const result = await validateRepository(fixtureRoot);
    const errors = result.errors.join('\n');

    assert.equal(result.ok, false);
    assert.match(errors, /required_checks\[0\] references unknown project command key 'missing_check'/);
    assert.match(errors, /artifact must start with YAML front matter delimiter/);
    assert.doesNotMatch(errors, /latest plan artifact attempt 2/);
    assert.doesNotMatch(
      errors,
      /task TASK-0099 has status 'approved' and requires at least one structurally valid plan artifact/,
    );
  });
});

test('invalid task contracts do not produce secondary invalid-outcome errors', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(
      fixtureRoot,
      'TASK-0099',
      'ready_for_pr',
      (content) => content.replace('required_checks: []', 'required_checks:\n  - missing_check'),
    );
    await writeCompleteArtifactChain(fixtureRoot, 'TASK-0099', {
      testOutcome: 'FAIL',
      reviewOutcome: 'REJECT',
    });

    const result = await validateRepository(fixtureRoot);
    const errors = result.errors.join('\n');

    assert.equal(result.ok, false);
    assert.match(errors, /required_checks\[0\] references unknown project command key 'missing_check'/);
    assert.doesNotMatch(errors, /has outcome 'FAIL' but must have outcome 'PASS'/);
    assert.doesNotMatch(errors, /has outcome 'REJECT' but must have outcome 'ACCEPT'/);
  });
});

test('a build report may reference a ready-for-approval plan', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('a build report rejects a blocked referenced plan', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeValidPlan(fixtureRoot, 'TASK-0090', 1, 'BLOCKED');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');

    await assertInvalid(
      fixtureRoot,
      /build_report input artifact \.forge\/artifacts\/TASK-0090\/plan-001\.md has outcome 'BLOCKED' but must have outcome 'READY_FOR_APPROVAL' to satisfy referenced outcome-chain validation/,
    );
  });
});

test('a test report may reference ready plan and build report artifacts', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');
    await writeValidTestReport(fixtureRoot, 'TASK-0090');

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('a test report rejects a blocked referenced build report', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090', 1, 1, 'BLOCKED');
    await writeValidTestReport(fixtureRoot, 'TASK-0090');

    await assertInvalid(
      fixtureRoot,
      /test_report input artifact \.forge\/artifacts\/TASK-0090\/build-report-001\.md has outcome 'BLOCKED' but must have outcome 'READY_FOR_TEST' to satisfy referenced outcome-chain validation/,
    );
  });
});

test('a test report rejects a blocked referenced plan', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeValidPlan(fixtureRoot, 'TASK-0090', 1, 'READY_FOR_APPROVAL');
    await writeValidPlan(fixtureRoot, 'TASK-0090', 2, 'BLOCKED');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090', 1, 1);
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 1, 2, 1);

    await assertInvalid(
      fixtureRoot,
      /test_report input artifact \.forge\/artifacts\/TASK-0090\/plan-002\.md has outcome 'BLOCKED' but must have outcome 'READY_FOR_APPROVAL' to satisfy referenced outcome-chain validation/,
    );
  });
});

test('a review report may reference ready plan, ready build, and passing test artifacts', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeCompleteArtifactChain(fixtureRoot, 'TASK-0090');

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('a review report rejects a failed referenced test report', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 'FAIL');
    await writeValidReviewReport(fixtureRoot, 'TASK-0090');

    await assertInvalid(
      fixtureRoot,
      /review_report input artifact \.forge\/artifacts\/TASK-0090\/test-report-001\.md has outcome 'FAIL' but must have outcome 'PASS' to satisfy referenced outcome-chain validation/,
    );
  });
});

test('a review report rejects a blocked referenced test report', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 'BLOCKED');
    await writeValidReviewReport(fixtureRoot, 'TASK-0090');

    await assertInvalid(
      fixtureRoot,
      /review_report input artifact \.forge\/artifacts\/TASK-0090\/test-report-001\.md has outcome 'BLOCKED' but must have outcome 'PASS' to satisfy referenced outcome-chain validation/,
    );
  });
});

test('a review report rejects a blocked referenced build report', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090', 1, 1, 'READY_FOR_TEST');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090', 2, 1, 'BLOCKED');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 'PASS');
    await writeValidReviewReport(fixtureRoot, 'TASK-0090', 1, 1, 2, 1);

    await assertInvalid(
      fixtureRoot,
      /review_report input artifact \.forge\/artifacts\/TASK-0090\/build-report-002\.md has outcome 'BLOCKED' but must have outcome 'READY_FOR_TEST' to satisfy referenced outcome-chain validation/,
    );
  });
});

test('a review report rejects a blocked referenced plan', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeValidPlan(fixtureRoot, 'TASK-0090', 1, 'READY_FOR_APPROVAL');
    await writeValidPlan(fixtureRoot, 'TASK-0090', 2, 'BLOCKED');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090', 1, 1);
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 'PASS');
    await writeValidReviewReport(fixtureRoot, 'TASK-0090', 1, 2, 1, 1);

    await assertInvalid(
      fixtureRoot,
      /review_report input artifact \.forge\/artifacts\/TASK-0090\/plan-002\.md has outcome 'BLOCKED' but must have outcome 'READY_FOR_APPROVAL' to satisfy referenced outcome-chain validation/,
    );
  });
});

test('missing referenced artifacts do not produce referenced-outcome-chain duplicate errors', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeArtifact(
      fixtureRoot,
      artifactPath('TASK-0090', 'build-report'),
      buildReportMetadata({
        task_id: 'TASK-0090',
        input_artifacts: [artifactPath('TASK-0090', 'plan', 999)],
      }),
    );

    const result = await validateRepository(fixtureRoot);
    const errors = result.errors.join('\n');

    assert.equal(result.ok, false);
    assert.match(errors, /does not reference an existing discovered live artifact file/);
    assert.doesNotMatch(errors, /referenced outcome-chain validation/);
  });
});

test('structurally invalid referenced artifacts do not produce referenced-outcome-chain duplicate errors', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeFixtureFile(fixtureRoot, artifactPath('TASK-0090', 'plan'), 'not front matter');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');

    const result = await validateRepository(fixtureRoot);
    const errors = result.errors.join('\n');

    assert.equal(result.ok, false);
    assert.match(errors, /artifact must start with YAML front matter delimiter/);
    assert.doesNotMatch(errors, /referenced outcome-chain validation/);
  });
});

test('structurally invalid referencing artifacts do not produce referenced-outcome-chain errors', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 'FAIL');
    await writeArtifact(
      fixtureRoot,
      artifactPath('TASK-0090', 'review-report'),
      reviewReportMetadata({
        task_id: 'TASK-0090',
        outcome: 'NOT_ALLOWED',
        input_artifacts: [
          artifactPath('TASK-0090', 'plan'),
          artifactPath('TASK-0090', 'build-report'),
          artifactPath('TASK-0090', 'test-report'),
        ],
      }),
    );

    const result = await validateRepository(fixtureRoot);
    const errors = result.errors.join('\n');

    assert.equal(result.ok, false);
    assert.match(errors, /outcome must be one of \[ACCEPT, REJECT, BLOCKED\]/);
    assert.doesNotMatch(errors, /referenced outcome-chain validation/);
  });
});

test('invalid task contracts do not produce secondary referenced-outcome-chain errors', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(
      fixtureRoot,
      'TASK-0099',
      'proposed',
      (content) => content.replace('required_checks: []', 'required_checks:\n  - missing_check'),
    );
    await writeValidPlan(fixtureRoot, 'TASK-0099');
    await writeValidBuildReport(fixtureRoot, 'TASK-0099');
    await writeValidTestReport(fixtureRoot, 'TASK-0099', 1, 1, 1, 'FAIL');
    await writeValidReviewReport(fixtureRoot, 'TASK-0099');

    const result = await validateRepository(fixtureRoot);
    const errors = result.errors.join('\n');

    assert.equal(result.ok, false);
    assert.match(errors, /required_checks\[0\] references unknown project command key 'missing_check'/);
    assert.doesNotMatch(errors, /referenced outcome-chain validation/);
  });
});

test('input artifacts may reference earlier attempts even when later attempts exist', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090', 2, 1, 'READY_FOR_TEST');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 'PASS');

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('referenced-outcome-chain errors are deterministic for multiple invalid references', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeValidPlan(fixtureRoot, 'TASK-0090', 1, 'READY_FOR_APPROVAL');
    await writeValidPlan(fixtureRoot, 'TASK-0090', 2, 'BLOCKED');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090', 1, 1, 'READY_FOR_TEST');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090', 2, 1, 'BLOCKED');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 'FAIL');
    await writeArtifact(
      fixtureRoot,
      artifactPath('TASK-0090', 'review-report'),
      reviewReportMetadata({
        task_id: 'TASK-0090',
        input_artifacts: [
          artifactPath('TASK-0090', 'test-report'),
          artifactPath('TASK-0090', 'plan', 2),
          artifactPath('TASK-0090', 'build-report', 2),
        ],
      }),
    );

    const result = await validateRepository(fixtureRoot);
    const referencedOutcomeErrors = result.errors.filter((error) => error.includes('referenced outcome-chain validation'));

    assert.equal(result.ok, false);
    assert.deepEqual(referencedOutcomeErrors, [
      "Contract error in .forge/artifacts/TASK-0090/review-report-001.md: review_report input artifact .forge/artifacts/TASK-0090/build-report-002.md has outcome 'BLOCKED' but must have outcome 'READY_FOR_TEST' to satisfy referenced outcome-chain validation.",
      "Contract error in .forge/artifacts/TASK-0090/review-report-001.md: review_report input artifact .forge/artifacts/TASK-0090/plan-002.md has outcome 'BLOCKED' but must have outcome 'READY_FOR_APPROVAL' to satisfy referenced outcome-chain validation.",
      "Contract error in .forge/artifacts/TASK-0090/review-report-001.md: review_report input artifact .forge/artifacts/TASK-0090/test-report-001.md has outcome 'FAIL' but must have outcome 'PASS' to satisfy referenced outcome-chain validation.",
    ]);
  });
});

test('a test report attempt 1 passes without a previous test report attempt', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 'PASS');

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('a review report attempt 1 passes without a previous review report attempt', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeCompleteArtifactChain(fixtureRoot, 'TASK-0090');

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('a test report attempt 2 passes when attempt 1 outcome is FAIL', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 'FAIL');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 2, 1, 1, 'PASS');

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('a test report attempt 2 fails when attempt 1 outcome is PASS', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 'PASS');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 2, 1, 1, 'FAIL');

    await assertInvalid(
      fixtureRoot,
      /test_report attempt 2 requires previous test_report attempt 1 at \.forge\/artifacts\/TASK-0090\/test-report-001\.md to have outcome 'FAIL' for retry-chain validation, but found outcome 'PASS'/,
    );
  });
});

test('a review report attempt 2 passes when attempt 1 outcome is REJECT', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeCompleteArtifactChain(fixtureRoot, 'TASK-0090', { reviewOutcome: 'REJECT' });
    await writeValidReviewReport(fixtureRoot, 'TASK-0090', 2, 1, 1, 1, 'ACCEPT');

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('a review report attempt 2 fails when attempt 1 outcome is ACCEPT', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeCompleteArtifactChain(fixtureRoot, 'TASK-0090', { reviewOutcome: 'ACCEPT' });
    await writeValidReviewReport(fixtureRoot, 'TASK-0090', 2, 1, 1, 1, 'REJECT');

    await assertInvalid(
      fixtureRoot,
      /review_report attempt 2 requires previous review_report attempt 1 at \.forge\/artifacts\/TASK-0090\/review-report-001\.md to have outcome 'REJECT' for retry-chain validation, but found outcome 'ACCEPT'/,
    );
  });
});

test('a test report attempt 3 requires attempt 2, not just attempt 1', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 'FAIL');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 3, 1, 1, 'PASS');

    await assertInvalid(
      fixtureRoot,
      /test_report attempt 3 requires previous test_report attempt 2 at \.forge\/artifacts\/TASK-0090\/test-report-002\.md with outcome 'FAIL' for retry-chain validation/,
    );
  });
});

test('a review report attempt 3 requires attempt 2, not just attempt 1', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeCompleteArtifactChain(fixtureRoot, 'TASK-0090', { reviewOutcome: 'REJECT' });
    await writeValidReviewReport(fixtureRoot, 'TASK-0090', 3, 1, 1, 1, 'ACCEPT');

    await assertInvalid(
      fixtureRoot,
      /review_report attempt 3 requires previous review_report attempt 2 at \.forge\/artifacts\/TASK-0090\/review-report-002\.md with outcome 'REJECT' for retry-chain validation/,
    );
  });
});

test('a test report attempt 3 passes when attempt 2 outcome is FAIL', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 'FAIL');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 2, 1, 1, 'FAIL');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 3, 1, 1, 'PASS');

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('a review report attempt 3 passes when attempt 2 outcome is REJECT', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeCompleteArtifactChain(fixtureRoot, 'TASK-0090', { reviewOutcome: 'REJECT' });
    await writeValidReviewReport(fixtureRoot, 'TASK-0090', 2, 1, 1, 1, 'REJECT');
    await writeValidReviewReport(fixtureRoot, 'TASK-0090', 3, 1, 1, 1, 'ACCEPT');

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('a missing previous test report attempt fails retry-chain validation', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 2, 1, 1, 'PASS');

    await assertInvalid(
      fixtureRoot,
      /test_report attempt 2 requires previous test_report attempt 1 at \.forge\/artifacts\/TASK-0090\/test-report-001\.md with outcome 'FAIL' for retry-chain validation/,
    );
  });
});

test('a missing previous review report attempt fails retry-chain validation', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeCompleteArtifactChain(fixtureRoot, 'TASK-0090');
    await removeFixturePath(fixtureRoot, artifactPath('TASK-0090', 'review-report', 1));
    await writeValidReviewReport(fixtureRoot, 'TASK-0090', 2, 1, 1, 1, 'ACCEPT');

    await assertInvalid(
      fixtureRoot,
      /review_report attempt 2 requires previous review_report attempt 1 at \.forge\/artifacts\/TASK-0090\/review-report-001\.md with outcome 'REJECT' for retry-chain validation/,
    );
  });
});

test('a structurally invalid previous test report avoids secondary retry-chain errors', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');
    await writeFixtureFile(fixtureRoot, artifactPath('TASK-0090', 'test-report', 1), 'not front matter');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 2, 1, 1, 'PASS');

    const result = await validateRepository(fixtureRoot);
    const errors = result.errors.join('\n');

    assert.equal(result.ok, false);
    assert.match(errors, /artifact must start with YAML front matter delimiter/);
    assert.doesNotMatch(errors, /retry-chain validation/);
  });
});

test('a structurally invalid previous review report avoids secondary retry-chain errors', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeCompleteArtifactChain(fixtureRoot, 'TASK-0090');
    await writeFixtureFile(fixtureRoot, artifactPath('TASK-0090', 'review-report', 1), 'not front matter');
    await writeValidReviewReport(fixtureRoot, 'TASK-0090', 2, 1, 1, 1, 'ACCEPT');

    const result = await validateRepository(fixtureRoot);
    const errors = result.errors.join('\n');

    assert.equal(result.ok, false);
    assert.match(errors, /artifact must start with YAML front matter delimiter/);
    assert.doesNotMatch(errors, /retry-chain validation/);
  });
});

test('a structurally invalid current retry artifact avoids retry-chain errors', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 'PASS');
    await writeFixtureFile(fixtureRoot, artifactPath('TASK-0090', 'test-report', 2), 'not front matter');

    const result = await validateRepository(fixtureRoot);
    const errors = result.errors.join('\n');

    assert.equal(result.ok, false);
    assert.match(errors, /artifact must start with YAML front matter delimiter/);
    assert.doesNotMatch(errors, /retry-chain validation/);
  });
});

test('invalid task contracts do not produce secondary retry-chain errors', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(
      fixtureRoot,
      'TASK-0099',
      'proposed',
      (content) => content.replace('required_checks: []', 'required_checks:\n  - missing_check'),
    );
    await writeValidPlan(fixtureRoot, 'TASK-0099');
    await writeValidBuildReport(fixtureRoot, 'TASK-0099');
    await writeValidTestReport(fixtureRoot, 'TASK-0099', 1, 1, 1, 'PASS');
    await writeValidTestReport(fixtureRoot, 'TASK-0099', 2, 1, 1, 'FAIL');

    const result = await validateRepository(fixtureRoot);
    const errors = result.errors.join('\n');

    assert.equal(result.ok, false);
    assert.match(errors, /required_checks\[0\] references unknown project command key 'missing_check'/);
    assert.doesNotMatch(errors, /retry-chain validation/);
  });
});

test('plan attempt 2 is not checked by retry-chain validation', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeValidPlan(fixtureRoot, 'TASK-0090', 1, 'READY_FOR_APPROVAL');
    await writeValidPlan(fixtureRoot, 'TASK-0090', 2, 'READY_FOR_APPROVAL');

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('build report attempt 2 is not checked by retry-chain validation', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090', 1, 1, 'READY_FOR_TEST');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090', 2, 1, 'READY_FOR_TEST');

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('legacy TASK-0004 test report retry artifact remains compatible', async () => {
  await withFixture(async (fixtureRoot) => {
    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('retry-chain errors are deterministic for multiple invalid retries', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeTask(fixtureRoot, 'TASK-0090', 'proposed');
    await writeValidPlan(fixtureRoot, 'TASK-0090');
    await writeValidBuildReport(fixtureRoot, 'TASK-0090');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 'PASS');
    await writeValidTestReport(fixtureRoot, 'TASK-0090', 2, 1, 1, 'PASS');
    await writeValidReviewReport(fixtureRoot, 'TASK-0090', 1, 1, 1, 1, 'ACCEPT');
    await writeValidReviewReport(fixtureRoot, 'TASK-0090', 2, 1, 1, 1, 'ACCEPT');

    const result = await validateRepository(fixtureRoot);
    const retryErrors = result.errors.filter((error) => error.includes('retry-chain validation'));

    assert.equal(result.ok, false);
    assert.deepEqual(retryErrors, [
      "Contract error in .forge/artifacts/TASK-0090/review-report-002.md: review_report attempt 2 requires previous review_report attempt 1 at .forge/artifacts/TASK-0090/review-report-001.md to have outcome 'REJECT' for retry-chain validation, but found outcome 'ACCEPT'.",
      "Contract error in .forge/artifacts/TASK-0090/test-report-002.md: test_report attempt 2 requires previous test_report attempt 1 at .forge/artifacts/TASK-0090/test-report-001.md to have outcome 'FAIL' for retry-chain validation, but found outcome 'PASS'.",
    ]);
  });
});

test('a valid live plan artifact passes', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeArtifact(
      fixtureRoot,
      '.forge/artifacts/TASK-0003/plan-003.md',
      planMetadata(),
    );

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('a valid complete live artifact chain passes', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeArtifact(
      fixtureRoot,
      '.forge/artifacts/TASK-0003/build-report-001.md',
      buildReportMetadata(),
    );
    await writeArtifact(
      fixtureRoot,
      '.forge/artifacts/TASK-0003/test-report-001.md',
      testReportMetadata(),
    );
    await writeArtifact(
      fixtureRoot,
      '.forge/artifacts/TASK-0003/review-report-001.md',
      reviewReportMetadata(),
    );

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('artifact metadata keys may appear in any order', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeArtifact(
      fixtureRoot,
      '.forge/artifacts/TASK-0003/plan-003.md',
      {
        input_artifacts: [],
        outcome: 'READY_FOR_APPROVAL',
        producing_role: 'planner',
        attempt: 3,
        artifact_type: 'plan',
        task_id: 'TASK-0003',
        schema_version: 1,
      },
    );

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

test('README and templates under artifacts are not live artifacts', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, '.forge/artifacts/README.md', 'not front matter');
    await writeFixtureFile(fixtureRoot, '.forge/artifacts/templates/bad.md', 'not front matter');

    const result = await validateRepository(fixtureRoot);
    assert.deepEqual(result, { ok: true, errors: [] });
  });
});

const artifactDiscoveryFailures = [
  {
    name: 'unsupported artifact-root file',
    path: '.forge/artifacts/notes.md',
    content: 'notes',
    expected: /unsupported direct artifact entry 'notes\.md'/,
  },
  {
    name: 'unsupported artifact task directory',
    path: '.forge/artifacts/TASK-ABC/plan-001.md',
    content: artifactContent(planMetadata({ task_id: 'TASK-ABC', attempt: 1 })),
    expected: /unsupported artifact task directory 'TASK-ABC'/,
  },
  {
    name: 'missing task contract',
    path: '.forge/artifacts/TASK-9999/plan-001.md',
    content: artifactContent(planMetadata({ task_id: 'TASK-9999', attempt: 1 })),
    expected: /artifact task directory has no matching task contract \.forge\/tasks\/TASK-9999\.yaml/,
  },
  {
    name: 'nested artifact directory',
    path: '.forge/artifacts/TASK-0003/nested/file.md',
    content: 'nested',
    expected: /live artifact task directories must contain only direct artifact files/,
  },
];

for (const { name, path: artifactPath, content, expected } of artifactDiscoveryFailures) {
  test(`artifact discovery rejects ${name}`, async () => {
    await withFixture(async (fixtureRoot) => {
      await writeFixtureFile(fixtureRoot, artifactPath, content);
      await assertInvalid(fixtureRoot, expected);
    });
  });
}

const artifactFilenameFailures = [
  {
    name: 'unsupported slug',
    path: '.forge/artifacts/TASK-0003/deploy-001.md',
    expected: /unsupported slug 'deploy'/,
  },
  {
    name: 'invalid attempt width',
    path: '.forge/artifacts/TASK-0003/plan-1.md',
    expected: /attempt suffix must be exactly three digits/,
  },
  {
    name: 'attempt zero',
    path: '.forge/artifacts/TASK-0003/plan-000.md',
    expected: /attempt suffix must be a positive attempt/,
  },
  {
    name: 'wrong extension',
    path: '.forge/artifacts/TASK-0003/plan-003.txt',
    expected: /artifact filename must match <artifact-slug>-NNN\.md/,
  },
];

for (const { name, path: artifactPath, expected } of artifactFilenameFailures) {
  test(`artifact filename rejects ${name}`, async () => {
    await withFixture(async (fixtureRoot) => {
      await writeFixtureFile(fixtureRoot, artifactPath, artifactContent(planMetadata()));
      await assertInvalid(fixtureRoot, expected);
    });
  });
}

const frontMatterFailures = [
  {
    name: 'missing opening delimiter',
    content: 'schema_version: 1\n---\n',
    expected: /must start with YAML front matter delimiter/,
  },
  {
    name: 'missing closing delimiter',
    content: '---\nschema_version: 1\n',
    expected: /front matter is missing closing delimiter/,
  },
  {
    name: 'malformed YAML',
    content: '---\nschema_version: [\n---\n',
    expected: /YAML parse error in \.forge\/artifacts\/TASK-0003\/plan-003\.md front matter/,
  },
  {
    name: 'non-mapping front matter',
    content: '---\n- 1\n---\n',
    expected: /front matter must contain a YAML mapping/,
  },
];

for (const { name, content, expected } of frontMatterFailures) {
  test(`artifact front matter rejects ${name}`, async () => {
    await withFixture(async (fixtureRoot) => {
      await writeFixtureFile(fixtureRoot, '.forge/artifacts/TASK-0003/plan-003.md', content);
      await assertInvalid(fixtureRoot, expected);
    });
  });
}

const artifactMetadataFailures = [
  {
    name: 'missing metadata field',
    metadata: (() => {
      const metadata = planMetadata();
      delete metadata.outcome;
      return metadata;
    })(),
    expected: /missing artifact metadata key 'outcome'/,
  },
  {
    name: 'unexpected metadata field',
    metadata: planMetadata({ produced_at: '2026-06-17T00:00:00Z' }),
    expected: /unexpected artifact metadata key 'produced_at'/,
  },
  {
    name: 'mismatched task ID',
    metadata: planMetadata({ task_id: 'TASK-9999' }),
    expected: /task_id must match artifact task directory 'TASK-0003'/,
  },
  {
    name: 'mismatched artifact type',
    metadata: planMetadata({ artifact_type: 'build_report' }),
    expected: /artifact_type must be 'plan' for filename slug 'plan'/,
  },
  {
    name: 'mismatched attempt',
    metadata: planMetadata({ attempt: 4 }),
    expected: /attempt must match filename suffix 3/,
  },
  {
    name: 'wrong producing role',
    metadata: planMetadata({ producing_role: 'builder' }),
    expected: /producing_role must be 'planner' for artifact_type 'plan'/,
  },
  {
    name: 'invalid outcome',
    metadata: planMetadata({ outcome: 'PASS' }),
    expected: /outcome must be one of \[READY_FOR_APPROVAL, BLOCKED\]/,
  },
];

for (const { name, metadata, expected } of artifactMetadataFailures) {
  test(`artifact metadata rejects ${name}`, async () => {
    await withFixture(async (fixtureRoot) => {
      await writeArtifact(fixtureRoot, '.forge/artifacts/TASK-0003/plan-003.md', metadata);
      await assertInvalid(fixtureRoot, expected);
    });
  });
}

test('artifact metadata rejects non-array inputs', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeFixtureFile(
      fixtureRoot,
      '.forge/artifacts/TASK-0003/build-report-001.md',
      `---
schema_version: 1
task_id: TASK-0003
artifact_type: build_report
attempt: 1
producing_role: builder
outcome: READY_FOR_TEST
input_artifacts: .forge/artifacts/TASK-0003/plan-002.md
---
`,
    );

    await assertInvalid(fixtureRoot, /input_artifacts must be an array/);
  });
});

const artifactInputFailures = [
  {
    name: 'non-string input',
    inputs: [123],
    expected: /input_artifacts\[0\] must be a repository-relative string/,
  },
  {
    name: 'absolute path',
    inputs: ['/tmp/plan-001.md'],
    expected: /must not be absolute/,
  },
  {
    name: 'backslash path',
    inputs: [String.raw`.forge\artifacts\TASK-0003\plan-002.md`],
    expected: /must use forward slashes and must not contain backslashes/,
  },
  {
    name: 'traversal',
    inputs: ['.forge/artifacts/TASK-0003/../TASK-0003/plan-002.md'],
    expected: /must not escape the repository through '\.\.'/,
  },
  {
    name: 'missing artifact input',
    inputs: ['.forge/artifacts/TASK-0003/plan-999.md'],
    expected: /does not reference an existing discovered live artifact file/,
  },
  {
    name: 'self-reference',
    inputs: ['.forge/artifacts/TASK-0003/build-report-001.md'],
    expected: /must not reference the current artifact/,
  },
  {
    name: 'duplicate input',
    inputs: [
      '.forge/artifacts/TASK-0003/plan-002.md',
      '.forge/artifacts/TASK-0003/plan-002.md',
    ],
    expected: /duplicates '\.forge\/artifacts\/TASK-0003\/plan-002\.md'/,
  },
  {
    name: 'build report without plan input',
    inputs: [],
    expected: /build_report artifacts must reference at least one plan artifact/,
  },
];

for (const { name, inputs, expected } of artifactInputFailures) {
  test(`artifact inputs reject ${name}`, async () => {
    await withFixture(async (fixtureRoot) => {
      await writeArtifact(
        fixtureRoot,
        '.forge/artifacts/TASK-0003/build-report-001.md',
        buildReportMetadata({ input_artifacts: inputs }),
      );
      await assertInvalid(fixtureRoot, expected);
    });
  });
}

test('artifact inputs reject other-task input paths', async () => {
  await withFixture(async (fixtureRoot) => {
    const task = await readFixtureFile(fixtureRoot, '.forge/tasks/TASK-0003.yaml');
    await writeFixtureFile(
      fixtureRoot,
      '.forge/tasks/TASK-0004.yaml',
      task.replace('id: TASK-0003', 'id: TASK-0004'),
    );
    await writeArtifact(
      fixtureRoot,
      '.forge/artifacts/TASK-0004/plan-001.md',
      planMetadata({ task_id: 'TASK-0004', attempt: 1 }),
    );
    await writeArtifact(
      fixtureRoot,
      '.forge/artifacts/TASK-0003/build-report-001.md',
      buildReportMetadata({ input_artifacts: ['.forge/artifacts/TASK-0004/plan-001.md'] }),
    );

    await assertInvalid(fixtureRoot, /must reference an artifact in \.forge\/artifacts\/TASK-0003\//);
  });
});

test('test reports must reference a build report', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeArtifact(
      fixtureRoot,
      '.forge/artifacts/TASK-0003/test-report-001.md',
      testReportMetadata({ input_artifacts: ['.forge/artifacts/TASK-0003/plan-002.md'] }),
    );

    await assertInvalid(fixtureRoot, /test_report artifacts must reference at least one build_report artifact/);
  });
});

test('review reports must reference a test report', async () => {
  await withFixture(async (fixtureRoot) => {
    await writeArtifact(
      fixtureRoot,
      '.forge/artifacts/TASK-0003/build-report-001.md',
      buildReportMetadata(),
    );
    await writeArtifact(
      fixtureRoot,
      '.forge/artifacts/TASK-0003/review-report-001.md',
      reviewReportMetadata({
        input_artifacts: [
          '.forge/artifacts/TASK-0003/plan-002.md',
          '.forge/artifacts/TASK-0003/build-report-001.md',
        ],
      }),
    );

    await assertInvalid(fixtureRoot, /review_report artifacts must reference at least one test_report artifact/);
  });
});
