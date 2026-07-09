import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, '../../..');
const promptScript = join(repoRoot, 'scripts/operator/prompt.sh');

const explicitTaskId = 'TASK-0030';
const explicitTaskTitle = 'Add prompt generator for Forge roles';
const activeTaskId = 'TASK-0032';
const activeTaskTitle = 'Improve prompt generator UX';
const prNumber = '777';

const supportedRoles = [
  'planner',
  'builder',
  'tester',
  'reviewer',
  'recovery',
  'implementation-pr',
  'completion-pr',
];

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    ...options,
  });
}

function runPrompt(args, options = {}) {
  return run('bash', ['scripts/operator/prompt.sh', ...args], options);
}

function gitStatus(cwd = repoRoot) {
  const result = spawnSync('git', ['status', '--porcelain'], {
    cwd,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

function currentBranch(cwd = repoRoot) {
  const result = spawnSync('git', ['branch', '--show-current'], {
    cwd,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);

  return result.stdout.trim() || process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || '';
}

function escapedRegExp(value) {
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

function createPromptFixture({ boardText, includeTask = true, includeTemplates = true } = {}) {
  const tempRoot = join(tmpdir(), `forge-prompt-fixture-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  mkdirSync(join(tempRoot, 'scripts/operator'), { recursive: true });
  mkdirSync(join(tempRoot, '.forge/tasks'), { recursive: true });
  mkdirSync(join(tempRoot, '.forge/prompts'), { recursive: true });
  mkdirSync(join(tempRoot, 'docs'), { recursive: true });

  copyFileSync(promptScript, join(tempRoot, 'scripts/operator/prompt.sh'));

  if (includeTask) {
    writeFileSync(
      join(tempRoot, `.forge/tasks/${activeTaskId}.yaml`),
      [
        'schema_version: 1',
        `id: ${activeTaskId}`,
        `title: ${activeTaskTitle}`,
        'status: approved',
        'workflow: .forge/workflows/feature.yaml',
        '',
      ].join('\n'),
    );
  }

  if (includeTemplates) {
    for (const role of supportedRoles) {
      writeFileSync(
        join(tempRoot, `.forge/prompts/${role}.md`),
        [
          `role=${role}`,
          'task={{TASK_ID}}',
          'title={{TASK_TITLE}}',
          'repo={{REPO_PATH}}',
          'branch={{BRANCH_NAME}}',
          'pr={{PR_NUMBER}}',
          '',
        ].join('\n'),
      );
    }
  }

  writeFileSync(
    join(tempRoot, 'docs/TASKS.md'),
    boardText ?? [
      '# Tasks',
      '',
      '## Now',
      '',
      `- [ ] ${activeTaskId} — ${activeTaskTitle}.`,
      '',
      '## Next',
      '',
      '- [ ] Build TASK-0032.',
      '',
      '## Later',
      '',
      '- [ ] No later tasks.',
      '',
    ].join('\n'),
  );

  const init = spawnSync('git', ['init'], {
    cwd: tempRoot,
    encoding: 'utf8',
  });

  assert.equal(init.status, 0, init.stderr);

  return {
    root: tempRoot,
    cleanup() {
      rmSync(tempRoot, { recursive: true, force: true });
    },
  };
}

test('prompt generator script has valid shell syntax', () => {
  const result = run('bash', ['-n', promptScript]);

  assert.equal(result.status, 0, result.stderr);
});

test('prompt generator supports help output', () => {
  for (const flag of ['--help', '-h']) {
    const result = runPrompt([flag]);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Usage:/);
    assert.match(result.stdout, /--list/);
    assert.match(result.stdout, /ROLE \[TASK_ID\] \[PR_NUMBER\]/);
    assert.match(result.stdout, /Supported roles:/);
  }
});

test('prompt generator lists supported roles', () => {
  const result = runPrompt(['--list']);

  assert.equal(result.status, 0, result.stderr);

  const listedRoles = result.stdout.trim().split(/\s+/);

  assert.deepEqual(listedRoles, supportedRoles);
});

test('prompt generator renders every supported role explicitly without mutating the working tree', () => {
  const before = gitStatus();
  const rendered = [];

  for (const role of supportedRoles) {
    const result = runPrompt([role, explicitTaskId, prNumber]);

    assert.equal(result.status, 0, result.stderr);
    assert.notEqual(result.stdout.trim(), '', `${role} rendered empty output`);

    rendered.push(result.stdout);
  }

  const after = gitStatus();

  assert.equal(after, before, 'prompt rendering must not modify the working tree');

  const combined = rendered.join('\n');
  const branchName = currentBranch();

  assert.match(combined, /TASK-0030/);
  assert.match(combined, escapedRegExp(explicitTaskTitle));
  assert.match(combined, escapedRegExp(repoRoot));
  if (branchName) {
    assert.match(combined, escapedRegExp(branchName));
  }

  assert.match(combined, escapedRegExp(prNumber));

  for (const placeholder of [
    '{{TASK_ID}}',
    '{{TASK_TITLE}}',
    '{{REPO_PATH}}',
    '{{BRANCH_NAME}}',
    '{{PR_NUMBER}}',
  ]) {
    assert.equal(
      combined.includes(placeholder),
      false,
      `rendered prompts must not contain unresolved ${placeholder}`,
    );
  }
});

test('prompt generator resolves the active task when TASK_ID is omitted', () => {
  const fixture = createPromptFixture();

  try {
    const before = gitStatus(fixture.root);

    const result = spawnSync('bash', ['scripts/operator/prompt.sh', 'builder'], {
      cwd: fixture.root,
      encoding: 'utf8',
    });

    const after = gitStatus(fixture.root);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /task=TASK-0032/);
    assert.match(result.stdout, /title=Improve prompt generator UX/);
    assert.match(result.stdout, escapedRegExp(fixture.root));

    assert.equal(after, before, 'role-only rendering must not modify fixture repository');
  } finally {
    fixture.cleanup();
  }
});

test('prompt generator resolves active ready_for_pr task format when TASK_ID is omitted', () => {
  const fixture = createPromptFixture({
    boardText: [
      '# Tasks',
      '',
      '## Now',
      '',
      '- [ ] `TASK-0032` — Improve prompt generator UX (`ready_for_pr`).',
      '',
      '## Next',
      '',
      '- [ ] Prepare PR for `TASK-0032`.',
      '',
      '## Later',
      '',
      '- [ ] No later tasks.',
      '',
    ].join('\n'),
  });

  try {
    const result = spawnSync('bash', ['scripts/operator/prompt.sh', 'reviewer'], {
      cwd: fixture.root,
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /task=TASK-0032/);
  } finally {
    fixture.cleanup();
  }
});

test('prompt generator supports PR_NUMBER with active task shorthand for PR roles', () => {
  const fixture = createPromptFixture();

  try {
    const result = spawnSync('bash', ['scripts/operator/prompt.sh', 'implementation-pr', prNumber], {
      cwd: fixture.root,
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /task=TASK-0032/);
    assert.match(result.stdout, /pr=777/);
  } finally {
    fixture.cleanup();
  }
});

test('prompt generator fails clearly when TASK_ID is omitted and no active task exists', () => {
  const fixture = createPromptFixture({
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
    ].join('\n'),
  });

  try {
    const result = spawnSync('bash', ['scripts/operator/prompt.sh', 'builder'], {
      cwd: fixture.root,
      encoding: 'utf8',
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /No active task found/);
  } finally {
    fixture.cleanup();
  }
});

test('prompt generator fails clearly when TASK_ID is omitted and the board cannot be parsed', () => {
  const fixture = createPromptFixture({
    boardText: [
      '# Tasks',
      '',
      '## Next',
      '',
      '- [ ] Define the next task.',
      '',
    ].join('\n'),
  });

  try {
    const result = spawnSync('bash', ['scripts/operator/prompt.sh', 'builder'], {
      cwd: fixture.root,
      encoding: 'utf8',
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Could not parse active task/);
  } finally {
    fixture.cleanup();
  }
});

test('prompt generator fails clearly when TASK_ID is omitted and active board is ambiguous', () => {
  const fixture = createPromptFixture({
    boardText: [
      '# Tasks',
      '',
      '## Now',
      '',
      '- [ ] TASK-0032 — Improve prompt generator UX.',
      '- [ ] TASK-0033 — Another active task.',
      '',
      '## Next',
      '',
      '- [ ] Build TASK-0032.',
      '',
    ].join('\n'),
  });

  try {
    const result = spawnSync('bash', ['scripts/operator/prompt.sh', 'builder'], {
      cwd: fixture.root,
      encoding: 'utf8',
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Ambiguous active task board/);
  } finally {
    fixture.cleanup();
  }
});

test('prompt generator fails clearly for unknown roles', () => {
  const result = runPrompt(['unknown-role', explicitTaskId]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unknown role/);
});

test('prompt generator fails clearly for invalid task IDs', () => {
  const result = runPrompt(['builder', 'INVALID']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Task ID must match TASK-0000 format/);
});

test('prompt generator fails clearly for missing task contracts', () => {
  const result = runPrompt(['builder', 'TASK-9999']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Task contract not found/);
});

test('prompt generator fails clearly for missing templates', () => {
  const fixture = createPromptFixture({ includeTemplates: false });

  try {
    const result = spawnSync('bash', ['scripts/operator/prompt.sh', 'builder', activeTaskId], {
      cwd: fixture.root,
      encoding: 'utf8',
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Prompt template not found/);
  } finally {
    fixture.cleanup();
  }
});
