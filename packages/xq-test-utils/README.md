# @chauhaidang/xq-test-utils

Test utilities for XQ component and integration tests: PostgreSQL database helper and wait-for-service.

---

## Overview

This package is structured into several core modules to provide organized test utilities:

-   **Database** – Robust MongoDB and PostgreSQL connection helpers, schema verification, and state management for integration tests.
-   **Service Readiness** – Utilities to wait for external services to become available before starting tests.
-   **Reporting** – Tools to generate markdown test reports from JUnit XML results.
-   **Test Config** – Reusable Jest configuration factories for component and integration tests.

---

## Installation

```sh
npm install @chauhaidang/xq-test-utils
```

For use from the xq-toolbox monorepo, link the workspace package:

```json
"devDependencies": {
  "@chauhaidang/xq-test-utils": "file:../xq-toolbox/packages/xq-test-utils"
}
```

---

## Usage

### Database (PostgreSQL)

```typescript
import { createDatabaseHelper } from '@chauhaidang/xq-test-utils';

const db = createDatabaseHelper();
await db.connect();

const healthy = await db.healthCheck(['my_table']);
if (!healthy.healthy) throw new Error('DB not ready');

const result = await db.query('SELECT * FROM my_table WHERE id = $1', [1]);
await db.disconnect();
```

Configuration is read from the environment (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`) or you can pass a `DatabaseConfig` object to any of the database helpers or the factory.

### Service Readiness

```typescript
import { waitForService } from '@chauhaidang/xq-test-utils';

// In Jest beforeAll or similar
await waitForService('http://localhost:8080/health', {
  timeout: 30000,
  interval: 1000,
});
```

### Reporting

```typescript
import { generateTestReport } from '@chauhaidang/xq-test-utils';

// In Jest globalTeardown or after all tests
await generateTestReport({
  junitXmlPath: './test/component/tsr/junit.xml',
  reportMdPath: './test/component/tsr/report.md',
  appendMarkdown: '## My extra section\n\n...',
});
```

---

## API

### Database Module
-   `createDatabaseHelper(config?)` – Factory function to create a database helper instance.
-   `PostgresDatabaseHelper` – PostgreSQL implementation of `IDatabaseHelper`.
-   `DatabaseHelper` – Alias for `PostgresDatabaseHelper` (for backward compatibility).
-   `DatabaseConfig` – Configuration interface (host, port, database, user, password, ssl, etc.).

### Service Readiness Module
-   `waitForService(healthUrl, options?)` – Returns a Promise that resolves when the URL is reachable; rejects on timeout.
-   `WaitForServiceOptions` – `timeout` (ms), `interval` (ms).

### Reporting Module
-   `generateTestReport(options)` – Async function that reads JUnit XML and writes a markdown report.
-   `JunitMarkdownReporter` – The underlying class used for report generation.
-   `GenerateTestReportOptions` – `junitXmlPath`, `reportMdPath`, `appendMarkdown?`.

### Test Config Module
-   `getComponentTestConfig(options)` – Generates a standardized Jest configuration for component tests.

#### Jest component test config example

```javascript
// jest.config.component.js (in your service)
const { getComponentTestConfig } = require('@chauhaidang/xq-test-utils');

module.exports = getComponentTestConfig({
  rootDir: './',
  testMatch: ['<rootDir>/test/component/workflows/**/*.test.ts'],
  setupPath: '<rootDir>/test/component/setup.ts',
  teardownPath: '<rootDir>/test/component/teardown.ts',
  helpersPath: '<rootDir>/test/component/helpers',
  tsconfigPath: '<rootDir>/tsconfig.json',
  testTimeout: 60000,
  displayName: 'Component Tests',
});
```

Options: `rootDir`, `testMatch`, `setupPath`, `teardownPath`, `helpersPath` (optional), `tsconfigPath`, `testTimeout`, `displayName`.

---

## Development

Part of the `xq-toolbox` monorepo.

```sh
npm run build
npm test
npm run lint
```

---

## License

Apache-2.0
