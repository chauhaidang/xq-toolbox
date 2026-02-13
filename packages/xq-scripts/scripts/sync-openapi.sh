#!/usr/bin/env bash
#
# sync-openapi.sh
#
# Download OpenAPI schemas from xq-apis (or similar GitHub repos) and/or generate
# API client code from them. Supports download-only, generate-only, or both.
#
# Usage:
#   ./sync-openapi.sh -s SERVICE [OPTIONS]
#   ./sync-openapi.sh --list-services
#
# Env: REPO, BRANCH, GITHUB_TOKEN, OUTPUT_DIR, SCHEMA_DIR, GENERATOR
#
set -euo pipefail

# === Configuration (defaults + env overrides) ===
REPO="${REPO:-chauhaidang/xq-apis}"
BRANCH="${BRANCH:-main}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
OUTPUT_DIR="${OUTPUT_DIR:-}"
SCHEMA_DIR="${SCHEMA_DIR:-}"
GENERATOR="${GENERATOR:-swagger-typescript-api}"

# Default paths (relative to CWD)
DEFAULT_SCHEMA_DIR="./schemas"
DEFAULT_OUTPUT_DIR="./generated"

# Mode: download | generate | both
MODE="both"
SERVICE=""
SCHEMA_PATH=""
LIST_SERVICES=false
DRY_RUN=false

# === Help ===
show_help() {
  cat << 'HELP'
sync-openapi.sh — Download OpenAPI schemas and/or generate API clients

USAGE
  ./sync-openapi.sh -s SERVICE [OPTIONS]
  ./sync-openapi.sh --list-services [OPTIONS]

MODES
  -m, --mode MODE    download | generate | both (default: both)
                     download  — fetch schema from GitHub, save locally
                     generate  — generate client from existing schema
                     both     — download then generate

OPTIONS
  -s, --service NAME     Service name (folder under api/). Required for download/both.
  -p, --schema-path PATH Path to schema file. Required for generate-only if not using -s.
  -o, --output-dir DIR   Output directory for generated client (default: ./generated/SERVICE)
  -d, --schema-dir DIR   Directory for downloaded schemas (default: ./schemas/SERVICE)
  -g, --generator TYPE   Client generator: swagger-typescript-api | openapi-generator
                         (default: swagger-typescript-api, no Java required)
  --repo REPO            GitHub repo owner/name (default: chauhaidang/xq-apis)
  --branch BRANCH        Branch (default: main)
  --list-services        List available services from the repo
  --dry-run              Print actions without executing
  -h, --help             Show this help

ENV VARS
  REPO          GitHub repo (owner/name)
  BRANCH        Branch name
  GITHUB_TOKEN Optional; for higher rate limits
  OUTPUT_DIR   Override default output dir
  SCHEMA_DIR   Override default schema dir
  GENERATOR    Override default generator

EXAMPLES
  # Download and generate client for read-service
  ./sync-openapi.sh -s read-service

  # Download schema only
  ./sync-openapi.sh -s write-service -m download

  # Generate client from existing schema
  ./sync-openapi.sh -m generate -p ./schemas/read-service/read-service-api.yaml -o ./clients/read

  # List available services
  ./sync-openapi.sh --list-services
HELP
}

# === Argument parsing ===
while [[ $# -gt 0 ]]; do
  case $1 in
    -m|--mode)
      MODE="$2"
      shift 2
      ;;
    -s|--service)
      SERVICE="$2"
      shift 2
      ;;
    -p|--schema-path)
      SCHEMA_PATH="$2"
      shift 2
      ;;
    -o|--output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    -d|--schema-dir)
      SCHEMA_DIR="$2"
      shift 2
      ;;
    -g|--generator)
      GENERATOR="$2"
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

# === Validation ===
validate_mode() {
  case "$MODE" in
    download|generate|both) ;;
    *)
      echo "Error: Invalid mode '$MODE'. Use: download | generate | both" >&2
      exit 2
      ;;
  esac
}

validate_generator() {
  case "$GENERATOR" in
    swagger-typescript-api|openapi-generator) ;;
    *)
      echo "Error: Invalid generator '$GENERATOR'. Use: swagger-typescript-api | openapi-generator" >&2
      exit 2
      ;;
  esac
}

# === Prerequisite validation ===
require_curl() {
  command -v curl >/dev/null 2>&1 || {
    echo "Error: curl is required" >&2
    exit 1
  }
}

require_node() {
  command -v node >/dev/null 2>&1 || {
    echo "Error: Node.js is required for client generation" >&2
    exit 1
  }
}

require_npx() {
  command -v npx >/dev/null 2>&1 || {
    echo "Error: npx is required for client generation" >&2
    exit 1
  }
}

require_java() {
  command -v java >/dev/null 2>&1 || {
    echo "Error: Java is required for openapi-generator. Use --generator swagger-typescript-api instead." >&2
    exit 1
  }
}

# === Helpers ===
log() {
  echo "[sync-openapi] $*" >&2
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
  local out_file="${3:-}"

  [[ -z "$out_dir" ]] && out_dir="${SCHEMA_DIR:-$DEFAULT_SCHEMA_DIR}/${svc}"
  [[ -z "$out_file" ]] && out_file="${svc}-api.yaml"

  local url="https://raw.githubusercontent.com/${REPO}/${BRANCH}/api/${svc}/${svc}-api.yaml"
  local dest="${out_dir}/${out_file}"

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

# Generate client from schema
generate_client() {
  local schema="$1"
  local out_dir="${2:-}"

  if [[ ! -f "$schema" ]]; then
    echo "Error: Schema file not found: $schema" >&2
    exit 1
  fi

  [[ -z "$out_dir" ]] && out_dir="${OUTPUT_DIR:-$DEFAULT_OUTPUT_DIR}/$(basename "$schema" | sed 's/-api\.yaml$//')"

  require_node
  require_npx

  if [[ "$DRY_RUN" == true ]]; then
    log "Would generate client from $schema -> $out_dir"
    return 0
  fi

  mkdir -p "$out_dir"

  case "$GENERATOR" in
    swagger-typescript-api)
      log "Generating client with swagger-typescript-api ..."
      npx --yes swagger-typescript-api generate \
        --path "$schema" \
        --output "$out_dir" \
        --name "ApiClient"
      log "Client generated at $out_dir"
      ;;
    openapi-generator)
      require_java
      log "Generating client with openapi-generator ..."
      npx --yes @openapitools/openapi-generator-cli generate \
        -i "$schema" \
        -g typescript-fetch \
        -o "$out_dir"
      log "Client generated at $out_dir"
      ;;
    *)
      echo "Error: Unknown generator: $GENERATOR" >&2
      exit 1
      ;;
  esac
}

# === Entry point ===
main() {
  validate_mode
  validate_generator

  if [[ "$LIST_SERVICES" == true ]]; then
    log "Listing services from $REPO (branch: $BRANCH)"
    list_services_impl
    exit 0
  fi

  case "$MODE" in
    download)
      if [[ -z "$SERVICE" ]]; then
        echo "Error: -s/--service is required for download mode" >&2
        exit 2
      fi
      download_schema "$SERVICE"
      ;;
    generate)
      if [[ -n "$SCHEMA_PATH" ]]; then
        generate_client "$SCHEMA_PATH" "$OUTPUT_DIR"
      elif [[ -n "$SERVICE" ]]; then
        local schema="${SCHEMA_DIR:-$DEFAULT_SCHEMA_DIR}/${SERVICE}/${SERVICE}-api.yaml"
        if [[ ! -f "$schema" ]]; then
          echo "Error: Schema not found: $schema. Use -p/--schema-path or run download first." >&2
          exit 1
        fi
        generate_client "$schema" "$OUTPUT_DIR"
      else
        echo "Error: For generate mode, provide -s/--service or -p/--schema-path" >&2
        exit 2
      fi
      ;;
    both)
      if [[ -z "$SERVICE" ]]; then
        echo "Error: -s/--service is required for both mode" >&2
        exit 2
      fi
      local schema
      schema=$(download_schema "$SERVICE")
      generate_client "$schema" "${OUTPUT_DIR:-$DEFAULT_OUTPUT_DIR}/$SERVICE"
      ;;
  esac

  exit 0
}

main "$@"
