---
name: xq-test-harness-bdd
description: >-
  End-to-end setup for @chauhaidang/xq-test-harness: GitHub Packages auth, Yarn deps,
  VS Code/Cucumber step globs, bdd-world, defineApiHarnessConfig, bddgen/playwright scripts,
  gitignore, CI env, and advanced fixture patterns.
---

# Skill: xq-test-harness BDD (consumer setup)

Use this skill when you are **greenfielding or migrating** a repo to **Playwright API + Gherkin** using **`@chauhaidang/xq-test-harness`** with **one** primary harness dependency (Playwright and playwright-bdd ship transitively inside the harness).

## When to use

- Backend or API black-box tests written in **Gherkin** and executed with **Playwright Test** + **playwright-bdd**.
- The team wants **Tier A** step imports (`Given`, `When`, `Then`, `Step`, `expect`, `test`) from a single package.
- You need a **checklist** from editor configuration through CI.

---

## 1. Prerequisites

- **Node.js** ≥ 18 (match harness `engines` if you add them later).
- **Yarn** 4+ (Corepack). Commands below use `yarn`; npm is not the default for this stack.
- **GitHub Packages** access for the `@chauhaidang` scope (token with `read:packages` for install; publish is separate).

---

## 2. Registry and dependencies

**Root `.npmrc`** (consumer repo):

```ini
@chauhaidang:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

**Install** (harness only for the stack; keep authoring tools explicit):

```bash
yarn add -D @chauhaidang/xq-test-harness typescript @types/node
```

Do **not** add `@playwright/test` or `playwright-bdd` as direct dependencies unless you accept duplicate installs and version skew.

---

## 3. Repository layout

Create (or align) this layout next to `package.json`:

```text
your-repo/
├── .npmrc
├── .vscode/
│   └── settings.json          # see section 4
├── bdd-world.ts               # re-export test/expect for bddgen
├── playwright.config.ts       # defineApiHarnessConfig + importTestFrom
├── features/
│   └── *.feature
├── steps/
│   └── *.ts                   # Tier A step definitions
└── tests/                       # optional: plain Playwright contract tests
```

**Gitignore** (minimum):

```gitignore
.features-gen/
test-results/
playwright-report/
```

`bddgen` writes generated specs under **`outputDir`** (default `.features-gen`); keep it out of version control.

---

## 4. VS Code (and compatible editors)

### 4.1 Cucumber step discovery

Install an extension that supports **Cucumber autocomplete** using workspace settings (common choice: **Cucumber (Gherkin) Full Support** or equivalent that reads `cucumberautocomplete.*` keys).

**`.vscode/settings.json`** — merge this structure (adjust `features/` and `steps/` if your folders differ):

```json
{
  "cucumberautocomplete.steps": [
    "features/**/*.ts",
    "features/**/*.js",
    "steps/**/*.ts",
    "steps/**/*.js",
    "node_modules/@chauhaidang/xq-test-harness/dist/**/*.js",
    "node_modules/@chauhaidang/xq-test-harness/dist/**/*.ts"
  ],
  "cucumberautocomplete.strictGherkinCompletion": true
}
```

**Why `node_modules/.../dist/`:** the published harness ships **compiled** step-related exports under `dist/`. Your own steps live under `features/` and `steps/` as TypeScript. The globs let autocomplete and “go to step” see **both** local steps and harness internals when useful.

**Canonical JSON in the xq-toolbox monorepo:** [docs/vscode-settings.example.json](https://github.com/chauhaidang/xq-toolbox/blob/main/docs/vscode-settings.example.json) — copy the same keys into your consumer `.vscode/settings.json`.

### 4.2 Playwright (recommended)

Install **Playwright Test for VS Code** (Microsoft) for running and debugging tests. It uses `playwright.config.ts` at the repo root; no extra harness-specific setting is required beyond a valid config.

### 4.3 Optional: workspace extension recommendations

**`.vscode/extensions.json`** (team hints, not required):

```json
{
  "recommendations": [
    "ms-playwright.playwright",
    "alexkrechik.cucumberautocomplete"
  ]
}
```

Adjust the Cucumber extension id if your team standardizes on a different marketplace package, as long as it honors **`cucumberautocomplete.*`** settings.

---

## 5. `bdd-world.ts` and `playwright.config.ts`

**`bdd-world.ts`** (repo root next to config):

```typescript
export { test, expect } from "@chauhaidang/xq-test-harness";
```

**`playwright.config.ts`:**

```typescript
import { defineApiHarnessConfig } from "@chauhaidang/xq-test-harness/config";

export default defineApiHarnessConfig({
  bdd: {
    name: "bdd",
    features: "features/**/*.feature",
    steps: "steps/**/*.ts",
    outputDir: ".features-gen",
    importTestFrom: "./bdd-world.ts",
    disableWarnings: { importTestFrom: true },
  },
  use: {
    baseURL: process.env.BASE_URL ?? "http://127.0.0.1:8080",
  },
});
```

- **`importTestFrom`:** points **bddgen** at the same **`test`** instance your steps use (via **`bdd-world.ts`**).
- **`use.baseURL`:** Playwright’s native **`request`** fixture uses this for relative URLs; set from env per environment.
- **`xq`:** reserved **`xq`** fixture (`XQFixture`) with logging and placeholder infra buckets; **`xq.apis`** is **`{}`** until the consumer merges clients in **`bdd-world.ts`**.
- **`webServer`:** add when you need a local HTTP mock or app under test.
- **API clients:** the harness does not ship SDK instances; wire types and clients in **`bdd-world.ts`** (see section 6 and **`docs/CONSUMER-GUIDE.md`** in the harness package).

---

## 6. API clients on `xq.apis` (`bdd-world.ts`)

The harness does **not** provide SDK instances. Put **`declare module`** augmentation and **`test.extend`** runtime wiring in one **`bdd-world.ts`**. Set **`bdd.importTestFrom: './bdd-world.ts'`**.

```typescript
import { test as base, expect } from "@chauhaidang/xq-test-harness";
import { ReadServiceApi } from "@chauhaidang/read-service-api";

declare module "@chauhaidang/xq-test-harness" {
  interface XQApiClients {
    read: ReadServiceApi;
  }
}

export const test = base.extend({
  xq: async ({ xq }, use) => {
    const baseURL = process.env.BASE_URL ?? "";
    await use({
      ...xq,
      apis: { ...xq.apis, read: new ReadServiceApi({ basePath: baseURL }) },
    });
  },
});

export { expect };
```

Full copy-paste blocks: **`docs/CONSUMER-GUIDE.md`** section 2.

---

## 7. Step definitions (Tier A)

```typescript
import { When, Then, expect } from "@chauhaidang/xq-test-harness";

When("I call ping", async ({ request }) => {
  const res = await request.get("/ping");
  expect(res.status()).toBe(200);
});
```

Imports must come from **`@chauhaidang/xq-test-harness`** for normal flows (see **`docs/CONSUMER-GUIDE.md`**).

---

## 8. Scripts (`package.json`)

```json
{
  "scripts": {
    "test:bdd": "yarn exec bddgen -c playwright.config.ts && yarn exec playwright test -c playwright.config.ts"
  }
}
```

- **`bddgen`** and **`playwright`** come from transitive dependencies of the harness; **`yarn exec`** resolves them reliably in Yarn 4.
- If binaries are not found, fall back to **`node_modules/.bin/bddgen`** and **`node_modules/.bin/playwright`**, or run **`node node_modules/playwright-bdd/dist/cli/index.js`** for bddgen (last resort).

---

## 9. CI

- Set **`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`** on **`yarn install`** (and optionally on test) when you only use **`request`** (API-only) to avoid downloading browsers in CI.
- Ensure **`NODE_AUTH_TOKEN`** (or `GITHUB_TOKEN` with `read:packages`) is available so `.npmrc` can authenticate to GitHub Packages.

---

## 10. Verify

```bash
yarn install
yarn test:bdd
```

Expect **`bddgen`** to create **`.features-gen/`** and Playwright to run the **bdd** project. Fix **`features`** and **`steps`** globs first if generation or collection fails.

---

## 11. References (human docs)

| Doc | Purpose |
|-----|---------|
| Package **README** (in the harness package) | ADR, publishing, public API table |
| **`docs/CONSUMER-GUIDE.md`** (in the harness package) | Install, `bdd-world.ts`, config, steps |

---

## Rules (agent)

- Prefer **Tier A** imports from `@chauhaidang/xq-test-harness`; follow **`docs/CONSUMER-GUIDE.md`** for **`bdd-world.ts`**, **`XQApiClients`**, and **`xq.apis`**.
- Add **`bdd-world.ts`** (types + client instances) and **`bdd.importTestFrom: './bdd-world.ts'`** for every consumer.
- Add **VS Code** step globs (section 4) whenever the user uses Cucumber autocomplete; without **`node_modules/.../dist/`** globs, cross-package navigation may be incomplete for the installed harness.
