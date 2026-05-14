# Consumer guide: `@chauhaidang/xq-test-harness`

For an **agent-oriented end-to-end checklist** (VS Code Cucumber globs through CI), use the published skill **`skills/xq-test-harness-bdd/SKILL.md`** inside the package (or your agent’s skill mirror).

This guide assumes a **new** TypeScript repo using **Yarn 4+** and API-only tests (no browser download required for CI).

## 1. Auth and dependency

Add `.npmrc` at the repo root (GitHub Packages):

```ini
@chauhaidang:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Install **only** the harness:

```bash
yarn add -D @chauhaidang/xq-test-harness typescript @types/node
```

Do **not** add `@playwright/test` or `playwright-bdd` as separate dependencies unless you intentionally want a second copy and possible version conflicts.

## 2. `bdd-world.ts`

Create `bdd-world.ts` at the repo root (next to `playwright.config.ts`):

```typescript
export { test, expect } from '@chauhaidang/xq-test-harness';
```

Point playwright-bdd `importTestFrom` at this file so generated tests use the same extended `test` as your steps.

## 3. `playwright.config.ts`

```typescript
import { defineApiHarnessConfig } from '@chauhaidang/xq-test-harness/config';

export default defineApiHarnessConfig({
  bdd: {
    name: 'bdd',
    features: 'features/**/*.feature',
    steps: 'steps/**/*.ts',
    importTestFrom: './bdd-world.ts',
    outputDir: '.features-gen',
    disableWarnings: { importTestFrom: true },
  },
  use: {
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:8080',
  },
});
```

Adjust `features`, `steps`, and `baseURL` for your service.

## 4. Features and steps

- Put Gherkin under `features/`.
- Put step definitions under `steps/`, importing Tier A keywords:

```typescript
import { When, Then, expect } from '@chauhaidang/xq-test-harness';

When('I call ping', async ({ request }) => {
  // ...
});
```

The harness `test` also exposes an **`xq`** fixture (`XQFixture`), currently an empty placeholder for future XQ-specific context. You can omit it or add `xq` to the fixture tuple when you want forward compatibility.

## 5. Scripts

```json
{
  "scripts": {
    "test:bdd": "yarn exec bddgen -c playwright.config.ts && yarn exec playwright test -c playwright.config.ts"
  }
}
```

## 6. CI

Set `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` on `yarn install` / test jobs when you only use the `request` API.

## 7. Advanced fixtures

To combine the harness with another `test.extend` chain, use `@chauhaidang/xq-test-harness/advanced` (`mergeTests`, `createHarnessBdd`). See the root repo [sdk-fixture.md](../../../docs/sdk-fixture.md) for patterns.
