#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const srcDir = path.dirname(currentFile);
const packageRoot = path.resolve(srcDir, "..");
const defaultRepoRoot = path.resolve(packageRoot, "../..");

const supportedRunners = new Set(["inspect", "verify"]);

function stripSeparator(args) {
  return args[0] === "--" ? args.slice(1) : args;
}

export function validateTaskId(taskId) {
  return /^TASK-\d{4}$/.test(taskId);
}

export function parseRunArgs(rawArgs) {
  const [runnerName, ...rawRest] = rawArgs;

  if (!runnerName || runnerName === "help" || runnerName === "-h" || runnerName === "--help") {
    return { kind: "help" };
  }

  if (!supportedRunners.has(runnerName)) {
    return {
      kind: "error",
      message: `Unknown run subcommand '${runnerName}'. Expected one of: inspect, verify.`,
    };
  }

  const rest = stripSeparator(rawRest);
  let taskId = null;

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];

    if (value !== "--id") {
      return {
        kind: "error",
        message: `Unknown argument: ${value}.`,
      };
    }

    if (index + 1 >= rest.length || rest[index + 1].startsWith("--")) {
      return {
        kind: "error",
        message: "Missing required --id argument.",
      };
    }

    taskId = rest[index + 1];
    index += 1;
  }

  if (!taskId) {
    return {
      kind: "error",
      message: "Missing required --id argument.",
    };
  }

  if (!validateTaskId(taskId)) {
    return {
      kind: "error",
      message: `Invalid task id '${taskId}'. Expected TASK-XXXX.`,
    };
  }

  return {
    kind: "run",
    runnerName,
    taskId,
  };
}

export function renderHelp() {
  return [
    "Forge Operator Runner",
    "",
    "Usage:",
    "  forge run inspect -- --id TASK-XXXX",
    "  forge run verify -- --id TASK-XXXX",
    "",
    "Notes:",
    "  These commands are local-only.",
    "  They do not create branches, commits, pushes, pull requests, merges, releases, or deployments.",
    "  Runner logs are written outside tracked project files.",
  ].join("\n");
}

export function defaultCommandRunner(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 64,
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error,
  };
}

function write(stream, value) {
  if (value) {
    stream.write(value);
  }
}

function commandLine(command, args) {
  return [command, ...args].join(" ");
}

function safeTimestamp(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function buildLogPath({ logRoot, taskId, runnerName, now = new Date() }) {
  return path.join(
    logRoot,
    "forge-operator-runs",
    `${taskId}-${runnerName}-${safeTimestamp(now)}.log`,
  );
}

function readTaskStatus(repoRoot, taskId) {
  const taskPath = path.join(repoRoot, ".forge", "tasks", `${taskId}.yaml`);

  if (!fs.existsSync(taskPath)) {
    throw new Error(`Missing task contract: .forge/tasks/${taskId}.yaml`);
  }

  const text = fs.readFileSync(taskPath, "utf8");
  const match = text.match(/^status:\s*([^\s#]+)/m);

  if (!match) {
    throw new Error(`Task contract does not contain a status: .forge/tasks/${taskId}.yaml`);
  }

  return match[1];
}

function collectGitSnapshot({ repoRoot, taskId, commandRunner }) {
  const branchResult = commandRunner("git", ["branch", "--show-current"], { cwd: repoRoot });
  const statusResult = commandRunner("git", ["status", "--short", "--branch"], { cwd: repoRoot });

  return {
    branchStatus: branchResult.status,
    branch: branchResult.stdout.trim() || "(unknown)",
    gitStatusStatus: statusResult.status,
    gitStatus: statusResult.stdout.trimEnd() || "(empty)",
    taskStatus: readTaskStatus(repoRoot, taskId),
  };
}

function renderSnapshot(title, snapshot) {
  return [
    `== ${title} ==`,
    `Branch: ${snapshot.branch}`,
    `Task status: ${snapshot.taskStatus}`,
    "Git status:",
    snapshot.gitStatus,
    "",
  ].join("\n");
}

function runLoggedCommand({ command, args, cwd, commandRunner, stdout, stderr, logParts }) {
  const line = `$ ${commandLine(command, args)}`;
  logParts.push(line);
  stdout.write(`${line}\n`);

  const result = commandRunner(command, args, { cwd });

  if (result.stdout) {
    logParts.push(result.stdout);
    write(stdout, result.stdout);
  }

  if (result.stderr) {
    logParts.push(result.stderr);
    write(stderr, result.stderr);
  }

  if (result.error) {
    const message = String(result.error.stack || result.error.message || result.error);
    logParts.push(message);
    stderr.write(`${message}\n`);
  }

  logParts.push(`exit_status=${result.status}`);
  stdout.write(`exit_status=${result.status}\n`);

  return result;
}

function writeLogFile(logPath, logParts) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(logPath, `${logParts.join("\n").trimEnd()}\n`, "utf8");
}

function runInspect({ repoRoot, taskId, commandRunner, stdout, stderr, logPath }) {
  const logParts = [];

  try {
    const snapshot = collectGitSnapshot({ repoRoot, taskId, commandRunner });
    const renderedSnapshot = renderSnapshot("INSPECT STATE", snapshot);

    stdout.write("Forge Operator Runner: inspect\n");
    stdout.write(renderedSnapshot);
    logParts.push("Forge Operator Runner: inspect", renderedSnapshot);

    runLoggedCommand({
      command: process.execPath,
      args: [path.join(repoRoot, "tools", "forge-validator", "src", "cli.mjs"), "next"],
      cwd: repoRoot,
      commandRunner,
      stdout,
      stderr,
      logParts,
    });

    runLoggedCommand({
      command: process.execPath,
      args: [path.join(repoRoot, "tools", "forge-validator", "src", "cli.mjs"), "status"],
      cwd: repoRoot,
      commandRunner,
      stdout,
      stderr,
      logParts,
    });

    stdout.write(`Log path: ${logPath}\n`);
    logParts.push(`Log path: ${logPath}`);
    writeLogFile(logPath, logParts);

    return 0;
  } catch (error) {
    const message = `ERROR: ${error.message}`;
    stderr.write(`${message}\n`);
    logParts.push(message, `Log path: ${logPath}`);
    writeLogFile(logPath, logParts);

    return 1;
  }
}

function runVerify({ repoRoot, taskId, commandRunner, stdout, stderr, logPath }) {
  const logParts = [];

  try {
    stdout.write("Forge Operator Runner: verify\n");
    logParts.push("Forge Operator Runner: verify");

    const beforeSnapshot = collectGitSnapshot({ repoRoot, taskId, commandRunner });
    const renderedBefore = renderSnapshot("BEFORE VERIFY", beforeSnapshot);
    stdout.write(renderedBefore);
    logParts.push(renderedBefore);

    const verifyResult = runLoggedCommand({
      command: "pnpm",
      args: ["-C", "tools/forge-validator", "verify"],
      cwd: repoRoot,
      commandRunner,
      stdout,
      stderr,
      logParts,
    });

    const afterSnapshot = collectGitSnapshot({ repoRoot, taskId, commandRunner });
    const renderedAfter = renderSnapshot("AFTER VERIFY", afterSnapshot);
    stdout.write(renderedAfter);
    logParts.push(renderedAfter);

    const outcome = verifyResult.status === 0 ? "PASS" : "FAIL";
    stdout.write(`Runner outcome: ${outcome}\n`);
    stdout.write(`Log path: ${logPath}\n`);

    logParts.push(`Runner outcome: ${outcome}`, `Log path: ${logPath}`);
    writeLogFile(logPath, logParts);

    return verifyResult.status;
  } catch (error) {
    const message = `ERROR: ${error.message}`;
    stderr.write(`${message}\n`);
    logParts.push(message, `Log path: ${logPath}`);
    writeLogFile(logPath, logParts);

    return 1;
  }
}

export function runOperatorRunner(rawArgs, options = {}) {
  const parsed = parseRunArgs(rawArgs);
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;

  if (parsed.kind === "help") {
    stdout.write(`${renderHelp()}\n`);
    return 0;
  }

  if (parsed.kind === "error") {
    stderr.write(`${parsed.message}\n\n${renderHelp()}\n`);
    return 1;
  }

  const repoRoot = options.repoRoot ?? defaultRepoRoot;
  const commandRunner = options.commandRunner ?? defaultCommandRunner;
  const logRoot = options.logRoot ?? os.tmpdir();
  const logPath = options.logPath ?? buildLogPath({
    logRoot,
    taskId: parsed.taskId,
    runnerName: parsed.runnerName,
    now: options.now ?? new Date(),
  });

  if (parsed.runnerName === "inspect") {
    return runInspect({
      repoRoot,
      taskId: parsed.taskId,
      commandRunner,
      stdout,
      stderr,
      logPath,
    });
  }

  if (parsed.runnerName === "verify") {
    return runVerify({
      repoRoot,
      taskId: parsed.taskId,
      commandRunner,
      stdout,
      stderr,
      logPath,
    });
  }

  stderr.write(`Unknown run subcommand '${parsed.runnerName}'.\n`);
  return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = runOperatorRunner(process.argv.slice(2));
}
