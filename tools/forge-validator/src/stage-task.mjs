import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultRepositoryRoot = path.resolve(packageDir, '../..');

export const stageTransitions = {
  planner: {
    fromStatus: 'proposed',
    toStatus: 'approved',
    fromNext: 'Run Planner',
    toNext: 'Run Builder',
  },
  builder: {
    fromStatus: 'approved',
    toStatus: 'in_progress',
    fromNext: 'Run Builder',
    toNext: 'Run Tester',
  },
  tester: {
    fromStatus: 'in_progress',
    toStatus: 'in_progress',
    fromNext: 'Run Tester',
    toNext: 'Run Reviewer',
  },
  reviewer: {
    fromStatus: 'in_progress',
    toStatus: 'ready_for_pr',
    fromNext: 'Run Reviewer',
    toNext: 'Prepare PR',
  },
};

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    repositoryRoot: defaultRepositoryRoot,
    taskId: null,
    stage: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--repo-root') {
      args.repositoryRoot = path.resolve(readValue(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg.startsWith('--repo-root=')) {
      args.repositoryRoot = path.resolve(arg.slice('--repo-root='.length));
      continue;
    }

    if (arg === '--id') {
      args.taskId = readValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg.startsWith('--id=')) {
      args.taskId = arg.slice('--id='.length);
      continue;
    }

    if (arg === '--stage') {
      args.stage = readValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg.startsWith('--stage=')) {
      args.stage = arg.slice('--stage='.length);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function readValue(argv, index, flagName) {
  const value = argv[index + 1];

  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${flagName}`);
  }

  return value;
}

export function validateTaskId(taskId) {
  if (!/^TASK-\d{4}$/.test(taskId || '')) {
    throw new Error('Task ID must match TASK-0000 format.');
  }
}

export function validateStage(stage) {
  if (!Object.hasOwn(stageTransitions, stage || '')) {
    throw new Error(`Stage must be one of: ${Object.keys(stageTransitions).join(', ')}.`);
  }
}

function parseScalar(value) {
  const trimmed = value.trim();

  if (trimmed.startsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }

  return trimmed;
}

export function parseTaskContract(contractText) {
  const idMatch = contractText.match(/^id:\s*(.+)$/m);
  const titleMatch = contractText.match(/^title:\s*(.+)$/m);
  const statusMatch = contractText.match(/^status:\s*(.+)$/m);

  if (!idMatch) {
    throw new Error('Task contract is missing id.');
  }

  if (!titleMatch) {
    throw new Error('Task contract is missing title.');
  }

  if (!statusMatch) {
    throw new Error('Task contract is missing status.');
  }

  return {
    id: parseScalar(idMatch[1]),
    title: parseScalar(titleMatch[1]),
    status: parseScalar(statusMatch[1]),
  };
}

export function stageTaskContract(contractText, { taskId, stage }) {
  validateTaskId(taskId);
  validateStage(stage);

  const transition = stageTransitions[stage];
  const task = parseTaskContract(contractText);

  if (task.id !== taskId) {
    throw new Error(`Task contract id mismatch: expected ${taskId}, found ${task.id}.`);
  }

  if (task.status !== transition.fromStatus) {
    throw new Error(
      `Task ${taskId} must be ${transition.fromStatus} before ${stage} transition.`,
    );
  }

  const nextContractText =
    transition.fromStatus === transition.toStatus
      ? contractText
      : contractText.replace(
          new RegExp(`^status:\\s*${transition.fromStatus}$`, 'm'),
          `status: ${transition.toStatus}`,
        );

  return {
    task,
    transition,
    contractText: nextContractText,
  };
}

export function stageTaskBoard(markdown, { taskId, title, stage }) {
  validateTaskId(taskId);
  validateStage(stage);

  const transition = stageTransitions[stage];

  const currentTaskLine = `- [ ] \`${taskId}\` — ${title} (\`${transition.fromStatus}\`).`;
  const nextTaskLine = `- [ ] \`${taskId}\` — ${title} (\`${transition.toStatus}\`).`;

  const currentNextLine =
    transition.fromNext === 'Prepare PR'
      ? `- [ ] Prepare PR for \`${taskId}\`.`
      : `- [ ] ${transition.fromNext} for \`${taskId}\`.`;

  const nextNextLine =
    transition.toNext === 'Prepare PR'
      ? `- [ ] Prepare PR for \`${taskId}\`.`
      : `- [ ] ${transition.toNext} for \`${taskId}\`.`;

  if (!markdown.includes(currentTaskLine)) {
    throw new Error(
      `docs/TASKS.md does not show ${taskId} as the active ${transition.fromStatus} task.`,
    );
  }

  if (!markdown.includes(currentNextLine)) {
    throw new Error(
      `docs/TASKS.md does not contain the expected ${transition.fromNext} next step for ${taskId}.`,
    );
  }

  return markdown.replace(currentTaskLine, nextTaskLine).replace(currentNextLine, nextNextLine);
}

export async function stageTask({
  repositoryRoot = defaultRepositoryRoot,
  taskId,
  stage,
} = {}) {
  validateTaskId(taskId);
  validateStage(stage);

  const taskPath = path.join(repositoryRoot, '.forge', 'tasks', `${taskId}.yaml`);
  const boardPath = path.join(repositoryRoot, 'docs', 'TASKS.md');

  let contractText;

  try {
    contractText = await fs.readFile(taskPath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      throw new Error(`Task contract does not exist: ${path.relative(repositoryRoot, taskPath)}`);
    }

    throw error;
  }

  const boardText = await fs.readFile(boardPath, 'utf8');

  const stagedContract = stageTaskContract(contractText, { taskId, stage });
  const stagedBoard = stageTaskBoard(boardText, {
    taskId,
    title: stagedContract.task.title,
    stage,
  });

  await fs.writeFile(taskPath, stagedContract.contractText, 'utf8');
  await fs.writeFile(boardPath, stagedBoard, 'utf8');

  return {
    taskId,
    title: stagedContract.task.title,
    stage,
    fromStatus: stagedContract.transition.fromStatus,
    toStatus: stagedContract.transition.toStatus,
    taskPath: path.relative(repositoryRoot, taskPath),
    boardPath: path.relative(repositoryRoot, boardPath),
  };
}

export function renderStageResult(result) {
  return [
    'Forge task stage transitioned.',
    '',
    `Task: ${result.taskId}`,
    `Title: ${result.title}`,
    `Stage: ${result.stage}`,
    `Status: ${result.fromStatus} -> ${result.toStatus}`,
    `Task contract: ${result.taskPath}`,
    `Task board: ${result.boardPath}`,
  ].join('\n');
}

export async function main() {
  const args = parseArgs();
  const result = await stageTask(args);
  console.log(renderStageResult(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
