import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildLogPath,
  parseRunArgs,
  runOperatorRunner,
  validateTaskId,
} from "../src/operator-runner.mjs";

function createTempRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "forge-runner-test-"));
  const taskDir = path.join(repoRoot, ".forge", "tasks");

  fs.mkdirSync(taskDir, { recursive: true });
  fs.writeFileSync(
    path.join(taskDir, "TASK-0050.yaml"),
    [
      "schema_version: 1",
      "",
      "id: TASK-0050",
      "title: Test task",
      "status: approved",
      "",
    ].join("\n"),
    "utf8",
  );

  return repoRoot;
}

function createSink() {
  return {
    value: "",
    write(chunk) {
      this.value += String(chunk);
    },
  };
}

function createCommandRunner({ verifyStatus = 0 } = {}) {
  return (command, args) => {
    if (command === "git" && args.join(" ") === "branch --show-current") {
      return { status: 0, stdout: "main\n", stderr: "" };
    }

    if (command === "git" && args.join(" ") === "status --short --branch") {
      return { status: 0, stdout: "## main...origin/main\n", stderr: "" };
    }

    if (args.some((value) => value.endsWith("cli.mjs")) && args.includes("next")) {
      return { status: 0, stdout: "Forge Next\\n", stderr: "" };
    }

    if (args.some((value) => value.endsWith("cli.mjs")) && args.includes("status")) {
      return { status: 0, stdout: "Forge Lifecycle Status\\n", stderr: "" };
    }

    if (command === "pnpm" && args.join(" ") === "-C tools/forge-validator verify") {
      return { status: verifyStatus, stdout: "verify output\\n", stderr: "" };
    }

    return {
      status: 1,
      stdout: "",
      stderr: `Unexpected command: ${command} ${args.join(" ")}\\n`,
    };
  };
}

test("validateTaskId accepts TASK-0000 format", () => {
  assert.equal(validateTaskId("TASK-0050"), true);
});

test("validateTaskId rejects invalid task ids", () => {
  assert.equal(validateTaskId("task-0050"), false);
  assert.equal(validateTaskId("TASK-50"), false);
  assert.equal(validateTaskId("TASK-00500"), false);
});

test("parseRunArgs accepts inspect with pnpm separator", () => {
  assert.deepEqual(parseRunArgs(["inspect", "--", "--id", "TASK-0050"]), {
    kind: "run",
    runnerName: "inspect",
    taskId: "TASK-0050",
  });
});

test("parseRunArgs accepts verify without separator", () => {
  assert.deepEqual(parseRunArgs(["verify", "--id", "TASK-0050"]), {
    kind: "run",
    runnerName: "verify",
    taskId: "TASK-0050",
  });
});

test("parseRunArgs rejects missing task id", () => {
  assert.equal(parseRunArgs(["inspect"]).kind, "error");
});

test("parseRunArgs rejects invalid task id", () => {
  assert.equal(parseRunArgs(["inspect", "--id", "TASK-50"]).kind, "error");
});

test("parseRunArgs rejects unknown runner", () => {
  assert.equal(parseRunArgs(["builder", "--id", "TASK-0050"]).kind, "error");
});

test("buildLogPath writes under forge operator temp directory", () => {
  const logPath = buildLogPath({
    logRoot: "/tmp",
    taskId: "TASK-0050",
    runnerName: "verify",
    now: new Date("2026-01-02T03:04:05.000Z"),
  });

  assert.equal(
    logPath,
    "/tmp/forge-operator-runs/TASK-0050-verify-2026-01-02T03-04-05-000Z.log",
  );
});

test("inspect runner reports state and writes a log without mutating tracked files", () => {
  const repoRoot = createTempRepo();
  const logRoot = fs.mkdtempSync(path.join(os.tmpdir(), "forge-runner-logs-"));
  const stdout = createSink();
  const stderr = createSink();

  const status = runOperatorRunner(["inspect", "--", "--id", "TASK-0050"], {
    repoRoot,
    logRoot,
    stdout,
    stderr,
    commandRunner: createCommandRunner(),
    now: new Date("2026-01-02T03:04:05.000Z"),
  });

  assert.equal(status, 0);
  assert.match(stdout.value, /Forge Operator Runner: inspect/);
  assert.match(stdout.value, /Task status: approved/);
  assert.match(stdout.value, /Log path:/);
  assert.equal(stderr.value, "");

  const taskText = fs.readFileSync(path.join(repoRoot, ".forge/tasks/TASK-0050.yaml"), "utf8");
  assert.match(taskText, /status: approved/);
});

test("verify runner returns zero when verification passes", () => {
  const repoRoot = createTempRepo();
  const logRoot = fs.mkdtempSync(path.join(os.tmpdir(), "forge-runner-logs-"));
  const stdout = createSink();
  const stderr = createSink();

  const status = runOperatorRunner(["verify", "--", "--id", "TASK-0050"], {
    repoRoot,
    logRoot,
    stdout,
    stderr,
    commandRunner: createCommandRunner({ verifyStatus: 0 }),
    now: new Date("2026-01-02T03:04:05.000Z"),
  });

  assert.equal(status, 0);
  assert.match(stdout.value, /Runner outcome: PASS/);
  assert.equal(stderr.value, "");
});

test("verify runner returns non-zero when verification fails", () => {
  const repoRoot = createTempRepo();
  const logRoot = fs.mkdtempSync(path.join(os.tmpdir(), "forge-runner-logs-"));
  const stdout = createSink();
  const stderr = createSink();

  const status = runOperatorRunner(["verify", "--", "--id", "TASK-0050"], {
    repoRoot,
    logRoot,
    stdout,
    stderr,
    commandRunner: createCommandRunner({ verifyStatus: 7 }),
    now: new Date("2026-01-02T03:04:05.000Z"),
  });

  assert.equal(status, 7);
  assert.match(stdout.value, /Runner outcome: FAIL/);
  assert.equal(stderr.value, "");
});

test("runner fails clearly when task contract is missing", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "forge-runner-test-"));
  const logRoot = fs.mkdtempSync(path.join(os.tmpdir(), "forge-runner-logs-"));
  const stdout = createSink();
  const stderr = createSink();

  const status = runOperatorRunner(["inspect", "--", "--id", "TASK-0050"], {
    repoRoot,
    logRoot,
    stdout,
    stderr,
    commandRunner: createCommandRunner(),
  });

  assert.equal(status, 1);
  assert.match(stderr.value, /Missing task contract/);
});
