#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TASK_ID_PATTERN = /^TASK-\d{4}$/;

export function stripSeparator(args) {
  if (args[0] === "--") {
    return args.slice(1);
  }

  return args;
}

export function validateTaskId(taskId) {
  return TASK_ID_PATTERN.test(taskId);
}

export function renderHelp() {
  return `Forge Post-Task Check

Usage:
  forge task check -- --id TASK-XXXX
  node tools/forge-validator/src/cli.mjs task check -- --id TASK-XXXX

Options:
  --id TASK-XXXX   Completed task id to validate
  --help           Show this help

Description:
  Runs a read-only post-task validation pass after a completion PR has been
  merged. The command verifies that the repository is on main, the working tree
  is clean, the selected task is completed, the task board has no active task,
  and Forge verification passes.
`;
}

export function parsePostTaskCheckArgs(argv) {
  const args = stripSeparator([...argv]);

  if (args.includes("--help") || args.includes("-h")) {
    return {
      ok: true,
      help: true,
      taskId: null,
      errors: [],
    };
  }

  const errors = [];

  if (args.length === 0) {
    errors.push("Missing required --id TASK-XXXX argument.");
  } else if (args.length !== 2 || args[0] !== "--id") {
    errors.push(`Unknown or invalid arguments: ${args.join(" ")}`);
  }

  const taskId = args[0] === "--id" ? args[1] : null;

  if (taskId && !validateTaskId(taskId)) {
    errors.push(`Invalid task id: ${taskId}. Expected TASK-XXXX.`);
  }

  return {
    ok: errors.length === 0,
    help: false,
    taskId,
    errors,
  };
}

export function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    shell: false,
  });

  return {
    command: [command, ...args].join(" "),
    exitCode: typeof result.status === "number" ? result.status : 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? String(result.error ?? ""),
  };
}

export function parseTaskStatus(taskText) {
  const match = taskText.match(/^status:\s*([A-Za-z0-9_-]+)\s*$/m);

  return match ? match[1] : null;
}

export function boardHasNoActiveTask(boardText) {
  const lines = boardText.split(/\r?\n/);
  const nowIndex = lines.findIndex((line) => /^##\s+Now\s*$/.test(line.trim()));

  if (nowIndex === -1) {
    return boardText.includes("- [ ] No active task.");
  }

  const nowLines = [];

  for (let index = nowIndex + 1; index < lines.length; index++) {
    const line = lines[index];

    if (/^##\s+/.test(line.trim())) {
      break;
    }

    nowLines.push(line);
  }

  const nowText = nowLines.join("\n");

  return nowText.includes("- [ ] No active task.") && !/TASK-\d{4}/.test(nowText);
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function check(name, ok, detail) {
  return {
    name,
    ok: Boolean(ok),
    detail,
  };
}

export function collectPostTaskCheckStatus(options) {
  const taskId = options.taskId;
  const repoRoot = options.repoRoot ?? process.cwd();
  const runner = options.runner ?? runCommand;

  const checks = [];

  const branchResult = runner("git", ["branch", "--show-current"], {
    cwd: repoRoot,
  });
  const branch = branchResult.stdout.trim();

  checks.push(
    check(
      "main branch",
      branchResult.exitCode === 0 && branch === "main",
      branchResult.exitCode === 0
        ? `current branch: ${branch || "(empty)"}`
        : branchResult.stderr.trim() || "git branch failed",
    ),
  );

  const statusResult = runner("git", ["status", "--porcelain"], {
    cwd: repoRoot,
  });
  const statusOutput = statusResult.stdout.trim();

  checks.push(
    check(
      "clean working tree",
      statusResult.exitCode === 0 && statusOutput === "",
      statusResult.exitCode === 0
        ? statusOutput || "working tree clean"
        : statusResult.stderr.trim() || "git status failed",
    ),
  );

  const taskPath = path.join(repoRoot, ".forge", "tasks", `${taskId}.yaml`);
  let taskStatus = null;

  try {
    const taskText = readText(taskPath);
    taskStatus = parseTaskStatus(taskText);

    checks.push(check("task contract exists", true, path.relative(repoRoot, taskPath)));
    checks.push(
      check(
        "task completed",
        taskStatus === "completed",
        taskStatus ? `task status: ${taskStatus}` : "task status not found",
      ),
    );
  } catch (error) {
    checks.push(check("task contract exists", false, String(error.message ?? error)));
    checks.push(check("task completed", false, "task contract unavailable"));
  }

  const boardPath = path.join(repoRoot, "docs", "TASKS.md");

  try {
    const boardText = readText(boardPath);
    const noActiveTask = boardHasNoActiveTask(boardText);

    checks.push(
      check(
        "task board has no active task",
        noActiveTask,
        noActiveTask ? "no active task" : "active task still present or board is ambiguous",
      ),
    );
  } catch (error) {
    checks.push(check("task board has no active task", false, String(error.message ?? error)));
  }

  const verifyResult = runner("pnpm", ["-C", "tools/forge-validator", "verify"], {
    cwd: repoRoot,
  });

  checks.push(
    check(
      "forge verify",
      verifyResult.exitCode === 0,
      verifyResult.exitCode === 0
        ? "verification passed"
        : verifyResult.stderr.trim() || verifyResult.stdout.trim() || "verification failed",
    ),
  );

  const ok = checks.every((item) => item.ok);

  return {
    taskId,
    repoRoot,
    branch,
    taskStatus,
    checks,
    ok,
    verifyExitCode: verifyResult.exitCode,
  };
}

export function renderPostTaskCheckReport(status) {
  const lines = [];

  lines.push("Forge Post-Task Check");
  lines.push("");
  lines.push("Current state:");
  lines.push(`- Task: ${status.taskId}`);
  lines.push(`- Repository: ${status.repoRoot}`);
  lines.push(`- Branch: ${status.branch || "(unknown)"}`);
  lines.push(`- Task status: ${status.taskStatus || "(unknown)"}`);
  lines.push("");
  lines.push("Checks:");

  for (const item of status.checks) {
    lines.push(`- ${item.ok ? "PASS" : "FAIL"} ${item.name}: ${item.detail}`);
  }

  lines.push("");
  lines.push("Result:");
  lines.push(`- State: ${status.ok ? "passing" : "failing"}`);

  lines.push("");
  lines.push("Next recommended action:");

  if (status.ok) {
    lines.push("- Post-task validation passed. Define the next task.");
  } else {
    lines.push("- Fix the failing post-task checks before starting the next task.");
  }

  lines.push("");

  return lines.join("\n");
}

const currentFile = fileURLToPath(import.meta.url);
const srcDir = path.dirname(currentFile);
const packageRoot = path.resolve(srcDir, "..");
const defaultRepoRoot = path.resolve(packageRoot, "../..");

export function resolveDefaultRepoRoot() {
  return defaultRepoRoot;
}

export function main(argv = process.argv.slice(2), options = {}) {
  const parsed = parsePostTaskCheckArgs(argv);

  if (parsed.help) {
    console.log(renderHelp());
    return 0;
  }

  if (!parsed.ok) {
    console.error(renderHelp());
    for (const error of parsed.errors) {
      console.error(`ERROR: ${error}`);
    }

    return 1;
  }

  const status = collectPostTaskCheckStatus({
    taskId: parsed.taskId,
    repoRoot: options.repoRoot ?? resolveDefaultRepoRoot(),
    runner: options.runner,
  });

  console.log(renderPostTaskCheckReport(status));

  return status.ok ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  process.exitCode = main();
}
