#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  echo "Preferred Forge command:"
  echo '  forge pr watch -- --pr PR_NUMBER'
  echo
  echo "Compatibility script:"
  echo "Usage: bash scripts/operator/check-completion-pr.sh PR_NUMBER [--no-watch]"
}

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  usage
  exit 2
fi

bash "$SCRIPT_DIR/check-pr.sh" "$@"
