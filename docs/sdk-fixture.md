# Generated SDK client as a Playwright fixture

The harness stays **client-agnostic** by default. When a team uses a generated OpenAPI / internal SDK, combine fixtures with Playwright’s [`mergeTests`](https://playwright.dev/docs/test-fixtures#combine-custom-fixtures-from-multiple-modules) using **`@chauhaidang/xq-test-harness/advanced`** (Tier A root export intentionally omits `mergeTests`).

## Pattern A — `test.extend` in the consumer repo (Tier A base)

```typescript
import { test as base, expect } from "@chauhaidang/xq-test-harness";
import { ReadServiceApi } from "@chauhaidang/read-service-api"; // example

export const test = base.extend<{ readServiceApi: ReadServiceApi }>({
  // Playwright requires object destructuring for fixture dependencies; `xq` is the harness placeholder.
  readServiceApi: async ({ xq: _xq }, use) => {
    void _xq;
    const baseURL = process.env.BASE_URL ?? "";
    const client = new ReadServiceApi({ basePath: baseURL });
    await use(client);
  },
});

export { expect };
```

Point playwright-bdd `importTestFrom` at the file that exports this `test` (see harness README / CONSUMER-GUIDE).

## Pattern B — `mergeTests` (advanced entrypoint)

```typescript
import { mergeTests, createHarnessBdd } from "@chauhaidang/xq-test-harness/advanced";
import { test as harnessTest } from "@chauhaidang/xq-test-harness";
import { test as clientTest } from "./fixtures/with-read-service";

export const test = mergeTests(harnessTest, clientTest);

const bdd = createHarnessBdd(test);
export const Given = bdd.Given;
export const When = bdd.When;
export const Then = bdd.Then;
export const Step = bdd.Step;
```

Point step files at this module (or re-export selectively). Export the merged `test` / `expect` from `bdd-world.ts` and set **`bdd.importTestFrom: './bdd-world.ts'`** in `defineApiHarnessConfig` so generated tests and steps share the same fixtures.
