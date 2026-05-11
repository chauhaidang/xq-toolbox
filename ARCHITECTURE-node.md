# Shared BDD Architecture — Node.js / TypeScript

## Overview

A 2-repo BDD system. `xq-runner` is a single npm package providing both the
CLI and shared core utilities. Each service team owns their feature files and
step definitions directly in their service repo — full autonomy, no shared
step bottleneck.

---

## Repository Map

```
┌──────────────────────────────────────────────────────────────────────┐
│  @chauhaidang/xq-runner  (npm package)                               │
│  Owns : CLI + base ICustomWorld + shared utilities                   │
│  Published : GitHub Packages (npm.pkg.github.com)                    │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ yarn add --dev @chauhaidang/xq-runner
        ┌──────────────────────▼──────────────┐  ┌──────────────────────────────┐
        │  service-payments                   │  │  service-search              │
        │  features/ + steps/                 │  │  features/ + steps/          │
        │  full step ownership                │  │  full step ownership         │
        └─────────────────────────────────────┘  └──────────────────────────────┘
```

---

## `xq-runner` Package

### Responsibility

Single package, two roles:
1. **CLI** — `xq-runner run ./features/`
2. **Core library** — base `ICustomWorld`, HTTP client, auth helpers, Chai assertions

### Project Structure

```
xq-runner/
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.js
└── src/
    ├── cli.ts                 ← Commander entry point; owns process.exit()
    ├── commands/
    │   └── run.ts             ← Cucumber programmatic API; returns boolean
    ├── steps/                 ← shared step definitions (auto-loaded by CLI)
    │   └── common.ts          ← generic response assertions; empty in v0.1.0
    ├── core/
    │   ├── index.ts           ← barrel export (public API)
    │   ├── world.ts           ← base ICustomWorld + expect injection
    │   ├── http.ts            ← pre-configured HTTP client (built-in fetch)
    │   ├── auth.ts            ← auth/session helpers
    │   └── assertions.ts      ← Chai BDD re-export
    ├── __tests__/
    │   ├── assertions.test.ts
    │   ├── auth.test.ts
    │   └── http.test.ts
    └── index.ts               ← re-exports core/index.ts
```

### `package.json`

```json
{
  "name": "@chauhaidang/xq-runner",
  "version": "0.1.0",
  "bin": { "xq-runner": "./dist/cli.js" },
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint . --ext .ts",
    "lint:fix": "eslint . --ext .ts --fix",
    "clean": "rm -rf dist"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  },
  "dependencies": {
    "@cucumber/cucumber": "^10.0.0",
    "chai": "^4.0.0",
    "commander": "^12.0.0",
    "ts-node": "^10.0.0"
  },
  "devDependencies": {
    "@types/chai": "^4.0.0",
    "@types/jest": "^30.0.0",
    "@types/node": "^24.10.1",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^8.50.0",
    "jest": "^30.1.1",
    "ts-jest": "^29.2.0",
    "typescript": "^5.9.3"
  }
}
```

> **chai@^4:** Chai v5+ is ESM-only and cannot be loaded via `require()`. Since
> `xq-runner` compiles to CommonJS (required by Cucumber.js), `chai@^4` — the
> last CJS-compatible major — is used.
>
> **ts-node in `dependencies`:** Must be present at runtime so xq-runner can
> auto-register `ts-node` before Cucumber loads TypeScript step files. Consumers
> do not need to install or configure it separately.

### Public API (`src/core/index.ts`)

```typescript
export type { ICustomWorld } from './world'
export { CustomWorld } from './world'
export { createHttpClient } from './http'
export type { HttpClient, HttpResponse } from './http'
export { createAuthHelper } from './auth'
export type { AuthHelper } from './auth'
```

> `expect` is not exported from the public API — it is injected onto every
> `CustomWorld` instance as `this.expect` so step definitions need no import.

### `ICustomWorld` / `CustomWorld`

```typescript
// src/core/world.ts
import { World, IWorldOptions } from '@cucumber/cucumber'
import { expect as chaiExpect } from 'chai'

export interface ICustomWorld extends World {
  /** Chai BDD `expect` — use as `this.expect(value).to.equal(...)` in steps. */
  readonly expect: typeof chaiExpect
}

export class CustomWorld extends World implements ICustomWorld {
  readonly expect = chaiExpect

  constructor(options: IWorldOptions) {
    super(options)
  }
}
```

Teams extend `CustomWorld` to add typed properties. `this.expect` is available
in every step definition without any per-file import.

### `HttpClient`

```typescript
// src/core/http.ts
export interface HttpResponse<T = unknown> {
  status: number
  headers: Record<string, string>
  body: T
}

export interface HttpClient {
  get<T>(path: string, headers?: Record<string, string>): Promise<HttpResponse<T>>
  post<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<HttpResponse<T>>
  put<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<HttpResponse<T>>
  patch<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<HttpResponse<T>>
  delete<T>(path: string, headers?: Record<string, string>): Promise<HttpResponse<T>>
}

export function createHttpClient(baseUrl: string, defaultHeaders?: Record<string, string>): HttpClient
```

Uses Node's built-in `fetch` (Node 18+). JSON responses are auto-parsed;
other content types fall back to text.

### `AuthHelper`

```typescript
// src/core/auth.ts
export interface AuthHelper {
  bearerToken(token: string): Record<string, string>
  basicAuth(username: string, password: string): Record<string, string>
  apiKey(key: string, headerName?: string): Record<string, string>
}

export function createAuthHelper(): AuthHelper
```

Returns header objects suitable for `createHttpClient(baseUrl, authHeaders)` or
per-request header arguments.

### Shared Step Definitions

Step definitions shipped inside `xq-runner` at `dist/steps/`. The CLI auto-loads
them before consumer steps — consumers add nothing to `cucumber-extension.js`.

#### Auto-injection in `run.ts`

```typescript
import path from 'path'

// __dirname at runtime: dist/commands/  →  ../steps resolves to dist/steps/
const sharedStepsGlob = path.join(__dirname, '../steps/**/*.js')

const provided = {
  requireModule: ['ts-node/register'],
  require: [sharedStepsGlob, ...(options.require ?? [])],
  // ...
}
```

Shared steps load before consumer steps. `dist/steps/` is already covered by
`"files": ["dist"]` in `package.json` — no packaging change needed.

#### Source file pattern

Shared step source files use `require()` destructuring instead of `import {}`:

```typescript
// src/steps/common.ts
const { Given, When, Then } = require('@cucumber/cucumber') as typeof import('@cucumber/cucumber')

Given('the response status is {int}', function(this: ICustomWorld, status: number) {
  this.expect((this as any).lastResponse!.status).to.equal(status)
})
```

**Why `require()` instead of `import {}`:** TypeScript's CJS emit for named imports
produces `(0, cucumber_1.Given)(...)` — a sequence expression callee the Cucumber
LSP's tree-sitter parser cannot match against `Given|When|Then` identifiers.
`require()` destructuring compiles to a direct `Given(...)` call that the LSP
recognises as a step definition.

This is the one deliberate deviation from idiomatic TypeScript `import` style in
the entire package.

#### Consumer VS Code settings

The Cucumber LSP is a separate process from the runner — it reads `cucumber.glue`
independently and does not see the runtime auto-injection. Consumers add the
shared steps glob once to their `.vscode/settings.json`:

```json
{
  "cucumber.glue": [
    "features/steps/**/*.ts",
    "node_modules/@chauhaidang/xq-runner/dist/steps/**/*.js"
  ],
  "cucumber.features": ["features/**/*.feature"]
}
```

xq-runner's README documents this exact glob. After `yarn install` the path
resolves and autocomplete covers both local and shared steps.

> [!IMPORTANT]
> **Duplicate step patterns cause a hard Cucumber load error.** If a consumer
> step file defines a pattern identical to a shared step, Cucumber throws
> `Multiple step definitions match` at startup and the run fails entirely.
> Shared step patterns are intentionally generic (e.g. `the response status is {int}`).
> Do not redefine them in service steps — extend `CustomWorld` with additional
> typed properties instead.

#### Shipped step content

`src/steps/` ships as a populated stub in Phase 1 and is expanded in Phase 3
alongside DB helpers and wait/retry utilities. Phase 3 defines the specific
patterns; the auto-injection infrastructure ships in Phase 1.

---

### CI Release Pipeline

```yaml
# .github/workflows/publish.yml
# xq-runner is included in the monorepo's version-change-driven publish job.
# A version bump in packages/xq-runner/package.json triggers:
#   yarn workspace @chauhaidang/xq-runner build
#   yarn npm publish  →  GitHub Packages
```

---

## Service Repo Structure

```
service-payments/
├── package.json                  ← @chauhaidang/xq-runner as devDependency
├── .npmrc                        ← @chauhaidang:registry=https://npm.pkg.github.com
├── cucumber-extension.js         ← consumer overrides: paths, steps, worldParameters
├── .vscode/
│   └── settings.json             ← cucumber.glue → local steps
└── features/
    ├── checkout.feature
    ├── refund.feature
    └── steps/
        ├── world.ts              ← extends CustomWorld from @chauhaidang/xq-runner
        └── checkout.steps.ts     ← team-owned step definitions
```

### `package.json` (service repo)

```json
{
  "name": "service-payments",
  "scripts": {
    "test:bdd": "xq-runner run ./features/",
    "test:bdd:smoke": "xq-runner run ./features/ --tags @smoke",
    "test:bdd:report": "xq-runner run ./features/ --format junit > report.xml"
  },
  "devDependencies": {
    "@chauhaidang/xq-runner": "^0.1.0"
  }
}
```

### `.npmrc` (service repo)

```
@chauhaidang:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

### `cucumber-extension.js` (service repo)

Consumer-owned config. Declares paths, their own step globs, and world parameters.
xq-runner reads this file automatically and merges in shared steps — consumers
never reference `dist/steps/` here.

```js
module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['features/steps/**/*.ts'],   // ← consumer steps only
    parallel: 2,
    retry: 1,
    failFast: false,
    worldParameters: {
      baseUrl: process.env.BASE_URL
    }
  }
}
```

CLI flags (`--tags`, `--format`, etc.) override individual values at runtime.

### Step Definition Pattern

```typescript
// features/steps/world.ts
import { setWorldConstructor } from '@cucumber/cucumber'
import { CustomWorld, createHttpClient, createAuthHelper } from '@chauhaidang/xq-runner'

export class PaymentsWorld extends CustomWorld {
  auth = createAuthHelper()
  api = createHttpClient(
    process.env.PAYMENTS_BASE_URL!,
    this.auth.bearerToken(process.env.API_TOKEN!)
  )
  card?: string
  result?: { status: number; body: unknown }
}

setWorldConstructor(PaymentsWorld)
```

```typescript
// features/steps/checkout.steps.ts
import { Given, When, Then } from '@cucumber/cucumber'
import type { PaymentsWorld } from './world'

// No import of expect — it comes through this.expect via CustomWorld

Given('I have a valid card {string}', async function(this: PaymentsWorld, card: string) {
  this.card = card
})

When('I complete checkout', async function(this: PaymentsWorld) {
  this.result = await this.api.post('/checkout', { card: this.card })
})

Then('the payment should succeed', function(this: PaymentsWorld) {
  this.expect(this.result!.status).to.equal(200)
})
```

### `.vscode/settings.json` (service repo)

```json
{
  "cucumber.glue": [
    "features/steps/**/*.ts",
    "node_modules/@chauhaidang/xq-runner/dist/steps/**/*.js"
  ],
  "cucumber.features": ["features/**/*.feature"]
}
```

The second glob gives the Cucumber LSP visibility into shared step patterns.
xq-runner's README documents this exact string — consumers copy-paste it once.

---

## CLI Command

### `xq-runner run <features-dir>`

```
Read cucumber-extension.js from cwd (if present)
       │
       ▼
inject shared steps glob into provided.require
  path.join(__dirname, '../steps/**/*.js')
       │
       ▼
loadConfiguration({
  file: 'cucumber-extension.js',
  provided: { /* shared steps + CLI flag overrides */ }
}, { cwd: process.cwd() })
       │
       ▼
runCucumber(runConfiguration)
  │  └── formatters write report to stdout as run progresses
  │
  └── returns { success: boolean, support: SupportCodeLibrary }
       │
       ▼
cli.ts: process.exit(success ? 0 : 1)
```

**ts-node is auto-registered** by xq-runner before Cucumber loads step files.
Consumers never configure `requireModule: ['ts-node/register']` themselves.

**Path resolution:** all paths in `cucumber.js` and CLI arguments resolve
relative to `process.cwd()` — the directory from which the command is run
(the consumer's project root), not the xq-runner package location in
`node_modules`.

**Flags (override cucumber.js values):**

| Flag | Default | Description |
|------|---------|-------------|
| `--format / -f` | `progress` | `progress`, `pretty`, `json`, `junit` |
| `--tags / -t` | _(none)_ | Tag filter, e.g. `@smoke and not @wip` |
| `--dry-run` | false | Validate steps without executing |
| `--require / -r` | _(from cucumber.js)_ | Step glob override (repeatable) |

### Daily Usage

```bash
yarn test:bdd                                        # via package.json script
yarn xq-runner run ./features/                       # direct
yarn xq-runner run ./features/checkout.feature       # single file
yarn xq-runner run ./features/ --tags @smoke         # tag filter
yarn xq-runner run ./features/ --format junit > report.xml
```

---

## Test Bed

A self-contained blackbox suite that validates the **built `dist/` artifact** — not `src/` — exactly as a service team would consume it. Lives inside the package so it runs without publishing or linking.

### Location

```
packages/xq-runner/
└── testbed/
    ├── cucumber.js              ← consumer-style Cucumber config (cwd when running)
    ├── features/
    │   └── sample.feature       ← BDD scenarios covering all core utilities
    └── steps/
        ├── world.ts             ← extends CustomWorld imported from ../../dist
        └── sample.steps.ts      ← BeforeAll mini HTTP server + step definitions
```

### What It Validates

| What | How |
|------|-----|
| `CustomWorld` is extendable | `TestWorld extends CustomWorld` compiles and constructs |
| `this.expect` is available | Used in every `Then` step — no Chai import in step file |
| `createHttpClient` makes real requests | Steps call actual `fetch` against a local Node HTTP server |
| `createAuthHelper` produces correct headers | Bearer and Basic auth verified by local server routes |
| `ts-node` auto-registration works | Step files are TypeScript; no `requireModule` in `cucumber.js` |
| CLI reads `cucumber.js` from cwd | Config loaded from `testbed/`, not from xq-runner package root |
| CLI exits 0 on pass / 1 on fail | Validated by Taskfile `test:xq-runner:e2e` exit code |

### Flow

```
task test:xq-runner:e2e
       │
       ├── deps: build:xq-runner   ← compiles src/ → dist/ first
       │
       └── dir: packages/xq-runner/testbed
           cmd: node ../dist/cli.js run
                        │
                        ├── reads testbed/cucumber.js
                        ├── auto-registers ts-node
                        ├── loads testbed/steps/*.ts
                        └── runs testbed/features/sample.feature
                                      │
                               BeforeAll  → http.createServer on random port
                               Given step → createHttpClient(`http://localhost:${port}`)
                               When steps → real fetch calls through HttpClient
                               Then steps → this.expect(res.status).to.equal(...)
                               AfterAll   → server.close()
```

> **Why import from `../../dist`, not `../../src`:** step files reference the compiled
> artifact on purpose. This catches issues unit tests cannot: tsc emit failures,
> missing `files` entries in `package.json`, wrong `main`/`exports` config.

### `cucumber.js` (testbed)

```js
module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['steps/**/*.ts'],
    worldParameters: {}
  }
}
```

### `features/sample.feature`

```gherkin
Feature: xq-runner blackbox validation

  @smoke
  Scenario: HTTP GET returns parsed JSON
    Given the test server is running
    When I GET "/users/1"
    Then the response status is 200
    And the response body field "name" equals "Alice"

  @smoke
  Scenario: Bearer token is forwarded in Authorization header
    Given the test server is running
    When I GET "/secure" with bearer token "test-token"
    Then the response status is 200

  Scenario: Basic auth credentials are base64 encoded
    Given the test server is running
    When I GET "/basic-auth" with username "user" and password "pass"
    Then the response status is 200
```

### `steps/world.ts` (testbed)

```typescript
import { setWorldConstructor } from '@cucumber/cucumber'
import { CustomWorld, createHttpClient, createAuthHelper } from '../../dist'
import type { HttpClient } from '../../dist'

export class TestWorld extends CustomWorld {
  auth = createAuthHelper()
  api!: HttpClient
  lastResponse?: { status: number; headers: Record<string, string>; body: unknown }
}

setWorldConstructor(TestWorld)
```

### `steps/sample.steps.ts` (testbed)

```typescript
import { BeforeAll, AfterAll, Given, When, Then, setDefaultTimeout } from '@cucumber/cucumber'
import { createHttpClient } from '../../dist'
import * as http from 'http'
import type { TestWorld } from './world'

setDefaultTimeout(10_000)

let server: http.Server
let serverPort: number

BeforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = req.url ?? '/'
    const auth = req.headers['authorization'] ?? ''

    if (url === '/users/1') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ id: 1, name: 'Alice' }))
    } else if (url === '/secure' && auth.startsWith('Bearer ')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
    } else if (url === '/basic-auth' && auth.startsWith('Basic ')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
    } else {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'unauthorized' }))
    }
  })

  await new Promise<void>(resolve => server.listen(0, resolve))
  serverPort = (server.address() as { port: number }).port
})

AfterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close(err => (err ? reject(err) : resolve()))
  )
})

Given('the test server is running', function(this: TestWorld) {
  this.api = createHttpClient(`http://localhost:${serverPort}`)
})

When('I GET {string}', async function(this: TestWorld, path: string) {
  this.lastResponse = await this.api.get(path)
})

When('I GET {string} with bearer token {string}', async function(this: TestWorld, path: string, token: string) {
  this.lastResponse = await this.api.get(path, this.auth.bearerToken(token))
})

When('I GET {string} with username {string} and password {string}', async function(this: TestWorld, path: string, username: string, password: string) {
  this.lastResponse = await this.api.get(path, this.auth.basicAuth(username, password))
})

Then('the response status is {int}', function(this: TestWorld, status: number) {
  this.expect(this.lastResponse!.status).to.equal(status)
})

Then('the response body field {string} equals {string}', function(this: TestWorld, field: string, value: string) {
  this.expect((this.lastResponse!.body as Record<string, unknown>)[field]).to.equal(value)
})
```

### Taskfile Task

```yaml
test:xq-runner:e2e:
  desc: Blackbox test — CLI + dist/ artifact validated against testbed
  deps: [build:xq-runner]
  dir: packages/xq-runner/testbed
  cmd: node ../dist/cli.js run
```

> `test:xq-runner:e2e` is separate from `test:xq-runner` (unit tests). The aggregate
> `test` task runs unit tests only; `e2e` is run explicitly or in CI after the build step.

---

## IntelliSense Flow

Works out of the box after `yarn install`. No setup command needed.

```
yarn install
      │
      ▼
node_modules/@chauhaidang/xq-runner/dist/index.d.ts   ← TypeScript resolves ICustomWorld types

.vscode/settings.json:
  "cucumber.glue": ["features/steps/**/*.ts"]   ← local steps only
      │
      ▼
Cucumber LSP scans features/steps/**/*.ts for Given/When/Then patterns
TypeScript resolves @chauhaidang/xq-runner imports via node_modules as usual
      │
      ▼
Developer types in checkout.feature:
  "Given I have a valid card|"
      │
      ▼
  ┌──────────────────────────────────────┐
  │  Given I have a valid card {string}  │  ← autocomplete
  └──────────────────────────────────────┘

Hover    → shows JSDoc from step definition
Undefined step → underline warning in editor
```

---

## Release Flow

```
bump version in packages/xq-runner/package.json
      │
      ▼ push to main → CI detects version change
      │
      ▼ task build:xq-runner → tsc → dist/
      │
      ▼ yarn npm publish → GitHub Packages (@chauhaidang/xq-runner)
      │
      ▼ Service teams (on their own schedule)
  yarn upgrade @chauhaidang/xq-runner
  → new utilities available
  → team steps unchanged — no forced migration
```

Teams update independently. A `xq-runner` version bump never breaks a team's
tests unless they opt in to changed APIs.

---

## Constraints & Trade-offs

| Concern | Decision | Reason |
|---------|----------|--------|
| Package count | 1 (CLI + core merged) | One install, one version, one release |
| Step ownership | Per service team | Full autonomy, no shared bottleneck |
| Distribution | GitHub Packages | Consistent with rest of xq-toolbox monorepo |
| Module format | CommonJS (CJS) | `require()` compatibility with Cucumber.js |
| HTTP client | Built-in `fetch` (Node 18+) | No extra dependency |
| Assertions | Chai BDD via `this.expect` | Full chain; no per-file import needed in steps |
| Chai version | `chai@^4` (not v5+) | v5+ is ESM-only; incompatible with CJS output |
| TypeScript steps | `ts-node` in `dependencies` | Auto-registered at runtime; zero consumer config |
| Config file | `cucumber-extension.js` | Signals consumer extends runner defaults; not a raw Cucumber config |
| Path resolution | `process.cwd()` explicit | Paths resolve from consumer root, not node_modules |
| Shared steps loading | Auto-injected via `__dirname` in `run.ts` | Consumer never configures the shared steps path at runtime |
| Shared step source style | `require()` destructuring, not `import {}` | TypeScript CJS emit of `import {}` produces `(0, mod.Given)(...)` which the Cucumber LSP tree-sitter parser cannot match |
| `process.exit` | CLI layer only (`cli.ts`) | Keeps `runFeatures()` testable (returns boolean) |
| IntelliSense | Local steps + node_modules types | Zero config after yarn install |

> [!IMPORTANT]
> `ICustomWorld` API changes in `xq-runner` are potentially breaking for all
> service teams. Use semver strictly — major bump for any breaking API change.

> [!WARNING]
> Service repos need `.npmrc` configured with the GitHub Packages registry URL
> and a `NODE_AUTH_TOKEN` (personal access token or `GITHUB_TOKEN` in CI).

---

## Open Questions

> [!IMPORTANT]
> Decisions needed before v1.0.0:
>
> 1. **Core API stability**: Versioning strategy for breaking ICustomWorld changes?
>    Recommendation: semver major for breaking changes, deprecation warnings first.
>
> 2. **Additional core utilities**: DB helpers, wait/retry — add in Phase 3.

---

## Build Order

```
Phase 1 — xq-runner package
  [ ] Scaffold package structure (dirs, package.json, tsconfig.json, jest.config.js, .eslintrc.js)
  [ ] src/core/world.ts   — ICustomWorld + CustomWorld + this.expect injection
  [ ] src/core/http.ts    — HttpClient + HttpResponse + createHttpClient
  [ ] src/core/auth.ts    — AuthHelper + createAuthHelper
  [ ] src/core/assertions.ts — re-export expect from chai
  [ ] src/core/index.ts   — barrel export
  [ ] src/index.ts        — package entry point
  [ ] src/steps/common.ts — shared step stubs (populated Phase 3); use require() destructuring
  [ ] src/commands/run.ts — loadConfiguration + runCucumber; auto-injects shared steps glob; returns boolean
  [ ] src/cli.ts          — Commander wiring; owns process.exit()
  [ ] src/__tests__/      — unit tests for core utilities
  [ ] README.md + LICENSE
  [ ] Taskfile.yml tasks: build/test/lint/clean:xq-runner
  [ ] yarn install + task build:xq-runner (verify zero tsc errors)
  [ ] task test:xq-runner (verify all tests pass)
  [ ] testbed/cucumber.js + testbed/features/sample.feature
  [ ] testbed/steps/world.ts + testbed/steps/sample.steps.ts
  [ ] Taskfile.yml task: test:xq-runner:e2e (deps: build:xq-runner)
  [ ] task test:xq-runner:e2e (verify all 3 scenarios pass)
  [ ] Tag and publish v0.1.0

Phase 2 — Service repo validation
  [ ] Create service-payments sample repo
  [ ] yarn add --dev @chauhaidang/xq-runner
  [ ] Write cucumber.js config
  [ ] Write features/ + features/steps/ (extend CustomWorld, use this.expect)
  [ ] Verify IntelliSense in VS Code (zero config)
  [ ] yarn xq-runner run → verify tests execute and report prints

Phase 3 — Polish
  [ ] Additional core utilities (DB helpers, wait/retry)
  [ ] CI example for service repo (GitHub Actions)
  [ ] README + contribution guide for core utilities
```
