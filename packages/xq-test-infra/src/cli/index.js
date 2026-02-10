#!/usr/bin/env node
const { program } = require('commander')
const path = require('path')
const fs = require('fs-extra')
const pkg = require('../../package.json')
const composeGenerator = require('../services/composeGenerator')
const composeInvoker = require('../services/composeInvoker')

module.exports = async function main() {
  program.name('xq-infra').description('CLI to generate docker-compose and manage test infra').version(pkg.version)

  program
    .command('generate')
    .description('Generate xq-compose.yml from xq spec')
    .requiredOption('-f, --file <path>', 'Path to xq YAML spec file or directory containing *.service.yml files')
    .option('--no-gateway', 'Disable default gateway injection')
    .option('--keep-file', 'Keep generated compose file after run')
    .option('--overrides <path>', 'Path to JSON file with overrides')
    .action(async (opts) => {
      const absIn = path.resolve(process.cwd(), opts.file)
      let overrides = undefined
      if (opts.overrides) {
        try {
          overrides = require(path.resolve(process.cwd(), opts.overrides))
        } catch (e) {
          console.error('Failed to load overrides file:', e.message || e)
          process.exit(2)
        }
      }
      try {
        const outPath = await composeGenerator.generateCompose(absIn, {
          gateway: opts.gateway,
          keepFile: opts.keepFile,
          overrides
        })
        console.log('Generated docker-compose at:', outPath)
      } catch (err) {
        console.error('Failed to generate compose file:', err.message || err)
        process.exit(2)
      }
    })

  program
    .command('up')
    .description('Start services from xq-compose.yml (detached mode)')
    .option('--no-pull', 'Skip pulling images (uses cached images)')
    .action(async (opts) => {
      const composeFile = path.join(process.cwd(), 'xq-compose.yml')
      try {
        const shouldPull = opts.pull !== false // true by default, false only if --no-pull

        // Attempt to pull images, but don't fail if some images are local
        if (shouldPull) {
          try {
            await composeInvoker.pull(composeFile)
          } catch (pullErr) {
            // Pull failed (possibly due to local images not in registry)
            // Log warning but continue - docker compose up will use local images if available
            console.warn('Warning: Failed to pull some images from registry. Proceeding with local/cached images.')
            console.warn(`Reason: ${pullErr.message}`)
          }
        }

        await composeInvoker.up(composeFile, { pull: shouldPull })
        console.log('Services started successfully!')
        
        // Detect and wait for test containers to complete
        // Try to find source directory (test-env, services, or same dir as compose file)
        const composeDir = path.dirname(composeFile)
        const possibleSourceDirs = [
          path.join(composeDir, 'test-env'),
          path.join(composeDir, 'services'),
          composeDir
        ]
        
        let sourcePath = null
        for (const dir of possibleSourceDirs) {
          try {
            const stat = await fs.stat(dir)
            if (stat.isDirectory()) {
              sourcePath = dir
              break
            }
          } catch {
            // Directory doesn't exist, try next
          }
        }
        
        // Detect and wait for test containers (if any)
        try {
          const testContainers = await composeInvoker.detectTestContainers(composeFile, sourcePath)
          if (testContainers.length > 0) {
            console.log('')
            console.log('🧪 Detected test containers:', testContainers.join(', '))
            console.log('⏳ Waiting for test containers to complete...')
            console.log('   (This may take a few moments while tests run)')
            console.log('')
            
            const allPassed = await composeInvoker.waitForTestContainers(composeFile, testContainers)
            if (!allPassed) {
              console.error('')
              console.error('❌ Some test containers failed. Check logs for details.')
              process.exit(1)
            }
            
            console.log('')
            console.log('✅ All test containers completed successfully!')
          }
        } catch (detectError) {
          // If test container detection fails, log warning but don't fail the command
          // This allows the up command to succeed even if detection has issues
          console.warn('Warning: Failed to detect test containers:', detectError.message)
        }
      } catch (err) {
        console.error('Failed to run up:', err.message || err)
        process.exit(3)
      }
    })

  program
    .command('down')
    .description('Stop and remove services from xq-compose.yml')
    .action(async () => {
      const composeFile = path.join(process.cwd(), 'xq-compose.yml')
      try {
        await composeInvoker.down(composeFile)
        console.log('Services stopped successfully!')
      } catch (err) {
        console.error('Failed to run down:', err.message || err)
        process.exit(4)
      }
    })

  program
    .command('logs')
    .description('View logs from services in xq-compose.yml')
    .option('-f, --follow', 'Follow log output in real-time')
    .option('-t, --tail <lines>', 'Number of lines to show from the end of the logs', '100')
    .option('--timestamps', 'Show timestamps')
    .argument('[service]', 'Specific service to show logs for (optional)')
    .action(async (service, opts) => {
      const composeFile = path.join(process.cwd(), 'xq-compose.yml')
      try {
        await composeInvoker.logs(composeFile, {
          follow: !!opts.follow,
          tail: opts.tail,
          timestamps: !!opts.timestamps,
          service
        })
      } catch (err) {
        console.error('Failed to get logs:', err.message || err)
        process.exit(5)
      }
    })

  await program.parseAsync(process.argv)
}

