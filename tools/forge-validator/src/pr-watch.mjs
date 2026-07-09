import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024;

export function stripSeparator(args) {
  return args[0] === "--" ? args.slice(1) : args;
}

export function renderHelp() {
  return `Forge PR Checks Watch

Usage:
  forge pr watch -- --pr <number>
  node tools/forge-validator/src/cli.mjs pr watch -- --pr <number>

Required:
  --pr <number>   GitHub pull request number to watch.

Behavior:
  Watches GitHub PR checks, inspects final check state, and reports the next safe operator action.

Read-only:
  This command does not create, edit, merge, push, delete, or modify local files.
`;
}

export function parsePrWatchArgs(rawArgs) {
  const args = stripSeparator(rawArgs);
  const errors = [];
  let help = false;
  let prNumber = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }

    if (arg === "--pr") {
      if (prNumber !== null) {
        errors.push("Duplicate required argument: --pr");
        index += 1;
        continue;
      }

      const value = args[index + 1];

      if (!value || value.startsWith("--")) {
        errors.push("Missing value for required argument: --pr");
        continue;
      }

      const parsed = Number(value);

      if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        errors.push(`Invalid PR number for --pr: ${value}`);
      } else {
        prNumber = parsed;
      }

      index += 1;
      continue;
    }

    errors.push(`Unknown argument: ${arg}`);
  }

  if (help) {
    return {
      ok: errors.length === 0,
      help: true,
      prNumber,
      errors,
    };
  }

  if (prNumber === null) {
    errors.push("Missing required argument: --pr");
  }

  return {
    ok: errors.length === 0,
    help: false,
    prNumber,
    errors,
  };
}

function stringValue(value) {
  return typeof value === "string" ? value : "";
}

export function normalizeCheckRows(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row) => ({
    name: stringValue(row?.name),
    state: stringValue(row?.state),
    bucket: stringValue(row?.bucket),
    link: stringValue(row?.link),
  }));
}

function classifyCheckRow(row) {
  const bucket = row.bucket.toLowerCase();
  const state = row.state.toLowerCase();

  if (
    bucket === "pass" ||
    bucket === "passing" ||
    bucket === "success" ||
    state === "success" ||
    state === "pass" ||
    state === "passed"
  ) {
    return "passing";
  }

  if (
    bucket === "skip" ||
    bucket === "skipped" ||
    bucket === "skipping" ||
    bucket === "neutral" ||
    state === "skipped" ||
    state === "neutral"
  ) {
    return "skipped";
  }

  if (
    bucket === "fail" ||
    bucket === "failed" ||
    bucket === "failing" ||
    bucket === "failure" ||
    bucket === "cancel" ||
    bucket === "cancelled" ||
    state === "failure" ||
    state === "failed" ||
    state === "error" ||
    state === "cancelled" ||
    state === "timed_out" ||
    state === "startup_failure"
  ) {
    return "failing";
  }

  if (
    bucket === "pending" ||
    bucket === "queued" ||
    bucket === "waiting" ||
    bucket === "expected" ||
    state === "pending" ||
    state === "queued" ||
    state === "in_progress" ||
    state === "waiting" ||
    state === "requested" ||
    state === "action_required"
  ) {
    return "pending";
  }

  return "unknown";
}

export function summarizeCheckRows(rows) {
  const normalizedRows = normalizeCheckRows(rows);
  const summary = {
    total: normalizedRows.length,
    passing: 0,
    failing: 0,
    pending: 0,
    skipped: 0,
    unknown: 0,
  };

  for (const row of normalizedRows) {
    const classification = classifyCheckRow(row);

    if (classification === "passing") {
      summary.passing += 1;
    } else if (classification === "failing") {
      summary.failing += 1;
    } else if (classification === "pending") {
      summary.pending += 1;
    } else if (classification === "skipped") {
      summary.skipped += 1;
    } else {
      summary.unknown += 1;
    }
  }

  return summary;
}

export function classifyCheckSummary(summary) {
  if (summary.total === 0) {
    return "missing";
  }

  if (summary.failing > 0) {
    return "failing";
  }

  if (summary.pending > 0) {
    return "pending";
  }

  if (summary.unknown > 0) {
    return "unavailable";
  }

  return "passing";
}

function nextActionForState(state, prNumber) {
  if (state === "passing") {
    return "Checks passed. Inspect `forge pr status` for the next safe operator action.";
  }

  if (state === "failing") {
    return "Inspect failed checks before merging.";
  }

  if (state === "pending") {
    return "Wait for PR checks to finish.";
  }

  return `Inspect GitHub checks manually with \`gh pr checks ${prNumber}\`.`;
}

function renderOptionalLine(label, value) {
  return `- ${label}: ${value || "(unavailable)"}`;
}

export function renderPrWatchReport(result) {
  const metadata = result.metadata || {};
  const lines = [
    "Forge PR Checks Watch",
    "",
    "Current state:",
    `- PR: #${result.prNumber}`,
    renderOptionalLine("Title", metadata.title),
    renderOptionalLine("State", metadata.state),
    renderOptionalLine("Mergeable", metadata.mergeable),
    renderOptionalLine("Head", metadata.headRefName),
    renderOptionalLine("Base", metadata.baseRefName),
    renderOptionalLine("URL", metadata.url),
    "",
    "Watch:",
    `- Exit code: ${result.watch.exitCode}`,
    `- State: ${result.watch.ok ? "completed" : "non-zero"}`,
    "",
    "Checks:",
    `- Total: ${result.summary.total}`,
    `- Passing: ${result.summary.passing}`,
    `- Failing: ${result.summary.failing}`,
    `- Pending: ${result.summary.pending}`,
    `- Skipped: ${result.summary.skipped}`,
    `- Unknown: ${result.summary.unknown}`,
    `- State: ${result.state}`,
  ];

  if (result.errors.length > 0) {
    lines.push("", "Diagnostics:");

    for (const error of result.errors) {
      lines.push(`- ${error}`);
    }
  }

  lines.push(
    "",
    "Next recommended action:",
    `- ${nextActionForState(result.state, result.prNumber)}`,
  );

  return `${lines.join("\n")}\n`;
}

export function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      {
        cwd: options.cwd,
        encoding: "utf8",
        maxBuffer: DEFAULT_MAX_BUFFER,
      },
      (error, stdout, stderr) => {
        const exitCode = error
          ? typeof error.code === "number"
            ? error.code
            : 1
          : 0;

        resolve({
          ok: !error,
          exitCode,
          stdout,
          stderr,
        });
      },
    );
  });
}

function parseJson(result, label, errors) {
  if (!result.ok) {
    const detail = result.stderr.trim() || result.stdout.trim() || "command failed";
    errors.push(`${label} unavailable: ${detail}`);
    return null;
  }

  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    errors.push(`${label} returned malformed JSON: ${error.message}`);
    return null;
  }
}

export async function collectPrWatchStatus(options) {
  const prNumber = options.prNumber;
  const cwd = options.cwd || process.cwd();
  const runner = options.runner || runCommand;
  const errors = [];

  const viewResult = await runner(
    "gh",
    [
      "pr",
      "view",
      String(prNumber),
      "--json",
      "number,title,state,isDraft,mergeable,headRefName,baseRefName,url",
    ],
    { cwd },
  );

  const metadata = parseJson(viewResult, "PR metadata", errors);

  const watchResult = await runner(
    "gh",
    ["pr", "checks", String(prNumber), "--watch"],
    { cwd },
  );

  const checksResult = await runner(
    "gh",
    ["pr", "checks", String(prNumber), "--json", "name,state,bucket,link"],
    { cwd },
  );

  const parsedChecks = parseJson(checksResult, "PR checks", errors);
  const checks = Array.isArray(parsedChecks) ? parsedChecks : [];
  const normalizedChecks = normalizeCheckRows(checks);
  const summary = summarizeCheckRows(normalizedChecks);

  let state = classifyCheckSummary(summary);

  if (!checksResult.ok || parsedChecks === null) {
    state = "unavailable";
  }

  if (parsedChecks !== null && !Array.isArray(parsedChecks)) {
    errors.push("PR checks JSON must be an array.");
    state = "unavailable";
  }

  return {
    prNumber,
    metadata,
    watch: {
      ok: watchResult.ok,
      exitCode: watchResult.exitCode,
      stderr: watchResult.stderr,
    },
    checks: normalizedChecks,
    summary,
    state,
    errors,
  };
}

export async function main(rawArgs = process.argv.slice(2), options = {}) {
  const parsed = parsePrWatchArgs(rawArgs);

  if (parsed.help) {
    if (parsed.errors.length > 0) {
      console.error(parsed.errors.join("\n"));
      return 1;
    }

    console.log(renderHelp());
    return 0;
  }

  if (!parsed.ok) {
    console.error("Forge PR Checks Watch");
    console.error("");
    console.error("Errors:");

    for (const error of parsed.errors) {
      console.error(`- ${error}`);
    }

    console.error("");
    console.error(renderHelp());
    return 1;
  }

  try {
    const result = await collectPrWatchStatus({
      prNumber: parsed.prNumber,
      cwd: options.cwd,
      runner: options.runner,
    });

    console.log(renderPrWatchReport(result));
    return result.state === "passing" ? 0 : 1;
  } catch (error) {
    console.error("Forge PR Checks Watch");
    console.error("");
    console.error(`Unexpected error: ${error.message}`);
    return 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (invokedFile === currentFile) {
  main().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
