# xq-toolbox

A monorepo containing all TypeScript tools, libraries, modules, and frameworks for XQ applications.

## Overview

This monorepo uses npm workspaces to manage multiple TypeScript packages. Each package can be independently versioned and published to GitHub Packages.

## Structure

```
xq-toolbox/
├── packages/              # All packages live here
│   └── example-package/   # Example package structure
├── .github/
│   └── workflows/
│       └── publish.yml    # GitHub Actions workflow for publishing
├── package.json          # Root package.json with workspaces
├── tsconfig.json         # Root TypeScript configuration
└── .npmrc                # GitHub Packages registry configuration
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Install all dependencies for all packages
npm install
```

### Building

```bash
# Build all packages
npm run build

# Build a specific package
cd packages/example-package
npm run build
```

### Testing

```bash
# Run tests for all packages
npm test

# Run tests for a specific package
cd packages/example-package
npm test
```

### Type Checking

```bash
# Type check all packages
npm run typecheck
```

## Creating a New Package

1. Create a new directory under `packages/`:
   ```bash
   mkdir packages/my-new-package
   ```

2. Create `package.json`:
   ```json
   {
     "name": "@chauhaidang/my-new-package",
     "version": "0.0.1",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "publishConfig": {
       "registry": "https://npm.pkg.github.com"
     },
     "scripts": {
       "build": "tsc",
       "test": "echo \"No tests specified\" && exit 0"
     }
   }
   ```

3. Create `tsconfig.json` that extends the root config:
   ```json
   {
     "extends": "../../tsconfig.json",
     "compilerOptions": {
       "outDir": "./dist",
       "rootDir": "./src"
     },
     "include": ["src/**/*"]
   }
   ```

4. Create `src/index.ts` with your code

5. Reference `packages/example-package` for a complete example

## Publishing

### Automatic Publishing

Packages are automatically published to GitHub Packages when:
- A push is made to the `main` branch
- The package's version in `package.json` has changed

The GitHub Actions workflow will:
1. Build and test all packages
2. Detect which packages have version changes
3. Publish only the changed packages

### Manual Publishing

You can manually trigger publishing via GitHub Actions workflow dispatch. This will publish all packages regardless of version changes.

### Publishing a Package

To publish a package:

1. Update the version in `packages/your-package/package.json`
2. Commit and push to `main` branch
3. The workflow will automatically detect the version change and publish

### Installing Published Packages

To use a published package in another project:

1. Create/update `.npmrc` in your project:
   ```
   @chauhaidang:registry=https://npm.pkg.github.com
   ```

2. Authenticate (for CI/CD, use `GITHUB_TOKEN`):
   ```bash
   npm login --scope=@chauhaidang --registry=https://npm.pkg.github.com
   ```

3. Install the package:
   ```bash
   npm install @chauhaidang/your-package
   ```

## Development Workflow

1. Create your package in `packages/your-package/`
2. Develop and test locally
3. Update version in `package.json` when ready to publish
4. Commit and push to `main`
5. GitHub Actions will automatically publish

## Package Guidelines

- Each package should have its own `package.json` with proper `name`, `version`, `main`, and `types` fields
- Use TypeScript for all packages
- Include `publishConfig` with GitHub Packages registry
- Set `files` field to control what gets published (typically `dist`, `README.md`, `LICENSE`)
- Each package should have its own `tsconfig.json` that extends the root config

## License

Apache-2.0
