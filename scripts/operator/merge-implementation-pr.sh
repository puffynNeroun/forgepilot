#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

usage() {
  echo "Preferred Forge command:"
  echo '  forge pr merge-implementation -- --pr PR_NUMBER --id TASK-XXXX --branch task/TASK-XXXX-branch-name'
  echo
  echo "Compatibility script:"
  echo "Usage: bash scripts/operator/merge-implementation-pr.sh PR_NUMBER TASK_ID [EXPECTED_HEAD_BRANCH]"
}

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  usage
  exit 2
fi

PR_NUMBER="$1"
TASK_ID="$2"
EXPECTED_HEAD="${3:-}"

forge_require_base_commands
forge_cd_root

forge_info "Validate PR"
forge_print_pr_summary "$PR_NUMBER"
forge_require_pr_open_clean "$PR_NUMBER"

if [ -n "$EXPECTED_HEAD" ]; then
  forge_require_pr_head "$PR_NUMBER" "$EXPECTED_HEAD"
fi

forge_info "Confirm CI checks"
forge_check_pr_ci "$PR_NUMBER"

forge_info "Local pre-merge sanity"
forge_require_clean_tree
forge_run_compact_verify "/tmp/forge-${TASK_ID:-operator}-merge-implementation-pr-before-verify.log"

forge_info "Merge implementation PR"
gh pr merge "$PR_NUMBER" --merge --delete-branch

forge_info "Update main"
git switch main
git pull --ff-only origin main

forge_info "Confirm task remains ready_for_pr on main"
git status --short --branch
forge_require_task_status "$TASK_ID" "ready_for_pr"

forge_info "Verify main"
forge_run_compact_verify "/tmp/forge-${TASK_ID:-operator}-merge-implementation-pr-main-verify.log"

forge_info "Final state"
git status --short --branch
git --no-pager log -8 --oneline --decorate

echo
echo "MERGE_IMPLEMENTATION_PR_OK=1"
