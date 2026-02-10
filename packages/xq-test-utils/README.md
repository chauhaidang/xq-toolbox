# @chauhaidang/xq-test-utils

Test utilities for XQ component and integration tests: PostgreSQL database helper and wait-for-service.

---

## Overview

This package provides:

- **DatabaseHelper** – PostgreSQL connection pool, health checks, and schema verification for component tests that need direct database access.
- **waitForService** – Poll a URL (e.g. health check) until it becomes available, with configurable timeout and interval.
- **generateTestReport** – Read JUnit XML, convert to markdown (via xq-common-kit), optionally append extra markdown, and write a report file (e.g. for Jest global teardown).

Service-specific helpers (e.g. test-data generators, API client wrappers, cleanup trackers) remain in the services that use them (e.g. write-service).

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

### DatabaseHelper

```typescript
import { DatabaseHelper } from '@chauhaidang/xq-test-utils';

const db = new DatabaseHelper();
await db.connect();

const healthy = await db.healthCheck(['my_table']);
if (!healthy.healthy) throw new Error('DB not ready');

const result = await db.query('SELECT * FROM my_table WHERE id = $1', [1]);
await db.disconnect();
```

Configuration is read from the environment (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`) or you can pass a `DatabaseConfig` object to the constructor.

### waitForService

```typescript
import { waitForService } from '@chauhaidang/xq-test-utils';

// In Jest beforeAll or similar
await waitForService('http://localhost:8080/health', {
  timeout: 30000,
  interval: 1000,
});
```

### generateTestReport

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

- **DatabaseHelper** – `connect()`, `disconnect()`, `query()`, `getClient()`, `checkConnection()`, `verifySchema()`, `verifySnapshotSchema()`, `healthCheck()`.
- **DatabaseConfig** – Optional config (host, port, database, user, password, ssl, etc.).
- **waitForService(healthUrl, options?)** – Returns a Promise that resolves when the URL is reachable; rejects on timeout.
- **WaitForServiceOptions** – `timeout` (ms), `interval` (ms).
- **generateTestReport(options)** – Async. Reads `junitXmlPath`, converts to markdown, optionally appends `appendMarkdown`, writes to `reportMdPath`.
- **GenerateTestReportOptions** – `junitXmlPath`, `reportMdPath`, `appendMarkdown?`.

### Jest component test config (Option B – config factory)

Use the shared Jest config factory so path-specific options stay in your project:

```javascript
// jest.config.component.js (in your service)
const getComponentTestConfig = require('@chauhaidang/xq-test-utils/jest.component.config');

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
