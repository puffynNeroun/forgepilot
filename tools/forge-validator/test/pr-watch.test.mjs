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

test("collectPrWatchStatus handles simulated GitHub CLI failures without mutation", async () => {
  const calls = [];
  const runner = async (command, args) => {
    calls.push([command, args]);

    if (args[0] === "pr" && args[1] === "view") {
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

    if (args[0] === "pr" && args[1] === "checks" && args.includes("--watch")) {
      return { ok: false, exitCode: 8, stdout: "", stderr: "checks did not pass" };
    }

    if (args[0] === "pr" && args[1] === "checks" && args.includes("--json")) {
      return { ok: false, exitCode: 1, stdout: "", stderr: "no checks reported" };
    }

    throw new Error(`Unexpected command: ${command} ${args.join(" ")}`);
  };

  const result = await collectPrWatchStatus({ prNumber: 89, runner });

  assert.equal(result.state, "unavailable");
  assert.equal(result.metadata.title, "Complete TASK-0042");
  assert.match(result.errors.join("\n"), /PR checks unavailable/);
  assert.deepEqual(
    calls.map(([command, args]) => [command, args.slice(0, 3)]),
    [
      ["gh", ["pr", "view", "89"]],
      ["gh", ["pr", "checks", "89"]],
      ["gh", ["pr", "checks", "89"]],
    ],
  );
});
