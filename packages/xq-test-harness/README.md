# @chauhaidang/xq-test-harness

Playwright **API testing** + **Gherkin** (via [`playwright-bdd`](https://github.com/vitalets/playwright-bdd)) for black-box backend tests. Tier A: import `When` / `Then` / `Given` / `Step` and the shared `test` / `expect` from this package only—`createBdd` is wired internally.

## Design decisions (ADR)

| Topic | Decision |
|--------|----------|
| **Tier A** | One canonical `test` (playwright-bdd + reserved `xq` fixture). `Given` / `When` / `Then` / `Step` are pre-bound; consumers do not call `createBdd` for normal flows. Playwright’s native `request` is unchanged. |
| **Advanced** | `@chauhaidang/xq-test-harness/advanced` exports `createHarnessBdd` and `mergeTests` for custom `test.extend` / merged fixtures. |
| **Dependencies** | `@playwright/test` and `playwright-bdd` are **runtime `dependencies`** of this package (not peer dependencies). Consumers add **only** `@chauhaidang/xq-test-harness` for the harness stack. |
| **Gherkin `And` / `But`** | Supported in `.feature` files by the runner; playwright-bdd v8 does not expose separate `And` / `But` step builders—use `When` / `Then` / `Given` in step files. |
| **Versioning** | Package semver starts at `0.1.0`; bump on `main` to trigger GitHub Actions publish for this workspace (see [Publishing](#publishing)). |

## Install (consumer)

**One dev dependency** (GitHub Packages for `@chauhaidang`):

```json
{
  "devDependencies": {
    "@chauhaidang/xq-test-harness": "^0.1.0"
  }
}
```

`.npmrc` (consumer repo):

```ini
@chauhaidang:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

You still need **TypeScript** (and usually `@types/node`) to author `playwright.config.ts` and step files—that is normal dev tooling, not the harness itself.

### Scripts and CLIs

After install, `bddgen` and `playwright` come in **transitively**. Prefer:

```json
{
  "scripts": {
    "test:bdd": "yarn exec bddgen -c playwright.config.ts && yarn exec playwright test -c playwright.config.ts"
  }
}
```

If `yarn exec` does not resolve a binary in your layout, call the copies under `node_modules/.bin/` or `node node_modules/playwright-bdd/dist/cli/index.js` as a fallback.

### API-only CI / install

Set `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` when installing or in CI if you only use `request` / API tests (smaller install). The monorepo publish workflow sets this for `yarn install`.

## Quickstart (Tier A)

1. `playwright.config.ts` — use `defineApiHarnessConfig` from `@chauhaidang/xq-test-harness/config` (see [docs/CONSUMER-GUIDE.md](docs/CONSUMER-GUIDE.md)).
2. `bdd-world.ts` — `export { test, expect } from '@chauhaidang/xq-test-harness';` and point playwright-bdd `importTestFrom` at this file.
3. Step definitions — `import { When, Then, expect } from '@chauhaidang/xq-test-harness'`.
4. Run `bddgen` then `playwright test`.

Do **not** add `@playwright/test` or `playwright-bdd` as direct dependencies in the consumer app unless you accept duplicate installs and version skew.

## Public API

| Import | Contents |
|--------|-----------|
| `@chauhaidang/xq-test-harness` | `test`, `expect`, `Given`, `When`, `Then`, `Step`, type `XQFixture` |
| `@chauhaidang/xq-test-harness/config` | `defineApiHarnessConfig`, `mergeApiHarnessPlaywrightConfig`, `defineBddProject` |
| `@chauhaidang/xq-test-harness/advanced` | `mergeTests`, `createHarnessBdd` |

### `defineApiHarnessConfig`

Merges:

- Optional **BDD** project via `defineBddProject` (`bdd` option).
- Optional **`contract`** Playwright project when `contractSpecs` is set (default `contractTestDir`: `tests`).
- **`use`**: shallow merge; `overrides.use` is merged on top.
- **`projects`**: harness-built projects first, then `options.projects`, then `overrides.projects` (each appended in order).

### `request` and `xq`

- **`request`:** Standard Playwright API testing fixture. Set `use.baseURL` in `defineApiHarnessConfig` (for example from `process.env.BASE_URL`) so `request.get('/path')` resolves relative URLs as usual.
- **`xq`:** Reserved fixture (`XQFixture`, currently `{}`) for future XQ-specific context. Include `xq` in step signatures when you want forward compatibility.

## Publishing (this monorepo)

- Bump **`version`** in this `package.json` on `main`.
- CI runs `scripts/check-version-changes.js` and publishes changed workspaces to GitHub Packages (`yarn npm publish` per package).
- Manual `workflow_dispatch` can publish all non-private workspaces.

See repo root [`.github/workflows/publish.yml`](../../.github/workflows/publish.yml).

## Development (xq-toolbox)

```bash
task build:xq-test-harness
task test:xq-test-harness
task lint:xq-test-harness
```

Dogfood lives under `bdd-dogfood/`; contract-style config assertions under `tests/*.contract.spec.ts`.

## Links

- [Consumer guide](docs/CONSUMER-GUIDE.md)
- [Test plan](TEST-PLAN.md)
- Agent skill (full checklist: VS Code, scripts, CI): `skills/xq-test-harness-bdd/SKILL.md` (published with the package)

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
