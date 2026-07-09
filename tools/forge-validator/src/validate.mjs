import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseDocument } from 'yaml';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultRepositoryRoot = path.resolve(packageDir, '..', '..');

const projectPath = '.forge/project.yaml';
const workflowPath = '.forge/workflows/feature.yaml';
const taskTemplatePath = '.forge/tasks/task.template.yaml';
const taskDir = '.forge/tasks';
const artifactRoot = '.forge/artifacts';

const requiredProjectDocuments = [
  'product_spec',
  'tasks',
  'decisions',
  'agent_instructions',
];

const requiredProjectCommands = [
  'install',
  'build',
  'typecheck',
  'test',
  'verify',
];

const expectedStatuses = [
  'proposed',
  'approved',
  'in_progress',
  'blocked',
  'ready_for_pr',
  'completed',
];

const expectedStages = [
  'plan',
  'approve_plan',
  'build',
  'test',
  'review',
  'approve_delivery',
];

const expectedStageActors = {
  plan: 'agent',
  approve_plan: 'human',
  build: 'agent',
  test: 'agent',
  review: 'agent',
  approve_delivery: 'human',
};

const expectedStageRoleContracts = {
  plan: '.forge/roles/planner.md',
  build: '.forge/roles/builder.md',
  test: '.forge/roles/tester.md',
  review: '.forge/roles/reviewer.md',
};

const expectedTaskKeys = [
  'schema_version',
  'id',
  'title',
  'status',
  'workflow',
  'goal',
  'in_scope',
  'out_of_scope',
  'allowed_files',
  'protected_files',
  'acceptance_criteria',
  'required_checks',
];

const expectedArtifactKeys = [
  'schema_version',
  'task_id',
  'artifact_type',
  'attempt',
  'producing_role',
  'outcome',
  'input_artifacts',
];

const artifactDefinitionsBySlug = {
  plan: {
    type: 'plan',
    role: 'planner',
    outcomes: ['READY_FOR_APPROVAL', 'BLOCKED'],
    requiredInputs: [],
  },
  'build-report': {
    type: 'build_report',
    role: 'builder',
    outcomes: ['READY_FOR_TEST', 'BLOCKED'],
    requiredInputs: ['plan'],
  },
  'test-report': {
    type: 'test_report',
    role: 'tester',
    outcomes: ['PASS', 'FAIL', 'BLOCKED'],
    requiredInputs: ['plan', 'build_report'],
  },
  'review-report': {
    type: 'review_report',
    role: 'reviewer',
    outcomes: ['ACCEPT', 'REJECT', 'BLOCKED'],
    requiredInputs: ['plan', 'build_report', 'test_report'],
  },
};

const requiredArtifactTypesByStatus = {
  proposed: [],
  blocked: [],
  approved: ['plan'],
  in_progress: ['plan'],
  ready_for_pr: ['plan', 'build_report', 'test_report', 'review_report'],
  completed: ['plan', 'build_report', 'test_report', 'review_report'],
};

const legacyCompletedTaskIdsWithoutArtifacts = new Set(['TASK-0001', 'TASK-0002']);

const requiredDeliveryArtifactOutcomesByStatus = {
  ready_for_pr: {
    test_report: 'PASS',
    review_report: 'ACCEPT',
  },
  completed: {
    test_report: 'PASS',
    review_report: 'ACCEPT',
  },
};

const requiredReferencedArtifactOutcomesByType = {
  build_report: {
    plan: 'READY_FOR_APPROVAL',
  },
  test_report: {
    plan: 'READY_FOR_APPROVAL',
    build_report: 'READY_FOR_TEST',
  },
  review_report: {
    plan: 'READY_FOR_APPROVAL',
    build_report: 'READY_FOR_TEST',
    test_report: 'PASS',
  },
};

const requiredPreviousRetryOutcomesByArtifactType = {
  test_report: 'FAIL',
  review_report: 'REJECT',
};

const retryArtifactSlugsByType = {
  test_report: 'test-report',
  review_report: 'review-report',
};

const legacyRetryChainExemptArtifactPaths = new Set([
  '.forge/artifacts/TASK-0004/test-report-002.md',
]);

const remoteStageIds = [
  'push',
  'pr',
  'pull_request',
  'pull-request',
  'merge',
  'publish',
  'deploy',
  'release',
];

const remoteStageTokens = new Set(['push', 'pr', 'merge', 'publish', 'deploy', 'release']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasPathEscape(relativePath) {
  const normalized = path.posix.normalize(relativePath);
  return normalized === '..' || normalized.startsWith('../') || relativePath.split('/').includes('..');
}

function isAbsolutePath(value) {
  return path.isAbsolute(value) || /^[A-Za-z]:[\\/]/.test(value);
}

function validateRepositoryRelativePath(value, label, errors, options = {}) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${label} must be a non-empty repository-relative string.`);
    return false;
  }

  if (value.includes('\\')) {
    errors.push(`${label} must use forward slashes and must not contain backslashes: ${value}`);
    return false;
  }

  if (isAbsolutePath(value)) {
    errors.push(`${label} must not be absolute: ${value}`);
    return false;
  }

  if (hasPathEscape(value)) {
    errors.push(`${label} must not escape the repository through '..': ${value}`);
    return false;
  }

  if (options.exactPath && /[*?\[\]]/.test(value)) {
    errors.push(`${label} must be an exact path and must not use glob syntax: ${value}`);
    return false;
  }

  if (options.exactPath && value.startsWith('!')) {
    errors.push(`${label} must be an exact path and must not use negation syntax: ${value}`);
    return false;
  }

  return true;
}

async function isRegularFile(repositoryRoot, relativePath) {
  try {
    const stat = await fs.stat(path.resolve(repositoryRoot, relativePath));
    return stat.isFile();
  } catch {
    return false;
  }
}

async function parseYamlFile(repositoryRoot, relativePath, errors) {
  const absolutePath = path.resolve(repositoryRoot, relativePath);

  let source;
  try {
    source = await fs.readFile(absolutePath, 'utf8');
  } catch (error) {
    errors.push(`Contract error in ${relativePath}: required file is missing or unreadable (${error.code ?? error.message}).`);
    return null;
  }

  let document;
  try {
    document = parseDocument(source, { prettyErrors: false });
  } catch (error) {
    errors.push(`YAML parse error in ${relativePath}: ${error.message}`);
    return null;
  }

  if (document.errors.length > 0) {
    for (const error of document.errors) {
      errors.push(`YAML parse error in ${relativePath}: ${error.message}`);
    }
    return null;
  }

  return document.toJS();
}

function validateRequiredObject(value, relativePath, errors) {
  if (!isPlainObject(value)) {
    errors.push(`Contract error in ${relativePath}: file must contain a YAML mapping.`);
    return false;
  }
  return true;
}

function compareArray(actual, expected, label, relativePath, errors) {
  if (!Array.isArray(actual)) {
    errors.push(`Contract error in ${relativePath}: ${label} must be an array.`);
    return;
  }

  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    errors.push(`Contract error in ${relativePath}: ${label} must be exactly [${expected.join(', ')}] in that order.`);
  }
}

async function validateProject(repositoryRoot, errors) {
  const project = await parseYamlFile(repositoryRoot, projectPath, errors);
  if (!validateRequiredObject(project, projectPath, errors)) {
    return null;
  }

  for (const key of ['schema_version', 'documents', 'commands']) {
    if (!(key in project)) {
      errors.push(`Contract error in ${projectPath}: missing required key '${key}'.`);
    }
  }

  if (project.schema_version !== 1) {
    errors.push(`Contract error in ${projectPath}: schema_version must be 1.`);
  }

  if (!isPlainObject(project.documents)) {
    errors.push(`Contract error in ${projectPath}: documents must be a mapping.`);
  } else {
    for (const key of requiredProjectDocuments) {
      if (!(key in project.documents)) {
        errors.push(`Contract error in ${projectPath}: documents.${key} is required.`);
        continue;
      }

      const value = project.documents[key];
      const label = `${projectPath}: documents.${key}`;
      if (validateRepositoryRelativePath(value, label, errors) && !(await isRegularFile(repositoryRoot, value))) {
        errors.push(`Contract error in ${projectPath}: documents.${key} does not reference an existing regular file: ${value}`);
      }
    }
  }

  if (!isPlainObject(project.commands)) {
    errors.push(`Contract error in ${projectPath}: commands must be a mapping.`);
  } else {
    for (const key of requiredProjectCommands) {
      if (!(key in project.commands)) {
        errors.push(`Contract error in ${projectPath}: commands.${key} is required.`);
        continue;
      }

      const value = project.commands[key];
      if (value !== null && (typeof value !== 'string' || value.trim() === '')) {
        errors.push(`Contract error in ${projectPath}: commands.${key} must be a non-empty string or null.`);
      }
    }
  }

  return project;
}

function visitNested(value, visitor) {
  if (Array.isArray(value)) {
    for (const item of value) {
      visitNested(item, visitor);
    }
    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    visitor(key, child);
    visitNested(child, visitor);
  }
}

async function validateWorkflow(repositoryRoot, errors) {
  const workflow = await parseYamlFile(repositoryRoot, workflowPath, errors);
  if (!validateRequiredObject(workflow, workflowPath, errors)) {
    return null;
  }

  if (workflow.schema_version !== 1) {
    errors.push(`Contract error in ${workflowPath}: schema_version must be 1.`);
  }

  if (workflow.id !== 'feature') {
    errors.push(`Contract error in ${workflowPath}: id must be 'feature'.`);
  }

  compareArray(workflow.task_statuses, expectedStatuses, 'task_statuses', workflowPath, errors);

  const stages = Array.isArray(workflow.stages) ? workflow.stages : [];
  if (!Array.isArray(workflow.stages)) {
    errors.push(`Contract error in ${workflowPath}: stages must be an array.`);
  }

  const stageIds = stages.map((stage) => (isPlainObject(stage) ? stage.id : undefined));
  compareArray(stageIds, expectedStages, 'stage IDs', workflowPath, errors);

  const stageIdSet = new Set();
  for (const stageId of stageIds) {
    if (stageIdSet.has(stageId)) {
      errors.push(`Contract error in ${workflowPath}: stage id '${stageId}' is duplicated.`);
    }
    stageIdSet.add(stageId);
  }

  const statusSet = new Set(Array.isArray(workflow.task_statuses) ? workflow.task_statuses : []);

  for (const [index, stage] of stages.entries()) {
    if (!isPlainObject(stage)) {
      errors.push(`Contract error in ${workflowPath}: stages[${index}] must be a mapping.`);
      continue;
    }

    const stageLabel = `stage '${stage.id ?? index}'`;
    const expectedActor = expectedStageActors[stage.id];
    if (stage.actor !== expectedActor) {
      errors.push(`Contract error in ${workflowPath}: ${stageLabel} actor must be '${expectedActor}'.`);
    }

    if (typeof stage.id === 'string') {
      const stageId = stage.id.toLowerCase();
      const stageTokens = stageId.split(/[^a-z0-9]+/).filter(Boolean);
      if (remoteStageIds.includes(stageId) || stageTokens.some((token) => remoteStageTokens.has(token))) {
        errors.push(`Contract error in ${workflowPath}: ${stageLabel} appears to define a remote-operation stage.`);
      }
    }

    const expectedRoleContract = expectedStageRoleContracts[stage.id];
    if (expectedRoleContract) {
      if (!('role_contract' in stage)) {
        errors.push(`Contract error in ${workflowPath}: ${stageLabel} must use role_contract ${expectedRoleContract}.`);
      } else if (stage.role_contract !== expectedRoleContract) {
        errors.push(`Contract error in ${workflowPath}: ${stageLabel} role_contract must be ${expectedRoleContract}.`);
      }
    }

    if (expectedActor === 'human' && 'role_contract' in stage) {
      errors.push(`Contract error in ${workflowPath}: human ${stageLabel} must not define a role_contract.`);
    }

    if ('role_contract' in stage) {
      const label = `${workflowPath}: ${stageLabel} role_contract`;
      if (validateRepositoryRelativePath(stage.role_contract, label, errors)) {
        if (!(await isRegularFile(repositoryRoot, stage.role_contract))) {
          errors.push(`Contract error in ${workflowPath}: ${stageLabel} role_contract does not reference an existing regular file: ${stage.role_contract}`);
        }
      }
    }

    if (Array.isArray(stage.allowed_statuses)) {
      for (const status of stage.allowed_statuses) {
        if (!statusSet.has(status)) {
          errors.push(`Contract error in ${workflowPath}: ${stageLabel} references unknown status '${status}'.`);
        }
      }
    }

    visitNested(stage, (key, value) => {
      if (key === 'next' && !stageIdSet.has(value)) {
        errors.push(`Contract error in ${workflowPath}: ${stageLabel} references unknown next stage '${value}'.`);
      }

      if ((key === 'status' || key === 'sets_status') && !statusSet.has(value)) {
        errors.push(`Contract error in ${workflowPath}: ${stageLabel} references unknown status '${value}'.`);
      }

      if ((key === 'status' || key === 'sets_status') && value === 'completed') {
        errors.push(`Contract error in ${workflowPath}: ${stageLabel} must not automatically assign completed.`);
      }

      if (stage.actor === 'agent' && (key === 'status' || key === 'sets_status') && value === 'ready_for_pr') {
        errors.push(`Contract error in ${workflowPath}: agent ${stageLabel} must not assign ready_for_pr.`);
      }
    });
  }

  const approveDelivery = stages.find((stage) => isPlainObject(stage) && stage.id === 'approve_delivery');
  if (approveDelivery?.on_approve?.status !== 'ready_for_pr') {
    errors.push(`Contract error in ${workflowPath}: terminal delivery approval must set status ready_for_pr.`);
  }

  return workflow;
}

async function discoverTaskFiles(repositoryRoot, errors) {
  const directory = path.resolve(repositoryRoot, taskDir);
  let entries;
  try {
    entries = await fs.readdir(directory);
  } catch (error) {
    errors.push(`Contract error in ${taskDir}: task directory is missing or unreadable (${error.code ?? error.message}).`);
    return [taskTemplatePath];
  }

  const activeTaskFiles = entries
    .filter((entry) => entry.startsWith('TASK-') && entry.endsWith('.yaml'))
    .sort()
    .map((entry) => `${taskDir}/${entry}`);

  return [taskTemplatePath, ...activeTaskFiles];
}

function validateTaskKeySet(task, taskPath, errors) {
  const actualKeys = Object.keys(task);
  const expectedKeySet = new Set(expectedTaskKeys);
  const actualKeySet = new Set(actualKeys);
  const missingKeys = expectedTaskKeys.filter((key) => !actualKeySet.has(key));
  const unexpectedKeys = actualKeys.filter((key) => !expectedKeySet.has(key)).sort();

  for (const key of missingKeys) {
    errors.push(`Contract error in ${taskPath}: missing top-level key '${key}'.`);
  }

  for (const key of unexpectedKeys) {
    errors.push(`Contract error in ${taskPath}: unexpected top-level key '${key}'.`);
  }
}

async function getTaskWorkflow(repositoryRoot, taskPath, task, canonicalWorkflow, errors) {
  if (!validateRepositoryRelativePath(task.workflow, `${taskPath}: workflow`, errors)) {
    return null;
  }

  if (!(await isRegularFile(repositoryRoot, task.workflow))) {
    errors.push(`Contract error in ${taskPath}: workflow does not reference an existing regular file: ${task.workflow}`);
    return null;
  }

  const taskWorkflow = task.workflow === workflowPath
    ? canonicalWorkflow
    : await parseYamlFile(repositoryRoot, task.workflow, errors);

  if (!validateRequiredObject(taskWorkflow, task.workflow, errors)) {
    return null;
  }

  if (!Array.isArray(taskWorkflow.task_statuses)) {
    errors.push(`Contract error in ${task.workflow}: task_statuses must be an array.`);
    return null;
  }

  return taskWorkflow;
}

async function validateTask(repositoryRoot, taskPath, workflow, project, errors) {
  const taskErrorCountBefore = errors.length;
  const task = await parseYamlFile(repositoryRoot, taskPath, errors);
  if (!validateRequiredObject(task, taskPath, errors)) {
    return null;
  }

  validateTaskKeySet(task, taskPath, errors);

  if (task.schema_version !== 1) {
    errors.push(`Contract error in ${taskPath}: schema_version must be 1.`);
  }

  const isTemplate = taskPath === taskTemplatePath;
  const filename = path.basename(taskPath);
  const stem = filename.slice(0, -'.yaml'.length);

  if (isTemplate) {
    if (task.id !== 'TASK-XXX') {
      errors.push(`Contract error in ${taskPath}: template id must be TASK-XXX.`);
    }
    if (task.status !== 'proposed') {
      errors.push(`Contract error in ${taskPath}: template status must be proposed.`);
    }
  } else {
    if (!/^TASK-\d+\.yaml$/.test(filename)) {
      errors.push(`Contract error in ${taskPath}: active task filename must match TASK-<number>.yaml.`);
    }
    if (task.id !== stem) {
      errors.push(`Contract error in ${taskPath}: active task id must match filename stem '${stem}'.`);
    }
  }

  for (const key of ['title', 'goal']) {
    if (typeof task[key] !== 'string' || task[key].trim() === '') {
      errors.push(`Contract error in ${taskPath}: ${key} must be a non-empty string.`);
    }
  }

  const taskWorkflow = await getTaskWorkflow(repositoryRoot, taskPath, task, workflow, errors);
  const statuses = new Set(Array.isArray(taskWorkflow?.task_statuses) ? taskWorkflow.task_statuses : []);
  if (!statuses.has(task.status)) {
    errors.push(`Contract error in ${taskPath}: status '${task.status}' is not listed in the referenced workflow task_statuses.`);
  }

  for (const key of ['in_scope', 'out_of_scope', 'allowed_files', 'protected_files', 'required_checks']) {
    if (!Array.isArray(task[key])) {
      errors.push(`Contract error in ${taskPath}: ${key} must be an array.`);
    }
  }

  for (const key of ['allowed_files', 'protected_files']) {
    if (Array.isArray(task[key])) {
      for (const [index, value] of task[key].entries()) {
        validateRepositoryRelativePath(value, `${taskPath}: ${key}[${index}]`, errors, { exactPath: true });
      }
    }
  }

  if (!Array.isArray(task.acceptance_criteria) || task.acceptance_criteria.length === 0) {
    errors.push(`Contract error in ${taskPath}: acceptance_criteria must be a non-empty array.`);
  } else {
    const acceptanceIds = new Set();
    for (const [index, criterion] of task.acceptance_criteria.entries()) {
      if (!isPlainObject(criterion)) {
        errors.push(`Contract error in ${taskPath}: acceptance_criteria[${index}] must be a mapping.`);
        continue;
      }

      for (const key of ['id', 'description']) {
        if (typeof criterion[key] !== 'string' || criterion[key].trim() === '') {
          errors.push(`Contract error in ${taskPath}: acceptance_criteria[${index}].${key} must be a non-empty string.`);
        }
      }

      if (typeof criterion.id === 'string') {
        if (acceptanceIds.has(criterion.id)) {
          errors.push(`Contract error in ${taskPath}: acceptance criterion id '${criterion.id}' is duplicated.`);
        }
        acceptanceIds.add(criterion.id);
      }
    }
  }

  const commandKeys = new Set(Object.keys(isPlainObject(project?.commands) ? project.commands : {}));
  if (Array.isArray(task.required_checks)) {
    for (const [index, check] of task.required_checks.entries()) {
      if (!commandKeys.has(check)) {
        errors.push(`Contract error in ${taskPath}: required_checks[${index}] references unknown project command key '${check}'.`);
      }
    }
  }

  if (!isTemplate && errors.length === taskErrorCountBefore) {
    return {
      id: task.id,
      status: task.status,
      path: taskPath,
    };
  }

  return null;
}

async function validateTasks(repositoryRoot, workflow, project, errors) {
  const taskFiles = await discoverTaskFiles(repositoryRoot, errors);
  const tasksById = new Map();
  for (const taskPath of taskFiles) {
    const taskSummary = await validateTask(repositoryRoot, taskPath, workflow, project, errors);
    if (taskSummary) {
      tasksById.set(taskSummary.id, taskSummary);
    }
  }
  return {
    taskFiles,
    tasksById,
  };
}

function parseArtifactPath(artifactPath) {
  const match = artifactPath.match(/^\.forge\/artifacts\/(TASK-\d+)\/([^/]+)$/);
  if (!match) {
    return null;
  }
  return {
    taskId: match[1],
    filename: match[2],
  };
}

function parseArtifactFilename(filename) {
  const match = filename.match(/^(.+)-([0-9]+)\.md$/);
  if (!match) {
    return null;
  }

  const slug = match[1];
  const attemptText = match[2];
  const definition = artifactDefinitionsBySlug[slug];
  const attempt = Number(attemptText);

  return {
    slug,
    attemptText,
    attempt,
    definition,
  };
}

function validateArtifactFilename(filename, artifactPath, errors) {
  const parsed = parseArtifactFilename(filename);
  if (!parsed) {
    errors.push(`Contract error in ${artifactPath}: artifact filename must match <artifact-slug>-NNN.md.`);
    return null;
  }

  if (!parsed.definition) {
    errors.push(`Contract error in ${artifactPath}: artifact filename uses unsupported slug '${parsed.slug}'.`);
    return null;
  }

  if (!/^\d{3}$/.test(parsed.attemptText)) {
    errors.push(`Contract error in ${artifactPath}: artifact filename attempt suffix must be exactly three digits.`);
    return null;
  }

  if (parsed.attempt < 1) {
    errors.push(`Contract error in ${artifactPath}: artifact filename attempt suffix must be a positive attempt.`);
    return null;
  }

  return parsed;
}

async function discoverArtifactFiles(repositoryRoot, activeTaskFileSet, errors) {
  const directory = path.resolve(repositoryRoot, artifactRoot);
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    errors.push(`Contract error in ${artifactRoot}: artifact directory is unreadable (${error.code ?? error.message}).`);
    return [];
  }

  const artifactFiles = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.name === 'README.md' || entry.name === 'templates') {
      continue;
    }

    const taskArtifactDir = `${artifactRoot}/${entry.name}`;
    if (!entry.isDirectory()) {
      errors.push(`Contract error in ${artifactRoot}: unsupported direct artifact entry '${entry.name}'.`);
      continue;
    }

    if (!/^TASK-\d+$/.test(entry.name)) {
      errors.push(`Contract error in ${artifactRoot}: unsupported artifact task directory '${entry.name}'.`);
      continue;
    }

    const taskPath = `${taskDir}/${entry.name}.yaml`;
    if (!activeTaskFileSet.has(taskPath)) {
      errors.push(`Contract error in ${taskArtifactDir}: artifact task directory has no matching task contract ${taskPath}.`);
    }

    let taskArtifactEntries;
    try {
      taskArtifactEntries = await fs.readdir(path.resolve(repositoryRoot, taskArtifactDir), { withFileTypes: true });
    } catch (error) {
      errors.push(`Contract error in ${taskArtifactDir}: artifact task directory is unreadable (${error.code ?? error.message}).`);
      continue;
    }

    for (const artifactEntry of taskArtifactEntries.sort((left, right) => left.name.localeCompare(right.name))) {
      const artifactPath = `${taskArtifactDir}/${artifactEntry.name}`;
      if (!artifactEntry.isFile()) {
        errors.push(`Contract error in ${artifactPath}: live artifact task directories must contain only direct artifact files.`);
        continue;
      }
      artifactFiles.push(artifactPath);
    }
  }

  return artifactFiles.sort();
}

async function parseArtifactFile(repositoryRoot, artifactPath, errors) {
  let source;
  try {
    source = await fs.readFile(path.resolve(repositoryRoot, artifactPath), 'utf8');
  } catch (error) {
    errors.push(`Contract error in ${artifactPath}: artifact file is missing or unreadable (${error.code ?? error.message}).`);
    return null;
  }

  const lines = source.split(/\r?\n/);
  if (lines[0] !== '---') {
    errors.push(`Contract error in ${artifactPath}: artifact must start with YAML front matter delimiter '---'.`);
    return null;
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line === '---');
  if (closingIndex === -1) {
    errors.push(`Contract error in ${artifactPath}: artifact front matter is missing closing delimiter '---'.`);
    return null;
  }

  const frontMatter = lines.slice(1, closingIndex).join('\n');
  if (frontMatter.trim() === '') {
    errors.push(`Contract error in ${artifactPath}: artifact front matter must not be empty.`);
    return null;
  }

  let document;
  try {
    document = parseDocument(frontMatter, { prettyErrors: false });
  } catch (error) {
    errors.push(`YAML parse error in ${artifactPath} front matter: ${error.message}`);
    return null;
  }

  if (document.errors.length > 0) {
    for (const error of document.errors) {
      errors.push(`YAML parse error in ${artifactPath} front matter: ${error.message}`);
    }
    return null;
  }

  const metadata = document.toJS();
  if (!isPlainObject(metadata)) {
    errors.push(`Contract error in ${artifactPath}: artifact front matter must contain a YAML mapping.`);
    return null;
  }

  return metadata;
}

function validateArtifactKeySet(metadata, artifactPath, errors) {
  const actualKeys = Object.keys(metadata);
  const expectedKeySet = new Set(expectedArtifactKeys);
  const actualKeySet = new Set(actualKeys);
  const missingKeys = expectedArtifactKeys.filter((key) => !actualKeySet.has(key));
  const unexpectedKeys = actualKeys.filter((key) => !expectedKeySet.has(key)).sort();

  for (const key of missingKeys) {
    errors.push(`Contract error in ${artifactPath}: missing artifact metadata key '${key}'.`);
  }

  for (const key of unexpectedKeys) {
    errors.push(`Contract error in ${artifactPath}: unexpected artifact metadata key '${key}'.`);
  }

  return missingKeys.length === 0 && unexpectedKeys.length === 0;
}

function validateArtifactMetadata(metadata, artifactPath, taskId, parsedFilename, errors) {
  const definition = parsedFilename.definition;

  if (metadata.schema_version !== 1) {
    errors.push(`Contract error in ${artifactPath}: schema_version must be 1.`);
  }

  if (metadata.task_id !== taskId) {
    errors.push(`Contract error in ${artifactPath}: task_id must match artifact task directory '${taskId}'.`);
  }

  if (metadata.artifact_type !== definition.type) {
    errors.push(`Contract error in ${artifactPath}: artifact_type must be '${definition.type}' for filename slug '${parsedFilename.slug}'.`);
  }

  if (!Number.isInteger(metadata.attempt)) {
    errors.push(`Contract error in ${artifactPath}: attempt must be an integer.`);
  } else if (metadata.attempt !== parsedFilename.attempt) {
    errors.push(`Contract error in ${artifactPath}: attempt must match filename suffix ${parsedFilename.attempt}.`);
  }

  if (metadata.producing_role !== definition.role) {
    errors.push(`Contract error in ${artifactPath}: producing_role must be '${definition.role}' for artifact_type '${definition.type}'.`);
  }

  if (!definition.outcomes.includes(metadata.outcome)) {
    errors.push(`Contract error in ${artifactPath}: outcome must be one of [${definition.outcomes.join(', ')}].`);
  }

  if (!Array.isArray(metadata.input_artifacts)) {
    errors.push(`Contract error in ${artifactPath}: input_artifacts must be an array.`);
  }
}

async function validateArtifactInputs(repositoryRoot, artifactPath, taskId, parsedFilename, inputArtifacts, artifactFileSet, errors) {
  if (!Array.isArray(inputArtifacts)) {
    return;
  }

  const definition = parsedFilename.definition;
  const seenInputs = new Set();
  const referencedTypes = new Set();

  if (definition.type === 'plan' && inputArtifacts.length !== 0) {
    errors.push(`Contract error in ${artifactPath}: plan artifacts must not declare input_artifacts.`);
  }

  for (const [index, inputPath] of inputArtifacts.entries()) {
    const label = `${artifactPath}: input_artifacts[${index}]`;
    if (typeof inputPath !== 'string') {
      errors.push(`Contract error in ${artifactPath}: input_artifacts[${index}] must be a repository-relative string.`);
      continue;
    }

    const pathIsSafe = validateRepositoryRelativePath(inputPath, label, errors);

    if (seenInputs.has(inputPath)) {
      errors.push(`Contract error in ${artifactPath}: input_artifacts[${index}] duplicates '${inputPath}'.`);
    }
    seenInputs.add(inputPath);

    if (!pathIsSafe) {
      continue;
    }

    if (inputPath === artifactPath) {
      errors.push(`Contract error in ${artifactPath}: input_artifacts[${index}] must not reference the current artifact.`);
    }

    const expectedPrefix = `${artifactRoot}/${taskId}/`;
    if (!inputPath.startsWith(expectedPrefix)) {
      errors.push(`Contract error in ${artifactPath}: input_artifacts[${index}] must reference an artifact in ${expectedPrefix}.`);
    }

    if (!artifactFileSet.has(inputPath)) {
      errors.push(`Contract error in ${artifactPath}: input_artifacts[${index}] does not reference an existing discovered live artifact file: ${inputPath}`);
      continue;
    }

    if (!(await isRegularFile(repositoryRoot, inputPath))) {
      errors.push(`Contract error in ${artifactPath}: input_artifacts[${index}] does not reference an existing regular file: ${inputPath}`);
      continue;
    }

    const inputInfo = parseArtifactPath(inputPath);
    const inputFilename = inputInfo ? parseArtifactFilename(inputInfo.filename) : null;
    if (inputFilename?.definition && /^\d{3}$/.test(inputFilename.attemptText) && inputFilename.attempt >= 1) {
      referencedTypes.add(inputFilename.definition.type);
    }
  }

  for (const requiredType of definition.requiredInputs) {
    if (!referencedTypes.has(requiredType)) {
      errors.push(`Contract error in ${artifactPath}: ${definition.type} artifacts must reference at least one ${requiredType} artifact.`);
    }
  }
}

async function validateArtifact(repositoryRoot, artifactPath, artifactFileSet, errors) {
  const artifactErrorCountBefore = errors.length;
  const pathInfo = parseArtifactPath(artifactPath);
  if (!pathInfo) {
    errors.push(`Contract error in ${artifactPath}: artifact path must match .forge/artifacts/TASK-<number>/<artifact-slug>-NNN.md.`);
    return null;
  }

  const parsedFilename = validateArtifactFilename(pathInfo.filename, artifactPath, errors);
  if (!parsedFilename) {
    return null;
  }

  const metadata = await parseArtifactFile(repositoryRoot, artifactPath, errors);
  if (!metadata) {
    return {
      taskId: pathInfo.taskId,
      artifactType: parsedFilename.definition.type,
      attempt: parsedFilename.attempt,
      inputArtifacts: [],
      path: artifactPath,
      structurallyValid: false,
    };
  }

  validateArtifactKeySet(metadata, artifactPath, errors);
  validateArtifactMetadata(metadata, artifactPath, pathInfo.taskId, parsedFilename, errors);
  await validateArtifactInputs(
    repositoryRoot,
    artifactPath,
    pathInfo.taskId,
    parsedFilename,
    metadata.input_artifacts,
    artifactFileSet,
    errors,
  );

  return {
    taskId: pathInfo.taskId,
    artifactType: parsedFilename.definition.type,
    attempt: parsedFilename.attempt,
    inputArtifacts: Array.isArray(metadata.input_artifacts) ? metadata.input_artifacts : [],
    outcome: metadata.outcome,
    path: artifactPath,
    structurallyValid: errors.length === artifactErrorCountBefore,
  };
}

async function validateArtifacts(repositoryRoot, taskFiles, errors) {
  const activeTaskFileSet = new Set(taskFiles.filter((taskPath) => taskPath !== taskTemplatePath));
  const artifactFiles = await discoverArtifactFiles(repositoryRoot, activeTaskFileSet, errors);
  const artifactFileSet = new Set(artifactFiles);
  const artifactsByPath = new Map();
  const latestArtifactsByTaskIdAndType = new Map();

  for (const artifactPath of artifactFiles) {
    const artifactSummary = await validateArtifact(repositoryRoot, artifactPath, artifactFileSet, errors);
    if (!artifactSummary) {
      continue;
    }

    artifactsByPath.set(artifactSummary.path, artifactSummary);

    if (!latestArtifactsByTaskIdAndType.has(artifactSummary.taskId)) {
      latestArtifactsByTaskIdAndType.set(artifactSummary.taskId, new Map());
    }

    const latestTypes = latestArtifactsByTaskIdAndType.get(artifactSummary.taskId);
    const currentLatest = latestTypes.get(artifactSummary.artifactType);
    if (!currentLatest || artifactSummary.attempt > currentLatest.attempt) {
      latestTypes.set(artifactSummary.artifactType, artifactSummary);
    }
  }

  return {
    artifactsByPath,
    latestArtifactsByTaskIdAndType,
  };
}

function validateReferencedArtifactOutcomeChains(tasksById, artifactsByPath, errors) {
  const artifacts = [...artifactsByPath.values()].sort((left, right) => left.path.localeCompare(right.path));

  for (const artifact of artifacts) {
    if (!artifact.structurallyValid || !tasksById.has(artifact.taskId)) {
      continue;
    }

    const requiredOutcomes = requiredReferencedArtifactOutcomesByType[artifact.artifactType];
    if (!requiredOutcomes) {
      continue;
    }

    const inputArtifacts = [...artifact.inputArtifacts].sort();
    for (const inputPath of inputArtifacts) {
      const referencedArtifact = artifactsByPath.get(inputPath);
      if (!referencedArtifact?.structurallyValid) {
        continue;
      }

      const expectedOutcome = requiredOutcomes[referencedArtifact.artifactType];
      if (!expectedOutcome) {
        continue;
      }

      if (referencedArtifact.outcome !== expectedOutcome) {
        errors.push(`Contract error in ${artifact.path}: ${artifact.artifactType} input artifact ${referencedArtifact.path} has outcome '${referencedArtifact.outcome}' but must have outcome '${expectedOutcome}' to satisfy referenced outcome-chain validation.`);
      }
    }
  }
}

function retryArtifactPath(taskId, artifactType, attempt) {
  const slug = retryArtifactSlugsByType[artifactType];
  return `${artifactRoot}/${taskId}/${slug}-${String(attempt).padStart(3, '0')}.md`;
}

function validateArtifactRetryChains(tasksById, artifactsByPath, errors) {
  const artifacts = [...artifactsByPath.values()].sort((left, right) => left.path.localeCompare(right.path));

  for (const artifact of artifacts) {
    if (
      !artifact.structurallyValid
      || !tasksById.has(artifact.taskId)
      || legacyRetryChainExemptArtifactPaths.has(artifact.path)
    ) {
      continue;
    }

    const expectedPreviousOutcome = requiredPreviousRetryOutcomesByArtifactType[artifact.artifactType];
    if (!expectedPreviousOutcome || artifact.attempt === 1) {
      continue;
    }

    const previousAttempt = artifact.attempt - 1;
    const previousArtifactPath = retryArtifactPath(artifact.taskId, artifact.artifactType, previousAttempt);
    const previousArtifact = artifactsByPath.get(previousArtifactPath);
    if (!previousArtifact) {
      errors.push(`Contract error in ${artifact.path}: ${artifact.artifactType} attempt ${artifact.attempt} requires previous ${artifact.artifactType} attempt ${previousAttempt} at ${previousArtifactPath} with outcome '${expectedPreviousOutcome}' for retry-chain validation.`);
      continue;
    }

    if (!previousArtifact.structurallyValid) {
      continue;
    }

    if (previousArtifact.outcome !== expectedPreviousOutcome) {
      errors.push(`Contract error in ${artifact.path}: ${artifact.artifactType} attempt ${artifact.attempt} requires previous ${artifact.artifactType} attempt ${previousAttempt} at ${previousArtifact.path} to have outcome '${expectedPreviousOutcome}' for retry-chain validation, but found outcome '${previousArtifact.outcome}'.`);
    }
  }
}

function validateArtifactPresenceByTaskStatus(tasksById, latestArtifactsByTaskIdAndType, errors) {
  const tasks = [...tasksById.values()].sort((left, right) => left.id.localeCompare(right.id));

  for (const task of tasks) {
    if (task.status === 'completed' && legacyCompletedTaskIdsWithoutArtifacts.has(task.id)) {
      continue;
    }

    const requiredArtifactTypes = requiredArtifactTypesByStatus[task.status] ?? [];
    const latestArtifactTypes = latestArtifactsByTaskIdAndType.get(task.id) ?? new Map();

    for (const artifactType of requiredArtifactTypes) {
      const latestArtifact = latestArtifactTypes.get(artifactType);
      if (!latestArtifact) {
        errors.push(`Contract error in ${task.path}: task ${task.id} has status '${task.status}' and requires at least one structurally valid ${artifactType} artifact.`);
      } else if (!latestArtifact.structurallyValid) {
        errors.push(`Contract error in ${task.path}: task ${task.id} has status '${task.status}' and latest ${artifactType} artifact attempt ${latestArtifact.attempt} at ${latestArtifact.path} must be structurally valid to satisfy presence.`);
      }
    }
  }
}

function validateDeliveryArtifactOutcomes(tasksById, latestArtifactsByTaskIdAndType, errors) {
  const tasks = [...tasksById.values()].sort((left, right) => left.id.localeCompare(right.id));

  for (const task of tasks) {
    if (task.status === 'completed' && legacyCompletedTaskIdsWithoutArtifacts.has(task.id)) {
      continue;
    }

    const requiredOutcomes = requiredDeliveryArtifactOutcomesByStatus[task.status];
    if (!requiredOutcomes) {
      continue;
    }

    const latestArtifactTypes = latestArtifactsByTaskIdAndType.get(task.id) ?? new Map();
    for (const [artifactType, expectedOutcome] of Object.entries(requiredOutcomes)) {
      const latestArtifact = latestArtifactTypes.get(artifactType);
      if (!latestArtifact?.structurallyValid) {
        continue;
      }

      if (latestArtifact.outcome !== expectedOutcome) {
        errors.push(`Contract error in ${task.path}: task ${task.id} has status '${task.status}' and latest ${artifactType} artifact attempt ${latestArtifact.attempt} at ${latestArtifact.path} has outcome '${latestArtifact.outcome}' but must have outcome '${expectedOutcome}'.`);
      }
    }
  }
}

export async function validateRepository(repositoryRoot = defaultRepositoryRoot) {
  const resolvedRoot = path.resolve(repositoryRoot);
  const errors = [];

  const project = await validateProject(resolvedRoot, errors);
  const workflow = await validateWorkflow(resolvedRoot, errors);
  const { taskFiles, tasksById } = await validateTasks(resolvedRoot, workflow, project, errors);
  const { artifactsByPath, latestArtifactsByTaskIdAndType } = await validateArtifacts(resolvedRoot, taskFiles, errors);
  validateReferencedArtifactOutcomeChains(tasksById, artifactsByPath, errors);
  validateArtifactRetryChains(tasksById, artifactsByPath, errors);
  validateArtifactPresenceByTaskStatus(tasksById, latestArtifactsByTaskIdAndType, errors);
  validateDeliveryArtifactOutcomes(tasksById, latestArtifactsByTaskIdAndType, errors);

  return {
    ok: errors.length === 0,
    errors: [...errors].sort(),
  };
}

export async function runCli(argv = process.argv) {
  const repositoryRoot = argv[2] ? path.resolve(argv[2]) : defaultRepositoryRoot;
  const result = await validateRepository(repositoryRoot);

  if (result.ok) {
    console.log('Forge contract validation passed.');
    return 0;
  }

  console.error(`Forge contract validation failed with ${result.errors.length} error(s):`);
  for (const error of result.errors) {
    console.error(`- ${error}`);
  }
  return 1;
}

function isDirectExecution() {
  if (!process.argv[1]) {
    return false;
  }
  return import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

if (isDirectExecution()) {
  process.exitCode = await runCli(process.argv);
}
