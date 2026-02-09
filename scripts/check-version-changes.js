#!/usr/bin/env node

/**
 * Script to check which packages have version changes
 * Outputs JSON array of changed package names
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packagesDir = path.join(__dirname, '..', 'packages');
const changedPackages = [];
let versionChanged = false;

// Get all package directories
const packageDirs = fs.readdirSync(packagesDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

for (const pkgName of packageDirs) {
  const pkgJsonPath = path.join(packagesDir, pkgName, 'package.json');
  
  if (!fs.existsSync(pkgJsonPath)) {
    continue;
  }

  try {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    const versionNow = pkgJson.version;

    if (!versionNow) {
      continue;
    }

    // Try to get previous version from git
    let versionPrev = '';
    try {
      const gitPath = `packages/${pkgName}/package.json`;
      const prevCommit = execSync('git rev-parse HEAD^1 2>/dev/null || echo ""', { encoding: 'utf8' }).trim();
      
      if (prevCommit) {
        try {
          const prevPkgJson = execSync(`git show ${prevCommit}:${gitPath} 2>/dev/null`, { encoding: 'utf8' });
          const prevPkg = JSON.parse(prevPkgJson);
          versionPrev = prevPkg.version || '';
        } catch (e) {
          // File didn't exist in previous commit, that's okay
        }
      }
    } catch (e) {
      // Couldn't get previous version, that's okay
    }

    if (versionNow !== versionPrev) {
      versionChanged = true;
      changedPackages.push(pkgName);
      console.error(`Package ${pkgName} version changed: ${versionPrev || '(new)'} -> ${versionNow}`);
    }
  } catch (e) {
    console.error(`Error processing ${pkgName}:`, e.message);
  }
}

// Output JSON to stdout for debugging / other consumers
const result = {
  version_changed: versionChanged,
  changed_packages: changedPackages
};
console.log(JSON.stringify(result));

// When running in GitHub Actions, write step outputs directly to avoid duplicated parsing in workflow
const githubOutput = process.env.GITHUB_OUTPUT;
if (githubOutput) {
  const versionLine = `version_changed=${versionChanged}`;
  const packagesJson = JSON.stringify(changedPackages);
  const packagesLine = `changed_packages=${packagesJson}`;
  fs.appendFileSync(githubOutput, versionLine + '\n');
  fs.appendFileSync(githubOutput, packagesLine + '\n');
}
