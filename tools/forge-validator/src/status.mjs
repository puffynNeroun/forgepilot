import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultRepositoryRoot = path.resolve(packageDir, '..', '..');

export const EXPECTED_ARTIFACT_FILES = [
  'plan-001.md',
  'build-report-001.md',
  'test-report-001.md',
  'review-report-001.md',
];

export const STALE_VERIFICATION_PATTERNS = [
  { name: 'stale test count', pattern: /tests 1([^0-9]|$)/ },
  { name: 'stale pass count', pattern: /pass 1([^0-9]|$)/ },
  { name: 'single validate test marker', pattern: /✔ test\/validate\.test\.mjs/ },
  { name: 'single top-level test file note', pattern: /one top-level test file/ },
  { name: 'prompt expected note', pattern: /prompt expected/ },
  { name: 'current run reported note', pattern: /current run reported/ },
  { name: 'reporter count mismatch note', pattern: /reporter count mismatch/ },
];

function normalizeLines(text) {
  return text.replace(/\r\n/g, '\n').split('\n');
}

export function parseTaskBoard(markdown) {
  const lines = normalizeLines(markdown);
  const sections = new Map();
  let current = null;

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      current = heading[1];
      sections.set(current, []);
      continue;
    }

    if (current) {
      sections.get(current).push(line);
    }
  }

  const getSection = (name) => (sections.get(name) ?? [])
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    now: getSection('Now'),
    next: getSection('Next'),
    later: getSection('Later'),
    completed: getSection('Completed'),
  };
}

export function activeTaskFromBoard(board) {
  const nowText = board.now.join('\n');
  const match = nowText.match(/`(TASK-\d{4})`/);
  return match ? match[1] : null;
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function defaultRunGit(repositoryRoot, args) {
  return execFileAsync('git', ['-C', repositoryRoot, ...args], {
    maxBuffer: 1024 * 1024,
  });
}

export async function readGitState(repositoryRoot, runGit = defaultRunGit) {
  try {
    const branchResult = await runGit(repositoryRoot, ['branch', '--show-current']);
    const statusResult = await runGit(repositoryRoot, ['status', '--short', '--branch']);

    const statusLines = normalizeLines(statusResult.stdout).filter(Boolean);
    const changedLines = statusLines.filter((line) => !line.startsWith('##'));

    return {
      branch: branchResult.stdout.trim() || '(detached)',
      clean: changedLines.length === 0,
      status: statusLines,
    };
  } catch (error) {
    return {
      branch: '(unknown)',
      clean: false,
      status: [`git status unavailable: ${error.message}`],
    };
  }
}

export async function readTaskBoard(repositoryRoot) {
  const boardPath = path.join(repositoryRoot, 'docs', 'TASKS.md');
  const markdown = await fs.readFile(boardPath, 'utf8');
  const board = parseTaskBoard(markdown);

  return {
    path: 'docs/TASKS.md',
    board,
    activeTaskId: activeTaskFromBoard(board),
  };
}

export async function readArtifactStatus(repositoryRoot, taskId) {
  if (!taskId) {
    return [];
  }

  const artifactDir = path.join(repositoryRoot, '.forge', 'artifacts', taskId);

  return Promise.all(EXPECTED_ARTIFACT_FILES.map(async (fileName) => {
    const relativePath = path.posix.join('.forge/artifacts', taskId, fileName);
    const absolutePath = path.join(artifactDir, fileName);

    return {
      file: relativePath,
      present: await pathExists(absolutePath),
    };
  }));
}

export async function scanStaleVerificationText(repositoryRoot, taskId) {
  if (!taskId) {
    return [];
  }

  const artifactDir = path.join(repositoryRoot, '.forge', 'artifacts', taskId);

  if (!(await pathExists(artifactDir))) {
    return [];
  }

  const entries = await fs.readdir(artifactDir, { withFileTypes: true });
  const matches = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue;
    }

    const absolutePath = path.join(artifactDir, entry.name);
    const relativePath = path.posix.join('.forge/artifacts', taskId, entry.name);
    const content = await fs.readFile(absolutePath, 'utf8');
    const lines = normalizeLines(content);

    lines.forEach((line, index) => {
      for (const { name, pattern } of STALE_VERIFICATION_PATTERNS) {
        if (pattern.test(line)) {
          matches.push({
            file: relativePath,
            line: index + 1,
            pattern: name,
          });
        }
      }
    });
  }

  return matches;
}

export async function collectLifecycleStatus(options = {}) {
  const repositoryRoot = path.resolve(options.repositoryRoot ?? defaultRepositoryRoot);
  const git = await readGitState(repositoryRoot, options.runGit);
  const taskBoard = await readTaskBoard(repositoryRoot);
  const selectedTaskId = options.taskId ?? taskBoard.activeTaskId;
  const artifacts = await readArtifactStatus(repositoryRoot, selectedTaskId);
  const staleVerificationMatches = await scanStaleVerificationText(repositoryRoot, selectedTaskId);

  return {
    repositoryRoot,
    git,
    taskBoard,
    selectedTaskId,
    artifacts,
    staleVerificationMatches,
  };
}

function formatSection(lines) {
  return lines.length > 0 ? lines : ['(empty)'];
}

export function renderLifecycleStatus(status) {
  const lines = [];

  lines.push('Forge Lifecycle Status');
  lines.push('');
  lines.push(`Repository: ${status.repositoryRoot}`);
  lines.push(`Branch: ${status.git.branch}`);
  lines.push(`Working tree: ${status.git.clean ? 'clean' : 'dirty'}`);
  lines.push('');

  lines.push('Git status:');
  for (const line of status.git.status.length > 0 ? status.git.status : ['(clean)']) {
    lines.push(`  ${line}`);
  }
  lines.push('');

  lines.push('Task board:');
  lines.push('  Now:');
  for (const line of formatSection(status.taskBoard.board.now)) {
    lines.push(`    ${line}`);
  }
  lines.push('  Next:');
  for (const line of formatSection(status.taskBoard.board.next)) {
    lines.push(`    ${line}`);
  }
  lines.push('  Later:');
  for (const line of formatSection(status.taskBoard.board.later)) {
    lines.push(`    ${line}`);
  }
  lines.push('');

  lines.push(`Active task: ${status.taskBoard.activeTaskId ?? '(none)'}`);
  lines.push(`Selected task: ${status.selectedTaskId ?? '(none)'}`);
  lines.push('');

  lines.push('Artifacts:');
  if (!status.selectedTaskId) {
    lines.push('  No selected task.');
  } else {
    for (const artifact of status.artifacts) {
      lines.push(`  ${artifact.present ? 'present' : 'missing'} ${artifact.file}`);
    }
  }
  lines.push('');

  lines.push('Stale verification text:');
  if (!status.selectedTaskId) {
    lines.push('  No selected task.');
  } else if (status.staleVerificationMatches.length === 0) {
    lines.push('  none found');
  } else {
    for (const match of status.staleVerificationMatches) {
      lines.push(`  ${match.file}:${match.line} ${match.pattern}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function parseArgs(argv) {
  const options = {
    repositoryRoot: defaultRepositoryRoot,
    taskId: null,
  };

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
  const status = await collectLifecycleStatus(options);
  process.stdout.write(renderLifecycleStatus(status));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
