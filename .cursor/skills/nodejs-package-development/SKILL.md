---
name: nodejs-package-development
description: Guides analysis, design, implementation, and testing of new Node.js packages that serve consumers. Use when creating a new npm package, adding a consumer-facing module to a monorepo, or when the user asks to build, design, or implement a Node.js package. Emphasizes close implementation and thorough testing at unit, integration, and component (functional) levels.
---

# Node.js Package Development

## Overview

Follow this lifecycle when creating a new Node.js package for consumers: **Analyze → Design → Implement → Test**. Each phase must complete before the next. Testing is mandatory at all three levels: unit, integration, and component (functional).

---

## Phase 1: Analyze

### 1.1 Consumer Requirements

- **Who** consumes this package? (other packages, CLI users, apps)
- **What** problem does it solve? (single responsibility)
- **How** will they use it? (API surface, entry points)
- **Constraints**: Node version, dependencies, bundle size

### 1.2 Scope Definition

- Define the minimal public API
- List concrete use cases (3–5 examples)
- Identify external dependencies (databases, HTTP, file system)
- Document non-goals (what this package will NOT do)

### 1.3 Output

Before design, produce:

- One-paragraph purpose statement
- List of exported symbols (functions, classes, types)
- Dependency list (runtime vs dev)

---

## Phase 2: Design

### 2.1 Package Structure

```
packages/<package-name>/
├── src/
│   ├── index.ts          # Main entry, re-exports public API
│   ├── <module>.ts       # Implementation
│   └── __tests__/        # Unit tests colocated or separate
├── dist/                 # Build output (gitignored)
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

### 2.2 Exports and API Design

- Use `package.json` `exports` for explicit entry points
- Prefer named exports over default
- Export types alongside implementation
- Keep public API small; hide internals

```json
{
  "main": "dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist", "README.md", "LICENSE"]
}
```

### 2.3 TypeScript Configuration

- Extend monorepo base `tsconfig.json`
- Enable `declaration`, `declarationMap`
- Exclude `**/*.test.ts`, `**/*.spec.ts` from build
- Use `strict: true`

### 2.4 Output

- Finalized `package.json` structure
- `tsconfig.json` aligned with monorepo
- API signature (function/class signatures)

---

## Phase 3: Implement

### 3.1 Implementation Principles

- **One concern per module**: Each file has a single responsibility
- **Dependency injection**: Accept config/dependencies as parameters for testability
- **Fail fast**: Validate inputs at boundaries; throw clear errors
- **No side effects in pure logic**: Isolate I/O (DB, HTTP, FS) behind interfaces

### 3.2 Code Style

- Use TypeScript strict mode
- Prefer `async/await` over raw Promises
- Use `logger` or structured logging (not `console.log` in production paths)
- Document public APIs with JSDoc

### 3.3 Build and Scripts

```json
{
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint . --ext .ts",
    "lint:fix": "eslint . --ext .ts --fix",
    "clean": "rm -rf dist"
  }
}
```

### 3.4 Implementation Checklist

- [ ] All public APIs have TypeScript types
- [ ] Input validation at module boundaries
- [ ] Error messages are actionable
- [ ] No hardcoded secrets or env-specific paths
- [ ] README documents installation and basic usage

---

## Phase 4: Test (All Levels Required)

### 4.1 Test Pyramid

| Level | Purpose | Scope | Tools |
|-------|---------|-------|-------|
| **Unit** | Isolate logic, fast feedback | Single function/class, mocked deps | Jest, ts-jest |
| **Integration** | Multiple modules or external services | Real DB, HTTP, FS | Jest, test containers or mocks |
| **Component** | End-to-end behavior of a feature | Full stack, real services | Jest, setup/teardown |

### 4.2 Unit Tests

- **Location**: `src/__tests__/*.test.ts` or `src/**/__tests__/*.test.ts`
- **Config**: `jest.config.js` with `preset: 'ts-jest'`, `testEnvironment: 'node'`
- **Coverage**: Aim for high coverage on business logic; exclude trivial getters
- **Mocking**: Mock external I/O (DB, HTTP, FS); test pure logic with real inputs

```typescript
// Example: isolate logic, mock I/O
describe('MyModule', () => {
  it('returns expected result for valid input', () => {
    const result = myFunction(validInput);
    expect(result).toEqual(expectedOutput);
  });
  it('throws on invalid input', () => {
    expect(() => myFunction(invalidInput)).toThrow('Expected error message');
  });
});
```

### 4.3 Integration Tests

- **Purpose**: Verify modules work together; real DB, HTTP, or file system
- **Setup**: Use env vars (`DB_HOST`, `DB_PORT`, etc.) or test containers
- **Isolation**: Each test or suite should clean up (e.g., truncate tables, delete temp files)
- **Timeout**: Increase `testTimeout` (e.g., 10000–30000 ms) for I/O

```typescript
// Example: real DB, cleanup in afterEach
describe('DatabaseHelper integration', () => {
  let db: DatabaseHelper;
  beforeAll(async () => { db = new DatabaseHelper(); await db.connect(); });
  afterEach(async () => { /* cleanup */ });
  afterAll(async () => { await db.disconnect(); });
  it('queries real database', async () => {
    const result = await db.query('SELECT 1 as n');
    expect(result.rows[0].n).toBe(1);
  });
});
```

### 4.4 Component (Functional) Tests

- **Purpose**: Test a complete feature or workflow as a consumer would use it
- **Scope**: Start services, call APIs, verify outcomes
- **Setup/Teardown**: Use `setupFilesAfterEnv`, `globalTeardown`; wait for services (e.g., `waitForService`)
- **Config**: Separate `jest.config.component.js` with longer timeout, `maxWorkers: 1`

```javascript
// jest.config.component.js
const getComponentTestConfig = require('@chauhaidang/xq-test-utils/jest.component.config');
module.exports = getComponentTestConfig({
  testMatch: ['<rootDir>/test/component/**/*.test.ts'],
  setupPath: '<rootDir>/test/component/setup.ts',
  teardownPath: '<rootDir>/test/component/teardown.ts',
  testTimeout: 60000,
});
```

### 4.5 Test Checklist

- [ ] Unit tests for all public functions and critical paths
- [ ] Integration tests for DB/HTTP/FS interactions
- [ ] Component tests for at least one full consumer workflow
- [ ] All tests pass: `npm test`
- [ ] No skipped tests without a documented reason
- [ ] CI runs all test levels

---

## Workflow Summary

```
Analyze → Design → Implement → Test
   ↓         ↓          ↓         ↓
 Scope    Structure   Code     Unit
  API     Exports     Build    Integration
  Deps    TSConfig    Lint     Component
```

---

## Additional Resources

- For detailed package.json and tsconfig patterns, see [reference.md](reference.md)
- For concrete test examples, see [examples.md](examples.md)
