# Shell Script Development – Reference

Detailed patterns for argument parsing, functions, and common operations.

---

## Argument Parsing Template

```bash
# Defaults
TAG="latest"
FLAG=false
POSITIONAL=()

while [[ $# -gt 0 ]]; do
  case $1 in
    -t|--tag)
      TAG="$2"
      shift 2
      ;;
    --flag)
      FLAG=true
      shift 1
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS] [ARGS]"
      echo "Options:"
      echo "  -t, --tag TAG    Tag (default: latest)"
      echo "  --flag           Enable flag"
      echo "  -h, --help       Show help"
      exit 0
      ;;
    -*)
      echo "Unknown option: $1" >&2
      echo "Use -h or --help for usage" >&2
      exit 1
      ;;
    *)
      POSITIONAL+=("$1")
      shift 1
      ;;
  esac
done

# Validate required
if [[ ${#POSITIONAL[@]} -lt 1 ]]; then
  echo "Error: missing required argument" >&2
  exit 1
fi
```

---

## Function Patterns

```bash
# Simple function
do_something() {
  local arg="$1"
  echo "Processing $arg"
}

# Function with return code
check_health() {
  local url="$1"
  if curl -sf "$url" > /dev/null; then
    return 0
  else
    return 1
  fi
}

# Function with output
get_version() {
  echo "1.0.0"
}
```

---

## Retry / Wait Loops

```bash
MAX_ATTEMPTS=60
SLEEP=2
attempt=0

while [[ $attempt -lt $MAX_ATTEMPTS ]]; do
  if check_health "$URL"; then
    echo "Ready"
    break
  fi
  attempt=$((attempt + 1))
  [[ $attempt -lt $MAX_ATTEMPTS ]] && sleep $SLEEP
done

if [[ $attempt -ge $MAX_ATTEMPTS ]]; then
  echo "Timeout" >&2
  exit 1
fi
```

---

## Finding Commands

```bash
# Check if command exists
if ! command -v docker &> /dev/null; then
  echo "Error: docker not found" >&2
  exit 1
fi

# Optional command with fallback
JQ_CMD=$(command -v jq 2>/dev/null || echo "")
```

---

## Safe Variable Expansion

```bash
# Default value
NAME="${NAME:-default}"

# Required (fail if unset)
: "${REQUIRED_VAR:?REQUIRED_VAR must be set}"

# Alternative
VAR="${VAR:-fallback}"
```

---

## Colors (Optional)

```bash
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Success${NC}"
echo -e "${RED}Error${NC}" >&2
```

---

## Script Location

For scripts that must run from a specific directory:

```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
# Or: cd "$SCRIPT_DIR/../subdir"
```
