---
name: shell-script-development
description: Guides development of portable, reusable shell scripts (.sh) that run on Linux, macOS, and CI. Use when creating or modifying shell scripts, bash scripts, or when the user asks for sh script development, build scripts, or automation scripts.
---

# Shell Script Development

## Overview

Develop shell scripts that are **portable** (Linux, macOS, CI) and **reusable** (clear API, documented, configurable). Follow a consistent structure and fail safely.

---

## Core Principles

1. **Agnostic**: Scripts must be domain-agnostic and not assume a specific project, module, or business context.
2. **Decoupled**: Do not tightly couple scripts to any domain or module; they should work as standalone utilities.
3. **Parameterized**: Expose parameters (flags, env vars) so consumers can configure behavior; avoid hardcoded values that force one choice.
4. **Validate prerequisites first**: Always validate environment prerequisites (required env vars, tools, permissions) before performing any action. Fail fast with clear messages.

---

## Script Structure

Every script should follow this skeleton:

```bash
#!/usr/bin/env bash
# Brief description of what the script does
# Optional: usage hint

set -euo pipefail

# === Configuration (defaults + env overrides) ===
VAR="${VAR:-default}"
OPTIONAL="${OPTIONAL:-}"

# === Argument parsing ===
# Parse -x, --long, positional args

# === Prerequisite validation ===
# Validate required env vars, tools, permissions before any action

# === Main logic ===
# Functions, then main flow

# === Exit ===
exit 0
```

---

## Portability

### Shebang

- Prefer `#!/usr/bin/env bash` over `#!/bin/bash` (handles different install paths)
- Use `#!/bin/sh` only if you need strict POSIX (no bash features)

### Options

- `set -e`: Exit on first error
- `set -u`: Fail on undefined variable
- `set -o pipefail`: Fail pipeline if any command fails (bash)
- Avoid `set -x` in production scripts (use only for debugging)

### Avoid Platform Pitfalls

- Always quote variables: `"$VAR"` (handles spaces and empty values)
- Prefer `[ ]` over `[[ ]]` for POSIX; use `[[ ]]` only when you need bash features
- Use `$(cmd)` not backticks
- Paths: avoid hardcoded `/usr/bin`; use `command -v` to find executables
- Newlines: use `$'\n'` or `printf` for cross-platform line endings

---

## Configuration

### Environment Overrides

```bash
TIMEOUT="${TIMEOUT:-60}"
URL="${MY_URL:-http://localhost:8080}"
```

- Document env vars in script header or `--help`
- Use sensible defaults; let consumers override via env

### Argument Parsing

```bash
while [[ $# -gt 0 ]]; do
  case $1 in
    -t|--tag) TAG="$2"; shift 2 ;;
    --flag) FLAG=true; shift 1 ;;
    -h|--help) show_help; exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done
```

- Support both `-x` and `--long` forms
- Always provide `-h|--help` with usage and options
- Validate required args after parsing

### Prerequisite Validation

Validate before any action:

```bash
# Required env vars
: "${REQUIRED_VAR:?Error: REQUIRED_VAR must be set}"
# Or with custom message:
[[ -z "${REQUIRED_VAR:-}" ]] && { echo "Error: REQUIRED_VAR must be set" >&2; exit 1; }

# Required tools
command -v jq >/dev/null 2>&1 || { echo "Error: jq is required" >&2; exit 1; }
```

- Fail fast with clear, actionable error messages
- Document required env vars and tools in `--help` or script header

---

## Error Handling

- Exit with meaningful codes: `0` success, `1` error, `2` usage
- Print errors to stderr: `echo "Error: message" >&2`
- Include actionable hints: "Use --github-token TOKEN"
- For critical commands, capture output: `if ! output=$(cmd 2>&1); then echo "$output" >&2; exit 1; fi`

---

## Output and Logging

- Use `echo` for user-facing output
- Optional colors: `RED='\033[0;31m'` `NC='\033[0m'` with `echo -e`
- Keep output readable: blank lines, clear status messages
- Avoid secrets in output (tokens, passwords)

---

## Security

- Never log or echo secrets (tokens, passwords)
- Prefer env vars over inline args for sensitive data
- Validate inputs; avoid `eval` and unquoted expansion
- For Docker/build scripts: verify tokens are not baked into images

---

## Checklist

Before finishing a script:

- [ ] Shebang and `set -euo pipefail` (or `set -e` if pipefail unavailable)
- [ ] Agnostic and decoupled (no domain/module-specific assumptions)
- [ ] Config via env vars and parameters (consumers choose values)
- [ ] Argument parsing with `-h|--help`
- [ ] Prerequisites validated first (env vars, tools) before any action
- [ ] Errors to stderr, exit codes 0/1/2
- [ ] No secrets in output
- [ ] Documented in header or help (purpose, usage, env vars)
- [ ] Added to `packages/xq-scripts/README.md` if consumer-facing

---

## Additional Resources

- For detailed patterns and snippets, see [reference.md](reference.md)
- For complete script examples, see [examples.md](examples.md)
