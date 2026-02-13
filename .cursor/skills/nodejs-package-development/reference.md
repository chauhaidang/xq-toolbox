# Node.js Package Development – Reference

Detailed patterns for package.json, tsconfig, Jest, and API design.

---

## package.json Patterns

### Minimal Consumer Package

```json
{
  "name": "@scope/package-name",
  "version": "1.0.0",
  "description": "One-line purpose",
  "main": "dist/index.js",
  "types": "./dist/index.d.ts",
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
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {},
  "devDependencies": {
    "@types/jest": "^30.0.0",
    "@types/node": "^24.10.1",
    "jest": "^30.1.1",
    "ts-jest": "^29.2.0",
    "typescript": "^5.9.3"
  }
}
```

### Monorepo Workspace Reference

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/org/repo.git",
    "directory": "packages/package-name"
  }
}
```

---

## tsconfig.json Patterns

### Extending Monorepo Base

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

### Base Compiler Options (Monorepo Root)

- `target`: ES2022
- `module`: commonjs
- `strict`: true
- `noUnusedLocals`, `noUnusedParameters`: true
- `noImplicitReturns`, `noFallthroughCasesInSwitch`: true

---

## Jest Configuration

### Unit Tests (Default)

```javascript
// jest.config.js
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

### Integration Tests

- Reuse unit config or extend with `testTimeout: 15000`
- Use `setupFilesAfterEnv` for DB/HTTP setup
- Use env vars for connection strings

### Component Tests (xq-test-utils Pattern)

```javascript
// jest.config.component.js
const getComponentTestConfig = require('@chauhaidang/xq-test-utils/jest.component.config');

module.exports = getComponentTestConfig({
  rootDir: './',
  testMatch: ['<rootDir>/test/component/**/*.test.ts'],
  setupPath: '<rootDir>/test/component/setup.ts',
  teardownPath: '<rootDir>/test/component/teardown.ts',
  helpersPath: '<rootDir>/test/component/helpers',
  tsconfigPath: '<rootDir>/tsconfig.json',
  testTimeout: 60000,
  displayName: 'Component Tests',
});
```

Add to package.json:

```json
"scripts": {
  "test:component": "jest --config jest.config.component.js"
}
```

---

## API Design Principles

### 1. Expose Types

```typescript
// Export both implementation and types
export { DatabaseHelper } from './database';
export type { DatabaseConfig, QueryResult } from './database';
```

### 2. Dependency Injection

```typescript
// Good: injectable
export function createService(config: Config, db: DatabaseClient) { ... }

// Avoid: hardcoded
export function createService() {
  const db = new Database(configFromEnv());
  ...
}
```

### 3. Input Validation

```typescript
export function process(input: unknown): Result {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Expected object input');
  }
  const validated = input as Record<string, unknown>;
  if (!('id' in validated) || typeof validated.id !== 'string') {
    throw new Error('Expected input.id to be a string');
  }
  const { id } = validated;
  ...
}
```

### 4. Error Messages

- Include what went wrong
- Include expected vs actual when relevant
- Avoid exposing internal details (paths, stack traces) in public API

---

## Test File Locations

| Test Type | Location | Config |
|-----------|----------|--------|
| Unit | `src/__tests__/*.test.ts` | jest.config.js |
| Integration | `src/__tests__/*.integration.test.ts` or `test/integration/` | Same or extended |
| Component | `test/component/**/*.test.ts` | jest.config.component.js |
