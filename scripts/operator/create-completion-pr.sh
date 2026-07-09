#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

usage() {
  echo "Preferred Forge command:"
  echo '  forge pr create-completion -- --id TASK-XXXX --branch chore/complete-TASK-XXXX'
  echo
  echo "Compatibility script:"
  echo "Usage: bash scripts/operator/create-completion-pr.sh TASK_ID [COMPLETION_BRANCH]"
}

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  usage
  exit 2
fi

TASK_ID="$1"
TASK_SLUG="$(forge_slug_task_id "$TASK_ID")"
COMPLETION_BRANCH="${2:-chore/complete-${TASK_ID}}"
PR_TITLE="Complete ${TASK_ID}"

forge_require_base_commands
forge_cd_root

forge_info "Prepare main"
git switch main
git pull --ff-only origin main
forge_require_clean_tree
forge_require_task_status "$TASK_ID" "ready_for_pr"
forge_require_artifact_chain "$TASK_ID"
forge_run_compact_verify "/tmp/forge-${TASK_ID:-operator}-create-completion-pr-verify.log"

forge_info "Create completion branch"
if git rev-parse --verify "$COMPLETION_BRANCH" >/dev/null 2>&1; then
  forge_die "Local completion branch already exists: $COMPLETION_BRANCH"
fi

git switch -c "$COMPLETION_BRANCH"

forge_info "Complete task"
pnpm -C tools/forge-validator run task:complete -- --id "$TASK_ID"
forge_require_task_status "$TASK_ID" "completed"

forge_info "Verify completion branch"
forge_run_compact_verify "/tmp/forge-${TASK_ID:-operator}-create-completion-pr-verify.log"

forge_info "Commit completion"
git add ".forge/tasks/${TASK_ID}.yaml" docs/TASKS.md
git diff --cached --check
git commit -m "chore: complete ${TASK_ID}"

forge_info "Push completion branch"
git push -u origin "$COMPLETION_BRANCH"

forge_info "Create or reuse completion PR"
BODY_FILE="/tmp/${TASK_ID}-completion-pr-body.md"

cat > "$BODY_FILE" <<EOF_BODY
## Summary

Completes ${TASK_ID} after the implementation PR was merged.

This updates the Forge task contract and task board from ready_for_pr to completed.

## Verification

- Compact verification log: /tmp/forge-${TASK_ID:-operator}-create-completion-pr-verify.log

Final local verify:

- Forge contract validation passed
EOF_BODY

if gh pr view "$COMPLETION_BRANCH" --json url --jq '.url' >/tmp/forge-existing-completion-pr-url.txt 2>/dev/null; then
  PR_URL="$(cat /tmp/forge-existing-completion-pr-url.txt)"
  echo "Existing completion PR found: $PR_URL"
else
  PR_URL="$(gh pr create \
    --base main \
    --head "$COMPLETION_BRANCH" \
    --title "$PR_TITLE" \
    --body-file "$BODY_FILE")"
  echo "Created completion PR: $PR_URL"
fi

forge_info "Completion PR summary"
gh pr view "$PR_URL" --json number,title,url,state,headRefName,baseRefName,isDraft --jq '
"PR #\(.number): \(.title)\nURL: \(.url)\nState: \(.state)\nDraft: \(.isDraft)\nHead: \(.headRefName)\nBase: \(.baseRefName)"
'

echo
echo "PR_URL=$PR_URL"
