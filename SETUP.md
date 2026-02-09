# Setup Guide

## Initial Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build all packages:**
   ```bash
   npm run build
   ```

3. **Run tests:**
   ```bash
   npm test
   ```

## Creating a New Package

1. **Create package directory:**
   ```bash
   mkdir -p packages/my-package/src
   ```

2. **Create `package.json`:**
   ```json
   {
     "name": "@chauhaidang/my-package",
     "version": "0.0.1",
     "description": "My package description",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "files": ["dist", "README.md", "LICENSE"],
     "publishConfig": {
       "registry": "https://npm.pkg.github.com"
     },
     "scripts": {
       "build": "tsc",
       "test": "echo \"No tests specified\" && exit 0",
       "clean": "rm -rf dist"
     },
     "repository": {
       "type": "git",
       "url": "git+https://github.com/chauhaidang/xq-toolbox.git",
       "directory": "packages/my-package"
     },
     "keywords": ["xq", "typescript"],
     "author": "chauhaidang",
     "license": "Apache-2.0"
   }
   ```

3. **Create `tsconfig.json`:**
   ```json
   {
     "extends": "../../tsconfig.json",
     "compilerOptions": {
       "outDir": "./dist",
       "rootDir": "./src"
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist", "**/*.test.ts"]
   }
   ```

4. **Create `src/index.ts`:**
   ```typescript
   export function myFunction(): string {
     return "Hello from my package!";
   }
   ```

5. **Reference `packages/example-package` for a complete example**

## Publishing

### Automatic Publishing

When you update a package version in `package.json` and push to `main`, the GitHub Actions workflow will:
1. Detect the version change
2. Build and test all packages
3. Publish only the changed packages

### Manual Publishing

Use GitHub Actions workflow dispatch to manually publish all packages.

### Version Bumping

To publish a package:
1. Update `version` in `packages/your-package/package.json`
2. Commit and push to `main`
3. The workflow will automatically publish

## Development Tips

- Use `npm run typecheck` to check types across all packages
- Each package can have its own dependencies
- Shared dev dependencies go in the root `package.json`
- Use `npm run build` from root to build all packages
- Use `npm run build` from a package directory to build just that package
