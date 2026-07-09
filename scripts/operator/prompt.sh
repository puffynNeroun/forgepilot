#!/usr/bin/env bash
set -euo pipefail

SUPPORTED_ROLES=(
  "planner"
  "builder"
  "tester"
  "reviewer"
  "recovery"
  "implementation-pr"
  "completion-pr"
)

usage() {
  cat <<'USAGE'
Forge prompt generator

Usage:
Preferred Forge command:
  forge prompt --help
  forge prompt --list
  forge prompt ROLE [TASK_ID] [PR_NUMBER]
  forge prompt implementation-pr [TASK_ID] PR_NUMBER
  forge prompt completion-pr [TASK_ID] PR_NUMBER

Compatibility script:
  bash scripts/operator/prompt.sh --help
  bash scripts/operator/prompt.sh -h
  bash scripts/operator/prompt.sh --list
  bash scripts/operator/prompt.sh ROLE [TASK_ID] [PR_NUMBER]
  bash scripts/operator/prompt.sh implementation-pr [TASK_ID] PR_NUMBER
  bash scripts/operator/prompt.sh completion-pr [TASK_ID] PR_NUMBER

Examples:
  bash scripts/operator/prompt.sh builder
  bash scripts/operator/prompt.sh reviewer TASK-0032
  bash scripts/operator/prompt.sh implementation-pr TASK-0032 66
  bash scripts/operator/prompt.sh completion-pr TASK-0032 67
  bash scripts/operator/prompt.sh implementation-pr 66

Behavior:
  - ROLE TASK_ID [PR_NUMBER] uses the explicit task id.
  - ROLE without TASK_ID reads the active task from docs/TASKS.md.
  - PR_NUMBER is optional and substitutes {{PR_NUMBER}}.
  - Output is printed to stdout only.
  - The repository is not modified.

Supported roles:
  planner
  builder
  tester
  reviewer
  recovery
  implementation-pr
  completion-pr
USAGE
}

list_roles() {
  printf '%s\n' "${SUPPORTED_ROLES[@]}"
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

is_known_role() {
  local role="${1:-}"

  case "$role" in
    planner|builder|tester|reviewer|recovery|implementation-pr|completion-pr)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

escape_regex() {
  python3 - "$1" <<'PY'
import re
import sys

print(re.escape(sys.argv[1]))
PY
}

resolve_active_task_id() {
  local board_path="$1"

  python3 - "$board_path" <<'PY'
from pathlib import Path
import re
import sys

board = Path(sys.argv[1])

if not board.exists():
    print(f"ERROR: Task board not found: {board}", file=sys.stderr)
    sys.exit(1)

lines = board.read_text().splitlines()

now_lines = []
inside_now = False
found_now = False

for line in lines:
    if line.strip() == "## Now":
        inside_now = True
        found_now = True
        continue

    if inside_now and line.startswith("## "):
        break

    if inside_now:
        now_lines.append(line)

if not found_now:
    print("ERROR: Could not parse active task: docs/TASKS.md has no ## Now section", file=sys.stderr)
    sys.exit(1)

now_text = "\n".join(now_lines)

if "No active task" in now_text:
    print("ERROR: No active task found in docs/TASKS.md. Pass TASK_ID explicitly.", file=sys.stderr)
    sys.exit(1)

matches = re.findall(r"`?(TASK-\d{4})`?", now_text)
unique = []

for match in matches:
    if match not in unique:
        unique.append(match)

if len(unique) == 1:
    print(unique[0])
    sys.exit(0)

if len(unique) == 0:
    print("ERROR: Could not parse active task from docs/TASKS.md. Pass TASK_ID explicitly.", file=sys.stderr)
    sys.exit(1)

print(
    "ERROR: Ambiguous active task board in docs/TASKS.md: "
    + ", ".join(unique)
    + ". Pass TASK_ID explicitly.",
    file=sys.stderr,
)
sys.exit(1)
PY
}

repo_root() {
  git rev-parse --show-toplevel 2>/dev/null || die "Not inside a Git repository"
}

render_template() {
  local role="$1"
  local task_id="$2"
  local pr_number="${3:-}"

  local root
  root="$(repo_root)"

  local task_file="${root}/.forge/tasks/${task_id}.yaml"
  local template_file="${root}/.forge/prompts/${role}.md"

  if [[ ! "$task_id" =~ ^TASK-[0-9]{4}$ ]]; then
    die "Task ID must match TASK-0000 format: ${task_id}"
  fi

  if [ ! -f "$task_file" ]; then
    die "Task contract not found: .forge/tasks/${task_id}.yaml"
  fi

  if [ ! -f "$template_file" ]; then
    die "Prompt template not found: .forge/prompts/${role}.md"
  fi

  local task_title
  task_title="$(sed -n 's/^title:[[:space:]]*//p' "$task_file" | head -n 1)"

  if [ -z "$task_title" ]; then
    die "Task title not found in .forge/tasks/${task_id}.yaml"
  fi

  task_title="${task_title%\"}"
  task_title="${task_title#\"}"
  task_title="${task_title%\'}"
  task_title="${task_title#\'}"

  local branch_name
  branch_name="$(git -C "$root" branch --show-current 2>/dev/null || true)"

  if [ -z "$branch_name" ]; then
    branch_name="${GITHUB_HEAD_REF:-${GITHUB_REF_NAME:-}}"
  fi

  export TASK_ID="$task_id"
  export TASK_TITLE="$task_title"
  export REPO_PATH="$root"
  export BRANCH_NAME="$branch_name"
  export PR_NUMBER="$pr_number"

  python3 - "$template_file" <<'PY'
from pathlib import Path
import os
import sys

template = Path(sys.argv[1]).read_text()

replacements = {
    "{{TASK_ID}}": os.environ["TASK_ID"],
    "{{TASK_TITLE}}": os.environ["TASK_TITLE"],
    "{{REPO_PATH}}": os.environ["REPO_PATH"],
    "{{BRANCH_NAME}}": os.environ["BRANCH_NAME"],
    "{{PR_NUMBER}}": os.environ.get("PR_NUMBER", ""),
}

for key, value in replacements.items():
    template = template.replace(key, value)

print(template, end="")
PY
}

main() {
  if [ "$#" -eq 0 ]; then
    usage >&2
    exit 1
  fi

  case "${1:-}" in
    --help|-h)
      usage
      exit 0
      ;;
    --list)
      list_roles
      exit 0
      ;;
  esac

  if [ "$#" -gt 3 ]; then
    usage >&2
    die "Too many arguments"
  fi

  local role="$1"

  if ! is_known_role "$role"; then
    die "Unknown role: ${role}. Run: forge prompt --list (or bash scripts/operator/prompt.sh --list for compatibility)"
  fi

  local root
  root="$(repo_root)"

  local task_id=""
  local pr_number=""

  if [ "$#" -eq 1 ]; then
    task_id="$(resolve_active_task_id "${root}/docs/TASKS.md")"
  elif [ "$#" -eq 2 ]; then
    if [[ "$2" =~ ^TASK-[0-9]{4}$ ]]; then
      task_id="$2"
    elif [[ "$role" =~ ^(implementation-pr|completion-pr)$ ]] && [[ "$2" =~ ^[0-9]+$ ]]; then
      task_id="$(resolve_active_task_id "${root}/docs/TASKS.md")"
      pr_number="$2"
    else
      task_id="$2"
    fi
  else
    task_id="$2"
    pr_number="$3"
  fi

  render_template "$role" "$task_id" "$pr_number"
}

main "$@"
