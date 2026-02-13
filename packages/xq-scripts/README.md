# xq-scripts

Consumer-facing shell scripts for the xq-toolbox monorepo. All scripts are portable (Linux, macOS, CI) and follow the shell-script-development skill.

## Scripts

| Script | Purpose |
|-------|---------|
| `scripts/sync-openapi.sh` | Download OpenAPI schemas from xq-apis and/or generate API client code |

---

## sync-openapi.sh

Download OpenAPI schemas from [xq-apis](https://github.com/chauhaidang/xq-apis) and/or generate typed API client code.

### Usage

```bash
# From monorepo root or any package
./packages/xq-scripts/scripts/sync-openapi.sh -s read-service

# Download only
./packages/xq-scripts/scripts/sync-openapi.sh -s write-service -m download

# Generate from existing schema
./packages/xq-scripts/scripts/sync-openapi.sh -m generate -p ./schemas/read-service/read-service-api.yaml -o ./clients/read

# List available services
./packages/xq-scripts/scripts/sync-openapi.sh --list-services
```

### Options

| Option | Description |
|--------|-------------|
| `-m, --mode` | `download` \| `generate` \| `both` (default: both) |
| `-s, --service` | Service name (folder under api/). Required for download/both |
| `-p, --schema-path` | Path to schema file. For generate-only when not using -s |
| `-o, --output-dir` | Output directory for generated client (default: ./generated/SERVICE) |
| `-d, --schema-dir` | Directory for downloaded schemas (default: ./schemas/SERVICE) |
| `-g, --generator` | `swagger-typescript-api` \| `openapi-generator` |
| `--repo` | GitHub repo owner/name (default: chauhaidang/xq-apis) |
| `--branch` | Branch (default: main) |
| `--list-services` | List available services from the repo |
| `--dry-run` | Print actions without executing |
| `-h, --help` | Show help |

### Env vars

| Var | Description |
|-----|-------------|
| `REPO` | GitHub repo (owner/name) |
| `BRANCH` | Branch name |
| `GITHUB_TOKEN` | Optional; for higher rate limits |
| `OUTPUT_DIR` | Override default output dir |
| `SCHEMA_DIR` | Override default schema dir |
| `GENERATOR` | Override default generator |

See `./scripts/sync-openapi.sh -h` for full help.
