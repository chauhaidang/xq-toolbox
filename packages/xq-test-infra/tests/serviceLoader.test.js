const fs = require('fs-extra')
const path = require('path')
const os = require('os')
const YAML = require('yaml')
const serviceLoader = require('../src/services/serviceLoader')

describe('ServiceLoader', () => {
  let tempDir

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `xq-serviceloader-test-${Date.now()}`)
    await fs.ensureDir(tempDir)
  })

  afterEach(async () => {
    await fs.remove(tempDir)
  })

  describe('loadFromDirectory', () => {
    test('should load and merge multiple service files', async () => {
      // Create service files
      const postgresService = {
        image: 'postgres',
        tag: 'latest',
        environment: {
          POSTGRES_DB: 'testdb',
          POSTGRES_USER: 'testuser',
          POSTGRES_PASSWORD: 'testpass'
        },
        ports: ['5432:5432']
      }

      const apiService = {
        image: 'api-service',
        tag: 'v1.0',
        port: 3000,
        environment: {
          DB_HOST: 'postgres'
        },
        depends_on: ['postgres']
      }

      await fs.writeFile(
        path.join(tempDir, 'postgres.service.yml'),
        YAML.stringify(postgresService),
        'utf8'
      )

      await fs.writeFile(
        path.join(tempDir, 'api-service.service.yml'),
        YAML.stringify(apiService),
        'utf8'
      )

      const result = await serviceLoader.loadFromDirectory(tempDir)

      expect(result).toHaveProperty('services')
      expect(result.services).toHaveProperty('postgres')
      expect(result.services).toHaveProperty('api-service')
      expect(result.services.postgres).toEqual(postgresService)
      expect(result.services['api-service']).toEqual(apiService)
    })

    test('should support explicit service name field', async () => {
      const service = {
        name: 'my-custom-name',
        image: 'nginx',
        tag: 'latest'
      }

      await fs.writeFile(
        path.join(tempDir, 'web.service.yml'),
        YAML.stringify(service),
        'utf8'
      )

      const result = await serviceLoader.loadFromDirectory(tempDir)

      expect(result.services).toHaveProperty('my-custom-name')
      expect(result.services['my-custom-name'].image).toBe('nginx')
      expect(result.services['my-custom-name']).not.toHaveProperty('name')
    })

    test('should load services in alphabetical order', async () => {
      const serviceA = { image: 'service-a', tag: 'latest' }
      const serviceB = { image: 'service-b', tag: 'latest' }
      const serviceC = { image: 'service-c', tag: 'latest' }

      // Write in non-alphabetical order
      await fs.writeFile(
        path.join(tempDir, 'charlie.service.yml'),
        YAML.stringify(serviceC),
        'utf8'
      )
      await fs.writeFile(
        path.join(tempDir, 'alpha.service.yml'),
        YAML.stringify(serviceA),
        'utf8'
      )
      await fs.writeFile(
        path.join(tempDir, 'bravo.service.yml'),
        YAML.stringify(serviceB),
        'utf8'
      )

      const result = await serviceLoader.loadFromDirectory(tempDir)
      const serviceNames = Object.keys(result.services)

      expect(serviceNames).toEqual(['alpha', 'bravo', 'charlie'])
    })

    test('should throw error if directory does not exist', async () => {
      const nonExistentDir = path.join(tempDir, 'non-existent')

      await expect(serviceLoader.loadFromDirectory(nonExistentDir))
        .rejects.toThrow('Directory does not exist')
    })

    test('should throw error if path is not a directory', async () => {
      const filePath = path.join(tempDir, 'not-a-directory.txt')
      await fs.writeFile(filePath, 'test content', 'utf8')

      await expect(serviceLoader.loadFromDirectory(filePath))
        .rejects.toThrow('Path is not a directory')
    })

    test('should throw error if no service files found', async () => {
      // Create directory with no service files
      await fs.writeFile(path.join(tempDir, 'random.txt'), 'test', 'utf8')

      await expect(serviceLoader.loadFromDirectory(tempDir))
        .rejects.toThrow('No service files')
    })

    test('should throw error on duplicate service names', async () => {
      const service = { image: 'test', tag: 'latest' }

      await fs.writeFile(
        path.join(tempDir, 'postgres.service.yml'),
        YAML.stringify(service),
        'utf8'
      )

      await fs.writeFile(
        path.join(tempDir, 'db.service.yml'),
        YAML.stringify({ name: 'postgres', ...service }),
        'utf8'
      )

      await expect(serviceLoader.loadFromDirectory(tempDir))
        .rejects.toThrow('Duplicate service name')
    })

    test('should throw error on invalid YAML', async () => {
      await fs.writeFile(
        path.join(tempDir, 'invalid.service.yml'),
        'invalid: yaml: content: [[[',
        'utf8'
      )

      await expect(serviceLoader.loadFromDirectory(tempDir))
        .rejects.toThrow('Failed to parse service file')
    })

    test('should throw error on empty service file', async () => {
      await fs.writeFile(
        path.join(tempDir, 'empty.service.yml'),
        '',
        'utf8'
      )

      await expect(serviceLoader.loadFromDirectory(tempDir))
        .rejects.toThrow('empty or invalid')
    })
  })

  describe('scanServiceFiles', () => {
    test('should find .service.yml files', async () => {
      await fs.writeFile(path.join(tempDir, 'service1.service.yml'), 'test', 'utf8')
      await fs.writeFile(path.join(tempDir, 'service2.service.yml'), 'test', 'utf8')
      await fs.writeFile(path.join(tempDir, 'not-a-service.yml'), 'test', 'utf8')

      const files = await serviceLoader.scanServiceFiles(tempDir)

      expect(files).toHaveLength(2)
      expect(files).toContain('service1.service.yml')
      expect(files).toContain('service2.service.yml')
      expect(files).not.toContain('not-a-service.yml')
    })

    test('should find .service.yaml files', async () => {
      await fs.writeFile(path.join(tempDir, 'service1.service.yaml'), 'test', 'utf8')
      await fs.writeFile(path.join(tempDir, 'service2.service.yaml'), 'test', 'utf8')

      const files = await serviceLoader.scanServiceFiles(tempDir)

      expect(files).toHaveLength(2)
      expect(files).toContain('service1.service.yaml')
      expect(files).toContain('service2.service.yaml')
    })

    test('should return sorted file list', async () => {
      await fs.writeFile(path.join(tempDir, 'zebra.service.yml'), 'test', 'utf8')
      await fs.writeFile(path.join(tempDir, 'alpha.service.yml'), 'test', 'utf8')
      await fs.writeFile(path.join(tempDir, 'mike.service.yml'), 'test', 'utf8')

      const files = await serviceLoader.scanServiceFiles(tempDir)

      expect(files).toEqual(['alpha.service.yml', 'mike.service.yml', 'zebra.service.yml'])
    })
  })

  describe('loadGlobalConfig', () => {
    test('should load xq.config.yml if exists', async () => {
      const config = {
        portRange: { start: 3001 },
        dependencies: {
          database: ['postgres']
        }
      }

      await fs.writeFile(
        path.join(tempDir, 'xq.config.yml'),
        YAML.stringify(config),
        'utf8'
      )

      const result = await serviceLoader.loadGlobalConfig(tempDir)

      expect(result).toEqual(config)
    })

    test('should load xq.config.yaml if exists', async () => {
      const config = {
        portRange: { start: 4000 }
      }

      await fs.writeFile(
        path.join(tempDir, 'xq.config.yaml'),
        YAML.stringify(config),
        'utf8'
      )

      const result = await serviceLoader.loadGlobalConfig(tempDir)

      expect(result).toEqual(config)
    })

    test('should return empty object if no config exists', async () => {
      const result = await serviceLoader.loadGlobalConfig(tempDir)

      expect(result).toEqual({})
    })

    test('should throw error on invalid config YAML', async () => {
      await fs.writeFile(
        path.join(tempDir, 'xq.config.yml'),
        'invalid: yaml: [[[',
        'utf8'
      )

      await expect(serviceLoader.loadGlobalConfig(tempDir))
        .rejects.toThrow('Failed to parse global config')
    })
  })

  describe('mergeServiceFiles', () => {
    test('should merge services with global config', async () => {
      const globalConfig = {
        portRange: { start: 5000 },
        dependencies: {
          database: ['postgres']
        }
      }

      const service = { image: 'test', tag: 'latest' }
      await fs.writeFile(
        path.join(tempDir, 'test.service.yml'),
        YAML.stringify(service),
        'utf8'
      )

      const result = await serviceLoader.mergeServiceFiles(
        tempDir,
        ['test.service.yml'],
        globalConfig
      )

      expect(result.portRange).toEqual({ start: 5000 })
      expect(result.dependencies).toEqual({ database: ['postgres'] })
      expect(result.services.test).toEqual(service)
    })

    test('should work without global config', async () => {
      const service = { image: 'test', tag: 'latest' }
      await fs.writeFile(
        path.join(tempDir, 'test.service.yml'),
        YAML.stringify(service),
        'utf8'
      )

      const result = await serviceLoader.mergeServiceFiles(
        tempDir,
        ['test.service.yml'],
        {}
      )

      expect(result.portRange).toBeUndefined()
      expect(result.dependencies).toBeUndefined()
      expect(result.services.test).toEqual(service)
    })
  })

  describe('deriveServiceName', () => {
    test('should derive name from .service.yml', () => {
      const name = serviceLoader.deriveServiceName('postgres.service.yml')
      expect(name).toBe('postgres')
    })

    test('should derive name from .service.yaml', () => {
      const name = serviceLoader.deriveServiceName('api-service.service.yaml')
      expect(name).toBe('api-service')
    })

    test('should handle complex filenames', () => {
      const name = serviceLoader.deriveServiceName('my-complex-service-name.service.yml')
      expect(name).toBe('my-complex-service-name')
    })
  })

  describe('validateDependencies', () => {
    test('should validate correct dependencies', async () => {
      const spec = {
        services: {
          postgres: {
            image: 'postgres',
            tag: 'latest'
          },
          api: {
            image: 'api',
            tag: 'latest',
            depends_on: ['postgres']
          }
        }
      }

      // Should not throw
      expect(() => serviceLoader.validateDependencies(spec)).not.toThrow()
    })

    test('should detect missing dependencies', async () => {
      const spec = {
        services: {
          api: {
            image: 'api',
            tag: 'latest',
            depends_on: ['non-existent-service']
          }
        }
      }

      expect(() => serviceLoader.validateDependencies(spec))
        .toThrow('depends on non-existent service')
    })

    test('should detect circular dependencies', async () => {
      const spec = {
        services: {
          serviceA: {
            image: 'a',
            tag: 'latest',
            depends_on: ['serviceB']
          },
          serviceB: {
            image: 'b',
            tag: 'latest',
            depends_on: ['serviceA']
          }
        }
      }

      expect(() => serviceLoader.validateDependencies(spec))
        .toThrow('Circular dependency')
    })

    test('should detect complex circular dependencies', async () => {
      const spec = {
        services: {
          serviceA: {
            image: 'a',
            tag: 'latest',
            depends_on: ['serviceB']
          },
          serviceB: {
            image: 'b',
            tag: 'latest',
            depends_on: ['serviceC']
          },
          serviceC: {
            image: 'c',
            tag: 'latest',
            depends_on: ['serviceA']
          }
        }
      }

      expect(() => serviceLoader.validateDependencies(spec))
        .toThrow('Circular dependency')
    })

    test('should handle services without dependencies', async () => {
      const spec = {
        services: {
          serviceA: {
            image: 'a',
            tag: 'latest'
          },
          serviceB: {
            image: 'b',
            tag: 'latest'
          }
        }
      }

      expect(() => serviceLoader.validateDependencies(spec)).not.toThrow()
    })
  })

  describe('route parsing', () => {
    test('should preserve routes field in service config', async () => {
      const serviceWithRoutes = {
        image: 'api-service',
        tag: 'latest',
        port: 3000,
        routes: [
          {
            methods: ['GET'],
            paths: ['/api/users', '/api/users/*']
          },
          {
            methods: ['POST', 'PUT', 'DELETE'],
            paths: ['/api/users']
          }
        ]
      }

      await fs.writeFile(
        path.join(tempDir, 'api.service.yml'),
        YAML.stringify(serviceWithRoutes),
        'utf8'
      )

      const result = await serviceLoader.loadFromDirectory(tempDir)

      expect(result.services.api).toHaveProperty('routes')
      expect(result.services.api.routes).toHaveLength(2)
      expect(result.services.api.routes[0].methods).toEqual(['GET'])
      expect(result.services.api.routes[0].paths).toContain('/api/users')
    })

    test('should handle services with and without routes', async () => {
      const serviceWithRoutes = {
        image: 'api-service',
        tag: 'latest',
        port: 3000,
        routes: [
          {
            methods: ['GET'],
            paths: ['/api/data']
          }
        ]
      }

      const serviceWithoutRoutes = {
        image: 'database',
        tag: 'latest',
        ports: ['5432:5432']
      }

      await fs.writeFile(
        path.join(tempDir, 'api.service.yml'),
        YAML.stringify(serviceWithRoutes),
        'utf8'
      )

      await fs.writeFile(
        path.join(tempDir, 'db.service.yml'),
        YAML.stringify(serviceWithoutRoutes),
        'utf8'
      )

      const result = await serviceLoader.loadFromDirectory(tempDir)

      expect(result.services.api).toHaveProperty('routes')
      expect(result.services.db).not.toHaveProperty('routes')
    })

    test('should preserve complex route configurations', async () => {
      const complexRoutes = {
        image: 'complex-service',
        tag: 'latest',
        port: 3000,
        routes: [
          {
            methods: ['GET', 'POST'],
            paths: ['/api/v1/todos', '/api/v1/todos/*', '/health']
          },
          {
            methods: ['PUT', 'DELETE'],
            paths: ['/api/v1/todos/*']
          }
        ]
      }

      await fs.writeFile(
        path.join(tempDir, 'complex.service.yml'),
        YAML.stringify(complexRoutes),
        'utf8'
      )

      const result = await serviceLoader.loadFromDirectory(tempDir)

      expect(result.services.complex.routes).toHaveLength(2)
      expect(result.services.complex.routes[0].paths).toContain('/health')
      expect(result.services.complex.routes[1].methods).toEqual(['PUT', 'DELETE'])
    })
  })

  describe('integration scenarios', () => {
    test('should handle complete todo-app scenario', async () => {
      // Create global config
      const globalConfig = {
        portRange: { start: 3001 },
        dependencies: {
          database: ['postgres']
        }
      }

      await fs.writeFile(
        path.join(tempDir, 'xq.config.yml'),
        YAML.stringify(globalConfig),
        'utf8'
      )

      // Create postgres service
      const postgresService = {
        image: 'postgres',
        tag: 'latest',
        environment: {
          POSTGRES_DB: 'todoapp',
          POSTGRES_USER: 'todouser',
          POSTGRES_PASSWORD: 'todopass'
        },
        ports: ['5432:5432']
      }

      await fs.writeFile(
        path.join(tempDir, 'postgres.service.yml'),
        YAML.stringify(postgresService),
        'utf8'
      )

      // Create read service
      const readService = {
        image: 'todo-read-service',
        tag: 'latest',
        port: 3000,
        environment: {
          DB_HOST: 'postgres',
          PORT: 3000
        },
        dependencyGroups: ['database']
      }

      await fs.writeFile(
        path.join(tempDir, 'todo-read-service.service.yml'),
        YAML.stringify(readService),
        'utf8'
      )

      // Create write service
      const writeService = {
        image: 'todo-write-service',
        tag: 'latest',
        port: 3000,
        environment: {
          DB_HOST: 'postgres',
          PORT: 3000
        },
        dependencyGroups: ['database']
      }

      await fs.writeFile(
        path.join(tempDir, 'todo-write-service.service.yml'),
        YAML.stringify(writeService),
        'utf8'
      )

      const result = await serviceLoader.loadFromDirectory(tempDir)

      expect(result.services).toHaveProperty('postgres')
      expect(result.services).toHaveProperty('todo-read-service')
      expect(result.services).toHaveProperty('todo-write-service')
      expect(result.portRange).toEqual({ start: 3001 })
      expect(result.dependencies).toEqual({ database: ['postgres'] })
    })
  })
})