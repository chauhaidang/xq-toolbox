const fs = require('fs-extra')
const path = require('path')
const os = require('os')
const gateway = require('../src/services/gateway')

describe('Gateway', () => {
  let tempDir

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `xq-gateway-test-${Date.now()}`)
    await fs.ensureDir(tempDir)
  })

  afterEach(async () => {
    await fs.remove(tempDir)
  })

  describe('parseRoutes', () => {
    test('should parse routes from service configuration', () => {
      const servicesMap = {
        'api-service': {
          ports: ['3001:3000'],
          routes: [
            {
              methods: ['GET'],
              paths: ['/api/users', '/api/users/*']
            }
          ]
        }
      }

      const routes = gateway.parseRoutes(servicesMap)

      expect(routes).toHaveLength(1)
      expect(routes[0].serviceName).toBe('api-service')
      expect(routes[0].port).toBe(3000)
      expect(routes[0].methods).toEqual(['GET'])
      expect(routes[0].paths).toEqual(['/api/users', '/api/users/*'])
    })

    test('should handle multiple routes for same service', () => {
      const servicesMap = {
        'api-service': {
          ports: ['3001:3000'],
          routes: [
            {
              methods: ['GET'],
              paths: ['/api/users']
            },
            {
              methods: ['POST', 'PUT'],
              paths: ['/api/users', '/api/users/*']
            }
          ]
        }
      }

      const routes = gateway.parseRoutes(servicesMap)

      expect(routes).toHaveLength(2)
      expect(routes[0].methods).toEqual(['GET'])
      expect(routes[1].methods).toEqual(['POST', 'PUT'])
    })

    test('should use default methods when not specified', () => {
      const servicesMap = {
        'api-service': {
          ports: ['3001:3000'],
          routes: [
            {
              paths: ['/api/data']
            }
          ]
        }
      }

      const routes = gateway.parseRoutes(servicesMap)

      expect(routes[0].methods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
    })

    test('should skip services without routes', () => {
      const servicesMap = {
        'api-service': {
          ports: ['3001:3000'],
          routes: [
            {
              methods: ['GET'],
              paths: ['/api/users']
            }
          ]
        },
        'database': {
          ports: ['5432:5432']
        }
      }

      const routes = gateway.parseRoutes(servicesMap)

      expect(routes).toHaveLength(1)
      expect(routes[0].serviceName).toBe('api-service')
    })

    test('should skip xq-gateway service', () => {
      const servicesMap = {
        'api-service': {
          ports: ['3001:3000'],
          routes: [
            {
              methods: ['GET'],
              paths: ['/api/users']
            }
          ]
        },
        'xq-gateway': {
          ports: ['8080:80']
        }
      }

      const routes = gateway.parseRoutes(servicesMap)

      expect(routes).toHaveLength(1)
      expect(routes[0].serviceName).toBe('api-service')
    })

    test('should handle empty routes array', () => {
      const servicesMap = {
        'api-service': {
          ports: ['3001:3000'],
          routes: []
        }
      }

      const routes = gateway.parseRoutes(servicesMap)

      expect(routes).toHaveLength(0)
    })
  })

  describe('convertToNginxPath', () => {
    test('should convert exact path to regex pattern', () => {
      const result = gateway.convertToNginxPath('/api/users')
      expect(result).toBe('~ ^\\/api\\/users(\\/|$)')
    })

    test('should convert wildcard path to regex pattern', () => {
      const result = gateway.convertToNginxPath('/api/users/*')
      expect(result).toBe('~ ^\\/api\\/users(\\/.*)?$')
    })

    test('should handle root path', () => {
      const result = gateway.convertToNginxPath('/health')
      expect(result).toBe('~ ^\\/health(\\/|$)')
    })

    test('should handle nested paths', () => {
      const result = gateway.convertToNginxPath('/api/v1/todos')
      expect(result).toBe('~ ^\\/api\\/v1\\/todos(\\/|$)')
    })

    test('should handle nested wildcard paths', () => {
      const result = gateway.convertToNginxPath('/api/v1/todos/*')
      expect(result).toBe('~ ^\\/api\\/v1\\/todos(\\/.*)?$')
    })
  })

  describe('generatePathBasedLocations', () => {
    test('should generate simple location block for single service', () => {
      const routes = [
        {
          serviceName: 'api-service',
          port: 3000,
          methods: ['GET'],
          paths: ['/api/users']
        }
      ]

      const result = gateway.generatePathBasedLocations(routes)

      expect(result).toContain('location ~ ^\\/api\\/users(\\/|$)')
      expect(result).toContain('proxy_pass http://api-service_upstream;')
      expect(result).toContain('proxy_set_header Host $host;')
    })

    test('should generate method-based routing for multiple methods', () => {
      const routes = [
        {
          serviceName: 'read-service',
          port: 3000,
          methods: ['GET'],
          paths: ['/api/todos']
        },
        {
          serviceName: 'write-service',
          port: 3000,
          methods: ['POST', 'PUT', 'DELETE'],
          paths: ['/api/todos']
        }
      ]

      const result = gateway.generatePathBasedLocations(routes)

      expect(result).toContain('location ~ ^\\/api\\/todos(\\/|$)')
      expect(result).toContain('if ($request_method = GET)')
      expect(result).toContain('proxy_pass http://read-service_upstream;')
      expect(result).toContain('if ($request_method = POST)')
      expect(result).toContain('proxy_pass http://write-service_upstream;')
    })

    test('should handle multiple paths', () => {
      const routes = [
        {
          serviceName: 'api-service',
          port: 3000,
          methods: ['GET'],
          paths: ['/api/users', '/api/todos']
        }
      ]

      const result = gateway.generatePathBasedLocations(routes)

      expect(result).toContain('location ~ ^\\/api\\/users(\\/|$)')
      expect(result).toContain('location ~ ^\\/api\\/todos(\\/|$)')
    })

    test('should return empty string for empty routes', () => {
      const result = gateway.generatePathBasedLocations([])

      expect(result).toBe('')
    })
  })

  describe('generateServiceNameLocations', () => {
    test('should generate location blocks for service names', () => {
      const servicesMap = {
        'api-service': {
          ports: ['3001:3000']
        },
        'web-service': {
          ports: ['8080:80']
        }
      }

      const result = gateway.generateServiceNameLocations(servicesMap)

      expect(result).toContain('location /api-service/')
      expect(result).toContain('proxy_pass http://api-service_upstream/;')
      expect(result).toContain('location /web-service/')
      expect(result).toContain('proxy_pass http://web-service_upstream/;')
    })

    test('should skip xq-gateway service', () => {
      const servicesMap = {
        'api-service': {
          ports: ['3001:3000']
        },
        'xq-gateway': {
          ports: ['8080:80']
        }
      }

      const result = gateway.generateServiceNameLocations(servicesMap)

      expect(result).toContain('location /api-service/')
      expect(result).not.toContain('location /xq-gateway/')
    })

    test('should include standard proxy headers', () => {
      const servicesMap = {
        'api-service': {
          ports: ['3001:3000']
        }
      }

      const result = gateway.generateServiceNameLocations(servicesMap)

      expect(result).toContain('proxy_set_header Host $host;')
      expect(result).toContain('proxy_set_header X-Real-IP $remote_addr;')
      expect(result).toContain('proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;')
      expect(result).toContain('proxy_set_header X-Forwarded-Proto $scheme;')
    })
  })

  describe('generateNginxConfig', () => {
    test('should generate nginx config without routes (backward compatible)', async () => {
      const servicesMap = {
        'api-service': {
          ports: ['3001:3000']
        },
        'database': {
          ports: ['5432:5432']
        }
      }

      const configPath = path.join(tempDir, 'nginx.conf')
      await gateway.generateNginxConfig(servicesMap, configPath)

      const config = await fs.readFile(configPath, 'utf8')

      expect(config).toContain('upstream api-service_upstream')
      expect(config).toContain('server api-service:3000;')
      expect(config).toContain('upstream database_upstream')
      expect(config).toContain('server database:5432;')
      expect(config).toContain('location /api-service/')
      expect(config).toContain('location /database/')
    })

    test('should generate nginx config with route-based routing', async () => {
      const servicesMap = {
        'read-service': {
          ports: ['3001:3000'],
          routes: [
            {
              methods: ['GET'],
              paths: ['/api/todos', '/api/todos/*']
            }
          ]
        },
        'write-service': {
          ports: ['3002:3000'],
          routes: [
            {
              methods: ['POST', 'PUT', 'DELETE'],
              paths: ['/api/todos', '/api/todos/*']
            }
          ]
        }
      }

      const configPath = path.join(tempDir, 'nginx.conf')
      await gateway.generateNginxConfig(servicesMap, configPath)

      const config = await fs.readFile(configPath, 'utf8')

      // Check upstreams
      expect(config).toContain('upstream read-service_upstream')
      expect(config).toContain('upstream write-service_upstream')

      // Check path-based routing
      expect(config).toContain('location ~ ^\\/api\\/todos(\\/|$)')
      expect(config).toContain('if ($request_method = GET)')
      expect(config).toContain('proxy_pass http://read-service_upstream;')

      // Check backward compatible service-name routing still exists
      expect(config).toContain('location /read-service/')
      expect(config).toContain('location /write-service/')
    })

    test('should generate mixed config with routes and non-routes services', async () => {
      const servicesMap = {
        'api-service': {
          ports: ['3001:3000'],
          routes: [
            {
              methods: ['GET'],
              paths: ['/api/data']
            }
          ]
        },
        'database': {
          ports: ['5432:5432']
        }
      }

      const configPath = path.join(tempDir, 'nginx.conf')
      await gateway.generateNginxConfig(servicesMap, configPath)

      const config = await fs.readFile(configPath, 'utf8')

      // Check route-based routing for api-service
      expect(config).toContain('location ~ ^\\/api\\/data(\\/|$)')
      expect(config).toContain('proxy_pass http://api-service_upstream;')

      // Check service-name routing for all services (backward compatible)
      expect(config).toContain('location /api-service/')
      expect(config).toContain('location /database/')
    })

    test('should include standard nginx configuration', async () => {
      const servicesMap = {
        'api-service': {
          ports: ['3001:3000']
        }
      }

      const configPath = path.join(tempDir, 'nginx.conf')
      await gateway.generateNginxConfig(servicesMap, configPath)

      const config = await fs.readFile(configPath, 'utf8')

      expect(config).toContain('worker_processes 1;')
      expect(config).toContain('events { worker_connections 1024; }')
      expect(config).toContain('http {')
      expect(config).toContain('server {')
      expect(config).toContain('listen 80;')
    })

    test('should handle complex todo-app scenario with intelligent routing', async () => {
      const servicesMap = {
        'todo-read-service': {
          ports: ['3002:3000'],
          routes: [
            {
              methods: ['GET'],
              paths: ['/api/todos', '/api/todos/*', '/health']
            }
          ]
        },
        'todo-write-service': {
          ports: ['3003:3000'],
          routes: [
            {
              methods: ['POST', 'PUT', 'DELETE'],
              paths: ['/api/todos', '/api/todos/*']
            }
          ]
        },
        'postgres': {
          ports: ['5432:5432']
        }
      }

      const configPath = path.join(tempDir, 'nginx.conf')
      await gateway.generateNginxConfig(servicesMap, configPath)

      const config = await fs.readFile(configPath, 'utf8')

      // Check upstreams
      expect(config).toContain('upstream todo-read-service_upstream')
      expect(config).toContain('upstream todo-write-service_upstream')
      expect(config).toContain('upstream postgres_upstream')

      // Check intelligent routing
      expect(config).toContain('location ~ ^\\/api\\/todos(\\/|$)')
      expect(config).toContain('if ($request_method = GET)')
      expect(config).toContain('proxy_pass http://todo-read-service_upstream;')
      expect(config).toContain('if ($request_method = POST)')
      expect(config).toContain('proxy_pass http://todo-write-service_upstream;')

      // Check health endpoint
      expect(config).toContain('location ~ ^\\/health(\\/|$)')

      // Check backward compatible routing
      expect(config).toContain('location /todo-read-service/')
      expect(config).toContain('location /todo-write-service/')
      expect(config).toContain('location /postgres/')
    })
  })
})
