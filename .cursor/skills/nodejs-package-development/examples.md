# Node.js Package Development – Examples

Concrete examples for unit, integration, and component tests.

---

## Unit Test Examples

### Pure Function

```typescript
// src/utils.ts
export function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// src/__tests__/utils.test.ts
import { slugify } from '../utils';

describe('slugify', () => {
  it('converts spaces to hyphens', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });
  it('removes non-alphanumeric characters', () => {
    expect(slugify('Test!@#')).toBe('test');
  });
  it('throws on non-string input', () => {
    expect(() => slugify(null as any)).toThrow();
  });
});
```

### Class with Mocked Dependencies

```typescript
// src/__tests__/logger.test.ts
import { logger, LOG_LEVELS } from '../logger';

describe('Logger', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('should log info messages by default', () => {
    logger.info('Test message');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('INFO: Test message'));
  });

  test('should not log debug when level is INFO', () => {
    logger.debug('Hidden');
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
```

### Async Function with Mock

```typescript
// src/__tests__/fetch.test.ts
import { fetchUser } from '../api';

jest.mock('../http-client');

describe('fetchUser', () => {
  it('returns user when API succeeds', async () => {
    const mockGet = require('../http-client').get;
    mockGet.mockResolvedValue({ id: 1, name: 'Alice' });

    const user = await fetchUser(1);
    expect(user.name).toBe('Alice');
    expect(mockGet).toHaveBeenCalledWith('/users/1');
  });

  it('throws on 404', async () => {
    const mockGet = require('../http-client').get;
    mockGet.mockRejectedValue(new Error('Not Found'));

    await expect(fetchUser(999)).rejects.toThrow('Not Found');
  });
});
```

---

## Integration Test Examples

### Database Helper

```typescript
// src/__tests__/database.integration.test.ts
import { DatabaseHelper } from '../database';

describe('DatabaseHelper integration', () => {
  let db: DatabaseHelper;

  beforeAll(async () => {
    db = new DatabaseHelper({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'test_db',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  afterEach(async () => {
    await db.query('TRUNCATE test_table RESTART IDENTITY CASCADE');
  });

  it('inserts and retrieves rows', async () => {
    await db.query('INSERT INTO test_table (name) VALUES ($1)', ['test']);
    const result = await db.query('SELECT * FROM test_table');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe('test');
  });
});
```

### HTTP Service

```typescript
// test/integration/api.integration.test.ts
import axios from 'axios';
import { waitForService } from '@chauhaidang/xq-test-utils';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';

describe('API integration', () => {
  beforeAll(async () => {
    await waitForService(`${BASE_URL}/health`, { timeout: 30000 });
  });

  it('GET /health returns 200', async () => {
    const res = await axios.get(`${BASE_URL}/health`);
    expect(res.status).toBe(200);
  });

  it('POST /items creates and returns item', async () => {
    const res = await axios.post(`${BASE_URL}/items`, { name: 'Test' });
    expect(res.status).toBe(201);
    expect(res.data.name).toBe('Test');
  });
});
```

---

## Component Test Examples

### Setup and Teardown

```typescript
// test/component/setup.ts
// Runs before each test file (setupFilesAfterEnv)
// For async setup (DB, waitForService), use beforeAll in test files or globalSetup
process.env.TEST_MODE = 'component';
```

```typescript
// test/component/teardown.ts
// globalTeardown - runs once after all tests
import { DatabaseHelper } from '@chauhaidang/xq-test-utils';

export default async function teardown() {
  const db = (global as any).__testDb;
  if (db) await db.disconnect();
}
```

### Full Workflow Test

```typescript
// test/component/workflows/todo-crud.test.ts
import axios from 'axios';
import { DatabaseHelper, waitForService } from '@chauhaidang/xq-test-utils';

const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:8080';

beforeAll(async () => {
  const db = new DatabaseHelper();
  (global as any).__testDb = db;
  await db.connect();
  await waitForService(`${GATEWAY}/health`, { timeout: 60000, interval: 2000 });
});

describe('Todo CRUD workflow', () => {
  let createdId: string;

  it('creates a todo via API', async () => {
    const res = await axios.post(`${GATEWAY}/api/todos`, {
      title: 'Component test todo',
      description: 'Created by component test',
    });
    expect(res.status).toBe(201);
    createdId = res.data.id;
  });

  it('reads the created todo', async () => {
    const res = await axios.get(`${GATEWAY}/api/todos/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.data.title).toBe('Component test todo');
  });

  it('updates the todo', async () => {
    const res = await axios.put(`${GATEWAY}/api/todos/${createdId}`, {
      completed: true,
    });
    expect(res.status).toBe(200);
  });

  it('deletes the todo', async () => {
    const res = await axios.delete(`${GATEWAY}/api/todos/${createdId}`);
    expect(res.status).toBe(200);
  });
});
```

---

## Checklist Summary

- **Unit**: Mock I/O; test logic in isolation; fast feedback
- **Integration**: Real DB/HTTP; cleanup after each test; env-based config
- **Component**: Full workflow; setup/teardown; wait for services; longer timeout
