import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultRepositoryRoot = path.resolve(packageDir, '../..');

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    repositoryRoot: defaultRepositoryRoot,
    taskId: null,
    title: null,
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

    if (arg === '--title') {
      args.title = readValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg.startsWith('--title=')) {
      args.title = arg.slice('--title='.length);
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

export function validateTitle(title) {
  if (!title || !title.trim()) {
    throw new Error('Task title must be a non-empty string.');
  }
}

export function extractSection(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  const section = [];
  let inside = false;

  for (const line of lines) {
    if (line.trim() === `## ${heading}`) {
      inside = true;
      continue;
    }

    if (inside && line.startsWith('## ')) {
      break;
    }

    if (inside) {
      section.push(line);
    }
  }

  return section;
}

export function boardHasActiveTask(markdown) {
  const nowSection = extractSection(markdown, 'Now');
  const nowItems = nowSection
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- [ ]'));

  if (nowItems.length === 0) {
    return false;
  }

  return !nowItems.every((line) => line === '- [ ] No active task.');
}

export function updateTaskBoard(markdown, taskId, title) {
  if (boardHasActiveTask(markdown)) {
    throw new Error('docs/TASKS.md already has an active task.');
  }

  if (!markdown.includes('- [ ] No active task.')) {
    throw new Error('docs/TASKS.md does not contain the expected no-active-task marker.');
  }

  if (!markdown.includes('- [ ] Define the next task.')) {
    throw new Error('docs/TASKS.md does not contain the expected next-task marker.');
  }

  return markdown
    .replace(
      '- [ ] No active task.',
      `- [ ] \`${taskId}\` — ${title} (\`proposed\`).`,
    )
    .replace(
      '- [ ] Define the next task.',
      `- [ ] Run Planner for \`${taskId}\`.`,
    );
}

function yamlString(value) {
  return JSON.stringify(value);
}

function previousTaskRange(taskId) {
  const number = Number(taskId.slice('TASK-'.length));

  if (!Number.isInteger(number) || number <= 1) {
    return 'completed task contracts and artifacts';
  }

  const previousId = `TASK-${String(number - 1).padStart(4, '0')}`;
  return `completed TASK-0001..${previousId} contracts and artifacts`;
}

export function buildTaskContract({ taskId, title }) {
  const completedRange = previousTaskRange(taskId);

  return `schema_version: 1

id: ${taskId}
title: ${yamlString(title)}
status: proposed
workflow: .forge/workflows/feature.yaml

goal: ${yamlString(`Define and deliver ${title}.`)}

in_scope:
  - Clarify the implementation plan for ${taskId}.
  - Implement the approved scope for ${taskId}.
  - Add or update tests for ${taskId}.
  - Update documentation when needed.
  - Preserve existing Forge Validator verification behavior.

out_of_scope:
  - Automatically creating branches, commits, pushes, pull requests, merges, or releases.
  - Modifying completed task contracts or completed task artifacts.
  - Rewriting previous task evidence.
  - Adding unrelated features outside ${taskId}.

allowed_files:
  - .forge/tasks/${taskId}.yaml
  - docs/TASKS.md
  - .forge/artifacts/${taskId}/plan-001.md
  - .forge/artifacts/${taskId}/build-report-001.md
  - .forge/artifacts/${taskId}/test-report-001.md
  - .forge/artifacts/${taskId}/review-report-001.md

protected_files:
  - .github/workflows/forge-contracts.yml
  - .forge/workflows/feature.yaml
  - .forge/roles/planner.md
  - .forge/roles/builder.md
  - .forge/roles/tester.md
  - .forge/roles/reviewer.md
  - ${completedRange}

acceptance_criteria:
  - id: AC-01
    description: The approved scope for ${taskId} is implemented.
  - id: AC-02
    description: Tests or verification evidence cover the implemented behavior.
  - id: AC-03
    description: Existing Forge Validator verification still passes.
  - id: AC-04
    description: The task lifecycle artifacts are created and linked correctly.

required_checks:
  - verify
`;
}

async function pathExists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

export async function scaffoldTask({
  repositoryRoot = defaultRepositoryRoot,
  taskId,
  title,
} = {}) {
  validateTaskId(taskId);
  validateTitle(title);

  const cleanTitle = title.trim();
  const taskPath = path.join(repositoryRoot, '.forge', 'tasks', `${taskId}.yaml`);
  const artifactDirectory = path.join(repositoryRoot, '.forge', 'artifacts', taskId);
  const boardPath = path.join(repositoryRoot, 'docs', 'TASKS.md');

  const board = await fs.readFile(boardPath, 'utf8');

  if (boardHasActiveTask(board)) {
    throw new Error('docs/TASKS.md already has an active task.');
  }

  if (await pathExists(taskPath)) {
    throw new Error(`Task contract already exists: ${path.relative(repositoryRoot, taskPath)}`);
  }

  if (await pathExists(artifactDirectory)) {
    throw new Error(`Task artifact directory already exists: ${path.relative(repositoryRoot, artifactDirectory)}`);
  }

  const nextBoard = updateTaskBoard(board, taskId, cleanTitle);
  const taskContract = buildTaskContract({ taskId, title: cleanTitle });

  await fs.mkdir(path.dirname(taskPath), { recursive: true });
  await fs.mkdir(artifactDirectory, { recursive: false });
  await fs.writeFile(taskPath, taskContract, 'utf8');
  await fs.writeFile(boardPath, nextBoard, 'utf8');

  return {
    taskPath: path.relative(repositoryRoot, taskPath),
    artifactDirectory: path.relative(repositoryRoot, artifactDirectory),
    boardPath: path.relative(repositoryRoot, boardPath),
  };
}

export function renderScaffoldResult(result) {
  return [
    'Forge task scaffold created.',
    '',
    `Task contract: ${result.taskPath}`,
    `Artifact directory: ${result.artifactDirectory}`,
    `Task board: ${result.boardPath}`,
  ].join('\n');
}

export async function main() {
  const args = parseArgs();
  const result = await scaffoldTask(args);
  console.log(renderScaffoldResult(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
