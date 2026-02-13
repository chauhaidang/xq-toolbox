# Shell Script Development – Examples

Complete script examples for common patterns.

---

## Minimal Script

```bash
#!/usr/bin/env bash
# Echo greeting. Usage: ./greet.sh [NAME]

set -euo pipefail

NAME="${1:-World}"
echo "Hello, $NAME"
exit 0
```

---

## Script with Options and Env Config

```bash
#!/usr/bin/env bash
# Build helper. Usage: ./build.sh [OPTIONS]
# Env: TAG, GITHUB_TOKEN

set -euo pipefail

TAG="${TAG:-latest}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

while [[ $# -gt 0 ]]; do
  case $1 in
    -t|--tag) TAG="$2"; shift 2 ;;
    --github-token) GITHUB_TOKEN="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [-t TAG] [--github-token TOKEN]"
      echo "Env: TAG, GITHUB_TOKEN"
      exit 0
      ;;
    *) echo "Unknown: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$GITHUB_TOKEN" ]]; then
  echo "WARNING: GITHUB_TOKEN not set" >&2
fi

echo "Building with tag: $TAG"
# ... build logic
exit 0
```

---

## Wait-for-Service Pattern

```bash
#!/usr/bin/env bash
# Wait for URL to respond. Env: URL, TIMEOUT, INTERVAL

set -euo pipefail

URL="${URL:-http://localhost:8080/health}"
TIMEOUT="${TIMEOUT:-60}"
INTERVAL="${INTERVAL:-2}"
attempt=0

echo "Waiting for $URL (max ${TIMEOUT}s)..."

while [[ $attempt -lt $TIMEOUT ]]; do
  if curl -sf "$URL" > /dev/null 2>&1; then
    echo "Ready"
    exit 0
  fi
  attempt=$((attempt + INTERVAL))
  sleep "$INTERVAL"
done

echo "Timeout waiting for $URL" >&2
exit 1
```

---

## Docker Build with Security Check

```bash
#!/usr/bin/env bash
# Build Docker image. Ensures token not persisted.

set -euo pipefail

IMAGE="${1:?Usage: $0 IMAGE_NAME [TAG]}"
TAG="${2:-latest}"
BUILD_ARGS=""

if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  BUILD_ARGS="--build-arg GITHUB_TOKEN=$GITHUB_TOKEN"
fi

docker build $BUILD_ARGS -t "${IMAGE}:${TAG}" .

# Verify token not in image
docker run --rm "${IMAGE}:${TAG}" sh -c 'env | grep -i github || echo "OK"'
```

---

## Multi-Step with Cleanup

```bash
#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  rm -rf "$TMPDIR"
}
trap cleanup EXIT

TMPDIR=$(mktemp -d)
# ... use TMPDIR
```
