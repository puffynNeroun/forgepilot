import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultRepositoryRoot = path.resolve(packageDir, '../..');

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    repositoryRoot: defaultRepositoryRoot,
    taskId: null,
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

export function completeTaskContract(contractText, taskId) {
  const task = parseTaskContract(contractText);

  if (task.id !== taskId) {
    throw new Error(`Task contract id mismatch: expected ${taskId}, found ${task.id}.`);
  }

  if (task.status !== 'ready_for_pr') {
    throw new Error(`Task ${taskId} must be ready_for_pr before completion.`);
  }

  return {
    task,
    contractText: contractText.replace(/^status:\s*ready_for_pr$/m, 'status: completed'),
  };
}

export function formatDate(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function completeTaskBoard(markdown, { taskId, title, completedDate = formatDate() }) {
  const activeLine = `- [ ] \`${taskId}\` — ${title} (\`ready_for_pr\`).`;
  const nextLine = `- [ ] Prepare PR for \`${taskId}\`.`;
  const completedLine = `- [x] \`${taskId}\` — ${title} (\`completed\`, ${completedDate}).`;
  const completedMarker = '## Completed\n\n';

  if (!markdown.includes(activeLine)) {
    throw new Error(`docs/TASKS.md does not show ${taskId} as the active ready_for_pr task.`);
  }

  if (!markdown.includes(nextLine)) {
    throw new Error(`docs/TASKS.md does not contain the expected Prepare PR line for ${taskId}.`);
  }

  if (!markdown.includes(completedMarker)) {
    throw new Error('docs/TASKS.md is missing the Completed section.');
  }

  let nextMarkdown = markdown
    .replace(activeLine, '- [ ] No active task.')
    .replace(nextLine, '- [ ] Define the next task.');

  if (!nextMarkdown.includes(completedLine)) {
    nextMarkdown = nextMarkdown.replace(completedMarker, completedMarker + completedLine + '\n');
  }

  return nextMarkdown;
}

export async function completeTask({
  repositoryRoot = defaultRepositoryRoot,
  taskId,
  today = new Date(),
} = {}) {
  validateTaskId(taskId);

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

  const completedDate = typeof today === 'string' ? today : formatDate(today);
  const completedContract = completeTaskContract(contractText, taskId);
  const completedBoard = completeTaskBoard(boardText, {
    taskId,
    title: completedContract.task.title,
    completedDate,
  });

  await fs.writeFile(taskPath, completedContract.contractText, 'utf8');
  await fs.writeFile(boardPath, completedBoard, 'utf8');

  return {
    taskPath: path.relative(repositoryRoot, taskPath),
    boardPath: path.relative(repositoryRoot, boardPath),
    taskId,
    title: completedContract.task.title,
    completedDate,
  };
}

export function renderCompletionResult(result) {
  return [
    'Forge task completed.',
    '',
    `Task: ${result.taskId}`,
    `Title: ${result.title}`,
    `Completed date: ${result.completedDate}`,
    `Task contract: ${result.taskPath}`,
    `Task board: ${result.boardPath}`,
  ].join('\n');
}

export async function main() {
  const args = parseArgs();
  const result = await completeTask(args);
  console.log(renderCompletionResult(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
