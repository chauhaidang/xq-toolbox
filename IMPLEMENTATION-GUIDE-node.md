# Implementation Guide — `@chauhaidang/xq-runner`

Step-by-step instructions to build the package from scratch.
Follow in order — each step builds on the previous one.

---

## Prerequisites

- Node.js 18+ (required for built-in `fetch`)
- Yarn Berry (corepack: `corepack enable`)
- Task runner installed (`brew install go-task`)
- Monorepo root dependencies installed: `yarn install`

---

## Step 1 — Scaffold the package

Create the directory structure:

```bash
mkdir -p packages/xq-runner/src/{commands,core,__tests__}
```

---

## Step 2 — `package.json`

**File:** `packages/xq-runner/package.json`

```json
{
  "name": "@chauhaidang/xq-runner",
  "version": "0.1.0",
  "description": "BDD test runner and shared core utilities for XQ service teams",
  "bin": {
    "xq-runner": "./dist/cli.js"
  },
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
  "repository": {
    "type": "git",
    "url": "git+https://github.com/chauhaidang/xq-toolbox.git",
    "directory": "packages/xq-runner"
  },
  "keywords": ["xq", "bdd", "cucumber", "test-runner", "typescript"],
  "author": "chauhaidang",
  "license": "Apache-2.0",
  "bugs": { "url": "https://github.com/chauhaidang/xq-toolbox/issues" },
  "homepage": "https://github.com/chauhaidang/xq-toolbox#readme",
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

> **Why `chai@^4`:** Chai v5+ is ESM-only. Our package compiles to CommonJS
> (required by Cucumber.js). `chai@^4` is the last version that ships a
> `require()`-compatible build.
>
> **Why `ts-node` in `dependencies`:** It must be present at runtime so
> xq-runner can register it before Cucumber loads TypeScript step files.
> Consumers do not install or configure ts-node themselves.

---

## Step 3 — `tsconfig.json`

**File:** `packages/xq-runner/tsconfig.json`

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

---

## Step 4 — `jest.config.js`

**File:** `packages/xq-runner/jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
};
```

---

## Step 5 — `.eslintrc.js`

**File:** `packages/xq-runner/.eslintrc.js`

```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: { node: true, es2022: true },
  ignorePatterns: ['dist/', 'node_modules/', 'jest.config.js'],
}
```

---

## Step 6 — `src/core/world.ts`

**File:** `packages/xq-runner/src/core/world.ts`

```typescript
import { World, IWorldOptions } from '@cucumber/cucumber'
import { expect as chaiExpect } from 'chai'

/**
 * Interface contract for the test world. Service teams extend this with
 * their own typed properties (HTTP clients, auth tokens, response data).
 */
export interface ICustomWorld extends World {
  /** Chai BDD `expect` — use as `this.expect(value).to.equal(...)` in steps. */
  readonly expect: typeof chaiExpect
}

/**
 * Base world class to extend in service repos.
 * Injects Chai's `expect` onto `this` so step definitions never need a
 * separate import.
 *
 * @example
 * export class PaymentsWorld extends CustomWorld {
 *   api = createHttpClient(process.env.PAYMENTS_BASE_URL!)
 * }
 * setWorldConstructor(PaymentsWorld)
 *
 * @example
 * Then('payment succeeds', function(this: PaymentsWorld) {
 *   this.expect(this.result.status).to.equal(200)
 * })
 */
export class CustomWorld extends World implements ICustomWorld {
  readonly expect = chaiExpect

  constructor(options: IWorldOptions) {
    super(options)
  }
}
```

> **Design:** `expect` is injected onto the world rather than exported from the
> package root. This means step definition files have zero imports beyond
> `@cucumber/cucumber` and their own world type.

---

## Step 7 — `src/core/http.ts`

**File:** `packages/xq-runner/src/core/http.ts`

```typescript
/** Shape of every HTTP response returned by {@link HttpClient}. */
export interface HttpResponse<T = unknown> {
  status: number
  headers: Record<string, string>
  body: T
}

/**
 * Typed HTTP client bound to a base URL.
 * All methods accept a relative `path` and optional per-request headers.
 */
export interface HttpClient {
  get<T = unknown>(path: string, headers?: Record<string, string>): Promise<HttpResponse<T>>
  post<T = unknown>(path: string, body?: unknown, headers?: Record<string, string>): Promise<HttpResponse<T>>
  put<T = unknown>(path: string, body?: unknown, headers?: Record<string, string>): Promise<HttpResponse<T>>
  patch<T = unknown>(path: string, body?: unknown, headers?: Record<string, string>): Promise<HttpResponse<T>>
  delete<T = unknown>(path: string, headers?: Record<string, string>): Promise<HttpResponse<T>>
}

/**
 * Creates a pre-configured HTTP client bound to a base URL.
 * Uses Node's built-in `fetch` (Node 18+) — no extra runtime dependency.
 * JSON responses are automatically parsed; other content types fall back to text.
 *
 * @param baseUrl - Root URL. Trailing slash is stripped automatically.
 * @param defaultHeaders - Merged into every request (e.g. auth, tenant headers).
 *
 * @example
 * const api = createHttpClient(process.env.BASE_URL!, auth.bearerToken(token))
 * const res = await api.post<Order>('/orders', { item: 'book' })
 * this.expect(res.status).to.equal(201)
 */
export function createHttpClient(
  baseUrl: string,
  defaultHeaders: Record<string, string> = {}
): HttpClient {
  const base = baseUrl.replace(/\/$/, '')

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders: Record<string, string> = {}
  ): Promise<HttpResponse<T>> {
    const url = `${base}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...defaultHeaders,
      ...extraHeaders,
    }

    const init: RequestInit = { method, headers }
    if (body !== undefined) {
      init.body = JSON.stringify(body)
    }

    const res = await fetch(url, init)
    const responseHeaders: Record<string, string> = {}
    res.headers.forEach((value, key) => { responseHeaders[key] = value })

    let responseBody: T
    const contentType = res.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      responseBody = (await res.json()) as T
    } else {
      responseBody = (await res.text()) as unknown as T
    }

    return { status: res.status, headers: responseHeaders, body: responseBody }
  }

  return {
    get: (path, headers) => request('GET', path, undefined, headers),
    post: (path, body, headers) => request('POST', path, body, headers),
    put: (path, body, headers) => request('PUT', path, body, headers),
    patch: (path, body, headers) => request('PATCH', path, body, headers),
    delete: (path, headers) => request('DELETE', path, undefined, headers),
  }
}
```

---

## Step 8 — `src/core/auth.ts`

**File:** `packages/xq-runner/src/core/auth.ts`

```typescript
/**
 * Produces auth-related request headers for use with {@link HttpClient}.
 * Pass the returned object as `defaultHeaders` to `createHttpClient`
 * or as per-request headers on individual calls.
 */
export interface AuthHelper {
  /** Returns `{ Authorization: 'Bearer <token>' }` */
  bearerToken(token: string): Record<string, string>
  /** Returns `{ Authorization: 'Basic <base64(user:pass)>' }` */
  basicAuth(username: string, password: string): Record<string, string>
  /**
   * Returns `{ [headerName]: key }`.
   * @param headerName - Defaults to `X-API-Key`.
   */
  apiKey(key: string, headerName?: string): Record<string, string>
}

/**
 * Creates auth header helpers for use in world setup or step definitions.
 *
 * @example
 * const auth = createAuthHelper()
 * const api = createHttpClient(baseUrl, auth.bearerToken(process.env.TOKEN!))
 */
export function createAuthHelper(): AuthHelper {
  return {
    bearerToken(token: string): Record<string, string> {
      return { Authorization: `Bearer ${token}` }
    },
    basicAuth(username: string, password: string): Record<string, string> {
      const encoded = Buffer.from(`${username}:${password}`).toString('base64')
      return { Authorization: `Basic ${encoded}` }
    },
    apiKey(key: string, headerName = 'X-API-Key'): Record<string, string> {
      return { [headerName]: key }
    },
  }
}
```

---

## Step 9 — `src/core/assertions.ts`

**File:** `packages/xq-runner/src/core/assertions.ts`

```typescript
/**
 * @packageDocumentation
 * BDD-style assertions powered by Chai.
 * `expect` is injected onto every {@link CustomWorld} instance as `this.expect`
 * so step definitions require no import. This re-export exists for use outside
 * of step context (e.g. helper utilities, standalone test scripts).
 *
 * @example
 * // Inside a step — preferred, no import needed
 * this.expect(res.status).to.equal(200)
 *
 * // Outside a step — import directly
 * import { expect } from '@chauhaidang/xq-runner'
 * expect(value).to.include('text')
 */
export { expect } from 'chai'
```

---

## Step 10 — `src/core/index.ts`

**File:** `packages/xq-runner/src/core/index.ts`

```typescript
/**
 * @packageDocumentation
 * Public API barrel for `@chauhaidang/xq-runner` core utilities.
 */
export type { ICustomWorld } from './world'
export { CustomWorld } from './world'
export { createHttpClient } from './http'
export type { HttpClient, HttpResponse } from './http'
export { createAuthHelper } from './auth'
export type { AuthHelper } from './auth'
export { expect } from './assertions'
```

---

## Step 11 — `src/index.ts`

**File:** `packages/xq-runner/src/index.ts`

```typescript
export type { ICustomWorld } from './core'
export { CustomWorld } from './core'
export { createHttpClient } from './core'
export type { HttpClient, HttpResponse } from './core'
export { createAuthHelper } from './core'
export type { AuthHelper } from './core'
export { expect } from './core'
```

---

## Step 12 — `src/commands/run.ts`

**File:** `packages/xq-runner/src/commands/run.ts`

```typescript
import { loadConfiguration, runCucumber } from '@cucumber/cucumber/api'
import path from 'path'

export interface RunOptions {
  format: string
  tags?: string
  dryRun: boolean
  require?: string[]
}

/**
 * Runs Cucumber feature files programmatically.
 * Reads `cucumber-extension.js` from the consumer's project root (process.cwd()).
 * Automatically prepends shared steps from dist/steps/ before consumer steps.
 * CLI flag values in `options` override the config file.
 * Returns `true` if all scenarios passed, `false` otherwise.
 * Does NOT call process.exit() — that is the caller's (cli.ts) responsibility.
 */
export async function runFeatures(options: RunOptions): Promise<boolean> {
  // __dirname is dist/commands/ at runtime; ../steps resolves to dist/steps/
  const sharedStepsGlob = path.join(__dirname, '../steps/**/*.js')

  const provided: Record<string, unknown> = {
    format: [options.format],
    dryRun: options.dryRun,
    requireModule: ['ts-node/register'],
    // shared steps first, then consumer overrides — order matters for load sequence
    require: [sharedStepsGlob, ...(options.require ?? [])],
  }

  if (options.tags) provided['tags'] = options.tags

  const { runConfiguration } = await loadConfiguration(
    {
      file: 'cucumber-extension.js',   // resolved relative to cwd — consumer's project root
      provided,
    },
    { cwd: process.cwd() }             // explicit: always resolve from where command was run
  )

  const { success } = await runCucumber(runConfiguration)
  return success
}
```

> **`cucumber-extension.js` not `cucumber.js`:** the filename signals this is an
> extension of xq-runner's built-in config, not a standalone Cucumber config.
> Consumers only declare their paths, step globs, and worldParameters here.
>
> **Shared steps auto-injected:** `sharedStepsGlob` prepends `dist/steps/**/*.js`
> to `require` before merging consumer config. Consumers never reference the
> shared steps path — it resolves via `__dirname` relative to the installed package.
>
> **`require` merge with consumer config:** if the consumer's `cucumber-extension.js`
> also declares a `require` array, Cucumber merges both. Shared steps always load
> first because they appear first in `provided.require`.
>
> **Why `process.exit` is NOT here:** `runFeatures` returns a boolean so it can
> be unit tested without terminating the test process. `process.exit` lives only
> in `cli.ts`.

---

## Step 13 — `src/cli.ts`

**File:** `packages/xq-runner/src/cli.ts`

```typescript
#!/usr/bin/env node
import { Command } from 'commander'
import { runFeatures } from './commands/run'

const program = new Command()

program
  .name('xq-runner')
  .description('BDD test runner for XQ service teams')
  .version('0.1.0')

program
  .command('run')
  .description('Run Cucumber feature files (reads cucumber.js from project root)')
  .option('-f, --format <format>', 'Output format: progress, pretty, json, junit', 'progress')
  .option('-t, --tags <expression>', 'Tag filter expression, e.g. "@smoke and not @wip"')
  .option('--dry-run', 'Validate step definitions without executing them', false)
  .option(
    '-r, --require <pattern>',
    'Step definition glob override (repeatable; overrides cucumber.js)',
    (val: string, prev: string[]) => [...prev, val],
    [] as string[]
  )
  .action(async (opts: {
    format: string
    tags?: string
    dryRun: boolean
    require: string[]
  }) => {
    const success = await runFeatures({
      format: opts.format,
      tags: opts.tags,
      dryRun: opts.dryRun,
      require: opts.require.length > 0 ? opts.require : undefined,
    })
    process.exit(success ? 0 : 1)
  })

program.parse(process.argv)
```

> **process.exit lives here only.** This is the CLI boundary. All other code
> returns values — only the CLI layer decides how to exit.

---

## Step 14 — Unit Tests

### `src/__tests__/assertions.test.ts`

```typescript
import { expect } from '../core/assertions'

describe('assertions — Chai BDD re-export', () => {
  it('exposes .to.equal for strict equality', () => {
    expect(200).to.equal(200)
  })

  it('exposes .to.deep.equal for object comparison', () => {
    expect({ a: 1 }).to.deep.equal({ a: 1 })
  })

  it('exposes .to.include for strings and arrays', () => {
    expect('hello world').to.include('world')
    expect([1, 2, 3]).to.include(2)
  })

  it('exposes .to.throw for error assertions', () => {
    expect(() => { throw new Error('bad input') }).to.throw('bad input')
  })

  it('exposes .not chain for negation', () => {
    expect(200).not.to.equal(404)
  })

  it('exposes .to.be.ok and .to.be.null', () => {
    expect('value').to.be.ok
    expect(null).to.be.null
  })
})
```

### `src/__tests__/http.test.ts`

```typescript
import { createHttpClient } from '../core/http'
import { expect } from '../core/assertions'

describe('createHttpClient', () => {
  it('strips trailing slash from base URL', async () => {
    const fetched: string[] = []
    global.fetch = jest.fn(async (url: string | URL | Request) => {
      fetched.push(url as string)
      return new Response(JSON.stringify({}), {
        headers: { 'content-type': 'application/json' },
      })
    }) as jest.Mock

    const client = createHttpClient('https://example.com/')
    await client.get('/users')

    expect(fetched[0]).to.equal('https://example.com/users')
  })

  it('merges default headers with per-request headers', async () => {
    let capturedHeaders: Record<string, string> = {}
    global.fetch = jest.fn(async (_url: unknown, init: RequestInit) => {
      capturedHeaders = init.headers as Record<string, string>
      return new Response(JSON.stringify({}), {
        headers: { 'content-type': 'application/json' },
      })
    }) as jest.Mock

    const client = createHttpClient('https://example.com', { 'X-Tenant': 'xq' })
    await client.get('/health', { 'X-Request-Id': '123' })

    expect(capturedHeaders['X-Tenant']).to.equal('xq')
    expect(capturedHeaders['X-Request-Id']).to.equal('123')
  })
})
```

### `src/__tests__/auth.test.ts`

```typescript
import { createAuthHelper } from '../core/auth'
import { expect } from '../core/assertions'

describe('createAuthHelper', () => {
  const auth = createAuthHelper()

  it('produces Bearer header', () => {
    const headers = auth.bearerToken('my-token')
    expect(headers['Authorization']).to.equal('Bearer my-token')
  })

  it('produces Basic header with base64 encoded credentials', () => {
    const headers = auth.basicAuth('user', 'pass')
    const decoded = Buffer.from(
      headers['Authorization'].replace('Basic ', ''), 'base64'
    ).toString()
    expect(decoded).to.equal('user:pass')
  })

  it('produces API key header with default header name', () => {
    const headers = auth.apiKey('secret-key')
    expect(headers['X-API-Key']).to.equal('secret-key')
  })

  it('produces API key header with custom header name', () => {
    const headers = auth.apiKey('secret-key', 'X-Custom-Auth')
    expect(headers['X-Custom-Auth']).to.equal('secret-key')
  })
})
```

---

## Step 15 — `Taskfile.yml` additions

Add the following section to `Taskfile.yml` after the `xq-test-infra` block and
before the `release:xq-scripts` block. Also add each task to the relevant
aggregate (`build`, `test`, `lint`, `clean`).

```yaml
  # ──────────────────────────────────────────────
  # xq-runner
  # ──────────────────────────────────────────────
  build:xq-runner:
    desc: Build xq-runner package
    run: once
    dir: packages/xq-runner
    sources:
      - src/**/*.ts
      - tsconfig.json
      - package.json
    generates:
      - dist/**
    cmd: yarn build

  test:xq-runner:
    desc: Test xq-runner package
    dir: packages/xq-runner
    cmd: yarn test

  lint:xq-runner:
    desc: Lint xq-runner package
    dir: packages/xq-runner
    cmd: yarn lint

  clean:xq-runner:
    desc: Clean xq-runner build artifacts
    dir: packages/xq-runner
    cmd: yarn clean
```

Update the four aggregates:

```yaml
  build:
    deps:
      - build:xq-test-utils
      - build:xq-test-infra
      - build:xq-runner      # ← add

  test:
    deps:
      - test:xq-common-kit
      - test:xq-test-utils
      - test:xq-test-infra
      - test:xq-runner       # ← add

  lint:
    deps:
      - lint:xq-common-kit
      - lint:xq-test-utils
      - lint:xq-test-infra
      - lint:xq-runner       # ← add

  clean:
    deps:
      - clean:xq-common-kit
      - clean:xq-test-utils
      - clean:xq-test-infra
      - clean:xq-runner      # ← add
```

---

## Step 16 — `README.md`

**File:** `packages/xq-runner/README.md`

````markdown
# @chauhaidang/xq-runner

BDD test runner and shared core utilities for XQ service teams.

## Overview

`xq-runner` provides a CLI and TypeScript library for running Cucumber.js BDD tests.
Service teams install it as a devDependency, own their feature files and step
definitions, and get `CustomWorld`, HTTP client, auth helpers, and Chai assertions
out of the box.

## Installation

Add `.npmrc` to your repo to point `@chauhaidang` packages at GitHub Packages:

```
@chauhaidang:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Install:

```bash
yarn add --dev @chauhaidang/xq-runner
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "test:bdd": "xq-runner run",
    "test:bdd:smoke": "xq-runner run --tags @smoke"
  }
}
```

## Configuration

Create `cucumber.js` at your project root. All standard Cucumber options are supported:

```js
module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['features/steps/**/*.ts'],
    parallel: 2,
    retry: 1,
    failFast: false,
    worldParameters: {
      baseUrl: process.env.BASE_URL
    }
  }
}
```

xq-runner reads this file automatically and registers `ts-node` for TypeScript
step files — no extra configuration needed.

## Quick Start

**`features/checkout.feature`**
```gherkin
Feature: Checkout

  Scenario: Successful payment
    Given I have a valid card "4111111111111111"
    When I complete checkout
    Then the payment should succeed
```

**`features/steps/world.ts`**
```typescript
import { setWorldConstructor } from '@cucumber/cucumber'
import { CustomWorld, createHttpClient, createAuthHelper } from '@chauhaidang/xq-runner'

export class PaymentsWorld extends CustomWorld {
  auth = createAuthHelper()
  api = createHttpClient(
    process.env.PAYMENTS_BASE_URL!,
    this.auth.bearerToken(process.env.API_TOKEN!)
  )
  card?: string
  result?: { status: number }
}

setWorldConstructor(PaymentsWorld)
```

**`features/steps/checkout.steps.ts`**
```typescript
import { Given, When, Then } from '@cucumber/cucumber'
import type { PaymentsWorld } from './world'

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

**Run:**
```bash
yarn test:bdd
```

## CLI Reference

```
xq-runner run [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `-f, --format` | `progress` | `progress`, `pretty`, `json`, `junit` |
| `-t, --tags` | _(none)_ | Tag expression, e.g. `@smoke and not @wip` |
| `--dry-run` | `false` | Validate steps without running them |
| `-r, --require` | _(from cucumber.js)_ | Step glob override (repeatable) |

## API Reference

### World

```typescript
import { CustomWorld, ICustomWorld } from '@chauhaidang/xq-runner'
```

Extend `CustomWorld` in your service repo. `this.expect` (Chai BDD) is available
in every step — no per-file import needed.

### HTTP Client

```typescript
import { createHttpClient, HttpClient, HttpResponse } from '@chauhaidang/xq-runner'

const api = createHttpClient(baseUrl, defaultHeaders?)
const res: HttpResponse<User> = await api.get<User>('/users/1')
```

Methods: `get`, `post`, `put`, `patch`, `delete`.

### Auth Helpers

```typescript
import { createAuthHelper } from '@chauhaidang/xq-runner'

const auth = createAuthHelper()
auth.bearerToken(token)              // { Authorization: 'Bearer ...' }
auth.basicAuth(username, password)   // { Authorization: 'Basic ...' }
auth.apiKey(key, headerName?)        // { 'X-API-Key': '...' }
```

### Assertions

Chai BDD `expect` is on every world instance:

```typescript
this.expect(res.status).to.equal(200)
this.expect(body.items).to.include('apple')
this.expect(body.count).to.be.above(0)
this.expect(() => parse('')).to.throw('empty input')
this.expect(val).not.to.equal(null)
```

Full [Chai BDD API](https://www.chaijs.com/api/bdd/) is available.

## VS Code IntelliSense

```json
{
  "cucumber.glue": ["features/steps/**/*.ts"],
  "cucumber.features": ["features/**/*.feature"]
}
```

Step autocomplete and undefined-step warnings work after `yarn install`.

## Development

```bash
yarn build    # compile TypeScript → dist/
yarn test     # run unit tests
yarn lint     # ESLint
```
````

---

## Step 17 — `LICENSE`

Copy from an existing package:

```bash
cp packages/xq-common-kit/LICENSE packages/xq-runner/LICENSE
```

---

## Step 18 — Install and verify

```bash
# Install (picks up the new workspace member)
yarn install

# Build
task build:xq-runner
# Expected: dist/ created, zero tsc errors, dist/cli.js is executable

# Test
task test:xq-runner
# Expected: 3 suites pass (assertions, auth, http)

# Lint
task lint:xq-runner
# Expected: no errors

# CLI smoke test
node packages/xq-runner/dist/cli.js --help
node packages/xq-runner/dist/cli.js run --help
# Expected: help output with run command and all flags listed
```

---

## Step 19 — Test Bed (blackbox validation)

Create the testbed directory and its files. These run against `dist/` (the built
artifact), not `src/`, so they catch issues unit tests cannot.

```bash
mkdir -p packages/xq-runner/testbed/features packages/xq-runner/testbed/steps
```

---

### `testbed/cucumber.js`

**File:** `packages/xq-runner/testbed/cucumber.js`

```js
module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['steps/**/*.ts'],
    worldParameters: {}
  }
}
```

---

### `testbed/features/sample.feature`

**File:** `packages/xq-runner/testbed/features/sample.feature`

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

---

### `testbed/steps/world.ts`

**File:** `packages/xq-runner/testbed/steps/world.ts`

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

> **Import from `../../dist`:** intentional — validates the compiled artifact, not the
> TypeScript source. Catches tsc emit failures, missing `files` entries in
> `package.json`, and wrong `main`/`exports` configuration before publishing.

---

### `testbed/steps/sample.steps.ts`

**File:** `packages/xq-runner/testbed/steps/sample.steps.ts`

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

---

### Add `test:xq-runner:e2e` to `Taskfile.yml`

Add this task after `test:xq-runner` in the `xq-runner` block:

```yaml
  test:xq-runner:e2e:
    desc: Blackbox test — CLI + dist/ artifact validated against testbed
    deps: [build:xq-runner]
    dir: packages/xq-runner/testbed
    cmd: node ../dist/cli.js run
```

> Do **not** add `test:xq-runner:e2e` to the aggregate `test` task. Unit tests
> (`test:xq-runner`) run in isolation; `e2e` is run explicitly or as a CI step
> after `build:xq-runner` completes.

---

### Verify

```bash
# Build first (e2e task depends on this, but run manually to see tsc output)
task build:xq-runner

# Run blackbox test
task test:xq-runner:e2e
# Expected: 3 scenarios pass (2 @smoke + 1 basic-auth)

# Smoke subset only
cd packages/xq-runner/testbed && node ../dist/cli.js run --tags @smoke
# Expected: 2 scenarios pass
```

---

## Consumer Setup (service repo validation — Phase 2)

After publishing, a consumer repo sets up like this:

```bash
# 1. Add .npmrc
echo "@chauhaidang:registry=https://npm.pkg.github.com" >> .npmrc
echo "//npm.pkg.github.com/:_authToken=\${NODE_AUTH_TOKEN}" >> .npmrc

# 2. Install
yarn add --dev @chauhaidang/xq-runner

# 3. Create cucumber-extension.js at project root
# Declares paths, consumer step globs, and worldParameters only.
# xq-runner auto-injects shared steps — do NOT add dist/steps/ here.

# 4. Add .vscode/settings.json with both globs for Cucumber LSP:
#    "cucumber.glue": [
#      "features/steps/**/*.ts",
#      "node_modules/@chauhaidang/xq-runner/dist/steps/**/*.js"
#    ]

# 5. Write features/ and features/steps/
# (see Quick Start above)

# 6. Run
yarn test:bdd
```
