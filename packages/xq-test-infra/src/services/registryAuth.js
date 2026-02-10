const { spawn } = require('cross-spawn')
const fs = require('fs-extra')
const os = require('os')
const path = require('path')

class RegistryAuth {
  async login(registry, username, password, options = {}) {
    const { ephemeral = false } = options

    if (!registry || !username || !password) {
      throw new Error('registry, username, and password are required')
    }

    // Setup ephemeral docker config if requested (useful for CI)
    let originalDockerConfig
    if (ephemeral) {
      originalDockerConfig = process.env.DOCKER_CONFIG
      const tempDockerConfig = path.join(os.tmpdir(), `docker-config-${Date.now()}`)
      await fs.ensureDir(tempDockerConfig)
      process.env.DOCKER_CONFIG = tempDockerConfig
    }

    try {
      return new Promise((resolve, reject) => {
        const args = ['login', registry, '--username', username, '--password-stdin']
        const child = spawn('docker', args, {
          stdio: ['pipe', 'inherit', 'inherit'],
          env: process.env
        })

        child.on('error', (err) => reject(err))
        child.on('exit', (code) => {
          if (ephemeral && originalDockerConfig !== undefined) {
            process.env.DOCKER_CONFIG = originalDockerConfig
          }

          if (code === 0) {
            resolve()
          } else {
            reject(new Error(`docker login exited with code ${code}`))
          }
        })

        // Write password to stdin
        child.stdin.write(password)
        child.stdin.end()
      })
    } catch (error) {
      // Restore original config on error
      if (ephemeral && originalDockerConfig !== undefined) {
        process.env.DOCKER_CONFIG = originalDockerConfig
      }
      throw error
    }
  }

  async loginGitHub(token, options = {}) {
    return this.login('ghcr.io', 'USERNAME_PLACEHOLDER', token, options)
  }

  async loginFromEnv(registry, options = {}) {
    const username = process.env.DOCKER_USERNAME || process.env.REGISTRY_USERNAME
    const password = process.env.DOCKER_PASSWORD || process.env.REGISTRY_PASSWORD

    if (!username || !password) {
      throw new Error('Docker credentials not found in environment variables. Set DOCKER_USERNAME and DOCKER_PASSWORD or REGISTRY_USERNAME and REGISTRY_PASSWORD')
    }

    return this.login(registry, username, password, options)
  }

  async loginFromGitHubActions(registry = 'ghcr.io') {
    const token = process.env.GITHUB_TOKEN
    if (!token) {
      throw new Error('GITHUB_TOKEN not found in environment. Ensure the workflow has access to secrets.GITHUB_TOKEN')
    }

    // For GitHub Container Registry, username can be anything when using PAT
    return this.login(registry, process.env.GITHUB_ACTOR || 'github-actions', token)
  }

  isInGitHubActions() {
    return process.env.GITHUB_ACTIONS === 'true'
  }

  async autoLogin(registry, options = {}) {
    // Auto-detect authentication method based on environment
    if (this.isInGitHubActions() && (registry === 'ghcr.io' || registry.includes('github'))) {
      return this.loginFromGitHubActions(registry)
    }

    // Try environment variables
    try {
      return await this.loginFromEnv(registry, options)
    } catch (error) {
      throw new Error(`Auto-login failed for ${registry}. Please run 'docker login ${registry}' manually or set appropriate environment variables. Original error: ${error.message}`)
    }
  }
}

module.exports = new RegistryAuth()

