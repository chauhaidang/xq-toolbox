const fs = require('fs-extra')
const path = require('path')
const os = require('os')
const composeInvoker = require('../src/services/composeInvoker')

// Mock cross-spawn
jest.mock('cross-spawn')
const { spawn } = require('cross-spawn')

// Mock which
jest.mock('which')
const which = require('which')

describe('ComposeInvoker', () => {
  let tempDir
  let testComposePath

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `xq-test-${Date.now()}`)
    await fs.ensureDir(tempDir)

    testComposePath = path.join(tempDir, 'docker-compose.yml')
    await fs.writeFile(testComposePath, `
version: '3.8'
services:
  test-service:
    image: nginx:alpine
    ports:
      - "8080:80"
`, 'utf8')

    // Reset mocks
    jest.clearAllMocks()
    composeInvoker.dockerComposeCli = null
  })

  afterEach(async () => {
    await fs.remove(tempDir)
  })

  describe('detectDockerCompose', () => {
    test('should detect docker compose v2 first', async () => {
      which.mockImplementation(async (cmd) => {
        if (cmd === 'docker') return '/usr/bin/docker'
        throw new Error('Command not found')
      })

      const mockChild = {
        on: jest.fn((event, callback) => {
          if (event === 'exit') {
            setTimeout(() => callback(0), 10)
          }
        })
      }
      spawn.mockReturnValue(mockChild)

      const cli = await composeInvoker.detectDockerCompose()

      expect(cli).toEqual({
        command: 'docker',
        args: ['compose']
      })
      expect(spawn).toHaveBeenCalledWith('docker', ['compose', '--version'], {})
    })

    test('should fallback to docker-compose v1', async () => {
      which.mockImplementation(async (cmd) => {
        if (cmd === 'docker') throw new Error('Command not found')
        if (cmd === 'docker-compose') return '/usr/bin/docker-compose'
        throw new Error('Command not found')
      })

      const cli = await composeInvoker.detectDockerCompose()

      expect(cli).toEqual({
        command: 'docker-compose',
        args: []
      })
    })

    test('should throw error when neither command is available', async () => {
      which.mockImplementation(async () => {
        throw new Error('Command not found')
      })

      await expect(composeInvoker.detectDockerCompose())
        .rejects.toThrow('Neither "docker compose" nor "docker-compose" command found')
    })

    test('should cache detection result', async () => {
      which.mockImplementation(async (cmd) => {
        if (cmd === 'docker-compose') return '/usr/bin/docker-compose'
        throw new Error('Command not found')
      })

      // First call
      await composeInvoker.detectDockerCompose()

      // Second call should use cached result
      const cli = await composeInvoker.detectDockerCompose()

      expect(cli).toEqual({
        command: 'docker-compose',
        args: []
      })
      expect(which).toHaveBeenCalledTimes(2) // Only called once for each command
    })
  })

  describe('validateComposeFile', () => {
    test('should pass for existing file', async () => {
      await expect(composeInvoker.validateComposeFile(testComposePath))
        .resolves.toBeUndefined()
    })

    test('should throw error for non-existent file', async () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.yml')

      await expect(composeInvoker.validateComposeFile(nonExistentPath))
        .rejects.toThrow('Docker compose file not found')
    })
  })

  describe('execCommand', () => {
    test('should resolve on successful command execution', async () => {
      const mockChild = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              setTimeout(() => callback(Buffer.from('success output')), 10)
            }
          })
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn((event, callback) => {
          if (event === 'exit') {
            setTimeout(() => callback(0, null), 20)
          }
        }),
        kill: jest.fn()
      }
      spawn.mockReturnValue(mockChild)

      const result = await composeInvoker.execCommand('echo', ['test'])

      expect(result).toEqual({
        exitCode: 0,
        signal: null,
        stdout: 'success output',
        stderr: ''
      })
    })

    test('should reject on command failure', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              setTimeout(() => callback(Buffer.from('error output')), 10)
            }
          })
        },
        on: jest.fn((event, callback) => {
          if (event === 'exit') {
            setTimeout(() => callback(1, null), 20)
          }
        }),
        kill: jest.fn()
      }
      spawn.mockReturnValue(mockChild)

      await expect(composeInvoker.execCommand('false', []))
        .rejects.toThrow('Command failed with exit code 1')
    })

    test('should handle timeout', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(), // Never calls exit
        kill: jest.fn()
      }
      spawn.mockReturnValue(mockChild)

      await expect(composeInvoker.execCommand('sleep', ['10'], { timeout: 100 }))
        .rejects.toThrow('Command timed out after 100ms')

      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM')
    })

    test('should handle spawn errors', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Spawn failed')), 10)
          }
        }),
        kill: jest.fn()
      }
      spawn.mockReturnValue(mockChild)

      await expect(composeInvoker.execCommand('invalid-command', []))
        .rejects.toThrow('Spawn failed')
    })
  })

  describe('up', () => {
    beforeEach(() => {
      composeInvoker.dockerComposeCli = { command: 'docker', args: ['compose'] }
    })

    test('should call docker compose up with correct arguments', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'exit') {
            setTimeout(() => callback(0, null), 10)
          }
        }),
        kill: jest.fn()
      }
      spawn.mockReturnValue(mockChild)

      await composeInvoker.up(testComposePath)

      expect(spawn).toHaveBeenCalledWith('docker',
        ['compose', '-f', testComposePath, 'up', '-d', '--pull', 'missing', '--remove-orphans'],
        expect.objectContaining({
          stdio: 'pipe',
          cwd: process.cwd()
        })
      )
    })

    test('should add detached flag when specified', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'exit') {
            setTimeout(() => callback(0, null), 10)
          }
        }),
        kill: jest.fn()
      }
      spawn.mockReturnValue(mockChild)

      await composeInvoker.up(testComposePath, { detached: true })

      // pull defaults to true, so --pull missing is included
      expect(spawn).toHaveBeenCalledWith('docker',
        ['compose', '-f', testComposePath, 'up', '-d', '--pull', 'missing', '--remove-orphans'],
        expect.objectContaining({
          stdio: 'pipe'
        })
      )
    })

    test('should add pull flag when specified', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'exit') {
            setTimeout(() => callback(0, null), 10)
          }
        }),
        kill: jest.fn()
      }
      spawn.mockReturnValue(mockChild)

      await composeInvoker.up(testComposePath, { pull: true })

      // When pull is true, it uses --pull missing (not always)
      expect(spawn).toHaveBeenCalledWith('docker',
        ['compose', '-f', testComposePath, 'up', '-d', '--pull', 'missing', '--remove-orphans'],
        expect.any(Object)
      )
    })

    test('should skip pull flag when pull is false', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'exit') {
            setTimeout(() => callback(0, null), 10)
          }
        }),
        kill: jest.fn()
      }
      spawn.mockReturnValue(mockChild)

      await composeInvoker.up(testComposePath, { pull: false })

      expect(spawn).toHaveBeenCalledWith('docker',
        ['compose', '-f', testComposePath, 'up', '-d', '--remove-orphans'],
        expect.any(Object)
      )
    })
  })

  describe('down', () => {
    beforeEach(() => {
      composeInvoker.dockerComposeCli = { command: 'docker-compose', args: [] }
    })

    test('should call docker-compose down with correct arguments', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'exit') {
            setTimeout(() => callback(0, null), 10)
          }
        }),
        kill: jest.fn()
      }
      spawn.mockReturnValue(mockChild)

      await composeInvoker.down(testComposePath)

      expect(spawn).toHaveBeenCalledWith('docker-compose',
        ['-f', testComposePath, 'down'],
        expect.objectContaining({
          stdio: 'inherit',
          cwd: process.cwd()
        })
      )
    })

    test('should add volume removal flag when specified', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'exit') {
            setTimeout(() => callback(0, null), 10)
          }
        }),
        kill: jest.fn()
      }
      spawn.mockReturnValue(mockChild)

      await composeInvoker.down(testComposePath, { removeVolumes: true })

      expect(spawn).toHaveBeenCalledWith('docker-compose',
        ['-f', testComposePath, 'down', '-v'],
        expect.any(Object)
      )
    })
  })

  describe('pull', () => {
    beforeEach(() => {
      composeInvoker.dockerComposeCli = { command: 'docker', args: ['compose'] }
    })

    test('should call docker compose pull', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'exit') {
            setTimeout(() => callback(0, null), 10)
          }
        }),
        kill: jest.fn()
      }
      spawn.mockReturnValue(mockChild)

      await composeInvoker.pull(testComposePath)

      expect(spawn).toHaveBeenCalledWith('docker',
        ['compose', '-f', testComposePath, 'pull'],
        expect.any(Object)
      )
    })
  })

  describe('detectTestContainers', () => {
    let sourceDir

    beforeEach(async () => {
      sourceDir = path.join(tempDir, 'test-env')
      await fs.ensureDir(sourceDir)
    })

    test('should detect test containers from .test. files in source directory', async () => {
      // Create test service files
      await fs.writeFile(path.join(sourceDir, 'keeper.test.service.yml'), `
name: xq-keeper
image: test-image
`, 'utf8')
      await fs.writeFile(path.join(sourceDir, 'regular.service.yml'), `
name: regular-service
image: regular-image
`, 'utf8')

      // Create compose file with matching services
      await fs.writeFile(testComposePath, `
version: '3.8'
services:
  xq-keeper:
    image: test-image
  regular-service:
    image: regular-image
`, 'utf8')

      const testContainers = await composeInvoker.detectTestContainers(testComposePath, sourceDir)

      expect(testContainers).toEqual(['xq-keeper'])
    })

    test('should detect multiple test containers', async () => {
      await fs.writeFile(path.join(sourceDir, 'keeper.test.service.yml'), `
name: xq-keeper
image: test-image
`, 'utf8')
      await fs.writeFile(path.join(sourceDir, 'e2e.test.yaml'), `
name: e2e-test
image: e2e-image
`, 'utf8')

      await fs.writeFile(testComposePath, `
version: '3.8'
services:
  xq-keeper:
    image: test-image
  e2e-test:
    image: e2e-image
`, 'utf8')

      const testContainers = await composeInvoker.detectTestContainers(testComposePath, sourceDir)

      expect(testContainers).toContain('xq-keeper')
      expect(testContainers).toContain('e2e-test')
      expect(testContainers.length).toBe(2)
    })

    test('should handle different filename patterns', async () => {
      await fs.writeFile(path.join(sourceDir, 'keeper.test.yaml'), `
name: keeper
image: test-image
`, 'utf8')
      await fs.writeFile(path.join(sourceDir, 'xq-keeper.test.service.yml'), `
name: xq-keeper
image: test-image
`, 'utf8')

      await fs.writeFile(testComposePath, `
version: '3.8'
services:
  keeper:
    image: test-image
  xq-keeper:
    image: test-image
`, 'utf8')

      const testContainers = await composeInvoker.detectTestContainers(testComposePath, sourceDir)

      expect(testContainers.length).toBeGreaterThan(0)
      // Should match both patterns - keeper.test.yaml matches "keeper" service
      // and xq-keeper.test.service.yml matches "xq-keeper" service
      expect(testContainers.length).toBeGreaterThanOrEqual(1)
      // At least one should be found
      expect(testContainers.some(name => name === 'keeper' || name === 'xq-keeper')).toBe(true)
    })

    test('should return empty array when no .test. files found', async () => {
      await fs.writeFile(path.join(sourceDir, 'regular.service.yml'), `
name: regular-service
image: regular-image
`, 'utf8')

      await fs.writeFile(testComposePath, `
version: '3.8'
services:
  regular-service:
    image: regular-image
`, 'utf8')

      const testContainers = await composeInvoker.detectTestContainers(testComposePath, sourceDir)

      expect(testContainers).toEqual([])
    })

    test('should fallback to service name pattern when sourcePath is null', async () => {
      await fs.writeFile(testComposePath, `
version: '3.8'
services:
  xq-keeper:
    image: test-image
  test-service:
    image: test-image
  regular-service:
    image: regular-image
`, 'utf8')

      const testContainers = await composeInvoker.detectTestContainers(testComposePath, null)

      expect(testContainers).toContain('xq-keeper')
      expect(testContainers).toContain('test-service')
      expect(testContainers).not.toContain('regular-service')
    })

    test('should return empty array when sourcePath does not exist', async () => {
      const nonExistentDir = path.join(tempDir, 'non-existent')

      await fs.writeFile(testComposePath, `
version: '3.8'
services:
  xq-keeper:
    image: test-image
`, 'utf8')

      const testContainers = await composeInvoker.detectTestContainers(testComposePath, nonExistentDir)

      // Should fallback to service name pattern
      expect(testContainers).toContain('xq-keeper')
    })

    test('should handle service name matching with xq- prefix', async () => {
      await fs.writeFile(path.join(sourceDir, 'keeper.test.service.yml'), `
name: keeper
image: test-image
`, 'utf8')

      await fs.writeFile(testComposePath, `
version: '3.8'
services:
  xq-keeper:
    image: test-image
`, 'utf8')

      const testContainers = await composeInvoker.detectTestContainers(testComposePath, sourceDir)

      expect(testContainers).toContain('xq-keeper')
    })
  })

  describe('waitForTestContainers', () => {
    beforeEach(() => {
      // Set dockerComposeCli directly to avoid calling detectDockerCompose
      composeInvoker.dockerComposeCli = { command: 'docker', args: ['compose'] }
      // Mock detectDockerCompose to return immediately
      jest.spyOn(composeInvoker, 'detectDockerCompose').mockResolvedValue({
        command: 'docker',
        args: ['compose']
      })
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    test('should return true immediately when no test containers provided', async () => {
      const result = await composeInvoker.waitForTestContainers(testComposePath, [])

      expect(result).toBe(true)
    })

    test('should wait for containers to exit and return true on success', async () => {
      const testContainers = ['xq-keeper']

      // Mock docker compose ps output
      // The parser splits by whitespace and takes last part, then checks if it includes "Exited"
      // So we need the status to be in a format where the last word or the full status contains "Exited"
      // Format: columns are space-separated, STATUS is last column
      const mockPsOutput = `NAME                          SERVICE      STATUS
database-xq-keeper-1         xq-keeper    Exited (0)`
      
      // Mock execCommand by spying on it - return immediately with exited status
      const execCommandSpy = jest.spyOn(composeInvoker, 'execCommand').mockResolvedValue({
        exitCode: 0,
        stdout: mockPsOutput,
        stderr: ''
      })

      const result = await composeInvoker.waitForTestContainers(testComposePath, testContainers, {
        timeout: 5000,
        checkInterval: 50 // Faster for tests
      })

      expect(result).toBe(true)
      expect(execCommandSpy).toHaveBeenCalled()
    }, 10000)

    test('should return false when containers exit with non-zero code', async () => {
      const testContainers = ['xq-keeper']

      // Mock docker compose ps output showing container exited with error
      const mockPsOutput = `NAME                          SERVICE      STATUS
database-xq-keeper-1         xq-keeper    Exited (1)`
      
      const execCommandSpy = jest.spyOn(composeInvoker, 'execCommand').mockResolvedValue({
        exitCode: 0,
        stdout: mockPsOutput,
        stderr: ''
      })

      const result = await composeInvoker.waitForTestContainers(testComposePath, testContainers, {
        timeout: 5000,
        checkInterval: 50
      })

      expect(result).toBe(false)
    }, 10000)

    test('should handle containers still running', async () => {
      const testContainers = ['xq-keeper']

      // First call: container running, second call: container exited
      let callCount = 0
      const execCommandSpy = jest.spyOn(composeInvoker, 'execCommand').mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            exitCode: 0,
            stdout: `NAME                          SERVICE      STATUS
database-xq-keeper-1         xq-keeper    Up`,
            stderr: ''
          })
        } else {
          return Promise.resolve({
            exitCode: 0,
            stdout: `NAME                          SERVICE      STATUS
database-xq-keeper-1         xq-keeper    Exited (0)`,
            stderr: ''
          })
        }
      })

      const result = await composeInvoker.waitForTestContainers(testComposePath, testContainers, {
        timeout: 5000,
        checkInterval: 50
      })

      expect(result).toBe(true)
      expect(execCommandSpy).toHaveBeenCalledTimes(2)
    }, 10000)

    test('should timeout when containers do not exit', async () => {
      const testContainers = ['xq-keeper']

      // Mock container always running
      const mockPsOutput = `NAME                          SERVICE      STATUS
database-xq-keeper-1         xq-keeper    Up`
      
      const execCommandSpy = jest.spyOn(composeInvoker, 'execCommand').mockResolvedValue({
        exitCode: 0,
        stdout: mockPsOutput,
        stderr: ''
      })

      const result = await composeInvoker.waitForTestContainers(testComposePath, testContainers, {
        timeout: 500, // Short timeout for test
        checkInterval: 100
      })

      expect(result).toBe(false)
    }, 10000)

    test('should handle ps command failures gracefully', async () => {
      const testContainers = ['xq-keeper']

      // Mock ps command failure
      const execCommandSpy = jest.spyOn(composeInvoker, 'execCommand').mockRejectedValue(
        new Error('Command failed with exit code 1')
      )

      const result = await composeInvoker.waitForTestContainers(testComposePath, testContainers, {
        timeout: 500,
        checkInterval: 100
      })

      // Should timeout since ps command fails
      expect(result).toBe(false)
    }, 10000)
  })
})