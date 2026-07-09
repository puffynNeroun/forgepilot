import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { scaffoldArtifact } from './scaffold-artifact.mjs';
import { completeTask } from './complete-task.mjs';
import { stageTask } from './stage-task.mjs';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function createSmokeRepository({
  taskId = 'TASK-9999',
  title = 'Smoke workflow task',
} = {}) {
  const repositoryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-workflow-smoke-'));

  await fs.mkdir(path.join(repositoryRoot, '.forge', 'tasks'), { recursive: true });
  await fs.mkdir(path.join(repositoryRoot, '.forge', 'artifacts', taskId), { recursive: true });
  await fs.mkdir(path.join(repositoryRoot, 'docs'), { recursive: true });

  await fs.writeFile(
    path.join(repositoryRoot, '.forge', 'tasks', `${taskId}.yaml`),
    [
      'schema_version: 1',
      '',
      `id: ${taskId}`,
      `title: ${title}`,
      'status: proposed',
      'workflow: .forge/workflows/feature.yaml',
      '',
    ].join('\n'),
    'utf8',
  );

  await fs.writeFile(
    path.join(repositoryRoot, 'docs', 'TASKS.md'),
    [
      '# Tasks',
      '',
      '## Now',
      '',
      `- [ ] \`${taskId}\` — ${title} (\`proposed\`).`,
      '',
      '## Next',
      '',
      `- [ ] Run Planner for \`${taskId}\`.`,
      '',
      '## Later',
      '',
      '- [ ] No later tasks.',
      '',
      '## Completed',
      '',
      '- [x] `TASK-0001` — Old fixture task (`completed`, 2026-06-16).',
      '',
    ].join('\n'),
    'utf8',
  );

  return repositoryRoot;
}

export async function readSmokeState(repositoryRoot, taskId) {
  const contractText = await fs.readFile(
    path.join(repositoryRoot, '.forge', 'tasks', `${taskId}.yaml`),
    'utf8',
  );

  const boardText = await fs.readFile(path.join(repositoryRoot, 'docs', 'TASKS.md'), 'utf8');

  return {
    contractText,
    boardText,
  };
}

export async function runWorkflowSmoke({
  taskId = 'TASK-9999',
  title = 'Smoke workflow task',
  today = '2026-07-01',
} = {}) {
  const repositoryRoot = await createSmokeRepository({ taskId, title });

  const steps = [];

  await stageTask({ repositoryRoot, taskId, stage: 'planner' });
  steps.push('planner');

  await scaffoldArtifact({ repositoryRoot, taskId, type: 'plan' });
  steps.push('plan');

  await stageTask({ repositoryRoot, taskId, stage: 'builder' });
  steps.push('builder');

  await scaffoldArtifact({ repositoryRoot, taskId, type: 'build_report' });
  steps.push('build_report');

  await stageTask({ repositoryRoot, taskId, stage: 'tester' });
  steps.push('tester');

  await scaffoldArtifact({ repositoryRoot, taskId, type: 'test_report' });
  steps.push('test_report');

  await stageTask({ repositoryRoot, taskId, stage: 'reviewer' });
  steps.push('reviewer');

  await scaffoldArtifact({ repositoryRoot, taskId, type: 'review_report' });
  steps.push('review_report');

  await completeTask({ repositoryRoot, taskId, today });
  steps.push('complete');

  const state = await readSmokeState(repositoryRoot, taskId);

  assertFinalState(state, { taskId, title, today });

  return {
    repositoryRoot,
    taskId,
    title,
    steps,
    contractText: state.contractText,
    boardText: state.boardText,
  };
}

export function assertFinalState({ contractText, boardText }, { taskId, title, today }) {
  const completedLine = `- [x] \`${taskId}\` — ${title} (\`completed\`, ${today}).`;

  if (!/^status:\s*completed$/m.test(contractText)) {
    throw new Error('Smoke workflow did not complete the task contract.');
  }

  if (!boardText.includes('- [ ] No active task.')) {
    throw new Error('Smoke workflow did not clear the active task.');
  }

  if (!boardText.includes('- [ ] Define the next task.')) {
    throw new Error('Smoke workflow did not set the next task instruction.');
  }

  if (!boardText.includes(completedLine)) {
    throw new Error('Smoke workflow did not add the completed task line.');
  }
}

export function renderSmokeResult(result) {
  return [
    'Forge workflow smoke passed.',
    '',
    `Task: ${result.taskId}`,
    `Title: ${result.title}`,
    `Fixture repository: ${result.repositoryRoot}`,
    '',
    'Steps:',
    ...result.steps.map((step) => `- ${step}`),
  ].join('\n');
}

export async function main() {
  const result = await runWorkflowSmoke();
  console.log(renderSmokeResult(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
