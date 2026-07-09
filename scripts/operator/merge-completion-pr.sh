#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

usage() {
  echo "Preferred Forge command:"
  echo '  forge pr merge-completion -- --pr PR_NUMBER --id TASK-XXXX --branch chore/complete-TASK-XXXX'
  echo
  echo "Compatibility script:"
  echo "Usage: bash scripts/operator/merge-completion-pr.sh PR_NUMBER TASK_ID [EXPECTED_HEAD_BRANCH]"
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

forge_info "Validate completion PR"
forge_print_pr_summary "$PR_NUMBER"
forge_require_pr_open_clean "$PR_NUMBER"

if [ -n "$EXPECTED_HEAD" ]; then
  forge_require_pr_head "$PR_NUMBER" "$EXPECTED_HEAD"
fi

forge_info "Confirm CI checks"
forge_check_pr_ci "$PR_NUMBER"

forge_info "Local pre-merge sanity"
forge_require_clean_tree
forge_run_compact_verify "/tmp/forge-${TASK_ID:-operator}-merge-completion-pr-before-verify.log"

forge_info "Merge completion PR"
gh pr merge "$PR_NUMBER" --merge --delete-branch

forge_info "Update main"
git switch main
git pull --ff-only origin main

forge_info "Confirm task completed on main"
git status --short --branch
forge_require_task_status "$TASK_ID" "completed"

forge_info "Confirm task board"
pnpm -C tools/forge-validator run status

if ! grep -Fq "No active task" docs/TASKS.md; then
  forge_die "Expected docs/TASKS.md to show no active task"
fi

if ! grep -Fq "Define the next task" docs/TASKS.md; then
  forge_die "Expected docs/TASKS.md Next to be Define the next task"
fi

forge_info "Verify main"
forge_run_compact_verify "/tmp/forge-${TASK_ID:-operator}-merge-completion-pr-main-verify.log"

forge_info "Final state"
git status --short --branch
git --no-pager log -8 --oneline --decorate

echo
echo "MERGE_COMPLETION_PR_OK=1"
