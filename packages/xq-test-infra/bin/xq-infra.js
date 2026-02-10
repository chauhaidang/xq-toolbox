#!/usr/bin/env node
// CLI entrypoint
try {
  require('../src/cli')()
} catch (err) {
  // Fallback for environments where src is not transpiled
  console.error('Failed to start CLI:', err && err.message ? err.message : err)
  process.exit(1)
}

