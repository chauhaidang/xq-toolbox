# Test plan: `@chauhaidang/xq-test-harness`

## Tier A — smoke

| ID | Case | Expect |
|----|------|--------|
| T1 | `yarn build` in package | `dist/` contains `index.js`, `config.js`, `advanced.js` |
| T2 | `yarn test` in package | bddgen + Playwright: contract specs + dogfood scenario pass |
| T3 | `mergeApiHarnessPlaywrightConfig` contract tests | bdd + contract project order; no default `use.channel`; `overrides.use` merge |

## Tier B — monorepo integration

| ID | Case | Expect |
|----|------|--------|
| B1 | `task test:xq-test-harness-e2e-consumer` | Consumer runs BDD with **only** `workspace:*` harness dep (no direct Playwright deps) |
| B2 | Parallel `task test` | Dogfood mock **19999**, consumer mock **19998**, no port clash |

## Tier C — publishing (manual / CI)

| ID | Case | Expect |
|----|------|--------|
| C1 | Version bump on `main` | `check-version-changes` lists `xq-test-harness`; publish job can `yarn npm publish` |
| C2 | Consumer install doc | Single `@chauhaidang/xq-test-harness` devDependency documented |
