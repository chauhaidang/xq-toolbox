#!/usr/bin/env bash
#
# sync-openapi-v2.sh
#
# Download OpenAPI schemas from xq-apis (or similar GitHub repos).
# This is a download-only version; client code generation is not supported.
#
# Usage:
#   ./sync-openapi-v2.sh -s SERVICE [OPTIONS]
#   ./sync-openapi-v2.sh --list-services
#
# Env: REPO, BRANCH, GITHUB_TOKEN, SCHEMA_DIR
#
set -euo pipefail

# === Configuration (defaults + env overrides) ===
REPO="${REPO:-chauhaidang/xq-contracts}"
BRANCH="${BRANCH:-main}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
SCHEMA_DIR="${SCHEMA_DIR:-}"

# Default paths (relative to CWD)
DEFAULT_SCHEMA_DIR="./api"

SERVICE=""
LIST_SERVICES=false
DRY_RUN=false

# === Help ===
show_help() {
  cat << 'HELP'
sync-openapi-v2.sh — Download OpenAPI schemas from a GitHub repository

USAGE
  ./sync-openapi-v2.sh -s SERVICE [OPTIONS]
  ./sync-openapi-v2.sh --list-services [OPTIONS]

OPTIONS
  -s, --service NAME     Service name (folder under api/). Required.
  -d, --schema-dir DIR   Directory for downloaded schemas (default: ./schemas/SERVICE)
  --repo REPO            GitHub repo owner/name (default: chauhaidang/xq-apis)
  --branch BRANCH        Branch (default: main)
  --list-services        List available services from the repo
  --dry-run              Print actions without executing
  -h, --help             Show this help

ENV VARS
  REPO           GitHub repo (owner/name)
  BRANCH         Branch name
  GITHUB_TOKEN   Optional; used for higher rate limits
  SCHEMA_DIR     Override default schema dir

EXAMPLES
  # Download schema for read-service
  ./sync-openapi-v2.sh -s read-service

  # Download schema into a custom directory
  ./sync-openapi-v2.sh -s write-service -d ./api-schemas

  # List available services
  ./sync-openapi-v2.sh --list-services
HELP
}

# === Argument parsing ===
while [[ $# -gt 0 ]]; do
  case $1 in
    -s|--service)
      SERVICE="$2"
      shift 2
      ;;
    -d|--schema-dir)
      SCHEMA_DIR="$2"
      shift 2
      ;;
    --repo)
      REPO="$2"
      shift 2
      ;;
    --branch)
      BRANCH="$2"
      shift 2
      ;;
    --list-services)
      LIST_SERVICES=true
      shift 1
      ;;
    --dry-run)
      DRY_RUN=true
      shift 1
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    -*)
      echo "Error: Unknown option: $1" >&2
      echo "Use -h or --help for usage" >&2
      exit 2
      ;;
    *)
      echo "Error: Unexpected argument: $1" >&2
      exit 2
      ;;
  esac
done

# === Prerequisite validation ===
require_curl() {
  command -v curl >/dev/null 2>&1 || {
    echo "Error: curl is required" >&2
    exit 1
  }
}

# === Helpers ===
log() {
  echo "[sync-openapi-v2] $*" >&2
}

# === Main logic ===

# List available services from GitHub API (directories under api/)
list_services_impl() {
  require_curl
  local url="https://api.github.com/repos/${REPO}/contents/api"
  local headers=(-H "Accept: application/vnd.github.v3+json")
  [[ -n "$GITHUB_TOKEN" ]] && headers+=(-H "Authorization: Bearer $GITHUB_TOKEN")

  local resp
  resp=$(curl -sf "${headers[@]}" "$url" 2>/dev/null) || {
    echo "Error: Failed to fetch $url" >&2
    exit 1
  }

  if command -v jq >/dev/null 2>&1; then
    echo "$resp" | jq -r '.[] | select(.type=="dir") | .name'
  else
    # Fallback: split JSON objects and extract name from dir entries (no jq)
    echo "$resp" | sed 's/},{/}\n{/g' | grep '"type":"dir"' | grep -oE '"name"\s*:\s*"[^"]+"' | sed 's/.*"\([^"]*\)"$/\1/' | sort -u
  fi
}

# Download schema for a service
download_schema() {
  local svc="$1"
  local out_dir="${2:-}"

  [[ -z "$out_dir" ]] && out_dir="${SCHEMA_DIR:-$DEFAULT_SCHEMA_DIR}/${svc}"

  local url="https://raw.githubusercontent.com/${REPO}/${BRANCH}/rest/${svc}-api.yaml"
  local dest="${out_dir}/${svc}-api.yaml"

  require_curl

  if [[ "$DRY_RUN" == true ]]; then
    log "Would download: $url -> $dest"
    echo "$dest"
    return 0
  fi

  mkdir -p "$out_dir"
  log "Downloading $url ..."
  if ! curl -sfL -o "$dest" "$url"; then
    echo "Error: Failed to download $url" >&2
    exit 1
  fi
  log "Saved to $dest"
  echo "$dest"
}

# === Entry point ===
main() {
  if [[ "$LIST_SERVICES" == true ]]; then
    log "Listing services from $REPO (branch: $BRANCH)"
    list_services_impl
    exit 0
  fi

  if [[ -z "$SERVICE" ]]; then
    echo "Error: -s/--service is required" >&2
    echo "Use -h or --help for usage" >&2
    exit 2
  fi

  download_schema "$SERVICE"
  exit 0
}

main "$@"
