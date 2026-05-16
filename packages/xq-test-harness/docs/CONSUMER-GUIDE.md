# Consumer guide: `@chauhaidang/xq-test-harness`

**Four things to remember:** one Yarn package, `bdd-world.ts`, config with `importTestFrom`, step files import keywords from the harness.

Full agent checklist (VS Code, CI): [skills/xq-test-harness-bdd/SKILL.md](../skills/xq-test-harness-bdd/SKILL.md).  
Package architecture: [README.md](../README.md).

---

## 1. Install

`.npmrc` (GitHub Packages):

```ini
@chauhaidang:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```bash
yarn add -D @chauhaidang/xq-test-harness typescript @types/node
```

Do not add `@playwright/test` or `playwright-bdd` separately.

---

## 2. `bdd-world.ts`

Re-export the harness `test` and `expect` so **bddgen** generated specs use the same instance as your steps:

```typescript
export { test, expect } from '@chauhaidang/xq-test-harness';
```

If you extend or merge fixtures, export your custom `test` / `expect` from this file instead. See [sdk-fixture.md](../../../docs/sdk-fixture.md).

---

## 3. Config

`playwright.config.ts`:

```typescript
import { defineApiHarnessConfig } from '@chauhaidang/xq-test-harness/config';

export default defineApiHarnessConfig({
  bdd: {
    features: 'features/**/*.feature',
    steps: 'steps/**/*.ts',
    importTestFrom: './bdd-world.ts',
    disableWarnings: { importTestFrom: true },
  },
  use: {
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:8080',
  },
});
```

---

## 4. Steps and run

`steps/example.steps.ts`:

```typescript
import { When, Then, expect } from '@chauhaidang/xq-test-harness';

When('I call ping', async ({ request }) => {
  const res = await request.get('/ping');
  expect(res.status()).toBe(200);
});
```

`package.json`:

```json
{
  "scripts": {
    "test:bdd": "yarn exec bddgen -c playwright.config.ts && yarn exec playwright test -c playwright.config.ts"
  }
}
```

CI (API-only): set `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` on `yarn install`.
