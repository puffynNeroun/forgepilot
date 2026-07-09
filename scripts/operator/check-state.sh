#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

forge_require_base_commands
forge_cd_root

TASK_ID="${1:-}"

forge_info "Git state"
git status --short --branch

forge_info "Forge status"
pnpm -C tools/forge-validator run status

if [ -n "$TASK_ID" ]; then
  forge_info "Selected task"
  forge_require_file ".forge/tasks/${TASK_ID}.yaml"
  grep -n '^status:' ".forge/tasks/${TASK_ID}.yaml"

  echo
  echo "Artifacts:"
  for artifact in plan-001.md build-report-001.md test-report-001.md review-report-001.md; do
    file=".forge/artifacts/${TASK_ID}/${artifact}"
    if [ -f "$file" ]; then
      echo "present $file"
    else
      echo "missing $file"
    fi
  done
fi

forge_info "Forge verify"
forge_run_compact_verify "/tmp/forge-${TASK_ID:-operator}-check-state-verify.log"

echo
echo "CHECK_STATE_OK=1"
