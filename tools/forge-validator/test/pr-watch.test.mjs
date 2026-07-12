import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyCheckSummary,
  collectPrWatchStatus,
  parsePrWatchArgs,
  renderPrWatchReport,
  summarizeCheckRows,
} from "../src/pr-watch.mjs";

test("parsePrWatchArgs accepts required PR number", () => {
  assert.deepEqual(parsePrWatchArgs(["--pr", "89"]), {
    ok: true,
    help: false,
    prNumber: 89,
    errors: [],
  });
});

test("parsePrWatchArgs accepts pnpm separator before arguments", () => {
  assert.deepEqual(parsePrWatchArgs(["--", "--pr", "89"]), {
    ok: true,
    help: false,
    prNumber: 89,
    errors: [],
  });
});

test("parsePrWatchArgs rejects missing PR number", () => {
  const parsed = parsePrWatchArgs([]);

  assert.equal(parsed.ok, false);
  assert.match(parsed.errors.join("\n"), /Missing required argument: --pr/);
});

test("parsePrWatchArgs rejects invalid PR number", () => {
  const parsed = parsePrWatchArgs(["--pr", "abc"]);

  assert.equal(parsed.ok, false);
  assert.match(parsed.errors.join("\n"), /Invalid PR number/);
});

test("parsePrWatchArgs rejects unknown arguments", () => {
  const parsed = parsePrWatchArgs(["--pr", "89", "--merge"]);

  assert.equal(parsed.ok, false);
  assert.match(parsed.errors.join("\n"), /Unknown argument: --merge/);
});

test("parsePrWatchArgs supports help", () => {
  const parsed = parsePrWatchArgs(["--help"]);

  assert.equal(parsed.ok, true);
  assert.equal(parsed.help, true);
});

test("summarizeCheckRows classifies passing and skipped checks as passing terminal state", () => {
  const summary = summarizeCheckRows([
    { name: "Verify Forge contracts", state: "SUCCESS", bucket: "pass", link: "https://example.test/pass" },
    { name: "Optional skipped check", state: "SKIPPED", bucket: "skipped", link: "https://example.test/skipped" },
  ]);

  assert.deepEqual(summary, {
    total: 2,
    passing: 1,
    failing: 0,
    pending: 0,
    skipped: 1,
    unknown: 0,
  });
  assert.equal(classifyCheckSummary(summary), "passing");
});

test("summarizeCheckRows classifies failing checks", () => {
  const summary = summarizeCheckRows([
    { name: "Verify Forge contracts", state: "FAILURE", bucket: "fail", link: "https://example.test/fail" },
  ]);

  assert.equal(summary.failing, 1);
  assert.equal(classifyCheckSummary(summary), "failing");
});

test("summarizeCheckRows classifies pending checks", () => {
  const summary = summarizeCheckRows([
    { name: "Verify Forge contracts", state: "IN_PROGRESS", bucket: "pending", link: "https://example.test/pending" },
  ]);

  assert.equal(summary.pending, 1);
  assert.equal(classifyCheckSummary(summary), "pending");
});

test("summarizeCheckRows classifies missing checks", () => {
  const summary = summarizeCheckRows([]);

  assert.equal(summary.total, 0);
  assert.equal(classifyCheckSummary(summary), "missing");
});

test("renderPrWatchReport renders passing state and next action", () => {
  const report = renderPrWatchReport({
    prNumber: 89,
    metadata: {
      title: "Complete TASK-0042",
      state: "OPEN",
      mergeable: "MERGEABLE",
      headRefName: "chore/complete-TASK-0042",
      baseRefName: "main",
      url: "https://github.com/example/repo/pull/89",
    },
    watch: { ok: true, exitCode: 0 },
    summary: { total: 1, passing: 1, failing: 0, pending: 0, skipped: 0, unknown: 0 },
    state: "passing",
    errors: [],
  });

  assert.match(report, /Forge PR Checks Watch/);
  assert.match(report, /State: passing/);
  assert.match(report, /Checks passed\. Inspect `forge pr status`/);
});

test("renderPrWatchReport renders failure state and next action", () => {
  const report = renderPrWatchReport({
    prNumber: 89,
    metadata: null,
    watch: { ok: false, exitCode: 1 },
    summary: { total: 1, passing: 0, failing: 1, pending: 0, skipped: 0, unknown: 0 },
    state: "failing",
    errors: ["PR checks unavailable: simulated"],
  });

  assert.match(report, /State: failing/);
  assert.match(report, /Inspect failed checks before merging/);
  assert.match(report, /Diagnostics:/);
});

function metadataResult() {
  return {
    ok: true,
    exitCode: 0,
    stdout: JSON.stringify({
      number: 89,
      title: "Complete TASK-0042",
      state: "OPEN",
      isDraft: false,
      mergeable: "MERGEABLE",
      headRefName: "chore/complete-TASK-0042",
      baseRefName: "main",
      url: "https://github.com/example/repo/pull/89",
    }),
    stderr: "",
  };
}

function checkResult(rows) {
  return {
    ok: true,
    exitCode: 0,
    stdout: JSON.stringify(rows),
    stderr: "",
  };
}

const pendingCheck = {
  name: "Forge Contracts",
  state: "IN_PROGRESS",
  bucket: "pending",
  link: "https://example.test/pending",
};

const passingCheck = {
  name: "Forge Contracts",
  state: "SUCCESS",
  bucket: "pass",
  link: "https://example.test/pass",
};

const failingCheck = {
  name: "Forge Contracts",
  state: "FAILURE",
  bucket: "fail",
  link: "https://example.test/fail",
};

test("collectPrWatchStatus handles immediately registered passing checks", async () => {
  let checksJsonCalls = 0;
  const calls = [];

  const runner = async (command, args) => {
    calls.push([command, args]);

    if (args[0] === "pr" && args[1] === "view") {
      return metadataResult();
    }

    if (
      args[0] === "pr" &&
      args[1] === "checks" &&
      args.includes("--json")
    ) {
      checksJsonCalls += 1;

      return checksJsonCalls === 1
        ? checkResult([pendingCheck])
        : checkResult([passingCheck]);
    }

    if (
      args[0] === "pr" &&
      args[1] === "checks" &&
      args.includes("--watch")
    ) {
      return {
        ok: true,
        exitCode: 0,
        stdout: "checks passed",
        stderr: "",
      };
    }

    throw new Error(
      `Unexpected command: ${command} ${args.join(" ")}`,
    );
  };

  const result = await collectPrWatchStatus({
    prNumber: 89,
    runner,
    registrationAttempts: 3,
    registrationDelayMs: 0,
    sleep: async () => {},
  });

  assert.equal(result.registration.state, "immediate");
  assert.equal(result.registration.attempts, 1);
  assert.equal(result.state, "passing");
  assert.equal(result.watch.skipped, false);
  assert.equal(
    calls.filter(([, args]) => args.includes("--watch")).length,
    1,
  );
});

test("collectPrWatchStatus retries delayed check registration", async () => {
  let checksJsonCalls = 0;
  const sleepCalls = [];

  const runner = async (command, args) => {
    if (args[0] === "pr" && args[1] === "view") {
      return metadataResult();
    }

    if (
      args[0] === "pr" &&
      args[1] === "checks" &&
      args.includes("--json")
    ) {
      checksJsonCalls += 1;

      if (checksJsonCalls === 1) {
        return {
          ok: false,
          exitCode: 1,
          stdout: "",
          stderr: "no checks reported on the branch",
        };
      }

      if (checksJsonCalls === 2) {
        return checkResult([pendingCheck]);
      }

      return checkResult([passingCheck]);
    }

    if (
      args[0] === "pr" &&
      args[1] === "checks" &&
      args.includes("--watch")
    ) {
      return {
        ok: true,
        exitCode: 0,
        stdout: "checks passed",
        stderr: "",
      };
    }

    throw new Error(
      `Unexpected command: ${command} ${args.join(" ")}`,
    );
  };

  const result = await collectPrWatchStatus({
    prNumber: 89,
    runner,
    registrationAttempts: 3,
    registrationDelayMs: 25,
    sleep: async (milliseconds) => {
      sleepCalls.push(milliseconds);
    },
  });

  assert.equal(result.registration.state, "delayed");
  assert.equal(result.registration.attempts, 2);
  assert.deepEqual(sleepCalls, [25]);
  assert.equal(result.state, "passing");
});

test("collectPrWatchStatus reports persistent missing checks without starting watch", async () => {
  const calls = [];
  const sleepCalls = [];

  const runner = async (command, args) => {
    calls.push([command, args]);

    if (args[0] === "pr" && args[1] === "view") {
      return metadataResult();
    }

    if (
      args[0] === "pr" &&
      args[1] === "checks" &&
      args.includes("--json")
    ) {
      return checkResult([]);
    }

    throw new Error(
      `Unexpected command: ${command} ${args.join(" ")}`,
    );
  };

  const result = await collectPrWatchStatus({
    prNumber: 89,
    runner,
    registrationAttempts: 3,
    registrationDelayMs: 10,
    sleep: async (milliseconds) => {
      sleepCalls.push(milliseconds);
    },
  });

  assert.equal(result.registration.state, "missing");
  assert.equal(result.registration.attempts, 3);
  assert.equal(result.state, "missing");
  assert.equal(result.watch.skipped, true);
  assert.deepEqual(sleepCalls, [10, 10]);
  assert.equal(
    calls.filter(([, args]) => args.includes("--watch")).length,
    0,
  );
  assert.match(
    result.errors.join("\n"),
    /No PR checks registered after 3 attempts/,
  );
});

test("collectPrWatchStatus does not retry real GitHub CLI failures", async () => {
  const calls = [];
  const sleepCalls = [];

  const runner = async (command, args) => {
    calls.push([command, args]);

    if (args[0] === "pr" && args[1] === "view") {
      return metadataResult();
    }

    if (
      args[0] === "pr" &&
      args[1] === "checks" &&
      args.includes("--json")
    ) {
      return {
        ok: false,
        exitCode: 1,
        stdout: "",
        stderr: "authentication failed",
      };
    }

    throw new Error(
      `Unexpected command: ${command} ${args.join(" ")}`,
    );
  };

  const result = await collectPrWatchStatus({
    prNumber: 89,
    runner,
    registrationAttempts: 5,
    registrationDelayMs: 10,
    sleep: async (milliseconds) => {
      sleepCalls.push(milliseconds);
    },
  });

  assert.equal(result.registration.state, "unavailable");
  assert.equal(result.registration.attempts, 1);
  assert.equal(result.state, "unavailable");
  assert.equal(result.watch.skipped, true);
  assert.deepEqual(sleepCalls, []);
  assert.match(
    result.errors.join("\n"),
    /authentication failed/,
  );
});

test("collectPrWatchStatus treats malformed registration JSON as unavailable", async () => {
  const runner = async (command, args) => {
    if (args[0] === "pr" && args[1] === "view") {
      return metadataResult();
    }

    if (
      args[0] === "pr" &&
      args[1] === "checks" &&
      args.includes("--json")
    ) {
      return {
        ok: true,
        exitCode: 0,
        stdout: "{",
        stderr: "",
      };
    }

    throw new Error(
      `Unexpected command: ${command} ${args.join(" ")}`,
    );
  };

  const result = await collectPrWatchStatus({
    prNumber: 89,
    runner,
    registrationAttempts: 3,
    registrationDelayMs: 0,
    sleep: async () => {},
  });

  assert.equal(result.registration.state, "unavailable");
  assert.equal(result.state, "unavailable");
  assert.match(
    result.errors.join("\n"),
    /malformed JSON/,
  );
});

test("collectPrWatchStatus preserves failing final checks", async () => {
  let checksJsonCalls = 0;

  const runner = async (command, args) => {
    if (args[0] === "pr" && args[1] === "view") {
      return metadataResult();
    }

    if (
      args[0] === "pr" &&
      args[1] === "checks" &&
      args.includes("--json")
    ) {
      checksJsonCalls += 1;

      return checksJsonCalls === 1
        ? checkResult([pendingCheck])
        : checkResult([failingCheck]);
    }

    if (
      args[0] === "pr" &&
      args[1] === "checks" &&
      args.includes("--watch")
    ) {
      return {
        ok: false,
        exitCode: 1,
        stdout: "",
        stderr: "checks failed",
      };
    }

    throw new Error(
      `Unexpected command: ${command} ${args.join(" ")}`,
    );
  };

  const result = await collectPrWatchStatus({
    prNumber: 89,
    runner,
    registrationAttempts: 2,
    registrationDelayMs: 0,
    sleep: async () => {},
  });

  assert.equal(result.state, "failing");
  assert.equal(result.summary.failing, 1);
  assert.equal(result.watch.ok, false);
});

test("collectPrWatchStatus preserves pending final checks", async () => {
  const runner = async (command, args) => {
    if (args[0] === "pr" && args[1] === "view") {
      return metadataResult();
    }

    if (
      args[0] === "pr" &&
      args[1] === "checks" &&
      args.includes("--json")
    ) {
      return checkResult([pendingCheck]);
    }

    if (
      args[0] === "pr" &&
      args[1] === "checks" &&
      args.includes("--watch")
    ) {
      return {
        ok: false,
        exitCode: 8,
        stdout: "",
        stderr: "checks still pending",
      };
    }

    throw new Error(
      `Unexpected command: ${command} ${args.join(" ")}`,
    );
  };

  const result = await collectPrWatchStatus({
    prNumber: 89,
    runner,
    registrationAttempts: 2,
    registrationDelayMs: 0,
    sleep: async () => {},
  });

  assert.equal(result.state, "pending");
  assert.equal(result.summary.pending, 1);
});

test("renderPrWatchReport exposes delayed registration diagnostics", () => {
  const report = renderPrWatchReport({
    prNumber: 89,
    metadata: {
      title: "Complete TASK-0042",
      state: "OPEN",
      mergeable: "MERGEABLE",
      headRefName: "chore/complete-TASK-0042",
      baseRefName: "main",
      url: "https://github.com/example/repo/pull/89",
    },
    registration: {
      state: "delayed",
      attempts: 2,
      maxAttempts: 12,
    },
    watch: {
      ok: true,
      exitCode: 0,
      skipped: false,
    },
    summary: {
      total: 1,
      passing: 1,
      failing: 0,
      pending: 0,
      skipped: 0,
      unknown: 0,
    },
    state: "passing",
    errors: [],
  });

  assert.match(report, /Registration:/);
  assert.match(report, /State: delayed/);
  assert.match(report, /Attempts: 2\/12/);
  assert.match(report, /Delayed: yes/);
});
