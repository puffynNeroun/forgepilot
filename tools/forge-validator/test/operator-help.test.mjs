import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function runScript(scriptPath, args = []) {
  const result = spawnSync('bash', [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  return `${result.stdout}${result.stderr}`;
}

const cases = [
  ['scripts/operator/create-implementation-pr.sh', [], 'forge pr create-implementation'],
  ['scripts/operator/check-pr.sh', [], 'forge pr watch'],
  ['scripts/operator/merge-implementation-pr.sh', [], 'forge pr merge-implementation'],
  ['scripts/operator/create-completion-pr.sh', [], 'forge pr create-completion'],
  ['scripts/operator/check-completion-pr.sh', [], 'forge pr watch'],
  ['scripts/operator/merge-completion-pr.sh', [], 'forge pr merge-completion'],
  ['scripts/operator/post-task-check.sh', [], 'forge task check'],
  ['scripts/operator/prompt.sh', ['--help'], 'forge prompt ROLE [TASK_ID] [PR_NUMBER]'],
];

for (const [scriptPath, args, forgeCommand] of cases) {
  test(`${scriptPath} help points to Forge CLI and labels compatibility usage`, () => {
    const output = runScript(scriptPath, args);

    assert.ok(output.includes('Preferred Forge command:'));
    assert.ok(output.includes('Compatibility script:'));
    assert.ok(output.includes(forgeCommand));
    assert.match(output, /bash scripts\/operator\//);
  });
}
