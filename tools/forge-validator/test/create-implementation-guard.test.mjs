import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");

function readRepoFile(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

test("create implementation PR refuses main before push or PR creation", () => {
  const script = readRepoFile("scripts/operator/create-implementation-pr.sh");

  const guardIndex = script.indexOf("Refusing to create an implementation PR from main.");
  const pushIndex = script.indexOf('git push -u origin "$BRANCH_NAME"');
  const prCreateIndex = script.indexOf("gh pr create");

  assert.notEqual(guardIndex, -1, "main-branch guard message should exist");
  assert.notEqual(pushIndex, -1, "push command should still be present");
  assert.notEqual(prCreateIndex, -1, "PR creation command should still be present");

  assert.ok(
    guardIndex < pushIndex,
    "main-branch guard must run before git push",
  );

  assert.ok(
    guardIndex < prCreateIndex,
    "main-branch guard must run before gh pr create",
  );

  assert.match(script, /\[ "\$CURRENT_BRANCH" = "main" \]/);
  assert.match(script, /\[ "\$BRANCH_NAME" = "main" \]/);
});

test("create implementation PR main guard is documented", () => {
  const script = readRepoFile("scripts/operator/create-implementation-pr.sh");
  const docs = readRepoFile("docs/OPERATOR_SCRIPTS.md");

  assert.match(script, /Safety: refuses to run from main/);
  assert.match(docs, /refuses to run from `main`/);
  assert.match(docs, /non-main task branch/);
});
