# xq-toolbox

A Yarn Berry workspaces monorepo of TypeScript tools, libraries, and frameworks for XQ applications. Packages publish to GitHub Packages under `@chauhaidang`.

## Quick start

- **Prerequisites:** Node.js ≥ 18, [Task](https://taskfile.dev/), Corepack-enabled Yarn (see root `package.json` `packageManager`).
- **Install Task:** `brew install go-task` (macOS), [other installs](https://taskfile.dev/installation/).
- **Enable Yarn:** `corepack enable`
- **Install / build / test / lint:**

```bash
task install    # or: yarn install
task build
task test
task lint
task clean
```

List all tasks: `task --list`. Per-package: `task build:xq-common-kit`, `task test:xq-test-harness`, etc.

Package-local Yarn scripts still work: `cd packages/xq-common-kit && yarn build`.

## Repository layout

```text
xq-toolbox/
├── packages/
│   ├── xq-common-kit/              # Shared utilities (logger, config, yaml, …)
│   ├── xq-test-utils/              # Jest/DB/service helpers for component tests
│   ├── xq-test-infra/              # Docker Compose test env CLI (`xq-infra`)
│   ├── xq-test-harness/            # Playwright API + Gherkin BDD harness
│   ├── xq-test-harness-e2e-consumer/  # Private workspace; exercises harness like an external consumer
│   ├── xq-scripts/                 # Bash scripts (tarball release, not npm)
│   └── poc/                        # Proof-of-concept experiments
├── schemas/
├── scripts/
├── Taskfile.yml
├── tsconfig.json
└── package.json
```

## Packages

| Path | Role |
|------|------|
| `packages/xq-common-kit/` | TypeScript utilities: `logger`, `config`, `yaml`, `string`, `datetime`, `markdown` — build with `tsc` → `dist/` |
| `packages/xq-test-utils/` | DB helpers (`pg`), `wait-on`, reporting, Jest config; depends on `xq-common-kit` |
| `packages/xq-test-infra/` | JavaScript CLI (`xq-infra`): compose generator, gateway, registry auth; `node --check` + Jest |
| `packages/xq-test-harness/` | Bundled Playwright + playwright-bdd; Tier A BDD; see package [README](packages/xq-test-harness/README.md) |
| `packages/xq-scripts/` | VERSION-file bash scripts; released as tarball |

## TypeScript

Root `tsconfig.json`: `strict`, ES2022, CommonJS. Test files (`*.test.ts`, `*.spec.ts`) are excluded from compilation. Each package extends the root config with its own `outDir` / `rootDir`.

## Publishing

- **Registry:** `https://npm.pkg.github.com` (auth via `NODE_AUTH_TOKEN` in `.yarnrc.yml`)
- **Automatic:** push to `main` with a bumped `version` in a package `package.json` → CI publishes that workspace
- **Manual:** workflow dispatch publishes all packages

See [.github/workflows/publish.yml](.github/workflows/publish.yml).

## Adding a package

1. `mkdir -p packages/my-package/src`
2. Add `package.json` (`@chauhaidang/my-package`, GitHub Packages `publishConfig`), `tsconfig.json` extending `../../tsconfig.json`
3. Export from `src/index.ts`; build to `dist/`
4. Add `build:`, `test:`, `lint:`, `clean:` tasks to `Taskfile.yml` and wire into aggregate `build` / `test` / `lint`

Full templates: [SETUP.md](SETUP.md). Python (`uv`) and Go package notes are in the Taskfile / workflow comments.

## More docs

- [SETUP.md](SETUP.md) — scaffolding template
- [packages/xq-test-harness/docs/CONSUMER-GUIDE.md](packages/xq-test-harness/docs/CONSUMER-GUIDE.md) — adopting the BDD harness and wiring API clients

## License

Apache-2.0
