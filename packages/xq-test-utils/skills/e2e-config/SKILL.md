---
name: e2e-config
description: >
  Generate Detox and Jest configuration for iOS E2E tests using
  createDetoxConfig and createE2eJestConfig from @chauhaidang/xq-test-utils.
  Use when setting up .detoxrc.js or e2e/jest.config.js in a React Native project.
---

# `e2e-config` skill

Provides two factory functions for wiring up Detox E2E infrastructure in a
React Native project. The consumer only needs the compiled app binary path —
all internal Detox and Jest settings are handled by the package.

> This skill applies only to **iOS simulator, release builds**. Android and
> debug builds are not in scope.

---

## Functions

### `createDetoxConfig(binaryPath)`

Generates a complete Detox configuration object for iOS simulator.

**Parameters**

| Name | Type | Description |
|------|------|-------------|
| `binaryPath` | `string` | Relative path from the project root to the compiled `.app` bundle |

**What it wires up internally**

- App name: `ios.release`, type `ios.app`
- Device: iPhone 15 simulator (`ios.simulator`)
- Configuration: `ios.sim.release`
- Test runner: Jest, pointing at `e2e/jest.config.js`
- Timeouts: `setupTimeout 120 s`, `teardownTimeout 30 s`

**Usage**

```js
// .detoxrc.js
const { createDetoxConfig } = require('@chauhaidang/xq-test-utils');

module.exports = createDetoxConfig(
  'ios/build/Build/Products/Release-iphonesimulator/MyApp.app',
);
```

---

### `createE2eJestConfig(options?)`

Generates a Jest configuration tuned for Detox E2E tests.

**Parameters (`E2eJestConfigOptions`)**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `testMatch` | `string[]` | `['<rootDir>/e2e/**/*.e2e.ts']` | Glob patterns for test files |
| `setupFilePath` | `string` | — | Path to a per-suite setup file (optional) |
| `testTimeout` | `number` | `120_000` | Per-test timeout in ms |
| `displayName` | `string` | `'E2E Tests'` | Label shown in Jest output |
| `tsconfigPath` | `string` | `'<rootDir>/tsconfig.json'` | Path to tsconfig for ts-jest |

**What it sets internally**

- `testEnvironment`: `detox/runners/jest/testEnvironment`
- `testRunner`: `jest-circus/runner`
- `maxWorkers`: `1` (Detox requires serial execution)
- `transform`: ts-jest for `.ts` files

**Usage**

```js
// e2e/jest.config.js
const { createE2eJestConfig } = require('@chauhaidang/xq-test-utils');

module.exports = createE2eJestConfig({
  testMatch: ['<rootDir>/e2e/**/*.e2e.ts'],
  setupFilePath: '<rootDir>/e2e/setup.ts',
});
```

---

## Full project setup example

```
my-rn-app/
├── .detoxrc.js          ← createDetoxConfig(binaryPath)
├── e2e/
│   ├── jest.config.js   ← createE2eJestConfig()
│   ├── setup.ts         ← optional beforeAll setup
│   └── login.e2e.ts     ← your test file
├── tsconfig.json
└── package.json
```

**Install**

```bash
yarn add --dev @chauhaidang/xq-test-utils detox jest-circus ts-jest
```

**Run**

```bash
detox build --configuration ios.sim.release
detox test --configuration ios.sim.release
```

---

## Rules for agents using this skill

- Always pass an **absolute-style relative path** to `createDetoxConfig`
  (relative to project root, using forward slashes).
- Do not add `apps`, `devices`, or `configurations` manually — that is handled
  internally.
- Use `createE2eJestConfig` for `e2e/jest.config.js` only; use
  `getComponentTestConfig` (also from `@chauhaidang/xq-test-utils`) for
  component/integration test configs.
- Do not import from `detox` directly — all configuration is through this API.
