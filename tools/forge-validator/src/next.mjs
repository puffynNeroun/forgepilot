import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectLifecycleStatus } from './status.mjs';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultRepositoryRoot = path.resolve(packageDir, '..', '..');

export const KNOWN_TASK_STATUSES = [
  'proposed',
  'approved',
  'in_progress',
  'ready_for_pr',
  'completed',
  'blocked',
];

function normalizeLines(text) {
  return text.replace(/\r\n/g, '\n').split('\n');
}

export function extractTaskStatusFromBoardLine(line = '') {
  const match = line.match(/\(`?(proposed|approved|in_progress|ready_for_pr|completed|blocked)`?\)\.?$/);
  return match ? match[1] : null;
}

export function findActiveTaskBoardLine(status) {
  const taskId = status.taskBoard?.activeTaskId;

  if (!taskId) {
    return null;
  }

  return status.taskBoard.board.now.find((line) => line.includes(`\`${taskId}\``)) ?? null;
}

function activeTaskId(status) {
  return status.selectedTaskId ?? status.taskBoard?.activeTaskId ?? null;
}

function nextBoardText(status) {
  return status.taskBoard?.board?.next?.join('\n').toLowerCase() ?? '';
}

export async function readTaskContractStatus(repositoryRoot, taskId) {
  if (!taskId) {
    return null;
  }

  const taskPath = path.join(repositoryRoot, '.forge', 'tasks', `${taskId}.yaml`);

  try {
    const content = await fs.readFile(taskPath, 'utf8');
    const statusLine = normalizeLines(content).find((line) => line.match(/^status:\s*/));
    const match = statusLine?.match(/^status:\s*"?([^"\n]+)"?\s*$/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

export function detectNextPhase(status) {
  const taskId = activeTaskId(status);
  const taskStatus =
    status.taskStatus ?? extractTaskStatusFromBoardLine(findActiveTaskBoardLine(status) ?? '');
  const boardNext = nextBoardText(status);

  if (!taskId) {
    return {
      action: 'Define the next task.',
      suggestedCommand: 'forge task new -- --id TASK-XXXX --title "Task title"',
    };
  }

  if (taskStatus === 'proposed') {
    return { action: `Plan ${taskId}.`, suggestedCommand: `forge prompt planner ${taskId}` };
  }

  if (taskStatus === 'approved') {
    return { action: `Build ${taskId}.`, suggestedCommand: `forge prompt builder ${taskId}` };
  }

  if (taskStatus === 'in_progress') {
    if (/\breviewer\b|\breview\b/.test(boardNext)) {
      return { action: `Review ${taskId}.`, suggestedCommand: `forge prompt reviewer ${taskId}` };
    }

    if (/\btester\b|\btest\b/.test(boardNext)) {
      return { action: `Test ${taskId}.`, suggestedCommand: `forge prompt tester ${taskId}` };
    }

    if (/\bbuilder\b|\bbuild\b/.test(boardNext)) {
      return { action: `Continue building ${taskId}.`, suggestedCommand: `forge prompt builder ${taskId}` };
    }

    return { action: `Inspect ${taskId} and continue the current stage.`, suggestedCommand: 'forge status' };
  }

  if (taskStatus === 'ready_for_pr') {
    const currentBranch = status.git?.branch ?? '';

    if (currentBranch === 'main') {
      return {
        action: `Create completion PR for ${taskId}.`,
        suggestedCommand: `forge pr create-completion -- --id ${taskId} --branch chore/complete-${taskId}`,
      };
    }

    return {
      action: `Create implementation PR for ${taskId}.`,
      suggestedCommand: `forge pr create-implementation -- --id ${taskId} --title "${taskId}: Implementation"`,
    };
  }

  if (taskStatus === 'blocked') {
    return {
      action: `Resolve the blocker for ${taskId} or run recovery.`,
      suggestedCommand: `forge prompt recovery ${taskId}`,
    };
  }

  if (taskStatus === 'completed') {
    return {
      action: `Run post-task check for ${taskId}, then define the next task.`,
      suggestedCommand: `forge task check -- --id ${taskId}`,
    };
  }

  return { action: `Inspect lifecycle state for ${taskId}.`, suggestedCommand: 'forge status' };
}

export async function collectForgeNext(options = {}) {
  const lifecycleStatus = await collectLifecycleStatus(options);
  const taskId = activeTaskId(lifecycleStatus);
  const boardLine = findActiveTaskBoardLine(lifecycleStatus);

  const taskStatus =
    await readTaskContractStatus(lifecycleStatus.repositoryRoot, taskId)
    ?? extractTaskStatusFromBoardLine(boardLine ?? '');

  return { ...lifecycleStatus, taskStatus };
}

export function renderForgeNext(status) {
  const taskId = activeTaskId(status);
  const phase = detectNextPhase(status);
  const lines = [];

  lines.push('Forge Next');
  lines.push('');
  lines.push('Current state:');
  lines.push(`- Branch: ${status.git.branch}`);
  lines.push(`- Working tree: ${status.git.clean ? 'clean' : 'dirty'}`);
  lines.push(`- Active task: ${taskId ?? 'none'}`);

  if (taskId) {
    lines.push(`- Task status: ${status.taskStatus ?? 'unknown'}`);
  }

  lines.push('');
  lines.push('Next recommended action:');
  lines.push(`- ${phase.action}`);

  if (phase.suggestedCommand) {
    lines.push('');
    lines.push('Suggested command:');
    lines.push(phase.suggestedCommand);
  }

  return `${lines.join('\n')}\n`;
}

function parseArgs(argv) {
  const options = { repositoryRoot: defaultRepositoryRoot, taskId: null };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--repo-root') {
      options.repositoryRoot = argv[index + 1];
      index += 1;
    } else if (arg === '--task') {
      options.taskId = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const status = await collectForgeNext(options);
  process.stdout.write(renderForgeNext(status));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
