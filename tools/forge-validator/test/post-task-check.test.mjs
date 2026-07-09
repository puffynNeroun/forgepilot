import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  boardHasNoActiveTask,
  collectPostTaskCheckStatus,
  parsePostTaskCheckArgs,
  parseTaskStatus,
  renderPostTaskCheckReport,
  resolveDefaultRepoRoot,
} from "../src/post-task-check.mjs";

function makeTempRepo({ taskStatus = "completed", board = "empty" } = {}) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "forge-post-task-check-"));

  fs.mkdirSync(path.join(repoRoot, ".forge", "tasks"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "docs"), { recursive: true });

  fs.writeFileSync(
    path.join(repoRoot, ".forge", "tasks", "TASK-9999.yaml"),
    `schema_version: 1
id: TASK-9999
title: Test task
status: ${taskStatus}
workflow: .forge/workflows/feature.yaml
goal: Test task.
in_scope:
  - Test scope.
out_of_scope:
  - Test out of scope.
allowed_files:
  - .forge/tasks/TASK-9999.yaml
protected_files:
  []
acceptance_criteria:
  - id: AC-01
    description: Test criterion.
required_checks:
  - verify
`,
    "utf8",
  );

  const boardText =
    board === "active"
      ? `# Tasks

## Now
- [ ] TASK-9999 — Test task.

## Next
- [ ] Continue task.
`
      : `# Tasks

## Now
- [ ] No active task.

## Next
- [ ] Define the next task.
`;

  fs.writeFileSync(path.join(repoRoot, "docs", "TASKS.md"), boardText, "utf8");

  return repoRoot;
}

function makeRunner({ branch = "main", dirty = false, verifyExitCode = 0 } = {}) {
  return (command, args) => {
    const commandText = [command, ...args].join(" ");

    if (commandText === "git branch --show-current") {
      return {
        command: commandText,
        exitCode: 0,
        stdout: `${branch}\n`,
        stderr: "",
      };
    }

    if (commandText === "git status --porcelain") {
      return {
        command: commandText,
        exitCode: 0,
        stdout: dirty ? " M docs/TASKS.md\n" : "",
        stderr: "",
      };
    }

    if (commandText === "pnpm -C tools/forge-validator verify") {
      return {
        command: commandText,
        exitCode: verifyExitCode,
        stdout: verifyExitCode === 0 ? "Forge contract validation passed.\n" : "",
        stderr: verifyExitCode === 0 ? "" : "verification failed\n",
      };
    }

    return {
      command: commandText,
      exitCode: 1,
      stdout: "",
      stderr: `unexpected command: ${commandText}`,
    };
  };
}


test("resolveDefaultRepoRoot points at the repository root", () => {
  const repoRoot = resolveDefaultRepoRoot();

  assert.equal(path.basename(repoRoot), "ai-project-template");
  assert.equal(fs.existsSync(path.join(repoRoot, ".forge", "tasks")), true);
  assert.equal(fs.existsSync(path.join(repoRoot, "docs", "TASKS.md")), true);
});

test("parsePostTaskCheckArgs accepts required task id", () => {
  assert.deepEqual(parsePostTaskCheckArgs(["--id", "TASK-0044"]), {
    ok: true,
    help: false,
    taskId: "TASK-0044",
    errors: [],
  });
});

test("parsePostTaskCheckArgs accepts pnpm separator before arguments", () => {
  assert.deepEqual(parsePostTaskCheckArgs(["--", "--id", "TASK-0044"]), {
    ok: true,
    help: false,
    taskId: "TASK-0044",
    errors: [],
  });
});

test("parsePostTaskCheckArgs rejects missing task id", () => {
  const parsed = parsePostTaskCheckArgs([]);

  assert.equal(parsed.ok, false);
  assert.match(parsed.errors.join("\n"), /Missing required --id/);
});

test("parsePostTaskCheckArgs rejects invalid task id", () => {
  const parsed = parsePostTaskCheckArgs(["--id", "TASK-44"]);

  assert.equal(parsed.ok, false);
  assert.match(parsed.errors.join("\n"), /Invalid task id/);
});

test("parsePostTaskCheckArgs rejects unknown arguments", () => {
  const parsed = parsePostTaskCheckArgs(["--task", "TASK-0044"]);

  assert.equal(parsed.ok, false);
  assert.match(parsed.errors.join("\n"), /Unknown or invalid arguments/);
});

test("parsePostTaskCheckArgs supports help", () => {
  const parsed = parsePostTaskCheckArgs(["--help"]);

  assert.equal(parsed.ok, true);
  assert.equal(parsed.help, true);
});

test("parseTaskStatus reads task status", () => {
  assert.equal(parseTaskStatus("id: TASK-0001\nstatus: completed\n"), "completed");
});

test("boardHasNoActiveTask detects no active task", () => {
  assert.equal(
    boardHasNoActiveTask(`# Tasks

## Now
- [ ] No active task.

## Next
- [ ] Define the next task.
`),
    true,
  );
});

test("boardHasNoActiveTask detects active task", () => {
  assert.equal(
    boardHasNoActiveTask(`# Tasks

## Now
- [ ] TASK-0044 — Build command.

## Next
- [ ] Continue task.
`),
    false,
  );
});

test("collectPostTaskCheckStatus reports passing state", () => {
  const repoRoot = makeTempRepo();
  const status = collectPostTaskCheckStatus({
    taskId: "TASK-9999",
    repoRoot,
    runner: makeRunner(),
  });

  assert.equal(status.ok, true);
  assert.equal(status.branch, "main");
  assert.equal(status.taskStatus, "completed");
  assert.equal(status.checks.every((item) => item.ok), true);
});

test("collectPostTaskCheckStatus fails outside main", () => {
  const repoRoot = makeTempRepo();
  const status = collectPostTaskCheckStatus({
    taskId: "TASK-9999",
    repoRoot,
    runner: makeRunner({ branch: "task/TASK-9999-example" }),
  });

  assert.equal(status.ok, false);
  assert.equal(status.checks.find((item) => item.name === "main branch").ok, false);
});

test("collectPostTaskCheckStatus fails on dirty working tree", () => {
  const repoRoot = makeTempRepo();
  const status = collectPostTaskCheckStatus({
    taskId: "TASK-9999",
    repoRoot,
    runner: makeRunner({ dirty: true }),
  });

  assert.equal(status.ok, false);
  assert.equal(status.checks.find((item) => item.name === "clean working tree").ok, false);
});

test("collectPostTaskCheckStatus fails when task is not completed", () => {
  const repoRoot = makeTempRepo({ taskStatus: "ready_for_pr" });
  const status = collectPostTaskCheckStatus({
    taskId: "TASK-9999",
    repoRoot,
    runner: makeRunner(),
  });

  assert.equal(status.ok, false);
  assert.equal(status.checks.find((item) => item.name === "task completed").ok, false);
});

test("collectPostTaskCheckStatus fails when board has active task", () => {
  const repoRoot = makeTempRepo({ board: "active" });
  const status = collectPostTaskCheckStatus({
    taskId: "TASK-9999",
    repoRoot,
    runner: makeRunner(),
  });

  assert.equal(status.ok, false);
  assert.equal(status.checks.find((item) => item.name === "task board has no active task").ok, false);
});

test("collectPostTaskCheckStatus fails when verify fails", () => {
  const repoRoot = makeTempRepo();
  const status = collectPostTaskCheckStatus({
    taskId: "TASK-9999",
    repoRoot,
    runner: makeRunner({ verifyExitCode: 1 }),
  });

  assert.equal(status.ok, false);
  assert.equal(status.checks.find((item) => item.name === "forge verify").ok, false);
});

test("renderPostTaskCheckReport renders next action for passing state", () => {
  const repoRoot = makeTempRepo();
  const status = collectPostTaskCheckStatus({
    taskId: "TASK-9999",
    repoRoot,
    runner: makeRunner(),
  });

  const report = renderPostTaskCheckReport(status);

  assert.match(report, /Forge Post-Task Check/);
  assert.match(report, /State: passing/);
  assert.match(report, /Define the next task/);
});

test("forge task check help dispatches successfully through cli", () => {
  const result = spawnSync(process.execPath, ["./src/cli.mjs", "task", "check", "--help"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Forge Post-Task Check/);
});
