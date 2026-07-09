#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

usage() {
  echo "Preferred Forge command:"
  echo '  forge pr watch -- --pr PR_NUMBER'
  echo
  echo "Compatibility script:"
  echo "Usage: bash scripts/operator/check-pr.sh PR_NUMBER [--no-watch]"
}

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  usage
  exit 2
fi

PR_NUMBER="$1"
WATCH_MODE="${2:-}"

forge_require_base_commands
forge_cd_root

forge_info "PR info"
forge_print_pr_summary "$PR_NUMBER"

forge_info "CI checks"
if [ "$WATCH_MODE" = "--no-watch" ]; then
  forge_check_pr_ci "$PR_NUMBER" || true
else
  forge_watch_pr_ci "$PR_NUMBER"
fi

forge_info "Final checks table"
forge_check_pr_ci "$PR_NUMBER" || true

forge_info "Local sanity"
git status --short --branch
forge_run_compact_verify "/tmp/forge-${TASK_ID:-operator}-check-pr-verify.log"

echo
echo "CHECK_PR_OK=1"
