#!/usr/bin/env node
/**
 * install-skills.js
 *
 * Scans all installed @chauhaidang/* packages for a skills/ directory and
 * copies the skill files into the consumer project's .agents/skills/ directory
 * so that agent tooling (e.g. Cursor `.agents/skills/`) can discover and use them.
 *
 * Usage (run from the consumer project root after installing packages):
 *   node path/to/install-skills.js
 *   # or, if released as part of xq-scripts tarball and placed on PATH:
 *   install-skills.js
 *
 * Safe to re-run — existing skill directories are overwritten with the latest
 * version from node_modules.
 * Exits silently if the consumer project has no .agents/ directory.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Locate consumer project root ────────────────────────────────────────────

function findProjectRoot(dir) {
  if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
  const parent = path.dirname(dir);
  if (parent === dir) return null;
  return findProjectRoot(parent);
}

const projectRoot = findProjectRoot(process.cwd());
if (!projectRoot) {
  console.error('[install-skills] Could not locate a package.json. Skipping.');
  process.exit(0);
}

// Opt-in only: exit silently if the consumer has no .agents/ or .agent/ directory.
const agentsDirName = fs.existsSync(path.join(projectRoot, '.agents')) ? '.agents'
  : fs.existsSync(path.join(projectRoot, '.agent')) ? '.agent'
    : null;
if (!agentsDirName) {
  process.exit(0);
}
const agentsSkillsDir = path.join(projectRoot, agentsDirName, 'skills');

// ─── Copy helper ─────────────────────────────────────────────────────────────

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ─── Discover skills from all @chauhaidang/* packages ────────────────────────

const scopeDir = path.join(projectRoot, 'node_modules', '@chauhaidang');
if (!fs.existsSync(scopeDir)) {
  console.log('[install-skills] No @chauhaidang packages found in node_modules. Nothing to install.');
  process.exit(0);
}

fs.mkdirSync(agentsSkillsDir, { recursive: true });

const installed = [];

for (const pkg of fs.readdirSync(scopeDir, { withFileTypes: true })) {
  if (!pkg.isDirectory()) continue;
  const skillsDir = path.join(scopeDir, pkg.name, 'skills');
  if (!fs.existsSync(skillsDir)) continue;

  for (const skill of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!skill.isDirectory()) continue;
    const src = path.join(skillsDir, skill.name);
    const dest = path.join(agentsSkillsDir, skill.name);
    copyDir(src, dest);
    installed.push({ pkg: `@chauhaidang/${pkg.name}`, skill: skill.name });
  }
}

// ─── Report ──────────────────────────────────────────────────────────────────

if (installed.length === 0) {
  console.log('[install-skills] No skills found in any @chauhaidang package.');
} else {
  console.log(`[install-skills] Installed skills to ${path.relative(projectRoot, agentsSkillsDir)}:`);
  for (const { pkg, skill } of installed) {
    console.log(`  ✓ ${skill}  (from ${pkg})`);
  }
}
