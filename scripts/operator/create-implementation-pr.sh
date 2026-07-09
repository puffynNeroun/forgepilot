#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

usage() {
  echo "Preferred Forge command:"
  echo '  forge pr create-implementation -- --id TASK-XXXX --title "TASK-XXXX: Implementation"'
  echo
  echo "Compatibility script:"
  echo "Usage: bash scripts/operator/create-implementation-pr.sh TASK_ID PR_TITLE [BRANCH_NAME]"
  echo "Safety: refuses to run from main; use a non-main task branch."
}

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  usage
  exit 2
fi

TASK_ID="$1"
PR_TITLE="$2"
BRANCH_NAME="${3:-$(git branch --show-current)}"

forge_require_base_commands
forge_cd_root

forge_info "Validate implementation PR preconditions"
forge_require_clean_tree
forge_require_task_status "$TASK_ID" "ready_for_pr"
forge_require_artifact_chain "$TASK_ID"
forge_run_compact_verify "/tmp/forge-${TASK_ID:-operator}-create-implementation-pr-verify.log"

CURRENT_BRANCH="$(git branch --show-current)"
if [ "$CURRENT_BRANCH" = "main" ] || [ "$BRANCH_NAME" = "main" ]; then
  echo "ERROR: Refusing to create an implementation PR from main." >&2
  echo "Implementation PR head branch must be a non-main task branch." >&2
  echo "Current branch: ${CURRENT_BRANCH}" >&2
  echo "Requested head branch: ${BRANCH_NAME}" >&2
  echo "Switch to a task branch before running this command." >&2
  echo "Example: git switch -c task/${TASK_ID}-short-description" >&2
  exit 1
fi

forge_info "Push branch"
git push -u origin "$BRANCH_NAME"

forge_info "Create or reuse implementation PR"
BODY_FILE="/tmp/${TASK_ID}-implementation-pr-body.md"

cat > "$BODY_FILE" <<EOF_BODY
## Summary

Implementation PR for ${TASK_ID}.

This PR contains the task implementation and its Forge evidence chain.

## Verification

- Compact verification log: /tmp/forge-${TASK_ID:-operator}-create-implementation-pr-verify.log

Final local verify:

- Forge contract validation passed

## Artifacts

- .forge/artifacts/${TASK_ID}/plan-001.md
- .forge/artifacts/${TASK_ID}/build-report-001.md
- .forge/artifacts/${TASK_ID}/test-report-001.md
- .forge/artifacts/${TASK_ID}/review-report-001.md
EOF_BODY

if gh pr view "$BRANCH_NAME" --json url --jq '.url' >/tmp/forge-existing-pr-url.txt 2>/dev/null; then
  PR_URL="$(cat /tmp/forge-existing-pr-url.txt)"
  echo "Existing PR found: $PR_URL"
else
  PR_URL="$(gh pr create \
    --base main \
    --head "$BRANCH_NAME" \
    --title "$PR_TITLE" \
    --body-file "$BODY_FILE")"
  echo "Created PR: $PR_URL"
fi

forge_info "PR summary"
gh pr view "$PR_URL" --json number,title,url,state,headRefName,baseRefName,isDraft --jq '
"PR #\(.number): \(.title)\nURL: \(.url)\nState: \(.state)\nDraft: \(.isDraft)\nHead: \(.headRefName)\nBase: \(.baseRefName)"
'

echo
echo "PR_URL=$PR_URL"
