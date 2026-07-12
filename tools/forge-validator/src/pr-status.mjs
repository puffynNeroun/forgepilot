#!/usr/bin/env node

import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { collectLifecycleStatus } from './status.mjs';

const execFileAsync = promisify(execFile);

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultRepositoryRoot = path.resolve(packageDir, '..', '..');

function normalizeGhState(value) {
  return String(value ?? '').trim().toUpperCase();
}

function parseJsonArray(stdout) {
  const text = String(stdout ?? '').trim();

  if (!text) {
    return [];
  }

  const parsed = JSON.parse(text);

  return Array.isArray(parsed) ? parsed : [];
}

async function defaultRunGh(repositoryRoot, args) {
  return execFileAsync('gh', args, {
    cwd: repositoryRoot,
    maxBuffer: 1024 * 1024,
  });
}

export function completionBranchForTask(taskId) {
  return `chore/complete-${taskId}`;
}

export function taskIdFromCompletionBranch(branch) {
  const match = String(branch ?? '').match(/^chore\/complete-(TASK-\d{4})$/);

  return match ? match[1] : null;
}

export function isCompletionBranch(branch) {
  return taskIdFromCompletionBranch(branch) !== null;
}

export async function readTaskContractStatus(repositoryRoot, taskId) {
  if (!taskId) {
    return null;
  }

  try {
    const contractPath = path.join(repositoryRoot, '.forge', 'tasks', `${taskId}.yaml`);
    const content = await fs.readFile(contractPath, 'utf8');
    const match = content.match(/^status:\s*([a-z_]+)\s*$/m);

    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export function extractTaskStatusFromLifecycleStatus(status) {
  if (status.taskStatus) {
    return status.taskStatus;
  }

  const taskId = status.taskBoard?.activeTaskId;

  if (!taskId) {
    return null;
  }

  const nowLine = status.taskBoard?.board?.now?.find((line) => line.includes(`\`${taskId}\``)) ?? '';
  const match = nowLine.match(/\(`?([a-z_]+)`?\)/);

  return match ? match[1] : null;
}

export function summarizeChecks(checks) {
  const summary = {
    status: 'none',
    total: 0,
    passing: 0,
    failing: 0,
    pending: 0,
    skipped: 0,
  };

  for (const check of checks ?? []) {
    summary.total += 1;

    const normalized = [
      check.bucket,
      check.conclusion,
      check.state,
    ].filter(Boolean).join(' ').toLowerCase();

    if (
      normalized.includes('fail')
      || normalized.includes('failure')
      || normalized.includes('timed_out')
      || normalized.includes('action_required')
    ) {
      summary.failing += 1;
    } else if (
      normalized.includes('pending')
      || normalized.includes('queued')
      || normalized.includes('in_progress')
      || normalized.includes('requested')
      || normalized.includes('waiting')
    ) {
      summary.pending += 1;
    } else if (
      normalized.includes('skip')
      || normalized.includes('cancel')
    ) {
      summary.skipped += 1;
    } else if (
      normalized.includes('pass')
      || normalized.includes('success')
      || normalized.includes('completed')
    ) {
      summary.passing += 1;
    } else {
      summary.pending += 1;
    }
  }

  if (summary.failing > 0) {
    summary.status = 'failing';
  } else if (summary.pending > 0) {
    summary.status = 'pending';
  } else if (summary.total > 0) {
    summary.status = 'passing';
  }

  return summary;
}

export function notApplicablePrStatus(kind, headBranch = null) {
  return {
    kind,
    headBranch,
    lookupState: 'not_applicable',
    pr: null,
    checks: {
      status: 'not_applicable',
      total: 0,
      passing: 0,
      failing: 0,
      pending: 0,
      skipped: 0,
    },
  };
}

export async function findPrByHeadBranch(repositoryRoot, headBranch, runGh = defaultRunGh) {
  if (!headBranch) {
    return {
      lookupState: 'not_applicable',
      pr: null,
    };
  }

  try {
    const result = await runGh(repositoryRoot, [
      'pr',
      'list',
      '--state',
      'all',
      '--head',
      headBranch,
      '--json',
      'number,title,url,state,isDraft,headRefName,baseRefName,mergeable,reviewDecision',
      '--limit',
      '20',
    ]);

    const prs = parseJsonArray(result.stdout)
      .sort((left, right) => Number(right.number ?? 0) - Number(left.number ?? 0));

    return {
      lookupState: prs.length > 0 ? 'resolved' : 'missing',
      pr: prs[0] ?? null,
    };
  } catch (error) {
    return {
      lookupState: 'unknown',
      pr: null,
      error: error.message,
    };
  }
}

export async function readPrChecks(repositoryRoot, pr, runGh = defaultRunGh) {
  if (!pr?.number) {
    return {
      status: 'not_applicable',
      total: 0,
      passing: 0,
      failing: 0,
      pending: 0,
      skipped: 0,
    };
  }

  try {
    const result = await runGh(repositoryRoot, [
      'pr',
      'checks',
      String(pr.number),
      '--json',
      'name,state,bucket,link',
    ]);

    return summarizeChecks(parseJsonArray(result.stdout));
  } catch (error) {
    return {
      status: 'unknown',
      total: 0,
      passing: 0,
      failing: 0,
      pending: 0,
      skipped: 0,
      error: error.message,
    };
  }
}

export async function resolvePrStatus(repositoryRoot, kind, headBranch, runGh = defaultRunGh) {
  const lookup = await findPrByHeadBranch(repositoryRoot, headBranch, runGh);
  const checks = await readPrChecks(repositoryRoot, lookup.pr, runGh);

  return {
    kind,
    headBranch,
    ...lookup,
    checks,
  };
}

function commandForPrList(headBranch) {
  return headBranch ? `gh pr list --state all --head ${headBranch}` : 'gh pr list --state all';
}

function computeCompletionBranchNextAction(taskId, completionPr, branch) {
  const targetLabel = 'completion PR';
  const target = completionPr;

  if (!target || target.lookupState === 'not_applicable') {
    return {
      action: `Inspect ${targetLabel} state manually.`,
      suggestedCommand: `gh pr list --state all --head ${branch}`,
    };
  }

  if (target.lookupState === 'unknown') {
    return {
      action: `Inspect ${targetLabel} state manually because GitHub PR data is unavailable.`,
      suggestedCommand: commandForPrList(target.headBranch ?? branch),
    };
  }

  if (!target.pr) {
    return {
      action: `Inspect or create completion PR for ${taskId}.`,
      suggestedCommand: `gh pr list --state all --head ${branch}`,
    };
  }

  const prNumber = target.pr.number;
  const prState = normalizeGhState(target.pr.state);

  if (prState === 'MERGED') {
    return {
      action: `Run post-task check for ${taskId}.`,
      suggestedCommand: `forge task check -- --id ${taskId}`,
    };
  }

  if (prState !== 'OPEN') {
    return {
      action: `Inspect completion PR #${prNumber}; it is not open.`,
      suggestedCommand: `gh pr view ${prNumber}`,
    };
  }

  if (target.checks.status === 'pending') {
    return {
      action: `Wait for completion PR #${prNumber} checks.`,
      suggestedCommand: `forge pr watch -- --pr ${prNumber}`,
    };
  }

  if (target.checks.status === 'failing') {
    return {
      action: `Inspect failing checks on completion PR #${prNumber}.`,
      suggestedCommand: `gh pr checks ${prNumber}`,
    };
  }

  if (target.checks.status === 'unknown') {
    return {
      action: `Inspect checks on completion PR #${prNumber}; check data is unavailable.`,
      suggestedCommand: `forge pr watch -- --pr ${prNumber}`,
    };
  }

  if (normalizeGhState(target.pr.mergeable) !== 'MERGEABLE') {
    return {
      action: `Inspect mergeability for completion PR #${prNumber}.`,
      suggestedCommand: `gh pr view ${prNumber}`,
    };
  }

  return {
    action: `Merge completion PR #${prNumber} for ${taskId}.`,
    suggestedCommand: `forge pr merge-completion -- --pr ${prNumber} --id ${taskId} --branch ${branch}`,
  };
}

export function computePrStatusNextAction(status) {
  const branch = status.lifecycleStatus.git.branch;
  const completionBranchTaskId = status.completionBranchTaskId ?? taskIdFromCompletionBranch(branch);
  const onCompletionBranch = Boolean(completionBranchTaskId);
  const taskId = status.taskId ?? completionBranchTaskId;
  const taskStatus = status.taskStatus;

  if (onCompletionBranch) {
    if (!status.lifecycleStatus.git.clean) {
      return {
        action: 'Review or clean local changes before remote PR actions.',
        suggestedCommand: 'git status --short --branch',
      };
    }

    return computeCompletionBranchNextAction(taskId, status.completionPr, branch);
  }

  if (!taskId) {
    return {
      action: 'Define the next task.',
      suggestedCommand: 'forge task new -- --id TASK-XXXX --title "Task title"',
    };
  }

  if (!status.lifecycleStatus.git.clean) {
    return {
      action: 'Review or clean local changes before remote PR actions.',
      suggestedCommand: 'git status --short --branch',
    };
  }

  if (taskStatus !== 'ready_for_pr') {
    return {
      action: `Follow forge next for ${taskId}.`,
      suggestedCommand: 'forge next',
    };
  }

  const isMain = branch === 'main';
  const target = isMain ? status.completionPr : status.implementationPr;
  const targetLabel = isMain ? 'completion PR' : 'implementation PR';

  if (!target || target.lookupState === 'not_applicable') {
    return {
      action: `Inspect ${targetLabel} state manually.`,
      suggestedCommand: 'gh pr list --state all',
    };
  }

  if (target.lookupState === 'unknown') {
    return {
      action: `Inspect ${targetLabel} state manually because GitHub PR data is unavailable.`,
      suggestedCommand: commandForPrList(target.headBranch),
    };
  }

  if (!target.pr) {
    if (isMain) {
      return {
        action: `Create completion PR for ${taskId}.`,
        suggestedCommand: `forge pr create-completion -- --id ${taskId} --branch ${completionBranchForTask(taskId)}`,
      };
    }

    return {
      action: `Create implementation PR for ${taskId}.`,
      suggestedCommand: `forge pr create-implementation -- --id ${taskId} --title "${taskId}: Implementation"`,
    };
  }

  const prNumber = target.pr.number;
  const prState = normalizeGhState(target.pr.state);

  if (prState === 'MERGED') {
    if (isMain) {
      return {
        action: `Run post-task check for ${taskId}.`,
        suggestedCommand: `forge task check -- --id ${taskId}`,
      };
    }

    return {
      action: `Switch to main and continue completion flow for ${taskId}.`,
      suggestedCommand: 'git switch main && git pull --ff-only origin main && forge next',
    };
  }

  if (prState !== 'OPEN') {
    return {
      action: `Inspect ${targetLabel} #${prNumber}; it is not open.`,
      suggestedCommand: `gh pr view ${prNumber}`,
    };
  }

  if (target.checks.status === 'pending') {
    return {
      action: `Wait for ${targetLabel} #${prNumber} checks.`,
      suggestedCommand: `forge pr watch -- --pr ${prNumber}`,
    };
  }

  if (target.checks.status === 'failing') {
    return {
      action: `Inspect failing checks on ${targetLabel} #${prNumber}.`,
      suggestedCommand: `gh pr checks ${prNumber}`,
    };
  }

  if (target.checks.status === 'unknown') {
    return {
      action: `Inspect checks on ${targetLabel} #${prNumber}; check data is unavailable.`,
      suggestedCommand: `forge pr watch -- --pr ${prNumber}`,
    };
  }

  if (normalizeGhState(target.pr.mergeable) !== 'MERGEABLE') {
    return {
      action: `Inspect mergeability for ${targetLabel} #${prNumber}.`,
      suggestedCommand: `gh pr view ${prNumber}`,
    };
  }

  if (isMain) {
    return {
      action: `Merge completion PR #${prNumber} for ${taskId}.`,
      suggestedCommand: `forge pr merge-completion -- --pr ${prNumber} --id ${taskId} --branch ${completionBranchForTask(taskId)}`,
    };
  }

  return {
    action: `Merge implementation PR #${prNumber} for ${taskId}.`,
    suggestedCommand: `forge pr merge-implementation -- --pr ${prNumber} --id ${taskId} --branch ${target.headBranch}`,
  };
}

function formatChecks(checks) {
  if (!checks || checks.status === 'not_applicable') {
    return 'not applicable';
  }

  if (checks.status === 'unknown') {
    return `unknown (${checks.error ?? 'check data unavailable'})`;
  }

  if (checks.status === 'none') {
    return 'none';
  }

  return `${checks.status} (${checks.passing} passing, ${checks.failing} failing, ${checks.pending} pending, ${checks.skipped} skipped)`;
}

function renderPrSection(lines, label, prStatus) {
  lines.push(`${label}:`);
  lines.push(`- Head branch: ${prStatus.headBranch ?? '(not applicable)'}`);

  if (prStatus.lookupState === 'unknown') {
    lines.push(`- State: unknown (${prStatus.error ?? 'GitHub PR data unavailable'})`);
    lines.push('');
    return;
  }

  if (!prStatus.pr) {
    lines.push(`- State: ${prStatus.lookupState === 'missing' ? 'missing' : 'not applicable'}`);
    lines.push('');
    return;
  }

  lines.push(`- State: ${String(prStatus.pr.state ?? 'unknown').toLowerCase()}`);
  lines.push(`- PR: #${prStatus.pr.number} ${prStatus.pr.title ?? ''}`.trim());
  lines.push(`- URL: ${prStatus.pr.url ?? '(unknown)'}`);
  lines.push(`- Base: ${prStatus.pr.baseRefName ?? '(unknown)'}`);
  lines.push(`- Mergeable: ${prStatus.pr.mergeable ?? '(unknown)'}`);
  lines.push(`- Checks: ${formatChecks(prStatus.checks)}`);
  lines.push('');
}

export function renderPrStatus(status) {
  const nextAction = status.nextAction ?? computePrStatusNextAction(status);
  const lines = [];

  lines.push('Forge PR Status');
  lines.push('');
  lines.push('Current state:');
  lines.push(`- Branch: ${status.lifecycleStatus.git.branch}`);
  lines.push(`- Working tree: ${status.lifecycleStatus.git.clean ? 'clean' : 'dirty'}`);
  lines.push(`- Active task: ${status.activeTaskId ?? status.lifecycleStatus.taskBoard?.activeTaskId ?? 'none'}`);
  lines.push(`- Workflow task: ${status.taskId ?? 'none'}`);
  lines.push(`- Task status: ${status.taskStatus ?? 'none'}`);
  lines.push('');

  renderPrSection(lines, 'Implementation PR', status.implementationPr);
  renderPrSection(lines, 'Completion PR', status.completionPr);

  lines.push('Next recommended action:');
  lines.push(`- ${nextAction.action}`);
  lines.push('');
  lines.push('Suggested command:');
  lines.push(nextAction.suggestedCommand);

  return `${lines.join('\n')}\n`;
}

export async function collectPrStatus(options = {}) {
  const repositoryRoot = path.resolve(options.repositoryRoot ?? defaultRepositoryRoot);
  const lifecycleStatus = options.lifecycleStatus ?? await collectLifecycleStatus({
    repositoryRoot,
    runGit: options.runGit,
  });

  const activeTaskId = lifecycleStatus.taskBoard.activeTaskId;
  const branch = lifecycleStatus.git.branch;
  const completionBranchTaskId = taskIdFromCompletionBranch(branch);
  const taskId = activeTaskId ?? completionBranchTaskId;
  let taskStatus = extractTaskStatusFromLifecycleStatus(lifecycleStatus);

  if (!taskStatus && completionBranchTaskId) {
    taskStatus = await readTaskContractStatus(repositoryRoot, completionBranchTaskId) ?? 'completed';
  }

  const runGh = options.runGh ?? defaultRunGh;

  let implementationPr = notApplicablePrStatus('implementation');
  let completionPr = notApplicablePrStatus('completion', taskId ? completionBranchForTask(taskId) : null);

  if (completionBranchTaskId) {
    completionPr = await resolvePrStatus(repositoryRoot, 'completion', branch, runGh);
  } else if (taskId && taskStatus === 'ready_for_pr') {
    if (lifecycleStatus.git.branch !== 'main') {
      implementationPr = await resolvePrStatus(repositoryRoot, 'implementation', lifecycleStatus.git.branch, runGh);
    }

    completionPr = await resolvePrStatus(repositoryRoot, 'completion', completionBranchForTask(taskId), runGh);
  }

  const status = {
    repositoryRoot,
    lifecycleStatus,
    activeTaskId,
    completionBranchTaskId,
    taskId,
    taskStatus,
    implementationPr,
    completionPr,
  };

  return {
    ...status,
    nextAction: computePrStatusNextAction(status),
  };
}

function parseArgs(argv) {
  const options = {
    repositoryRoot: defaultRepositoryRoot,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--repo-root') {
      options.repositoryRoot = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

export async function main(argv = process.argv.slice(2), options = {}) {
  const parsed = parseArgs(argv);
  const status = await collectPrStatus({
    ...options,
    repositoryRoot: parsed.repositoryRoot,
  });

  process.stdout.write(renderPrStatus(status));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
