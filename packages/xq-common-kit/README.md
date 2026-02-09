# @chauhaidang/xq-common-kit

A focused collection of lightweight TypeScript utilities for use across multiple XQ projects.

---

## ✨ Overview

This kit provides minimal, dependency-friendly helpers for tasks like:

- Reading YAML files
- Generating random strings
- Centralized configuration management
- Structured logging with multiple levels
- Converting JUnit XML test results to markdown

Designed for easy inclusion in any TypeScript/JavaScript project without heavy coupling.

---

## 🚀 Quick Start

### Installation

```sh
npm install @chauhaidang/xq-common-kit
```

**Note:** Make sure you have configured your `.npmrc` to use GitHub Packages:

```
@chauhaidang:registry=https://npm.pkg.github.com
```

### Usage

#### TypeScript/ES Modules

```typescript
import { 
  readYAML, 
  generateRandomString, 
  getConfig, 
  logger,
  generateMarkdownFromJunit 
} from '@chauhaidang/xq-common-kit';

// Read YAML file
const data = readYAML('xq.yaml');
console.log(data);

// Generate a random string
console.log(generateRandomString(8));

// Access config
console.log(getConfig().someKey);

// Logging
logger.info('Application started');
logger.error('Something went wrong');
logger.debug('Debug information');

// Convert JUnit XML to markdown
const markdown = await generateMarkdownFromJunit(xmlContent);
```

#### CommonJS

```javascript
const { 
  readYAML, 
  generateRandomString, 
  getConfig, 
  logger,
  generateMarkdownFromJunit 
} = require('@chauhaidang/xq-common-kit');

// Same usage as above
```

---

## 📝 Logger

The logger module provides structured logging with multiple levels and colored output.

### Log Levels
- `DEBUG` (0) - Detailed debug information
- `INFO` (1) - General information messages
- `WARN` (2) - Warning messages
- `ERROR` (3) - Error messages

### Usage

```typescript
import { logger, LOG_LEVELS } from '@chauhaidang/xq-common-kit';

// Basic logging
logger.info('Server started on port 3000');
logger.warn('Memory usage is high');
logger.error('Database connection failed');
logger.debug('Processing user request');

// Multiple arguments
logger.info('User logged in:', { userId: 123, email: 'user@example.com' });

// Configure log level (only logs at or above this level)
logger.setLevel('WARN');  // Only WARN and ERROR messages will be shown
logger.setLevel('DEBUG'); // All messages will be shown
logger.setLevel(LOG_LEVELS.ERROR); // Using numeric level
```

### Output Format
```
[2025-09-23T10:30:45.123Z] INFO: Server started on port 3000
[2025-09-23T10:30:46.456Z] ERROR: Database connection failed
```

---

## 🛠️ Development

This package is part of the `xq-toolbox` monorepo.

### Building

```sh
npm run build
```

### Testing

```sh
npm test
```

### Linting

```sh
npm run lint
npm run lint:fix
```

---

## 📦 API Reference

### `generateRandomString(length: number): string`

Generates a random alphanumeric string of specified length.

### `getConfig(): any`

Reads and parses the `xq.json` configuration file from the current working directory. Throws an error if the file doesn't exist.

### `readYAML(filePath: string): any | null`

Reads and parses a YAML file. Returns `null` if an error occurs.

### `logger: Logger`

Singleton logger instance with methods: `debug()`, `info()`, `warn()`, `error()`, and `setLevel()`.

### `generateMarkdownFromJunit(xmlContent: string): Promise<string>`

Converts JUnit XML test results to markdown format. Useful for generating test reports.

---

## 🚚 Publishing

This package is automatically published to GitHub Packages when its version changes in `package.json`. Publishing is handled by the monorepo's GitHub Actions workflow.

---

## 📄 License

Apache-2.0
