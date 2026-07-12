import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function readRepoFile(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

test('operator lib exposes compact verification helpers', () => {
  const lib = readRepoFile('scripts/operator/lib.sh');

  assert.match(lib, /forge_run_compact_command\(\)/);
  assert.match(lib, /forge_run_compact_verify\(\)/);
  assert.match(lib, /Full log:/);
  assert.match(lib, /COMMAND_EXIT=/);
  assert.match(lib, /VERIFY_EXIT=/);
  assert.match(lib, /tests\|pass\|fail/);
  assert.match(lib, /Forge contract validation/);
  assert.match(lib, /tail -80/);
});

test('high-noise operator workflows use compact verification output', () => {
  const scriptPaths = [
    'scripts/operator/create-implementation-pr.sh',
    'scripts/operator/merge-implementation-pr.sh',
    'scripts/operator/create-completion-pr.sh',
    'scripts/operator/merge-completion-pr.sh',
    'scripts/operator/post-task-check.sh',
  ];

  const scripts = scriptPaths.map((scriptPath) => [
    scriptPath,
    readRepoFile(scriptPath),
  ]);

  const compactUsers = scripts.filter(([, content]) =>
    content.includes('forge_run_compact_verify'),
  );

  assert.ok(
    compactUsers.length >= 1,
    'expected at least one operator workflow to use compact verify output',
  );

  for (const [scriptPath, content] of compactUsers) {
    assert.match(
      content,
      /\/tmp\/forge-\$\{TASK_ID:-operator\}-[a-z0-9-]+-verify\.log/,
      `${scriptPath} should write compact verify logs to a deterministic /tmp path`,
    );
  }
});

test('PR creation workflows execute compact verify before remote mutation', () => {
  const scriptPaths = [
    'scripts/operator/create-implementation-pr.sh',
    'scripts/operator/create-completion-pr.sh',
  ];

  for (const scriptPath of scriptPaths) {
    const content = readRepoFile(scriptPath);
    const lines = content.split('\n');

    const executableCompactLine = lines.findIndex((line) =>
      line.includes('forge_run_compact_verify') &&
      !line.trimStart().startsWith('- '),
    );

    const markdownCompactLine = lines.findIndex((line) =>
      line.includes('forge_run_compact_verify') &&
      line.trimStart().startsWith('- '),
    );

    const pushLine = lines.findIndex((line) =>
      line.includes('git push -u origin'),
    );

    const prCreateLine = lines.findIndex((line) =>
      line.includes('gh pr create'),
    );

    assert.notEqual(
      executableCompactLine,
      -1,
      `${scriptPath} should execute compact verify as shell code`,
    );

    assert.equal(
      markdownCompactLine,
      -1,
      `${scriptPath} should not put compact verify helper only in markdown body`,
    );

    assert.ok(
      executableCompactLine < pushLine,
      `${scriptPath} should verify before pushing the branch`,
    );

    assert.ok(
      executableCompactLine < prCreateLine,
      `${scriptPath} should verify before creating the PR`,
    );
  }
});

test('PR body compact log references do not use shell command substitution backticks', () => {
  const scriptPaths = [
    'scripts/operator/create-implementation-pr.sh',
    'scripts/operator/create-completion-pr.sh',
  ];

  for (const scriptPath of scriptPaths) {
    const content = readRepoFile(scriptPath);

    assert.doesNotMatch(
      content,
      /`\/tmp\/forge-\$\{TASK_ID:-operator\}-[a-z0-9-]+-verify\.log`/,
      `${scriptPath} should not wrap /tmp compact log paths in shell backticks inside heredoc bodies`,
    );

    assert.match(
      content,
      /Compact verification log: \/tmp\/forge-\$\{TASK_ID:-operator\}-[a-z0-9-]+-verify\.log/,
      `${scriptPath} should still mention the compact verification log path in the PR body`,
    );
  }
});

test('legacy verify summary helper delegates to compact verify', () => {
  const lib = readRepoFile('scripts/operator/lib.sh');
  const summaryStart = lib.indexOf('forge_run_verify_summary()');
  const compactStart = lib.indexOf('forge_run_compact_command()');

  assert.notEqual(summaryStart, -1, 'expected legacy summary helper to exist');
  assert.notEqual(compactStart, -1, 'expected compact command helper to exist');

  const summarySection = lib.slice(summaryStart, compactStart);

  assert.match(
    summarySection,
    /forge_run_verify_summary\(\)\s*\{\s*forge_run_compact_verify "\$@"\s*\}/s,
    'legacy summary helper should be a thin compatibility wrapper around compact verify',
  );

  assert.doesNotMatch(
    summarySection,
    /pnpm -C tools\/forge-validator verify/,
    'legacy summary helper should not duplicate full verify execution logic',
  );

  assert.doesNotMatch(
    summarySection,
    /grep -E/,
    'legacy summary helper should not duplicate summary extraction logic',
  );
});

test('high-noise operator workflows use compact verify consistently', () => {
  const highNoiseScripts = [
    'scripts/operator/check-pr.sh',
    'scripts/operator/check-state.sh',
    'scripts/operator/create-implementation-pr.sh',
    'scripts/operator/create-completion-pr.sh',
    'scripts/operator/merge-implementation-pr.sh',
    'scripts/operator/merge-completion-pr.sh',
    'scripts/operator/post-task-check.sh',
  ];

  for (const scriptPath of highNoiseScripts) {
    const content = readRepoFile(scriptPath);

    assert.match(
      content,
      /forge_run_compact_verify/,
      `${scriptPath} should use compact verification output`,
    );

    assert.doesNotMatch(
      content,
      /forge_run_verify_summary/,
      `${scriptPath} should not call the legacy summary helper directly`,
    );

    assert.doesNotMatch(
      content,
      /pnpm -C tools\/forge-validator verify/,
      `${scriptPath} should not run full verify directly`,
    );
  }
});

test('operator verify execution is centralized in compact helper', () => {
  const scriptPaths = [
    'scripts/operator/check-pr.sh',
    'scripts/operator/check-state.sh',
    'scripts/operator/create-implementation-pr.sh',
    'scripts/operator/create-completion-pr.sh',
    'scripts/operator/merge-implementation-pr.sh',
    'scripts/operator/merge-completion-pr.sh',
    'scripts/operator/post-task-check.sh',
    'scripts/operator/prompt.sh',
    'scripts/operator/check-completion-pr.sh',
  ];

  for (const scriptPath of scriptPaths) {
    const content = readRepoFile(scriptPath);

    assert.doesNotMatch(
      content,
      /pnpm -C tools\/forge-validator verify/,
      `${scriptPath} should not duplicate compact verify implementation`,
    );
  }

  const lib = readRepoFile('scripts/operator/lib.sh');
  const directVerifyMatches = lib.match(/pnpm -C tools\/forge-validator verify/g) ?? [];

  assert.equal(
    directVerifyMatches.length,
    1,
    'scripts/operator/lib.sh should contain exactly one direct full verify invocation',
  );
});


test('legacy PR watch helper delegates to hardened Forge PR watch', () => {
  const lib = readRepoFile('scripts/operator/lib.sh');
  const start = lib.indexOf('forge_watch_pr_ci()');
  const end = lib.indexOf('forge_slug_task_id()', start);

  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const section = lib.slice(start, end);

  assert.match(
    section,
    /node tools\/forge-validator\/src\/cli\.mjs pr watch -- --pr "\$pr_number"/,
  );
  assert.doesNotMatch(
    section,
    /gh pr checks "\$pr_number" --watch/,
  );
});
