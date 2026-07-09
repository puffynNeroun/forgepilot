import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultRepositoryRoot = path.resolve(packageDir, '../..');

export const artifactTypes = {
  plan: {
    fileName: 'plan-001.md',
    artifactType: 'plan',
    producingRole: 'planner',
    outcome: 'READY_FOR_APPROVAL',
    inputArtifacts: [],
    title: 'Plan',
  },
  build_report: {
    fileName: 'build-report-001.md',
    artifactType: 'build_report',
    producingRole: 'builder',
    outcome: 'READY_FOR_TEST',
    inputArtifacts: ['plan-001.md'],
    title: 'Build Report',
  },
  test_report: {
    fileName: 'test-report-001.md',
    artifactType: 'test_report',
    producingRole: 'tester',
    outcome: 'PASS',
    inputArtifacts: ['plan-001.md', 'build-report-001.md'],
    title: 'Test Report',
  },
  review_report: {
    fileName: 'review-report-001.md',
    artifactType: 'review_report',
    producingRole: 'reviewer',
    outcome: 'ACCEPT',
    inputArtifacts: ['plan-001.md', 'build-report-001.md', 'test-report-001.md'],
    title: 'Review Report',
  },
};

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    repositoryRoot: defaultRepositoryRoot,
    taskId: null,
    type: null,
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

    if (arg === '--type') {
      args.type = readValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg.startsWith('--type=')) {
      args.type = arg.slice('--type='.length);
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

export function validateArtifactType(type) {
  if (!Object.hasOwn(artifactTypes, type || '')) {
    throw new Error(`Artifact type must be one of: ${Object.keys(artifactTypes).join(', ')}.`);
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

  if (!idMatch) {
    throw new Error('Task contract is missing id.');
  }

  if (!titleMatch) {
    throw new Error('Task contract is missing title.');
  }

  return {
    id: parseScalar(idMatch[1]),
    title: parseScalar(titleMatch[1]),
  };
}

export function renderArtifactReport({ taskId, type }) {
  validateTaskId(taskId);
  validateArtifactType(type);

  const config = artifactTypes[type];
  const inputArtifacts = config.inputArtifacts.map(
    (fileName) => `.forge/artifacts/${taskId}/${fileName}`,
  );

  const frontmatter = [
    '---',
    'schema_version: 1',
    `task_id: ${taskId}`,
    `artifact_type: ${config.artifactType}`,
    'attempt: 1',
    `producing_role: ${config.producingRole}`,
    `outcome: ${config.outcome}`,
    'input_artifacts:',
  ];

  if (inputArtifacts.length === 0) {
    frontmatter.push('  []');
  } else {
    for (const artifactPath of inputArtifacts) {
      frontmatter.push(`  - ${artifactPath}`);
    }
  }

  frontmatter.push('---');

  return [
    ...frontmatter,
    '',
    `# ${config.title}`,
    '',
    '## Summary',
    '',
    `Scaffolded ${config.title.toLowerCase()} for ${taskId}.`,
    '',
    '## Details',
    '',
    'Replace this section with task-specific evidence before committing final work.',
    '',
    '## Outcome',
    '',
    config.outcome,
    '',
  ].join('\n');
}

export async function scaffoldArtifact({
  repositoryRoot = defaultRepositoryRoot,
  taskId,
  type,
} = {}) {
  validateTaskId(taskId);
  validateArtifactType(type);

  const config = artifactTypes[type];
  const taskPath = path.join(repositoryRoot, '.forge', 'tasks', `${taskId}.yaml`);
  const artifactDir = path.join(repositoryRoot, '.forge', 'artifacts', taskId);
  const artifactPath = path.join(artifactDir, config.fileName);

  let contractText;

  try {
    contractText = await fs.readFile(taskPath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      throw new Error(`Task contract does not exist: ${path.relative(repositoryRoot, taskPath)}`);
    }

    throw error;
  }

  const task = parseTaskContract(contractText);

  if (task.id !== taskId) {
    throw new Error(`Task contract id mismatch: expected ${taskId}, found ${task.id}.`);
  }

  try {
    await fs.stat(artifactPath);
    throw new Error(`Artifact already exists: ${path.relative(repositoryRoot, artifactPath)}`);
  } catch (error) {
    if (!error || error.code !== 'ENOENT') {
      throw error;
    }
  }

  await fs.mkdir(artifactDir, { recursive: true });

  const report = renderArtifactReport({ taskId, type });
  await fs.writeFile(artifactPath, report, 'utf8');

  return {
    taskId,
    taskTitle: task.title,
    type,
    artifactPath: path.relative(repositoryRoot, artifactPath),
  };
}

export function renderScaffoldResult(result) {
  return [
    'Forge artifact scaffold created.',
    '',
    `Task: ${result.taskId}`,
    `Title: ${result.taskTitle}`,
    `Type: ${result.type}`,
    `Artifact: ${result.artifactPath}`,
  ].join('\n');
}

export async function main() {
  const args = parseArgs();
  const result = await scaffoldArtifact(args);
  console.log(renderScaffoldResult(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
