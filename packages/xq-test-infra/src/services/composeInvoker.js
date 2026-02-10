const { spawn } = require('cross-spawn')
const which = require('which')
const fs = require('fs-extra')
const YAML = require('yaml')

class ComposeInvoker {
  constructor() {
    this.dockerComposeCli = null
  }

  async detectDockerCompose() {
    if (this.dockerComposeCli) {
      return this.dockerComposeCli
    }

    // Try docker compose (v2) first, then fallback to docker-compose (v1)
    try {
      await which('docker')
      // Test if docker compose plugin is available
      const result = await this.execCommand('docker', ['compose', '--version'], { timeout: 5000 })
      if (result.exitCode === 0) {
        this.dockerComposeCli = { command: 'docker', args: ['compose'] }
        return this.dockerComposeCli
      }
    } catch (error) {
      // Docker not found or compose plugin not available
    }

    try {
      await which('docker-compose')
      this.dockerComposeCli = { command: 'docker-compose', args: [] }
      return this.dockerComposeCli
    } catch (error) {
      throw new Error('Neither "docker compose" nor "docker-compose" command found. Please install Docker with Compose plugin or docker-compose.')
    }
  }

  async up(composeFile, options = {}) {
    const { detached = true, pull = true } = options

    await this.validateComposeFile(composeFile)
    const cli = await this.detectDockerCompose()

    const args = [...cli.args, '-f', composeFile, 'up']
    if (detached) args.push('-d')
    if (pull) args.push('--pull', 'missing')
    args.push('--remove-orphans') // Always remove orphaned containers

    return this.execCommand(cli.command, args, {
      stdio: detached ? 'pipe' : 'inherit',
      cwd: process.cwd()
    })
  }

  async down(composeFile, options = {}) {
    const { removeVolumes = false, removeImages = false } = options

    await this.validateComposeFile(composeFile)
    const cli = await this.detectDockerCompose()

    const args = [...cli.args, '-f', composeFile, 'down']
    if (removeVolumes) args.push('-v')
    if (removeImages) args.push('--rmi', 'all')

    return this.execCommand(cli.command, args, {
      stdio: 'inherit',
      cwd: process.cwd()
    })
  }

  async pull(composeFile) {
    await this.validateComposeFile(composeFile)
    const cli = await this.detectDockerCompose()

    const args = [...cli.args, '-f', composeFile, 'pull']

    return this.execCommand(cli.command, args, {
      stdio: 'inherit',
      cwd: process.cwd()
    })
  }

  async logs(composeFile, options = {}) {
    const { follow = false, tail = '100', timestamps = false, service = null } = options

    await this.validateComposeFile(composeFile)
    const cli = await this.detectDockerCompose()

    const args = [...cli.args, '-f', composeFile, 'logs']
    if (follow) args.push('-f')
    if (tail) args.push('--tail', tail.toString())
    if (timestamps) args.push('--timestamps')
    if (service) args.push(service)

    return this.execCommand(cli.command, args, {
      stdio: 'inherit',
      cwd: process.cwd()
    })
  }

  async ps(composeFile) {
    await this.validateComposeFile(composeFile)
    const cli = await this.detectDockerCompose()

    const args = [...cli.args, '-f', composeFile, 'ps']

    return this.execCommand(cli.command, args, {
      stdio: 'inherit',
      cwd: process.cwd()
    })
  }

  /**
   * Detect test containers from source service files
   * Test containers are identified by filenames containing: .test.
   * (e.g., keeper.test.yaml, my-service.test.yml)
   */
  async detectTestContainers(composeFile, sourcePath = null) {
    try {
      // If sourcePath is provided, scan for .test. files
      if (sourcePath) {
        try {
          const stat = await fs.stat(sourcePath)
          if (stat.isDirectory()) {
            // Scan directory for service files containing .test.
            const files = await fs.readdir(sourcePath)
            const testFiles = files.filter(file => 
              file.includes('.test.') && (file.endsWith('.yml') || file.endsWith('.yaml') || file.endsWith('.service.yml') || file.endsWith('.service.yaml'))
            )
            
            if (testFiles.length === 0) {
              return []
            }
            
            // Map test filenames to service names in compose file
            const composeContent = await fs.readFile(composeFile, 'utf8')
            const compose = YAML.parse(composeContent)
            const services = compose.services || {}
            
            const testContainers = []
            
            // For each test file, find matching service name
            for (const testFile of testFiles) {
              // Extract base name from different patterns:
              // "keeper.test.yaml" -> "keeper"
              // "xq-keeper.test.service.yml" -> "xq-keeper"
              // "my-service.test.service.yaml" -> "my-service"
              let baseName = testFile.split('.test.')[0]
              
              // Remove common prefixes/suffixes
              baseName = baseName.replace(/^xq-/, '') // Remove "xq-" prefix if present
              
              // Try to find service with matching name
              // First try exact match, then partial match
              let found = false
              for (const [serviceName, serviceConfig] of Object.entries(services)) {
                const serviceNameLower = serviceName.toLowerCase()
                const baseNameLower = baseName.toLowerCase()
                
                // Exact match or contains match
                if (serviceNameLower === baseNameLower ||
                    serviceNameLower.includes(baseNameLower) ||
                    baseNameLower.includes(serviceNameLower) ||
                    serviceNameLower === `xq-${baseNameLower}` ||
                    serviceNameLower === `${baseNameLower}-service`) {
                  testContainers.push(serviceName)
                  found = true
                  break
                }
              }
              
              // If not found, try matching by the original filename pattern
              if (!found) {
                // Try matching with "xq-" prefix
                const withPrefix = `xq-${baseName}`
                if (services[withPrefix]) {
                  testContainers.push(withPrefix)
                }
              }
            }
            
            return [...new Set(testContainers)] // Remove duplicates
          }
        } catch (error) {
          // If we can't read the directory, fall through to fallback method
        }
      }
      
      // Fallback: try to detect from compose file by service names
      // This is for backward compatibility when sourcePath is not available
      // This fallback should rarely be used - prefer .test. files in source directory
      const content = await fs.readFile(composeFile, 'utf8')
      const compose = YAML.parse(content)
      const services = compose.services || {}
      
      // Match services that are clearly test containers
      // Match: "xq-keeper", "gate-keeper", "e2e-tests", "test-service"
      // Don't match: "nginx-test", "redis-test" (test is a suffix, not a prefix)
      const testContainers = []
      
      for (const [serviceName, serviceConfig] of Object.entries(services)) {
        const nameLower = serviceName.toLowerCase()
        // Match keeper services (e.g., "xq-keeper", "gate-keeper")
        if (nameLower.includes('keeper')) {
          testContainers.push(serviceName)
        }
        // Match e2e services (e.g., "e2e-tests", "e2e-runner")
        else if (nameLower.includes('e2e')) {
          testContainers.push(serviceName)
        }
        // Match test services that start with "test-" (e.g., "test-service")
        // but not services that end with "-test" (e.g., "nginx-test", "redis-test")
        else if (nameLower.startsWith('test-') || nameLower === 'test') {
          testContainers.push(serviceName)
        }
      }
      
      return testContainers
    } catch (error) {
      // If we can't parse the file, return empty array
      return []
    }
  }

  /**
   * Wait for test containers to exit
   * Returns true if all test containers exited successfully, false otherwise
   */
  async waitForTestContainers(composeFile, testContainers, options = {}) {
    if (testContainers.length === 0) {
      return true
    }

    const { timeout = 600000, checkInterval = 2000 } = options // 10 minute default, check every 2 seconds
    const cli = await this.detectDockerCompose()
    const startTime = Date.now()

    console.log(`⏳ Waiting for test containers to complete: ${testContainers.join(', ')}`)

    while (Date.now() - startTime < timeout) {
      try {
        // Get container status using docker compose ps
        const args = [...cli.args, '-f', composeFile, 'ps', '-a']
        let result
        try {
          result = await this.execCommand(cli.command, args, {
            stdio: 'pipe',
            cwd: process.cwd()
          })
        } catch (error) {
          // If ps command fails, containers might not be up yet, continue waiting
          await new Promise(resolve => setTimeout(resolve, checkInterval))
          continue
        }

        // Parse the output - docker compose ps outputs table format
        const lines = result.stdout.split('\n').filter(line => line.trim())
        const testContainerStatuses = []

        for (const line of lines) {
          // Skip header lines
          if (line.includes('NAME') || line.includes('SERVICE') || line.startsWith('---')) {
            continue
          }

          // Parse service name and status from the line
          // Format: <project>_<service>_<number>  <status>
          // Status column can contain multiple words like "Exited (0) 2 hours ago"
          for (const serviceName of testContainers) {
            if (line.includes(serviceName)) {
              const parts = line.split(/\s+/)
              // Find the service name position, status is everything after it
              const serviceIndex = parts.findIndex(part => part.includes(serviceName))
              let status = ''
              if (serviceIndex >= 0 && serviceIndex < parts.length - 1) {
                // Status is everything after the service name
                status = parts.slice(serviceIndex + 1).join(' ')
              } else {
                // Fallback: use last part
                status = parts[parts.length - 1] || ''
              }
              const isExited = status.includes('Exited') || status.includes('exited')
              
              if (isExited) {
                // Extract exit code if available (format: "Exited (0)")
                const exitCodeMatch = status.match(/Exited\s*\((\d+)\)/)
                const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1], 10) : 0
                
                testContainerStatuses.push({
                  service: serviceName,
                  status,
                  exitCode,
                  exited: true
                })
              } else {
                testContainerStatuses.push({
                  service: serviceName,
                  status,
                  exited: false
                })
              }
            }
          }
        }

        // Check if we found all test containers and they've all exited
        const foundContainers = testContainerStatuses.map(c => c.service)
        const allFound = testContainers.every(name => foundContainers.includes(name))
        const allExited = testContainerStatuses.length > 0 && 
                         testContainerStatuses.every(c => c.exited) &&
                         testContainerStatuses.length === testContainers.length

        if (allFound && allExited) {
          // Check exit codes
          const failedContainers = testContainerStatuses.filter(c => c.exitCode !== 0)

          if (failedContainers.length > 0) {
            console.log('❌ Some test containers failed:')
            failedContainers.forEach(container => {
              console.log(`   - ${container.service}: exit code ${container.exitCode}`)
            })
            return false
          }

          console.log('✅ All test containers completed successfully')
          return true
        }

        // Some containers still running, wait and check again
        await new Promise(resolve => setTimeout(resolve, checkInterval))
      } catch (error) {
        // If command fails, continue waiting (containers might not be up yet)
        await new Promise(resolve => setTimeout(resolve, checkInterval))
      }
    }

    console.log(`⏱️  Timeout waiting for test containers after ${timeout / 1000} seconds`)
    return false
  }

  async validateComposeFile(composeFile) {
    try {
      await fs.access(composeFile)
    } catch (error) {
      throw new Error(`Docker compose file not found: ${composeFile}`)
    }
  }

  execCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const { timeout = 300000, ...spawnOptions } = options // 5 minute default timeout

      const child = spawn(command, args, spawnOptions)
      let timeoutId

      if (timeout) {
        timeoutId = setTimeout(() => {
          child.kill('SIGTERM')
          reject(new Error(`Command timed out after ${timeout}ms`))
        }, timeout)
      }

      let stdout = ''
      let stderr = ''

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString()
        })
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString()
        })
      }

      child.on('error', (error) => {
        if (timeoutId) clearTimeout(timeoutId)
        reject(error)
      })

      child.on('exit', (exitCode, signal) => {
        if (timeoutId) clearTimeout(timeoutId)

        const result = {
          exitCode,
          signal,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        }

        if (exitCode === 0) {
          resolve(result)
        } else {
          const errorMsg = `Command failed with exit code ${exitCode}: ${command} ${args.join(' ')}`
          const fullError = stderr || stdout || 'No error output'
          const error = new Error(`${errorMsg}\n\nDocker output:\n${fullError}`)
          error.result = result
          reject(error)
        }
      })

      // Handle process signals
      process.on('SIGINT', () => {
        child.kill('SIGINT')
      })

      process.on('SIGTERM', () => {
        child.kill('SIGTERM')
      })
    })
  }
}

module.exports = new ComposeInvoker()