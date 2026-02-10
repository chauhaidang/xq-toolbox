const fs = require('fs-extra')
const path = require('path')
const os = require('os')
const YAML = require('yaml')
const composeGenerator = require('../src/services/composeGenerator')

describe('ComposeGenerator', () => {
  let tempDir
  let testSpecPath
  let testSpec

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `xq-test-${Date.now()}`)
    await fs.ensureDir(tempDir)

    testSpecPath = path.join(tempDir, 'xq.yaml')
    testSpec = {
      services: {
        'web-app': {
          image: 'nginx',
          tag: '1.21',
          ports: ['8080:80'],
          environment: {
            NODE_ENV: 'test'
          }
        },
        'api-service': {
          image: 'node',
          tag: '18-alpine',
          ports: ['3000:3000']
        }
      }
    }

    await fs.writeFile(testSpecPath, YAML.stringify(testSpec), 'utf8')
  })

  afterEach(async () => {
    await fs.remove(tempDir)
    composeGenerator.cleanupTempFiles()
  })

  describe('generateCompose', () => {
    test('should generate valid docker-compose from XQ spec', async () => {
      const composePath = await composeGenerator.generateCompose(testSpecPath)

      expect(composePath).toBe(path.join(process.cwd(), 'xq-compose.yml'))
      expect(await fs.pathExists(composePath)).toBe(true)

      const composeContent = await fs.readFile(composePath, 'utf8')
      const compose = YAML.parse(composeContent)

      expect(compose.version).toBe('3.8')
      expect(compose.services).toHaveProperty('web-app')
      expect(compose.services).toHaveProperty('api-service')
      expect(compose.services).toHaveProperty('xq-gateway')
      expect(compose.networks).toHaveProperty('xq-network')
    })

    test('should apply service configurations correctly', async () => {
      const composePath = await composeGenerator.generateCompose(testSpecPath)
      const composeContent = await fs.readFile(composePath, 'utf8')
      const compose = YAML.parse(composeContent)

      const webApp = compose.services['web-app']
      expect(webApp.image).toBe('nginx:1.21')
      expect(webApp.ports).toEqual(['8080:80'])
      expect(webApp.environment).toEqual({ NODE_ENV: 'test' })
      expect(webApp.networks).toEqual(['xq-network'])

      const apiService = compose.services['api-service']
      expect(apiService.image).toBe('node:18-alpine')
      expect(apiService.ports).toEqual(['3000:3000'])
    })

    test('should add gateway service by default', async () => {
      const composePath = await composeGenerator.generateCompose(testSpecPath)
      const composeContent = await fs.readFile(composePath, 'utf8')
      const compose = YAML.parse(composeContent)

      const gateway = compose.services['xq-gateway']
      expect(gateway.image).toBe('nginx:alpine')
      // Gateway port should be 8081 (8080 is used by web-app)
      expect(gateway.ports).toEqual(['8081:80'])
      expect(gateway.networks).toEqual(['xq-network'])
      expect(gateway.depends_on).toHaveProperty('web-app')
      expect(gateway.depends_on).toHaveProperty('api-service')
      expect(gateway.depends_on['web-app']).toEqual({ condition: 'service_started' })
      expect(gateway.depends_on['api-service']).toEqual({ condition: 'service_started' })
    })

    test('should skip gateway when disabled', async () => {
      const composePath = await composeGenerator.generateCompose(testSpecPath, { gateway: false })
      const composeContent = await fs.readFile(composePath, 'utf8')
      const compose = YAML.parse(composeContent)

      expect(compose.services).not.toHaveProperty('xq-gateway')
    })

    test('should apply overrides correctly', async () => {
      const overrides = {
        services: {
          'web-app': {
            tag: '1.22',
            environment: {
              NODE_ENV: 'production'
            }
          }
        }
      }

      const composePath = await composeGenerator.generateCompose(testSpecPath, { overrides })
      const composeContent = await fs.readFile(composePath, 'utf8')
      const compose = YAML.parse(composeContent)

      const webApp = compose.services['web-app']
      expect(webApp.image).toBe('nginx:1.22')
      expect(webApp.environment).toEqual({ NODE_ENV: 'production' })
    })

    test('should write to default output path', async () => {
      const composePath = await composeGenerator.generateCompose(testSpecPath)
      const expectedPath = path.join(process.cwd(), 'xq-compose.yml')

      expect(composePath).toBe(expectedPath)
      expect(await fs.pathExists(expectedPath)).toBe(true)
    })

    test('should handle keepFile option', async () => {
      const composePath = await composeGenerator.generateCompose(testSpecPath, { keepFile: true })

      expect(await fs.pathExists(composePath)).toBe(true)

      // File should not be in cleanup list
      composeGenerator.cleanupTempFiles()
      expect(await fs.pathExists(composePath)).toBe(true)
    })

    test('should generate compose from directory with multiple services', async () => {
      const servicesDir = path.join(tempDir, 'multi-services')
      await fs.ensureDir(servicesDir)

      // Create service files
      const postgresSpec = {
        name: 'postgres',
        image: 'postgres',
        tag: 'latest',
        environment: {
          POSTGRES_DB: 'testdb',
          POSTGRES_USER: 'testuser',
          POSTGRES_PASSWORD: 'testpass'
        },
        ports: ['5432:5432']
      }

      const apiSpec = {
        name: 'api-service',
        image: 'node',
        tag: '18-alpine',
        port: 3000,
        environment: {
          DB_HOST: 'postgres'
        },
        depends_on: ['postgres']
      }

      await fs.writeFile(
        path.join(servicesDir, 'postgres.service.yml'),
        YAML.stringify(postgresSpec),
        'utf8'
      )
      await fs.writeFile(
        path.join(servicesDir, 'api.service.yml'),
        YAML.stringify(apiSpec),
        'utf8'
      )

      // Generate compose from directory
      const composePath = await composeGenerator.generateCompose(servicesDir)

      expect(composePath).toBe(path.join(process.cwd(), 'xq-compose.yml'))
      expect(await fs.pathExists(composePath)).toBe(true)

      const composeContent = await fs.readFile(composePath, 'utf8')
      const compose = YAML.parse(composeContent)

      expect(compose.version).toBe('3.8')
      expect(compose.services).toHaveProperty('postgres')
      expect(compose.services).toHaveProperty('api-service')
      expect(compose.services).toHaveProperty('xq-gateway')
      expect(compose.networks).toHaveProperty('xq-network')

      // Verify service configurations
      expect(compose.services['postgres'].image).toBe('postgres:latest')
      expect(compose.services['api-service'].image).toBe('node:18-alpine')
      expect(compose.services['api-service'].depends_on).toContain('postgres')
    })

    test('should generate compose from directory with global config', async () => {
      const servicesDir = path.join(tempDir, 'services-with-global-config')
      await fs.ensureDir(servicesDir)

      // Create service file
      const apiSpec = {
        name: 'api-service',
        image: 'node',
        tag: '18-alpine',
        port: 3000,
        dependencyGroups: ['database']
      }

      await fs.writeFile(
        path.join(servicesDir, 'api.service.yml'),
        YAML.stringify(apiSpec),
        'utf8'
      )

      const dbSpec = {
        name: 'postgres',
        image: 'postgres',
        tag: 'latest',
        ports: ['5432:5432']
      }

      await fs.writeFile(
        path.join(servicesDir, 'postgres.service.yml'),
        YAML.stringify(dbSpec),
        'utf8'
      )

      // Create global config with dependencies
      const globalConfig = {
        portRange: {
          start: 4000
        },
        dependencies: {
          database: ['postgres']
        }
      }

      await fs.writeFile(
        path.join(servicesDir, 'xq.config.yml'),
        YAML.stringify(globalConfig),
        'utf8'
      )

      // Generate compose from directory
      const composePath = await composeGenerator.generateCompose(servicesDir)

      const composeContent = await fs.readFile(composePath, 'utf8')
      const compose = YAML.parse(composeContent)

      // Verify api-service has postgres dependency through centralized deps
      expect(compose.services['api-service'].depends_on).toContain('postgres')

      // Verify port assignment starts from global config
      expect(compose.services['api-service'].ports[0]).toBe('4000:3000')
    })
  })

  describe('readXQSpec', () => {
    test('should read and parse valid YAML spec from file', async () => {
      const spec = await composeGenerator.readXQSpec(testSpecPath)
      expect(spec).toEqual(testSpec)
    })

    test('should read and parse spec from directory', async () => {
      const servicesDir = path.join(tempDir, 'services')
      await fs.ensureDir(servicesDir)

      // Create service files
      const webServiceSpec = {
        name: 'web-app',
        image: 'nginx',
        tag: '1.21',
        ports: ['8080:80'],
        environment: {
          NODE_ENV: 'test'
        }
      }

      const apiServiceSpec = {
        name: 'api-service',
        image: 'node',
        tag: '18-alpine',
        ports: ['3000:3000']
      }

      await fs.writeFile(
        path.join(servicesDir, 'web-app.service.yml'),
        YAML.stringify(webServiceSpec),
        'utf8'
      )
      await fs.writeFile(
        path.join(servicesDir, 'api-service.service.yml'),
        YAML.stringify(apiServiceSpec),
        'utf8'
      )

      const spec = await composeGenerator.readXQSpec(servicesDir)

      expect(spec.services).toHaveProperty('web-app')
      expect(spec.services).toHaveProperty('api-service')
      expect(spec.services['web-app'].image).toBe('nginx')
      expect(spec.services['api-service'].image).toBe('node')
    })

    test('should read directory with global config', async () => {
      const servicesDir = path.join(tempDir, 'services-with-config')
      await fs.ensureDir(servicesDir)

      // Create service file
      const apiServiceSpec = {
        name: 'api-service',
        image: 'node',
        tag: '18-alpine',
        port: 3000
      }

      await fs.writeFile(
        path.join(servicesDir, 'api-service.service.yml'),
        YAML.stringify(apiServiceSpec),
        'utf8'
      )

      // Create global config
      const globalConfig = {
        portRange: {
          start: 3001
        },
        dependencies: {
          database: ['postgres']
        }
      }

      await fs.writeFile(
        path.join(servicesDir, 'xq.config.yml'),
        YAML.stringify(globalConfig),
        'utf8'
      )

      const spec = await composeGenerator.readXQSpec(servicesDir)

      expect(spec.services).toHaveProperty('api-service')
      expect(spec.portRange).toEqual({ start: 3001 })
      expect(spec.dependencies).toEqual({ database: ['postgres'] })
    })

    test('should throw error for non-existent path', async () => {
      const nonExistentPath = path.join(tempDir, 'non-existent')
      await expect(composeGenerator.readXQSpec(nonExistentPath))
        .rejects.toThrow('Failed to read XQ spec')
    })

    test('should throw error for invalid YAML', async () => {
      const invalidYamlPath = path.join(tempDir, 'invalid.yaml')
      await fs.writeFile(invalidYamlPath, 'invalid: yaml: content:', 'utf8')

      await expect(composeGenerator.readXQSpec(invalidYamlPath))
        .rejects.toThrow('Failed to read XQ spec')
    })
  })

  describe('applyOverrides', () => {
    test('should merge overrides with spec', () => {
      const overrides = {
        services: {
          'web-app': {
            tag: 'latest',
            volumes: ['/data:/data']
          }
        }
      }

      const result = composeGenerator.applyOverrides(testSpec, overrides)

      expect(result.services['web-app'].tag).toBe('latest')
      expect(result.services['web-app'].volumes).toEqual(['/data:/data'])
      expect(result.services['web-app'].image).toBe('nginx') // Original preserved
    })

    test('should handle empty overrides', () => {
      const result = composeGenerator.applyOverrides(testSpec, {})
      expect(result).toEqual(testSpec)
    })
  })

  describe('convertServiceToCompose', () => {
    test('should convert service with all options', () => {
      const service = {
        image: 'redis',
        tag: '7-alpine',
        ports: ['6379:6379'],
        environment: { REDIS_PASSWORD: 'secret' },
        volumes: ['/data:/data'],
        command: ['redis-server', '--appendonly', 'yes'],
        depends_on: ['web-app']
      }

      const result = composeGenerator.convertServiceToCompose(service)

      expect(result).toEqual({
        image: 'redis:7-alpine',
        networks: ['xq-network'],
        ports: ['6379:6379'],
        environment: { REDIS_PASSWORD: 'secret' },
        volumes: ['/data:/data'],
        command: ['redis-server', '--appendonly', 'yes'],
        depends_on: ['web-app']
      })
    })

    test('should handle service with minimal config', () => {
      const service = {
        image: 'postgres'
      }

      const result = composeGenerator.convertServiceToCompose(service)

      expect(result).toEqual({
        image: 'postgres:latest',
        networks: ['xq-network']
      })
    })
  })

  describe('cleanup', () => {
    test('should clean up temp files when keepFile is false', async () => {
      const composePath = await composeGenerator.generateCompose(testSpecPath, { keepFile: false })
      expect(await fs.pathExists(composePath)).toBe(true)

      composeGenerator.cleanupTempFiles()
      expect(await fs.pathExists(composePath)).toBe(false)
    })
  })
})