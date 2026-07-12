#!/usr/bin/env bash

# Shared helpers for local Forge operator scripts.
# These helpers intentionally stay small and shell-based.

forge_die() {
  echo
  echo "ERROR: $*" >&2
  exit 1
}

forge_info() {
  echo
  echo "== $* =="
}

forge_repo_root() {
  local root

  root="$(git rev-parse --show-toplevel 2>/dev/null)" || {
    echo "ERROR: not inside a git repository" >&2
    exit 1
  }

  printf '%s\n' "$root"
}

forge_cd_root() {
  cd "$(forge_repo_root)"
}

forge_require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    forge_die "Required command not found: $command_name"
  fi
}

forge_require_base_commands() {
  forge_require_command git
  forge_require_command pnpm
  forge_require_command gh
  forge_require_command awk
}

forge_git_branch() {
  git branch --show-current
}

forge_require_clean_tree() {
  git status --short --branch

  if [ -n "$(git status --porcelain)" ]; then
    forge_die "Working tree must be clean"
  fi
}

forge_task_file() {
  local task_id="$1"
  printf '.forge/tasks/%s.yaml\n' "$task_id"
}

forge_task_status() {
  local task_id="$1"
  local task_file

  task_file="$(forge_task_file "$task_id")"

  if [ ! -f "$task_file" ]; then
    forge_die "Missing task contract: $task_file"
  fi

  awk '/^status:/ {print $2; exit}' "$task_file"
}

forge_require_task_status() {
  local task_id="$1"
  local expected="$2"
  local actual

  actual="$(forge_task_status "$task_id")"

  echo "Task status: $actual"

  if [ "$actual" != "$expected" ]; then
    forge_die "Expected $task_id status $expected, got $actual"
  fi
}

forge_require_file() {
  local file="$1"

  if [ ! -f "$file" ]; then
    forge_die "Missing required file: $file"
  fi
}

forge_require_artifact_chain() {
  local task_id="$1"

  forge_require_file ".forge/artifacts/${task_id}/plan-001.md"
  forge_require_file ".forge/artifacts/${task_id}/build-report-001.md"
  forge_require_file ".forge/artifacts/${task_id}/test-report-001.md"
  forge_require_file ".forge/artifacts/${task_id}/review-report-001.md"
}

forge_run_verify_summary() {
  forge_run_compact_verify "$@"
}

forge_pr_value() {
  local pr_number="$1"
  local field="$2"

  gh pr view "$pr_number" --json "$field" --jq ".$field"
}

forge_print_pr_summary() {
  local pr_number="$1"

  gh pr view "$pr_number" \
    --json number,title,url,state,isDraft,headRefName,baseRefName,mergeable,mergeStateStatus \
    --jq '
"PR #\(.number): \(.title)\nURL: \(.url)\nState: \(.state)\nDraft: \(.isDraft)\nHead: \(.headRefName)\nBase: \(.baseRefName)\nMergeable: \(.mergeable)\nMerge state: \(.mergeStateStatus)"
'
}

forge_require_pr_open_clean() {
  local pr_number="$1"

  local pr_state
  local pr_base
  local pr_mergeable
  local pr_merge_state

  pr_state="$(forge_pr_value "$pr_number" state)"
  pr_base="$(forge_pr_value "$pr_number" baseRefName)"
  pr_mergeable="$(forge_pr_value "$pr_number" mergeable)"
  pr_merge_state="$(forge_pr_value "$pr_number" mergeStateStatus)"

  echo "PR_STATE=$pr_state"
  echo "PR_BASE=$pr_base"
  echo "PR_MERGEABLE=$pr_mergeable"
  echo "PR_MERGE_STATE=$pr_merge_state"

  if [ "$pr_state" != "OPEN" ]; then
    forge_die "Expected PR state OPEN"
  fi

  if [ "$pr_base" != "main" ]; then
    forge_die "Expected PR base main"
  fi

  if [ "$pr_mergeable" != "MERGEABLE" ]; then
    forge_die "Expected PR mergeable"
  fi

  if [ "$pr_merge_state" != "CLEAN" ]; then
    forge_die "Expected PR merge state CLEAN"
  fi
}

forge_require_pr_head() {
  local pr_number="$1"
  local expected_head="$2"
  local actual_head

  actual_head="$(forge_pr_value "$pr_number" headRefName)"
  echo "PR_HEAD=$actual_head"

  if [ "$actual_head" != "$expected_head" ]; then
    forge_die "Expected PR head $expected_head, got $actual_head"
  fi
}

forge_check_pr_ci() {
  local pr_number="$1"

  gh pr checks "$pr_number"
}

forge_watch_pr_ci() {
  local pr_number="$1"

  node tools/forge-validator/src/cli.mjs pr watch -- --pr "$pr_number"
}

forge_slug_task_id() {
  local task_id="$1"
  printf '%s\n' "$task_id" | tr '[:upper:]' '[:lower:]'
}


# Run a command while preserving the complete output in a log file and printing
# only a concise operator-facing summary.
forge_run_compact_command() {
    local log_file="$1"
    shift

    local log_dir
    log_dir="$(dirname "$log_file")"
    mkdir -p "$log_dir"

    printf 'Full log: %s\n' "$log_file"

    set +e
    "$@" >"$log_file" 2>&1
    local command_exit=$?
    set -e

    printf 'COMMAND_EXIT=%s\n' "$command_exit"

    grep -E '^[[:space:]]*ℹ (tests|pass|fail) ' "$log_file" | tail -3 || true
    grep -E 'Forge contract validation (passed|failed)' "$log_file" | tail -1 || true

    if [ "$command_exit" -ne 0 ]; then
        printf '\n== Compact failure log tail ==\n'
        tail -80 "$log_file" || true
    fi

    return "$command_exit"
}

# Compact wrapper for the high-noise Forge verification command.
forge_run_compact_verify() {
    local log_file="$1"

    printf 'Full log: %s\n' "$log_file"

    local log_dir
    log_dir="$(dirname "$log_file")"
    mkdir -p "$log_dir"

    set +e
    pnpm -C tools/forge-validator verify >"$log_file" 2>&1
    local verify_exit=$?
    set -e

    printf 'VERIFY_EXIT=%s\n' "$verify_exit"

    grep -E '^[[:space:]]*ℹ (tests|pass|fail) ' "$log_file" | tail -3 || true
    grep -E 'Forge contract validation (passed|failed)' "$log_file" | tail -1 || true

    if [ "$verify_exit" -ne 0 ]; then
        printf '\n== Compact verify failure log tail ==\n'
        tail -80 "$log_file" || true
    fi

    return "$verify_exit"
}
