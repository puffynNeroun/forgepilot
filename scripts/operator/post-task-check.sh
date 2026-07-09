#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

usage() {
  echo "Preferred Forge command:"
  echo '  forge task check -- --id TASK-XXXX'
  echo
  echo "Compatibility script:"
  echo "Usage: bash scripts/operator/post-task-check.sh TASK_ID"
}

if [ "$#" -ne 1 ]; then
  usage
  exit 2
fi

TASK_ID="$1"

forge_require_base_commands
forge_cd_root

forge_info "Final local state"
git switch main
git pull --ff-only origin main
forge_require_clean_tree
forge_require_task_status "$TASK_ID" "completed"

forge_info "Forge status"
pnpm -C tools/forge-validator run status

forge_info "Final verify"
forge_run_compact_verify "/tmp/forge-${TASK_ID:-operator}-post-task-check-verify.log"

forge_info "Prune deleted remote branches"
git remote prune origin || true

forge_info "Recent main commits"
git --no-pager log -8 --oneline --decorate

forge_info "Recent GitHub Actions runs"
gh run list --branch main --limit 6 || true

forge_info "GitHub Pages info"
REPO="$(gh repo view --json nameWithOwner --jq '.nameWithOwner' 2>/dev/null || true)"

if [ -n "$REPO" ]; then
  gh api "repos/${REPO}/pages" \
    --jq '"URL: \(.html_url)\nStatus: \(.status)\nSource branch: \(.source.branch // "n/a")\nSource path: \(.source.path // "n/a")"' \
    2>/dev/null || echo "GitHub Pages info unavailable."
else
  echo "GitHub repository info unavailable."
fi

echo
echo "POST_TASK_CHECK_OK=1"
