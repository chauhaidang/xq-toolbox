const fs = require('fs-extra')
const path = require('path')
const YAML = require('yaml')

class ServiceLoader {
  /**
   * Load and merge service files from a directory
   * @param {string} dirPath - Path to directory containing service files
   * @returns {Promise<Object>} Unified spec object with services, dependencies, and portRange
   */
  async loadFromDirectory(dirPath) {
    // Verify directory exists
    const dirExists = await fs.pathExists(dirPath)
    if (!dirExists) {
      throw new Error(`Directory does not exist: ${dirPath}`)
    }

    const stat = await fs.stat(dirPath)
    if (!stat.isDirectory()) {
      throw new Error(`Path is not a directory: ${dirPath}`)
    }

    // Scan for service files
    const serviceFiles = await this.scanServiceFiles(dirPath)

    if (serviceFiles.length === 0) {
      throw new Error(`No service files (*.service.yml or *.service.yaml) found in ${dirPath}`)
    }

    // Load global config if exists
    const globalConfig = await this.loadGlobalConfig(dirPath)

    // Load and merge all service files
    const mergedSpec = await this.mergeServiceFiles(dirPath, serviceFiles, globalConfig)

    return mergedSpec
  }

  /**
   * Scan directory for service files
   * @param {string} dirPath - Directory path to scan
   * @returns {Promise<string[]>} Sorted array of service filenames
   */
  async scanServiceFiles(dirPath) {
    const files = await fs.readdir(dirPath)

    const serviceFiles = files.filter(file => {
      return file.endsWith('.service.yml') || file.endsWith('.service.yaml')
    })

    // Sort alphabetically for consistent loading order
    return serviceFiles.sort()
  }

  /**
   * Load global config file (xq.config.yml) if it exists
   * @param {string} dirPath - Directory path
   * @returns {Promise<Object>} Global config object or empty object
   */
  async loadGlobalConfig(dirPath) {
    const configPaths = [
      path.join(dirPath, 'xq.config.yml'),
      path.join(dirPath, 'xq.config.yaml')
    ]

    for (const configPath of configPaths) {
      if (await fs.pathExists(configPath)) {
        try {
          const content = await fs.readFile(configPath, 'utf8')
          return YAML.parse(content) || {}
        } catch (error) {
          throw new Error(`Failed to parse global config ${configPath}: ${error.message}`)
        }
      }
    }

    return {}
  }

  /**
   * Merge all service files into unified spec format
   * @param {string} dirPath - Directory path
   * @param {string[]} serviceFiles - Array of service filenames
   * @param {Object} globalConfig - Global config object
   * @returns {Promise<Object>} Merged spec object
   */
  async mergeServiceFiles(dirPath, serviceFiles, globalConfig) {
    const spec = {
      services: {}
    }

    // Add global config (portRange, dependencies)
    if (globalConfig.portRange) {
      spec.portRange = globalConfig.portRange
    }

    if (globalConfig.dependencies) {
      spec.dependencies = globalConfig.dependencies
    }

    // Load each service file
    for (const filename of serviceFiles) {
      const filePath = path.join(dirPath, filename)
      let serviceData

      try {
        const content = await fs.readFile(filePath, 'utf8')
        serviceData = YAML.parse(content)
      } catch (error) {
        throw new Error(`Failed to parse service file ${filename}: ${error.message}`)
      }

      if (!serviceData) {
        throw new Error(`Service file ${filename} is empty or invalid`)
      }

      // Derive service name from filename or explicit name field
      const serviceName = serviceData.name || this.deriveServiceName(filename)

      // Check for duplicate service names
      if (spec.services[serviceName]) {
        throw new Error(`Duplicate service name '${serviceName}' found in ${filename}`)
      }

      // Remove 'name' field from service data (not needed in final spec)
      // Keep 'routes' field if present for gateway routing
      const { name, ...serviceConfig } = serviceData

      // Add service to spec
      spec.services[serviceName] = serviceConfig
    }

    // Validate dependencies
    this.validateDependencies(spec)

    return spec
  }

  /**
   * Derive service name from filename
   * @param {string} filename - Service filename (e.g., 'postgres.service.yml')
   * @returns {string} Service name (e.g., 'postgres')
   */
  deriveServiceName(filename) {
    // Remove .service.yml or .service.yaml extension
    return filename
      .replace(/\.service\.ya?ml$/, '')
  }

  /**
   * Validate service dependencies to detect circular dependencies
   * @param {Object} spec - Merged spec object
   * @throws {Error} If circular dependencies detected
   */
  validateDependencies(spec) {
    const services = spec.services
    const visited = new Set()
    const recursionStack = new Set()

    const hasCycle = (serviceName) => {
      if (recursionStack.has(serviceName)) {
        return true // Circular dependency detected
      }

      if (visited.has(serviceName)) {
        return false // Already checked this service
      }

      visited.add(serviceName)
      recursionStack.add(serviceName)

      const service = services[serviceName]
      if (service && service.depends_on) {
        for (const dep of service.depends_on) {
          if (!services[dep]) {
            throw new Error(`Service '${serviceName}' depends on non-existent service '${dep}'`)
          }

          if (hasCycle(dep)) {
            throw new Error(`Circular dependency detected involving service '${serviceName}'`)
          }
        }
      }

      recursionStack.delete(serviceName)
      return false
    }

    // Check all services for circular dependencies
    for (const serviceName of Object.keys(services)) {
      if (!visited.has(serviceName)) {
        hasCycle(serviceName)
      }
    }
  }
}

module.exports = new ServiceLoader()
