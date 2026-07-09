import assert from "node:assert/strict";
import {
  spawnSync } from "node:child_process"; import { readFileSync,
  writeFileSync } from "node:fs"; import path from "node:path"; import test from "node:test"; import { fileURLToPath } from "node:url";  import { renderHelp,
  resolveCommand,
  resolvePrOperatorCommand,
  runPrOperatorCommand,
} from "../src/cli.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(testDir, "..");
const cliPath = path.join(packageRoot, "src", "cli.mjs");
const repoRoot = path.resolve(packageRoot, "../..");

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: packageRoot,
    encoding: "utf8",
  });
}

function gitStatus(cwd = repoRoot) {
  const result = spawnSync("git", ["status", "--porcelain"], {
    cwd,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);

  return result.stdout;
}

function withActiveTaskBoard(fn) {
  const boardPath = path.join(repoRoot, "docs", "TASKS.md");
  const original = readFileSync(boardPath, "utf8");

  const marker = "## Completed";
  assert.ok(original.includes(marker), "docs/TASKS.md must include Completed section");

  const completed = original.slice(original.indexOf(marker));

  const activeBoard = [
    "# Tasks",
    "",
    "## Now",
    "",
    "- [ ] `TASK-0033` — Add Forge prompt CLI command (`ready_for_pr`).",
    "",
    "## Next",
    "",
    "- [ ] Prepare PR for `TASK-0033`.",
    "",
    "## Later",
    "",
    "- [ ] No later tasks.",
    "",
    completed,
  ].join("\n");

  writeFileSync(boardPath, activeBoard);

  try {
    return fn();
  } finally {
    writeFileSync(boardPath, original);
  }
}

test("renderHelp includes the concise Forge commands", () => {
  const help = renderHelp();

  assert.match(help, /forge status/);
  assert.match(help, /forge pr status/);
  assert.match(help, /forge release status/);
  assert.match(help, /forge smoke/);
  assert.match(help, /forge verify/);
  assert.match(help, /forge task new/);
  assert.match(help, /forge artifact new/);
  assert.match(help, /forge prompt ROLE \[TASK_ID\] \[PR_NUMBER\]/);
});

test("help exits successfully", () => {
  const result = runCli(["help"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Forge CLI/);
  assert.equal(result.stderr, "");
});

test("unknown command exits non-zero", () => {
  const result = runCli(["does-not-exist"]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unknown command 'does-not-exist'/);
});


test("resolveCommand maps pr status to the Forge PR status script", () => {
  assert.deepEqual(resolveCommand(["pr", "status"]), {
    kind: "node-script",
    script: "pr-status.mjs",
    args: [],
  });
});

test("resolveCommand maps pr alias to the Forge PR status script", () => {
  assert.deepEqual(resolveCommand(["pr"]), {
    kind: "node-script",
    script: "pr-status.mjs",
    args: [],
  });
});

test("forge pr status dispatches successfully", () => {
  const result = runCli(["pr", "status"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Forge PR Status/);
  assert.equal(result.stderr, "");
});

test("resolveCommand maps release status to the Forge release status script", () => {
  assert.deepEqual(resolveCommand(["release", "status", "--", "--tag", "v0.4.0"]), {
    kind: "node-script",
    script: "release-status.mjs",
    args: ["--tag", "v0.4.0"],
  });
});

test("forge release status help dispatches successfully", () => {
  const result = runCli(["release", "status", "--help"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Forge Release Status/);
  assert.equal(result.stderr, "");
});

test("resolveCommand maps status to the existing status script", () => {
  assert.deepEqual(resolveCommand(["status"]), {
    kind: "node-script",
    script: "status.mjs",
    args: [],
  });
});

test("resolveCommand maps smoke to the existing workflow smoke script", () => {
  assert.deepEqual(resolveCommand(["smoke"]), {
    kind: "node-script",
    script: "workflow-smoke.mjs",
    args: [],
  });
});

test("resolveCommand maps verify to the existing package verify script", () => {
  assert.deepEqual(resolveCommand(["verify"]), {
    kind: "package-script",
    command: "pnpm",
    args: ["run", "verify"],
  });
});

test("resolveCommand maps task new and strips the optional separator", () => {
  assert.deepEqual(resolveCommand(["task", "new", "--", "--id", "TASK-1234", "--title", "Example"]), {
    kind: "node-script",
    script: "scaffold-task.mjs",
    args: ["--id", "TASK-1234", "--title", "Example"],
  });
});

test("resolveCommand maps task stage", () => {
  assert.deepEqual(resolveCommand(["task", "stage", "--id", "TASK-1234", "--stage", "planner"]), {
    kind: "node-script",
    script: "stage-task.mjs",
    args: ["--id", "TASK-1234", "--stage", "planner"],
  });
});

test("resolveCommand maps task complete", () => {
  assert.deepEqual(resolveCommand(["task", "complete", "--id", "TASK-1234"]), {
    kind: "node-script",
    script: "complete-task.mjs",
    args: ["--id", "TASK-1234"],
  });
});

test("resolveCommand maps artifact new", () => {
  assert.deepEqual(resolveCommand(["artifact", "new", "--type", "plan"]), {
    kind: "node-script",
    script: "scaffold-artifact.mjs",
    args: ["--type", "plan"],
  });
});

test("forge status dispatches successfully", () => {
  const result = runCli(["status"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Forge Lifecycle Status/);
});


test("resolveCommand maps prompt to the existing prompt generator", () => {
  assert.deepEqual(resolveCommand(["prompt", "builder", "TASK-0032"]), {
    kind: "prompt-script",
    args: ["builder", "TASK-0032"],
  });
});

test("resolveCommand maps prompt and strips the optional separator", () => {
  assert.deepEqual(resolveCommand(["prompt", "--", "reviewer", "TASK-0032"]), {
    kind: "prompt-script",
    args: ["reviewer", "TASK-0032"],
  });
});

test("resolveCommand maps prompt help alias", () => {
  assert.deepEqual(resolveCommand(["prompt", "help"]), {
    kind: "prompt-script",
    args: ["--help"],
  });
});

test("resolveCommand keeps prompt PR shorthand arguments", () => {
  assert.deepEqual(resolveCommand(["prompt", "implementation-pr", "68"]), {
    kind: "prompt-script",
    args: ["implementation-pr", "68"],
  });
});

test("forge prompt help delegates successfully", () => {
  const result = runCli(["prompt", "--help"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Forge prompt generator/);
  assert.match(result.stdout, /Supported roles:/);
  assert.equal(result.stderr, "");
});

test("forge prompt list delegates successfully", () => {
  const result = runCli(["prompt", "--list"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^planner$/m);
  assert.match(result.stdout, /^builder$/m);
  assert.match(result.stdout, /^completion-pr$/m);
  assert.equal(result.stderr, "");
});

test("forge prompt renders explicit task without mutating the working tree", () => {
  const before = gitStatus();

  const result = runCli(["prompt", "builder", "TASK-0032"]);

  const after = gitStatus();

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /TASK-0032/);
  assert.equal(result.stderr, "");
  assert.equal(after, before, "forge prompt must not modify repository state");
});

test("forge prompt forwards explicit PR role arguments", () => {
  const result = runCli(["prompt", "implementation-pr", "TASK-0032", "68"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /TASK-0032/);
  assert.match(result.stdout, /68/);
  assert.equal(result.stderr, "");
});

test("forge prompt reports delegated failures", () => {
  const result = runCli(["prompt", "unknown-role", "TASK-0032"]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unknown role/);
});


test("forge prompt resolves active task shorthand without mutating the working tree", () => {
  withActiveTaskBoard(() => {
    const before = gitStatus();

    const result = runCli(["prompt", "builder"]);

    const after = gitStatus();

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /TASK-0033/);
    assert.equal(result.stderr, "");
    assert.equal(after, before, "forge prompt active-task shorthand must not modify repository state");
  });
});

test("forge prompt forwards active-task PR shorthand arguments", () => {
  withActiveTaskBoard(() => {
    const result = runCli(["prompt", "implementation-pr", "68"]);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /TASK-0033/);
    assert.match(result.stdout, /68/);
    assert.equal(result.stderr, "");
  });
});

test("renderHelp includes forge next", () => {
  const help = renderHelp();

  assert.match(help, /forge next/);
});

test("resolveCommand maps next to the Forge next script", () => {
  assert.deepEqual(resolveCommand(["next"]), {
    kind: "node-script",
    script: "next.mjs",
    args: [],
  });
});

test("forge next dispatches successfully", () => {
  const result = runCli(["next"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Forge Next/);
  assert.match(result.stdout, /Next recommended action:/);
});

test("forge next does not mutate the working tree", () => {
  const before = gitStatus();

  const result = runCli(["next"]);

  const after = gitStatus();

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal(after, before, "forge next must not modify repository state");
});

test("resolveCommand maps pr watch to the Forge PR checks watch script", () => {
  const resolved = resolveCommand(["pr", "watch", "--", "--pr", "89"]);

  assert.equal(resolved.kind, "node-script");
  assert.equal(resolved.script, "pr-watch.mjs");
  assert.deepEqual(resolved.args, ["--pr", "89"]);
});

test("forge pr watch help dispatches successfully", () => {
  const result = runCli(["pr", "watch", "--help"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Forge PR Checks Watch/);
});


test("renderHelp includes Forge PR operator commands", () => {
  const help = renderHelp();

  assert.match(help, /forge pr create-implementation -- --id TASK-XXXX/);
  assert.match(help, /forge pr merge-implementation -- --pr 123/);
  assert.match(help, /forge pr create-completion -- --id TASK-XXXX/);
  assert.match(help, /forge pr merge-completion -- --pr 124/);
});

test("resolvePrOperatorCommand maps create-implementation and forwards script arguments", () => {
  const resolved = resolvePrOperatorCommand([
    "pr",
    "create-implementation",
    "--",
    "--id",
    "TASK-0045",
    "--title",
    "TASK-0045: Implementation",
  ]);

  assert.equal(resolved.command, "bash");
  assert.match(resolved.args[0], /scripts\/operator\/create-implementation-pr\.sh$/);
  assert.deepEqual(resolved.args.slice(1), [
    "TASK-0045",
    "TASK-0045: Implementation",
  ]);
});

test("resolvePrOperatorCommand maps merge-implementation and forwards script arguments", () => {
  const resolved = resolvePrOperatorCommand([
    "pr",
    "merge-implementation",
    "--",
    "--pr",
    "94",
    "--id",
    "TASK-0045",
    "--branch",
    "task/TASK-0045-pr-operator-commands",
  ]);

  assert.equal(resolved.command, "bash");
  assert.match(resolved.args[0], /scripts\/operator\/merge-implementation-pr\.sh$/);
  assert.deepEqual(resolved.args.slice(1), [
    "94",
    "TASK-0045",
    "task/TASK-0045-pr-operator-commands",
  ]);
});

test("resolvePrOperatorCommand maps create-completion and forwards script arguments", () => {
  const resolved = resolvePrOperatorCommand([
    "pr",
    "create-completion",
    "--",
    "--id",
    "TASK-0045",
    "--branch",
    "chore/complete-TASK-0045",
  ]);

  assert.equal(resolved.command, "bash");
  assert.match(resolved.args[0], /scripts\/operator\/create-completion-pr\.sh$/);
  assert.deepEqual(resolved.args.slice(1), [
    "TASK-0045",
    "chore/complete-TASK-0045",
  ]);
});

test("resolvePrOperatorCommand maps merge-completion and forwards script arguments", () => {
  const resolved = resolvePrOperatorCommand([
    "pr",
    "merge-completion",
    "--",
    "--pr",
    "95",
    "--id",
    "TASK-0045",
    "--branch",
    "chore/complete-TASK-0045",
  ]);

  assert.equal(resolved.command, "bash");
  assert.match(resolved.args[0], /scripts\/operator\/merge-completion-pr\.sh$/);
  assert.deepEqual(resolved.args.slice(1), [
    "95",
    "TASK-0045",
    "chore/complete-TASK-0045",
  ]);
});

test("resolvePrOperatorCommand returns null for non-operator PR commands", () => {
  assert.equal(resolvePrOperatorCommand(["pr", "status"]), null);
  assert.equal(resolvePrOperatorCommand(["pr", "watch", "--", "--pr", "95"]), null);
});

test("resolvePrOperatorCommand rejects missing required flags", () => {
  assert.throws(
    () => resolvePrOperatorCommand(["pr", "create-implementation", "--", "--id", "TASK-0045"]),
    /Missing required --title argument/,
  );
});

test("resolvePrOperatorCommand rejects unknown flags", () => {
  assert.throws(
    () => resolvePrOperatorCommand(["pr", "create-completion", "--", "--id", "TASK-0045", "--branch", "x", "--bad", "y"]),
    /Unknown argument: --bad/,
  );
});


test("runPrOperatorCommand executes a safe local command", () => {
  const exitCode = runPrOperatorCommand({
    command: process.execPath,
    args: ["-e", "process.exit(0)"],
  });

  assert.equal(exitCode, 0);
});

test("renderHelp includes Forge run operator commands", () => {
  assert.match(renderHelp(), /forge run inspect -- --id TASK-XXXX/);
  assert.match(renderHelp(), /forge run verify -- --id TASK-XXXX/);
});

test("resolveCommand maps run inspect to the operator runner script", () => {
  assert.deepEqual(resolveCommand(["run", "inspect", "--", "--id", "TASK-0050"]), {
    kind: "node-script",
    script: "operator-runner.mjs",
    args: ["inspect", "--", "--id", "TASK-0050"],
  });
});

test("resolveCommand maps run verify to the operator runner script", () => {
  assert.deepEqual(resolveCommand(["run", "verify", "--", "--id", "TASK-0050"]), {
    kind: "node-script",
    script: "operator-runner.mjs",
    args: ["verify", "--", "--id", "TASK-0050"],
  });
});
