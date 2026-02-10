const fs = require('fs-extra')
const path = require('path')
const os = require('os')
const { v4: uuidv4 } = require('uuid')
const YAML = require('yaml')
const gateway = require('./gateway')
const serviceLoader = require('./serviceLoader')

class ComposeGenerator {
  constructor() {
    this.tempFiles = new Set()
    this.setupCleanup()
  }

  setupCleanup() {
    // Avoid multiple listeners in tests
    if (!this.listenersSetup) {
      process.setMaxListeners(20) // Increase limit for tests
      process.on('exit', () => this.cleanupTempFiles())
      process.on('SIGINT', () => this.cleanupTempFiles())
      process.on('SIGTERM', () => this.cleanupTempFiles())
      this.listenersSetup = true
    }
  }

  async generateCompose(specPath, options = {}) {
    const {
      gateway: enableGateway = true,
      keepFile = true,
      overrides = {}
    } = options

    // Read and parse XQ spec
    const spec = await this.readXQSpec(specPath)

    // Apply overrides
    const mergedSpec = this.applyOverrides(spec, overrides)

    // Generate compose object
    const compose = await this.generateComposeObject(mergedSpec, enableGateway, keepFile)

    // Always output to xq-compose.yml in current directory
    const finalOutputPath = path.join(process.cwd(), 'xq-compose.yml')

    // Write compose file
    await fs.outputFile(finalOutputPath, YAML.stringify(compose), 'utf8')

    // Track temp file for cleanup only if not keeping files
    if (!keepFile) {
      this.tempFiles.add(finalOutputPath)
    }

    return finalOutputPath
  }

  async readXQSpec(specPath) {
    try {
      // Check if path exists
      const pathExists = await fs.pathExists(specPath)
      if (!pathExists) {
        throw new Error(`Path does not exist: ${specPath}`)
      }

      // Determine if path is a file or directory
      const stat = await fs.stat(specPath)

      if (stat.isDirectory()) {
        // Load from directory using serviceLoader
        return await serviceLoader.loadFromDirectory(specPath)
      } else if (stat.isFile()) {
        // Load from single file (backward compatible)
        const content = await fs.readFile(specPath, 'utf8')
        return YAML.parse(content)
      } else {
        throw new Error(`Invalid path type: ${specPath} (must be a file or directory)`)
      }
    } catch (error) {
      throw new Error(`Failed to read XQ spec from ${specPath}: ${error.message}`)
    }
  }

  applyOverrides(spec, overrides) {
    // Deep merge overrides with spec
    const merged = JSON.parse(JSON.stringify(spec))

    if (overrides.services) {
      Object.keys(overrides.services).forEach(serviceName => {
        if (merged.services && merged.services[serviceName]) {
          Object.assign(merged.services[serviceName], overrides.services[serviceName])
        }
      })
    }

    return merged
  }

  async generateComposeObject(spec, enableGateway, keepFile = false) {
    const compose = {
      version: '3.8',
      services: {},
      networks: {
        'xq-network': {
          driver: 'bridge'
        }
      }
    }

    // Process dependencies if centralized dependencies are defined
    const centralizedDeps = spec.dependencies || {}

    // Auto port assignment - track used ports
    const usedPorts = new Set()
    let nextPort = spec.portRange?.start || 3000

    // Add services from spec
    if (spec.services) {
      Object.entries(spec.services).forEach(([name, service]) => {
        compose.services[name] = this.convertServiceToCompose(service, centralizedDeps, usedPorts, nextPort)

        // Update nextPort for auto assignment
        if (service.autoPort !== false) {
          nextPort++
          while (usedPorts.has(nextPort)) {
            nextPort++
          }
        }
      })
    }

    // Add gateway if enabled
    if (enableGateway && Object.keys(compose.services).length > 0) {
      await this.addGateway(compose, spec.services, keepFile)
    }

    return compose
  }

  convertServiceToCompose(service, centralizedDeps = {}, usedPorts = new Set(), currentPort = 3000) {
    const composeService = {
      image: `${service.image}:${service.tag || 'latest'}`,
      networks: ['xq-network']
    }

    // Handle ports - auto assignment or manual
    if (service.ports) {
      // Manual port specification
      composeService.ports = service.ports
      // Track used ports
      service.ports.forEach(port => {
        const hostPort = parseInt(port.split(':')[0])
        if (!isNaN(hostPort)) {
          usedPorts.add(hostPort)
        }
      })
    } else if (service.port && service.autoPort !== false) {
      // Auto port assignment
      let hostPort = currentPort
      while (usedPorts.has(hostPort)) {
        hostPort++
      }
      composeService.ports = [`${hostPort}:${service.port}`]
      usedPorts.add(hostPort)
    }

    if (service.environment) {
      composeService.environment = service.environment
    }

    if (service.volumes) {
      composeService.volumes = service.volumes
    }

    if (service.command) {
      composeService.command = service.command
    }

    if (service.healthcheck) {
      composeService.healthcheck = service.healthcheck
    }

    // Handle dependencies - check both service-level and centralized
    let dependencies = []

    if (service.depends_on) {
      dependencies = [...service.depends_on]
    }

    // Add centralized dependencies if service is in dependency groups
    if (service.dependencyGroups) {
      service.dependencyGroups.forEach(group => {
        if (centralizedDeps[group]) {
          dependencies = [...dependencies, ...centralizedDeps[group]]
        }
      })
    }

    if (dependencies.length > 0) {
      composeService.depends_on = [...new Set(dependencies)] // Remove duplicates
    }

    return composeService
  }

  async addGateway(compose, originalServices = {}, keepFile = false) {
    // Generate nginx config in project directory
    // Pass both compose services (for ports) and original services (for routes)
    const nginxConfigPath = path.join(process.cwd(), 'nginx-gateway.conf')

    // Merge compose services with routes from original services
    const servicesWithRoutes = {}
    Object.entries(compose.services).forEach(([name, composeService]) => {
      servicesWithRoutes[name] = {
        ...composeService,
        routes: originalServices[name]?.routes
      }
    })

    await gateway.generateNginxConfig(servicesWithRoutes, nginxConfigPath)

    // Add to temp files for cleanup only if not keeping files
    if (!keepFile) {
      this.tempFiles.add(nginxConfigPath)
    }

    // Find an available port for gateway (avoid conflicts)
    const usedPorts = new Set()
    Object.values(compose.services).forEach(service => {
      if (service.ports) {
        service.ports.forEach(port => {
          const hostPort = port.split(':')[0]
          usedPorts.add(parseInt(hostPort))
        })
      }
    })

    // Find next available port starting from 8080
    let gatewayPort = 8080
    while (usedPorts.has(gatewayPort)) {
      gatewayPort++
    }

    // Gateway waits for backends: service_healthy when the service has a healthcheck (avoids nginx 502 while app boots), else service_started
    const gatewayDependsOn = {}
    for (const name of Object.keys(compose.services)) {
      gatewayDependsOn[name] = {
        condition: compose.services[name].healthcheck ? 'service_healthy' : 'service_started'
      }
    }

    // Add gateway service
    compose.services['xq-gateway'] = {
      image: 'nginx:alpine',
      ports: [`${gatewayPort}:80`],
      volumes: [`${nginxConfigPath}:/etc/nginx/nginx.conf:ro`],
      networks: ['xq-network'],
      depends_on: gatewayDependsOn
    }
  }

  createTempPath(prefix, suffix) {
    const tempDir = os.tmpdir()
    const filename = `${prefix}-${uuidv4()}${suffix}`
    return path.join(tempDir, filename)
  }

  cleanupTempFiles() {
    this.tempFiles.forEach(file => {
      try {
        fs.removeSync(file)
      } catch (error) {
        // Ignore cleanup errors
      }
    })
    this.tempFiles.clear()
  }
}

module.exports = new ComposeGenerator()