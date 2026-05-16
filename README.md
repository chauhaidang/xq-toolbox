# xq-toolbox

A Yarn Berry workspaces monorepo of TypeScript tools, libraries, and frameworks for XQ applications. Packages publish to GitHub Packages under `@chauhaidang`.

## Quick start

- **Prerequisites:** Node.js ≥ 18, [Task](https://taskfile.dev/), Corepack-enabled Yarn (see root `package.json` `packageManager`).
- **Install:** `task install` or `yarn install`
- **Build / test / lint:** `task build`, `task test`, `task lint`

See **[CLAUDE.md](CLAUDE.md)** for the canonical tree, per-package notes (including `xq-test-harness`), and CI/publish behavior.

## Packages (high level)

| Path | Role |
|------|------|
| `packages/xq-common-kit/` | Shared utilities (logger, config, yaml, …) |
| `packages/xq-test-utils/` | Jest/DB/service helpers for component tests |
| `packages/xq-test-infra/` | Docker Compose test env CLI (`xq-infra`) |
| `packages/xq-test-harness/` | Playwright API + Gherkin BDD harness |
| `packages/xq-scripts/` | Bash scripts (tarball release, not npm) |

## Publishing

Version bump a package’s `package.json` on `main` → CI builds, tests, and publishes changed workspaces. Manual dispatch can publish all. Details in [CLAUDE.md](CLAUDE.md) and [.github/workflows/publish.yml](.github/workflows/publish.yml).

## More docs

- [SETUP.md](SETUP.md) — package scaffolding template (prefers Yarn/Task; see top note there)
- [docs/sdk-fixture.md](docs/sdk-fixture.md) — merging generated API clients with the harness

## License

Apache-2.0
