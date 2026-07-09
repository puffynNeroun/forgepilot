import assert from "node:assert/strict";
import test from "node:test";

import {
  computeReleaseStatus,
  evaluateGitHubRelease,
  evaluateLocalTag,
  evaluateRemoteTag,
  parseLsRemoteTagOutput,
  parseReleaseStatusArgs,
  releaseNotesPathForTag,
  renderReleaseStatus,
} from "../src/release-status.mjs";

const target = "820b566f5cda0a4b9610704708c4026c4af57a66";
const tagObject = "1111111111111111111111111111111111111111";

function validGithubRelease(overrides = {}) {
  return {
    tagName: "v0.4.0",
    name: "Forge v0.4.0",
    url: "https://github.com/example/repo/releases/tag/v0.4.0",
    publishedAt: "2026-07-05T00:00:00Z",
    targetCommitish: target,
    isDraft: false,
    isPrerelease: false,
    ...overrides,
  };
}

function validStatus(overrides = {}) {
  return computeReleaseStatus({
    tag: "v0.4.0",
    target,
    title: "Forge v0.4.0",
    notesPath: "docs/releases/v0.4.0.md",
    remote: "origin",
    notesExists: true,
    localTag: evaluateLocalTag({
      tag: "v0.4.0",
      target,
      expectedTarget: target,
    }),
    remoteTag: evaluateRemoteTag({
      tag: "v0.4.0",
      remote: "origin",
      parsed: {
        tagSha: tagObject,
        peeledTarget: target,
      },
      expectedTarget: target,
    }),
    githubRelease: evaluateGitHubRelease({
      tag: "v0.4.0",
      title: "Forge v0.4.0",
      release: validGithubRelease(),
    }),
    ...overrides,
  });
}

test("parseReleaseStatusArgs requires tag, target, and title", () => {
  const result = parseReleaseStatusArgs([]);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /Missing required argument: --tag/);
  assert.match(result.errors.join("\n"), /Missing required argument: --target/);
  assert.match(result.errors.join("\n"), /Missing required argument: --title/);
});

test("parseReleaseStatusArgs accepts required and optional arguments", () => {
  const result = parseReleaseStatusArgs([
    "--",
    "--tag",
    "v0.4.0",
    "--target",
    target,
    "--title",
    "Forge v0.4.0",
    "--notes",
    "custom.md",
    "--remote",
    "upstream",
  ]);

  assert.equal(result.ok, true);
  assert.equal(result.tag, "v0.4.0");
  assert.equal(result.target, target);
  assert.equal(result.title, "Forge v0.4.0");
  assert.equal(result.notes, "custom.md");
  assert.equal(result.remote, "upstream");
});

test("parseReleaseStatusArgs reports unknown arguments and missing values", () => {
  const result = parseReleaseStatusArgs([
    "--tag",
    "--target",
    target,
    "--title",
    "Forge v0.4.0",
    "--bad",
  ]);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /Missing value for --tag/);
  assert.match(result.errors.join("\n"), /Unknown argument: --bad/);
});

test("releaseNotesPathForTag returns the conventional release notes path", () => {
  assert.equal(releaseNotesPathForTag("v0.4.0"), "docs/releases/v0.4.0.md");
});

test("parseLsRemoteTagOutput reads annotated tag and peeled target", () => {
  const output = [
    `${tagObject}\trefs/tags/v0.4.0`,
    `${target}\trefs/tags/v0.4.0^{}`,
  ].join("\n");

  assert.deepEqual(parseLsRemoteTagOutput(output, "v0.4.0"), {
    tag: "v0.4.0",
    tagSha: tagObject,
    peeledTarget: target,
  });
});

test("evaluateLocalTag accepts matching target", () => {
  const result = evaluateLocalTag({
    tag: "v0.4.0",
    target: `${target}\n`,
    expectedTarget: target,
  });

  assert.equal(result.ok, true);
  assert.equal(result.state, "exists");
  assert.equal(result.target, target);
  assert.equal(result.match, true);
});

test("evaluateLocalTag rejects missing local tag", () => {
  const result = evaluateLocalTag({
    tag: "v9.9.9",
    expectedTarget: target,
    error: "fatal: ambiguous argument",
  });

  assert.equal(result.ok, false);
  assert.equal(result.state, "missing");
  assert.match(result.errors.join("\n"), /Local tag v9.9.9 is missing/);
});

test("evaluateLocalTag rejects target mismatch", () => {
  const result = evaluateLocalTag({
    tag: "v0.4.0",
    target: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    expectedTarget: target,
  });

  assert.equal(result.ok, false);
  assert.equal(result.match, false);
  assert.match(result.errors.join("\n"), /Local tag v0.4.0 target mismatch/);
});

test("evaluateRemoteTag accepts matching peeled target", () => {
  const result = evaluateRemoteTag({
    tag: "v0.4.0",
    remote: "origin",
    parsed: {
      tagSha: tagObject,
      peeledTarget: target,
    },
    expectedTarget: target,
  });

  assert.equal(result.ok, true);
  assert.equal(result.state, "exists");
  assert.equal(result.match, true);
});

test("evaluateRemoteTag rejects missing remote tag", () => {
  const result = evaluateRemoteTag({
    tag: "v0.4.0",
    remote: "origin",
    parsed: {
      tagSha: null,
      peeledTarget: null,
    },
    expectedTarget: target,
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /Remote tag v0.4.0 is missing on origin/);
});

test("evaluateRemoteTag rejects missing peeled remote target", () => {
  const result = evaluateRemoteTag({
    tag: "v0.4.0",
    remote: "origin",
    parsed: {
      tagSha: tagObject,
      peeledTarget: null,
    },
    expectedTarget: target,
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /missing peeled target/);
});

test("evaluateRemoteTag rejects peeled target mismatch", () => {
  const result = evaluateRemoteTag({
    tag: "v0.4.0",
    remote: "origin",
    parsed: {
      tagSha: tagObject,
      peeledTarget: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    },
    expectedTarget: target,
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /peeled target mismatch/);
});

test("evaluateGitHubRelease accepts valid metadata", () => {
  const result = evaluateGitHubRelease({
    tag: "v0.4.0",
    title: "Forge v0.4.0",
    release: validGithubRelease(),
  });

  assert.equal(result.ok, true);
  assert.equal(result.state, "exists");
});

test("evaluateGitHubRelease rejects missing release", () => {
  const result = evaluateGitHubRelease({
    tag: "v0.4.0",
    title: "Forge v0.4.0",
    error: "release not found",
  });

  assert.equal(result.ok, false);
  assert.equal(result.state, "missing");
  assert.match(result.errors.join("\n"), /GitHub Release v0.4.0 is missing/);
});

test("evaluateGitHubRelease rejects tag and title mismatch", () => {
  const result = evaluateGitHubRelease({
    tag: "v0.4.0",
    title: "Forge v0.4.0",
    release: validGithubRelease({
      tagName: "v0.3.0",
      name: "Wrong title",
    }),
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /tag mismatch/);
  assert.match(result.errors.join("\n"), /title mismatch/);
});

test("evaluateGitHubRelease rejects draft and prerelease", () => {
  const result = evaluateGitHubRelease({
    tag: "v0.4.0",
    title: "Forge v0.4.0",
    release: validGithubRelease({
      isDraft: true,
      isPrerelease: true,
    }),
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /must not be a draft/);
  assert.match(result.errors.join("\n"), /must not be a prerelease/);
});

test("evaluateGitHubRelease rejects malformed metadata", () => {
  const result = evaluateGitHubRelease({
    tag: "v0.4.0",
    title: "Forge v0.4.0",
    release: null,
  });

  assert.equal(result.ok, false);
  assert.equal(result.state, "malformed");
});

test("computeReleaseStatus aggregates valid checks", () => {
  const status = validStatus();

  assert.equal(status.ok, true);
  assert.deepEqual(status.errors, []);
});

test("computeReleaseStatus reports missing release notes", () => {
  const status = validStatus({
    notesExists: false,
  });

  assert.equal(status.ok, false);
  assert.match(status.errors.join("\n"), /Release notes file is missing/);
});

test("renderReleaseStatus renders verified release", () => {
  const output = renderReleaseStatus(validStatus());

  assert.match(output, /Forge Release Status/);
  assert.match(output, /Release v0.4.0 is verified/);
  assert.match(output, /Match: yes/);
});

test("renderReleaseStatus renders failures", () => {
  const output = renderReleaseStatus(validStatus({
    notesExists: false,
  }));

  assert.match(output, /Problems:/);
  assert.match(output, /Release notes file is missing/);
  assert.match(output, /Fix release status problems/);
});
