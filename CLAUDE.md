# CLAUDE.md — xq-toolbox

## Project Overview

`xq-toolbox` is an npm workspaces monorepo containing TypeScript tools, libraries, and frameworks for XQ applications. Packages are published to GitHub Packages under the `@chauhaidang` scope.

## Repository Structure

```
xq-toolbox/
├── packages/
│   ├── xq-common-kit/     # TypeScript common utilities (logger, config, yaml, string, datetime, markdown)
│   ├── xq-test-utils/     # Test utilities for component/integration tests (DB helper, wait-for-service)
│   ├── xq-test-infra/     # CLI tool to spin up test environments via Docker Compose (JavaScript)
│   ├── xq-scripts/        # (scripts package)
│   └── poc/               # Proof-of-concept experiments
├── schemas/
├── scripts/
├── tsconfig.json          # Root TypeScript config (ES2022, commonjs, strict)
└── package.json           # Root with npm workspaces
```

## Common Commands

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Run all tests
npm test

# Type check entire monorepo
npm run typecheck

# Lint all packages
npm run lint

# Clean all build artifacts and node_modules
npm run clean
```

## Package-Specific Notes

### xq-common-kit (`@chauhaidang/xq-common-kit`)
- TypeScript; exports: `logger`, `config`, `yaml`, `string`, `datetime`, `markdown`
- Build: `tsc` → `dist/`
- Tests: Jest + ts-jest

### xq-test-utils (`@chauhaidang/xq-test-utils`)
- TypeScript; provides database helpers (PostgreSQL via `pg`), service readiness checks (`wait-on`), reporting utilities, and Jest config
- Depends on `@chauhaidang/xq-common-kit`
- Exposes `jest.component.config.js` in published files

### xq-test-infra (`@chauhaidang/xq-test-infra`)
- **JavaScript** (not TypeScript) — uses ESLint for JS (`.js` files), Jest for tests
- CLI binary: `xq-infra` via `./bin/xq-infra.js`
- Services: compose generator/invoker, gateway, registry auth, service loader
- Build check: `node --check` on all `.js` files + runs tests
- Depends on `@chauhaidang/xq-js-common-kit` (separate package, not in this repo)

## TypeScript Configuration

Root `tsconfig.json` enforces:
- `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`
- Target: ES2022, module: commonjs
- Test files (`*.test.ts`, `*.spec.ts`) excluded from compilation

Each package extends the root config with its own `outDir`/`rootDir`.

## Publishing

- Registry: `https://npm.pkg.github.com` (GitHub Packages)
- Automatic: push to `main` with a bumped `version` in a package's `package.json` triggers CI to publish that package
- Manual: GitHub Actions workflow dispatch publishes all packages

## Adding a New Package

1. `mkdir -p packages/my-package/src`
2. Create `package.json` with `name: @chauhaidang/my-package`, `publishConfig` pointing to GitHub Packages
3. Create `tsconfig.json` extending `../../tsconfig.json`
4. Export from `src/index.ts`; build output goes to `dist/`

See [SETUP.md](SETUP.md) for the full template.
