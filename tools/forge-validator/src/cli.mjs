#!/usr/bin/env node

import { spawn, spawnSync} from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const srcDir = path.dirname(currentFile);
const packageRoot = path.resolve(srcDir, "..");
const repoRoot = path.resolve(packageRoot, "../..");

const scriptByCommand = {
  next: "next.mjs",
  status: "status.mjs",
  smoke: "workflow-smoke.mjs",
  run: "operator-runner.mjs",
};

const taskScriptByCommand = {
  new: "scaffold-task.mjs",
  stage: "stage-task.mjs",
  complete: "complete-task.mjs",
  check: "post-task-check.mjs",
};

const artifactScriptByCommand = {
  new: "scaffold-artifact.mjs",
};

function stripSeparator(args) {
  if (args[0] === "--") {
    return args.slice(1);
  }

  return args;
}


const prOperatorScriptByCommand = {
  "create-implementation": "create-implementation-pr.sh",
  "merge-implementation": "merge-implementation-pr.sh",
  "create-completion": "create-completion-pr.sh",
  "merge-completion": "merge-completion-pr.sh",
};

function stripOptionalPrOperatorSeparator(args) {
  return args[0] === "--" ? args.slice(1) : args;
}

function readRequiredFlag(args, flagName) {
  const index = args.indexOf(flagName);

  if (index === -1 || index + 1 >= args.length || args[index + 1].startsWith("--")) {
    throw new Error(`Missing required ${flagName} argument.`);
  }

  return args[index + 1];
}

function rejectUnknownPrOperatorArgs(args, allowedFlags) {
  const allowed = new Set(allowedFlags);

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];

    if (!value.startsWith("--")) {
      continue;
    }

    if (!allowed.has(value)) {
      throw new Error(`Unknown argument: ${value}.`);
    }

    index += 1;
  }
}

function cliRepositoryRoot() {
  const currentFile = fileURLToPath(import.meta.url);
  const srcDir = path.dirname(currentFile);
  const packageRoot = path.resolve(srcDir, "..");

  return path.resolve(packageRoot, "../..");
}

function buildPrOperatorScriptPath(scriptName) {
  return path.join(cliRepositoryRoot(), "scripts/operator", scriptName);
}

export function resolvePrOperatorCommand(argv) {
  const [group, command, ...rawArgs] = argv;

  if (group !== "pr" || !prOperatorScriptByCommand[command]) {
    return null;
  }

  const args = stripOptionalPrOperatorSeparator(rawArgs);
  const scriptPath = buildPrOperatorScriptPath(prOperatorScriptByCommand[command]);

  if (command === "create-implementation") {
    rejectUnknownPrOperatorArgs(args, ["--id", "--title"]);

    return {
      command: "bash",
      args: [
        scriptPath,
        readRequiredFlag(args, "--id"),
        readRequiredFlag(args, "--title"),
      ],
    };
  }

  if (command === "merge-implementation") {
    rejectUnknownPrOperatorArgs(args, ["--pr", "--id", "--branch"]);

    return {
      command: "bash",
      args: [
        scriptPath,
        readRequiredFlag(args, "--pr"),
        readRequiredFlag(args, "--id"),
        readRequiredFlag(args, "--branch"),
      ],
    };
  }

  if (command === "create-completion") {
    rejectUnknownPrOperatorArgs(args, ["--id", "--branch"]);

    return {
      command: "bash",
      args: [
        scriptPath,
        readRequiredFlag(args, "--id"),
        readRequiredFlag(args, "--branch"),
      ],
    };
  }

  if (command === "merge-completion") {
    rejectUnknownPrOperatorArgs(args, ["--pr", "--id", "--branch"]);

    return {
      command: "bash",
      args: [
        scriptPath,
        readRequiredFlag(args, "--pr"),
        readRequiredFlag(args, "--id"),
        readRequiredFlag(args, "--branch"),
      ],
    };
  }

  return null;
}

export function runPrOperatorCommand(resolved) {
  const result = spawnSync(resolved.command, resolved.args, {
    cwd: cliRepositoryRoot(),
    stdio: "inherit",
  });

  return result.status ?? 1;
}


function baseRenderHelp() {
  return [
    "Forge CLI",
    "",
    "Usage:",
    "  forge help",

    "  forge next                         Show the next recommended operator action.",
    "  forge pr status                    Show read-only PR workflow status.",
    "  forge release status -- --tag v0.4.0 --target COMMIT --title \"Forge v0.4.0\"",
    "  forge status",
    "  forge smoke",
    "  forge verify",
    "  forge run inspect -- --id TASK-XXXX",
    "  forge run verify -- --id TASK-XXXX",
    "  forge task new -- --id TASK-XXXX --title \"Task title\"",
    "  forge task stage -- --id TASK-XXXX --stage planner",
    "  forge task complete -- --id TASK-XXXX",
    "  forge task check -- --id TASK-XXXX",
    "  forge artifact new -- --id TASK-XXXX --type plan",
    "  forge prompt ROLE [TASK_ID] [PR_NUMBER]",
    "  forge prompt --help",
    "  forge prompt --list",
    "",
    "Notes:",
    "  Existing pnpm scripts remain supported.",
    "  The optional -- separator is accepted for compatibility with current command usage.",
  ].join("\n");
}

export function resolveCommand(rawArgs) {
  const args = stripSeparator(rawArgs);
  const [command, subcommand, ...rest] = args;

  if (!command || command === "help" || command === "-h" || command === "--help") {
    return {
      kind: "help",
    };
  }

  if (command in scriptByCommand) {
    return {
      kind: "node-script",
      script: scriptByCommand[command],
      args: stripSeparator([subcommand, ...rest].filter((value) => value !== undefined)),
    };
  }


  if (command === "pr") {
    const prArgs = stripSeparator([subcommand, ...rest].filter((value) => value !== undefined));
    const [prSubcommand, ...prRest] = prArgs;

    if (!prSubcommand || prSubcommand === "status") {
      return {
        kind: "node-script",
        script: "pr-status.mjs",
        args: prSubcommand === "status" ? stripSeparator(prRest) : prArgs,
      };
    }

    if (prSubcommand === "watch") {
      return {
        kind: "node-script",
        script: "pr-watch.mjs",
        args: stripSeparator(prRest),
      };
    }

    if (prSubcommand === "help" || prSubcommand === "-h" || prSubcommand === "--help") {
      return {
        kind: "help",
      };
    }

    return {
      kind: "error",
      message: `Unknown pr subcommand '${prSubcommand}'. Expected one of: status, watch.`,
    };
  }

  if (command === "release") {
    const releaseArgs = stripSeparator([subcommand, ...rest].filter((value) => value !== undefined));
    const [releaseSubcommand, ...releaseRest] = releaseArgs;

    if (!releaseSubcommand || releaseSubcommand === "help" || releaseSubcommand === "-h" || releaseSubcommand === "--help") {
      return {
        kind: "error",
        message: "Missing release subcommand. Expected: status.",
      };
    }

    if (releaseSubcommand !== "status") {
      return {
        kind: "error",
        message: `Unknown release subcommand '${releaseSubcommand}'. Expected: status.`,
      };
    }

    return {
      kind: "node-script",
      script: "release-status.mjs",
      args: stripSeparator(releaseRest),
    };
  }

  if (command === "verify") {
    return {
      kind: "package-script",
      command: "pnpm",
      args: ["run", "verify", ...stripSeparator([subcommand, ...rest].filter((value) => value !== undefined))],
    };
  }

  if (command === "prompt") {
    const promptArgs = stripSeparator([subcommand, ...rest].filter((value) => value !== undefined));

    if (promptArgs[0] === "help") {
      promptArgs[0] = "--help";
    }

    return {
      kind: "prompt-script",
      args: promptArgs,
    };
  }

  if (command === "task") {
    if (!subcommand || subcommand === "help" || subcommand === "-h" || subcommand === "--help") {
      return {
        kind: "error",
        message: "Missing task subcommand. Expected one of: new, stage, complete.",
      };
    }

    if (!(subcommand in taskScriptByCommand)) {
      return {
        kind: "error",
        message: `Unknown task subcommand '${subcommand}'. Expected one of: new, stage, complete.`,
      };
    }

    return {
      kind: "node-script",
      script: taskScriptByCommand[subcommand],
      args: stripSeparator(rest),
    };
  }

  if (command === "artifact") {
    if (!subcommand || subcommand === "help" || subcommand === "-h" || subcommand === "--help") {
      return {
        kind: "error",
        message: "Missing artifact subcommand. Expected: new.",
      };
    }

    if (!(subcommand in artifactScriptByCommand)) {
      return {
        kind: "error",
        message: `Unknown artifact subcommand '${subcommand}'. Expected: new.`,
      };
    }

    return {
      kind: "node-script",
      script: artifactScriptByCommand[subcommand],
      args: stripSeparator(rest),
    };
  }

  return {
    kind: "error",
    message: `Unknown command '${command}'.`,
  };
}

function spawnCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: packageRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options,
    });

    child.on("error", (error) => {
      console.error(error.message);
      resolve(1);
    });

    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

export async function runResolvedCommand(resolved) {
  if (resolved.kind === "help") {
    console.log(renderHelp());
    return 0;
  }

  if (resolved.kind === "error") {
    console.error(resolved.message);
    console.error("");
    console.error(renderHelp());
    return 1;
  }

  if (resolved.kind === "node-script") {
    const scriptPath = path.join(srcDir, resolved.script);

    return spawnCommand(process.execPath, [scriptPath, ...resolved.args]);
  }

  if (resolved.kind === "prompt-script") {
    const scriptPath = path.join(repoRoot, "scripts", "operator", "prompt.sh");

    return spawnCommand("bash", [scriptPath, ...resolved.args], {
      cwd: repoRoot,
    });
  }

  if (resolved.kind === "package-script") {
    return spawnCommand(resolved.command, resolved.args);
  }

  console.error("Internal CLI error: unsupported command resolution.");
  return 1;
}

export async function main(argv = process.argv.slice(2)) {
  try {
    const prOperatorCommand = resolvePrOperatorCommand(argv);

    if (prOperatorCommand) {
      return runPrOperatorCommand(prOperatorCommand);
    }
  } catch (error) {
    console.error(error.message);
    return 1;
  }

  return runResolvedCommand(resolveCommand(argv));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main();
}

export function renderHelp() {
  const baseHelp = baseRenderHelp();

  if (baseHelp.includes("forge pr create-implementation")) {
    return baseHelp;
  }

  return `${baseHelp}

PR operator commands:
  forge pr create-implementation -- --id TASK-XXXX --title "TASK-XXXX: Implementation"
  forge pr merge-implementation -- --pr 123 --id TASK-XXXX --branch task/TASK-XXXX-example
  forge pr create-completion -- --id TASK-XXXX --branch chore/complete-TASK-XXXX
  forge pr merge-completion -- --pr 124 --id TASK-XXXX --branch chore/complete-TASK-XXXX`;
}
