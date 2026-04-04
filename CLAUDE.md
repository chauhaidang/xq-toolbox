# CLAUDE.md — xq-toolbox

## Project Overview

`xq-toolbox` is a Yarn Berry workspaces monorepo containing TypeScript tools, libraries, and frameworks for XQ applications. Packages are published to GitHub Packages under the `@chauhaidang` scope.

## Repository Structure

```
xq-toolbox/
├── packages/
│   ├── xq-common-kit/     # TypeScript common utilities (logger, config, yaml, string, datetime, markdown)
│   ├── xq-test-utils/     # Test utilities for component/integration tests (DB helper, wait-for-service)
│   ├── xq-test-infra/     # CLI tool to spin up test environments via Docker Compose (JavaScript)
│   ├── xq-scripts/        # Bash scripts package (VERSION-file driven, released as tarball)
│   └── poc/               # Proof-of-concept experiments
├── schemas/
├── scripts/
├── Taskfile.yml           # Unified build interface (Task orchestrator)
├── tsconfig.json          # Root TypeScript config (ES2022, commonjs, strict)
└── package.json           # Root with Yarn workspaces
```

## Build Tool

**Task (Taskfile.dev)** is the unified build interface. It delegates to Yarn for JS/TS packages, and will delegate to `uv` (Python) or `go` (Go) when those packages are added.

Install Task locally:
```bash
brew install go-task          # macOS
scoop install task            # Windows
sh -c "$(curl -sL https://taskfile.dev/install.sh)" -- -d -b ~/.local/bin  # Linux
```

Yarn Berry v4 is managed via corepack:
```bash
corepack enable   # activates the yarn version pinned in package.json
```

## Common Commands

```bash
# Install all dependencies
task install         # or: yarn install

# Build all packages (correct dependency order)
task build

# Run all tests
task test

# Type check entire monorepo
task typecheck

# Lint all packages
task lint

# Clean all build artifacts and node_modules
task clean

# Build or test a single package
task build:xq-common-kit
task test:xq-test-utils

# Show all available tasks with descriptions
task --list
```

Yarn workspace scripts still work for package-local operations:
```bash
cd packages/xq-common-kit && yarn build
```

## Package-Specific Notes

### xq-common-kit (`@chauhaidang/xq-common-kit`)
- TypeScript; exports: `logger`, `config`, `yaml`, `string`, `datetime`, `markdown`
- Build: `tsc` → `dist/`
- Tests: Jest + ts-jest

### xq-test-utils (`@chauhaidang/xq-test-utils`)
- TypeScript; provides database helpers (PostgreSQL via `pg`), service readiness checks (`wait-on`), reporting utilities, and Jest config
- Depends on `@chauhaidang/xq-common-kit` (via `workspace:*` — resolved locally)
- Exposes `jest.component.config.js` in published files

### xq-test-infra (`@chauhaidang/xq-test-infra`)
- **JavaScript** (not TypeScript) — uses ESLint for JS (`.js` files), Jest for tests
- CLI binary: `xq-infra` via `./bin/xq-infra.js`
- Services: compose generator/invoker, gateway, registry auth, service loader
- Build check: `node --check` on all `.js` files + runs tests
- Depends on `@chauhaidang/xq-common-kit` (via `workspace:*`)

## TypeScript Configuration

Root `tsconfig.json` enforces:
- `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`
- Target: ES2022, module: commonjs
- Test files (`*.test.ts`, `*.spec.ts`) excluded from compilation

Each package extends the root config with its own `outDir`/`rootDir`.

## Publishing

- Registry: `https://npm.pkg.github.com` (GitHub Packages)
- Auth: `NODE_AUTH_TOKEN` env var (set in CI via `GITHUB_TOKEN`); configured in `.yarnrc.yml`
- Automatic: push to `main` with a bumped `version` in a package's `package.json` triggers CI to publish that package via `yarn npm publish`
- Manual: GitHub Actions workflow dispatch publishes all packages

## Adding a New Package

### JS/TS package
1. `mkdir -p packages/my-package/src`
2. Create `package.json` with `name: @chauhaidang/my-package`, `publishConfig` pointing to GitHub Packages
3. Create `tsconfig.json` extending `../../tsconfig.json`
4. Export from `src/index.ts`; build output goes to `dist/`
5. Add `build:my-package`, `test:my-package`, `lint:my-package`, `clean:my-package` tasks to `Taskfile.yml` (see existing tasks as template)
6. Add `my-package` to the `deps:` list of the `build` and `test` aggregate tasks

See [SETUP.md](SETUP.md) for the full package.json/tsconfig.json template.

### Python package (uv)
1. Create `packages/my-python-pkg/` with `pyproject.toml`
2. Add tasks to `Taskfile.yml`:
   ```yaml
   build:my-python-pkg:
     dir: packages/my-python-pkg
     cmd: uv build
   test:my-python-pkg:
     dir: packages/my-python-pkg
     cmd: uv run pytest
   ```
3. Add `actions/setup-python@v5` + uv install step to `.github/workflows/publish.yml`

### Go package
1. Create `packages/my-go-tool/` with `go.mod`
2. Add tasks to `Taskfile.yml`:
   ```yaml
   build:my-go-tool:
     dir: packages/my-go-tool
     cmd: go build ./...
   test:my-go-tool:
     dir: packages/my-go-tool
     cmd: go test ./...
   ```
3. Add `actions/setup-go@v5` to `.github/workflows/publish.yml`
