# Consumer guide: `@chauhaidang/xq-test-harness`

**Four things to remember:** one Yarn package; **`bdd-world.ts`** (types + client instances); config with **`importTestFrom`**; step files import keywords from the harness.

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

Do not add `@playwright/test` or `playwright-bdd` separately. Add your generated or hand-rolled API client packages as needed (for example `@chauhaidang/read-service-api`).

---

## 2. `bdd-world.ts`

The harness does **not** ship SDK instances. It provides runtime **`xq.apis`** as **`{}`** and an empty mergeable **`XQApiClients`** interface until you wire clients in **`bdd-world.ts`**.

Put **declaration merging** and **runtime clients** in one file. **`bddgen`** and your steps use the **`test`** you export here; set **`bdd.importTestFrom: './bdd-world.ts'`** in config (section 3).

```typescript
import { test as base, expect } from '@chauhaidang/xq-test-harness';
import { ReadServiceApi } from '@chauhaidang/read-service-api';

declare module '@chauhaidang/xq-test-harness' {
  interface XQApiClients {
    read: ReadServiceApi;
  }
}

export const test = base.extend({
  xq: async ({ xq }, use) => {
    const baseURL = process.env.BASE_URL ?? '';
    await use({
      ...xq,
      apis: {
        ...xq.apis,
        read: new ReadServiceApi({ basePath: baseURL }),
      },
    });
  },
});

export { expect };
```

Add more SDKs by extending **`XQApiClients`** and adding matching keys under **`apis`** in the same file. Keep names aligned between the interface and **`apis`**.

A shared **`@org/test-clients`** package can export the same **`bdd-world.ts`** (or re-export its **`test`** / **`expect`**) for multiple test repos.

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

When('I call ping via the read API client', async ({ xq }) => {
  const res = await xq.apis.read.ping(); // example; method name depends on your SDK
  expect(res).toBeDefined();
});
```

Use Playwright’s **`request`** fixture when you need raw HTTP without a typed SDK:

```typescript
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
