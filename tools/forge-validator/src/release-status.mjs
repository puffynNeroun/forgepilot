#!/usr/bin/env node

import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const currentFile = fileURLToPath(import.meta.url);
const srcDir = path.dirname(currentFile);
const packageRoot = path.resolve(srcDir, "..");
const repoRoot = path.resolve(packageRoot, "../..");

const githubReleaseFields = [
  "tagName",
  "name",
  "url",
  "publishedAt",
  "targetCommitish",
  "isDraft",
  "isPrerelease",
].join(",");

function stripSeparator(args) {
  if (args[0] === "--") {
    return args.slice(1);
  }

  return args;
}

export function renderHelp() {
  return [
    "Forge Release Status",
    "",
    "Usage:",
    "  forge release status -- --tag TAG --target COMMIT --title \"Release title\"",
    "",
    "Options:",
    "  --tag TAG        Required release tag, for example v0.4.0.",
    "  --target COMMIT  Required expected peeled tag target commit.",
    "  --title TITLE    Required GitHub Release title.",
    "  --notes PATH     Optional release notes path. Defaults to docs/releases/TAG.md.",
    "  --remote NAME    Optional git remote. Defaults to origin.",
    "",
    "This command is read-only. It verifies local tag, remote tag, release notes, and GitHub Release metadata.",
  ].join("\n");
}

export function parseReleaseStatusArgs(argv = []) {
  const args = stripSeparator(argv);
  const parsed = {
    remote: "origin",
  };
  const errors = [];

  if (args.includes("--help") || args.includes("-h") || args[0] === "help") {
    return {
      help: true,
    };
  }

  const optionNames = new Set(["--tag", "--target", "--title", "--notes", "--remote"]);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!optionNames.has(arg)) {
      errors.push(`Unknown argument: ${arg}`);
      continue;
    }

    const value = args[index + 1];

    if (!value || value.startsWith("--")) {
      errors.push(`Missing value for ${arg}`);
      continue;
    }

    if (arg === "--tag") {
      parsed.tag = value;
    } else if (arg === "--target") {
      parsed.target = value;
    } else if (arg === "--title") {
      parsed.title = value;
    } else if (arg === "--notes") {
      parsed.notes = value;
    } else if (arg === "--remote") {
      parsed.remote = value;
    }

    index += 1;
  }

  for (const required of ["tag", "target", "title"]) {
    if (!parsed[required]) {
      errors.push(`Missing required argument: --${required}`);
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    ...parsed,
  };
}

export function releaseNotesPathForTag(tag) {
  return path.posix.join("docs", "releases", `${tag}.md`);
}

export function parseLsRemoteTagOutput(output, tag) {
  const result = {
    tag,
    tagSha: null,
    peeledTarget: null,
  };

  for (const line of output.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    const [sha, ref] = trimmed.split(/\s+/);

    if (ref === `refs/tags/${tag}`) {
      result.tagSha = sha;
    }

    if (ref === `refs/tags/${tag}^{}`) {
      result.peeledTarget = sha;
    }
  }

  return result;
}

export function evaluateLocalTag({ tag, target, expectedTarget, error }) {
  const actualTarget = target ? target.trim() : null;
  const errors = [];

  if (error) {
    errors.push(`Local tag ${tag} is missing or cannot be resolved: ${error}`);
  }

  if (!error && !actualTarget) {
    errors.push(`Local tag ${tag} is missing or resolved to an empty target.`);
  }

  if (actualTarget && actualTarget !== expectedTarget) {
    errors.push(`Local tag ${tag} target mismatch: expected ${expectedTarget}, got ${actualTarget}.`);
  }

  return {
    ok: errors.length === 0,
    state: actualTarget && !error ? "exists" : "missing",
    target: actualTarget,
    match: Boolean(actualTarget && actualTarget === expectedTarget),
    errors,
  };
}

export function evaluateRemoteTag({ tag, remote, parsed, expectedTarget, error }) {
  const errors = [];
  const tagSha = parsed?.tagSha ?? null;
  const peeledTarget = parsed?.peeledTarget ?? null;

  if (error) {
    errors.push(`Remote tag ${tag} on ${remote} cannot be inspected: ${error}`);
  }

  if (!error && !tagSha) {
    errors.push(`Remote tag ${tag} is missing on ${remote}.`);
  }

  if (!error && tagSha && !peeledTarget) {
    errors.push(`Remote tag ${tag} is missing peeled target refs/tags/${tag}^{} on ${remote}.`);
  }

  if (peeledTarget && peeledTarget !== expectedTarget) {
    errors.push(`Remote tag ${tag} peeled target mismatch: expected ${expectedTarget}, got ${peeledTarget}.`);
  }

  return {
    ok: errors.length === 0,
    remote,
    state: tagSha && !error ? "exists" : "missing",
    tagSha,
    peeledTarget,
    match: Boolean(peeledTarget && peeledTarget === expectedTarget),
    errors,
  };
}

export function evaluateGitHubRelease({ tag, title, release, error }) {
  const errors = [];

  if (error) {
    return {
      ok: false,
      state: "missing",
      release: null,
      errors: [`GitHub Release ${tag} is missing or cannot be inspected: ${error}`],
    };
  }

  if (!release || typeof release !== "object" || Array.isArray(release)) {
    return {
      ok: false,
      state: "malformed",
      release,
      errors: [`GitHub Release ${tag} metadata is missing or malformed.`],
    };
  }

  if (release.tagName !== tag) {
    errors.push(`GitHub Release tag mismatch: expected ${tag}, got ${release.tagName ?? "(missing)"}.`);
  }

  if (release.name !== title) {
    errors.push(`GitHub Release title mismatch: expected ${title}, got ${release.name ?? "(missing)"}.`);
  }

  if (release.isDraft !== false) {
    errors.push(`GitHub Release ${tag} must not be a draft.`);
  }

  if (release.isPrerelease !== false) {
    errors.push(`GitHub Release ${tag} must not be a prerelease.`);
  }

  if (!release.url) {
    errors.push(`GitHub Release ${tag} is missing url.`);
  }

  if (!release.publishedAt) {
    errors.push(`GitHub Release ${tag} is missing publishedAt.`);
  }

  return {
    ok: errors.length === 0,
    state: "exists",
    release,
    errors,
  };
}

export function computeReleaseStatus({
  tag,
  target,
  title,
  notesPath,
  remote,
  notesExists,
  localTag,
  remoteTag,
  githubRelease,
}) {
  const notes = {
    ok: notesExists,
    path: notesPath,
    state: notesExists ? "exists" : "missing",
    errors: notesExists ? [] : [`Release notes file is missing: ${notesPath}.`],
  };

  const errors = [
    ...notes.errors,
    ...localTag.errors,
    ...remoteTag.errors,
    ...githubRelease.errors,
  ];

  return {
    ok: errors.length === 0,
    tag,
    expectedTarget: target,
    title,
    remote,
    notes,
    localTag,
    remoteTag,
    githubRelease,
    errors,
  };
}

function yesNo(value) {
  return value ? "yes" : "no";
}

function valueOrNone(value) {
  return value || "(none)";
}

export function renderReleaseStatus(status) {
  const release = status.githubRelease.release;

  const lines = [
    "Forge Release Status",
    "",
    "Current state:",
    `- Tag: ${status.tag}`,
    `- Expected target: ${status.expectedTarget}`,
    `- Release title: ${status.title}`,
    `- Release notes: ${status.notes.path}`,
    "",
    "Release notes:",
    `- State: ${status.notes.state}`,
    "",
    "Local tag:",
    `- State: ${status.localTag.state}`,
    `- Target: ${valueOrNone(status.localTag.target)}`,
    `- Match: ${yesNo(status.localTag.match)}`,
    "",
    "Remote tag:",
    `- Remote: ${status.remoteTag.remote}`,
    `- State: ${status.remoteTag.state}`,
    `- Peeled target: ${valueOrNone(status.remoteTag.peeledTarget)}`,
    `- Match: ${yesNo(status.remoteTag.match)}`,
    "",
    "GitHub release:",
    `- State: ${status.githubRelease.state}`,
    `- Title: ${valueOrNone(release?.name)}`,
    `- Draft: ${valueOrNone(release?.isDraft?.toString())}`,
    `- Prerelease: ${valueOrNone(release?.isPrerelease?.toString())}`,
    `- Published: ${valueOrNone(release?.publishedAt)}`,
    `- URL: ${valueOrNone(release?.url)}`,
    "",
  ];

  if (status.errors.length > 0) {
    lines.push("Problems:");

    for (const error of status.errors) {
      lines.push(`- ${error}`);
    }

    lines.push("");
  }

  lines.push("Next recommended action:");

  if (status.ok) {
    lines.push(`- Release ${status.tag} is verified.`);
  } else {
    lines.push(`- Fix release status problems before continuing.`);
  }

  return lines.join("\n");
}

async function runCommand(command, args) {
  try {
    const { stdout } = await execFileAsync(command, args, {
      cwd: repoRoot,
      maxBuffer: 1024 * 1024,
    });

    return {
      ok: true,
      stdout,
    };
  } catch (error) {
    const stderr = typeof error.stderr === "string" ? error.stderr.trim() : "";
    const message = stderr || error.message || String(error);

    return {
      ok: false,
      error: message,
    };
  }
}

async function pathExists(relativePath) {
  try {
    await access(path.join(repoRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

export async function collectReleaseStatus(args) {
  const notesPath = args.notes ?? releaseNotesPathForTag(args.tag);
  const notesExists = await pathExists(notesPath);

  const localResult = await runCommand("git", ["rev-parse", `${args.tag}^{}`]);
  const localTag = evaluateLocalTag({
    tag: args.tag,
    target: localResult.ok ? localResult.stdout : null,
    expectedTarget: args.target,
    error: localResult.ok ? null : localResult.error,
  });

  const remoteResult = await runCommand("git", ["ls-remote", "--tags", args.remote, `refs/tags/${args.tag}*`]);
  const remoteTag = evaluateRemoteTag({
    tag: args.tag,
    remote: args.remote,
    parsed: remoteResult.ok ? parseLsRemoteTagOutput(remoteResult.stdout, args.tag) : null,
    expectedTarget: args.target,
    error: remoteResult.ok ? null : remoteResult.error,
  });

  const githubResult = await runCommand("gh", [
    "release",
    "view",
    args.tag,
    "--json",
    githubReleaseFields,
  ]);

  let release = null;
  let githubError = githubResult.ok ? null : githubResult.error;

  if (githubResult.ok) {
    try {
      release = JSON.parse(githubResult.stdout);
    } catch (error) {
      githubError = `Malformed GitHub Release JSON: ${error.message}`;
    }
  }

  const githubRelease = evaluateGitHubRelease({
    tag: args.tag,
    title: args.title,
    release,
    error: githubError,
  });

  return computeReleaseStatus({
    tag: args.tag,
    target: args.target,
    title: args.title,
    notesPath,
    remote: args.remote,
    notesExists,
    localTag,
    remoteTag,
    githubRelease,
  });
}

export async function main(argv = process.argv.slice(2)) {
  const parsed = parseReleaseStatusArgs(argv);

  if (parsed.help) {
    console.log(renderHelp());
    return 0;
  }

  if (!parsed.ok) {
    console.error(parsed.errors.join("\n"));
    console.error("");
    console.error(renderHelp());
    return 1;
  }

  const status = await collectReleaseStatus(parsed);
  console.log(renderReleaseStatus(status));

  return status.ok ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main();
}
