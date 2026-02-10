const { Pool } = require('pg')
const { logger } = require('@chauhaidang/xq-js-common-kit')

class DatabaseConnection {
  constructor() {
    this.pool = null
    this.isConnected = false
  }

  async connect(maxRetries = 30, retryDelay = 1000) {
    if (this.isConnected) {
      return this.pool
    }

    const config = {
      user: process.env.DB_USER || 'todouser',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'todoapp',
      password: process.env.DB_PASSWORD || 'todopass',
      port: process.env.DB_PORT || 5432,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }

    let lastError
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.pool = new Pool(config)

        this.pool.on('error', (err) => {
          logger.error('Unexpected error on idle client', err)
        })

        // Test the connection
        const client = await this.pool.connect()
        client.release()

        this.isConnected = true
        logger.info(`Database connected successfully on attempt ${attempt}`)

        return this.pool
      } catch (error) {
        lastError = error
        logger.warn(`Database connection attempt ${attempt}/${maxRetries} failed: ${error.message}`)

        // Clean up failed pool
        if (this.pool) {
          try {
            await this.pool.end()
          } catch (e) {
            // Ignore cleanup errors
          }
          this.pool = null
        }

        if (attempt < maxRetries) {
          const waitTime = retryDelay * Math.min(attempt, 5) // Cap exponential backoff at 5x
          logger.info(`Retrying in ${waitTime}ms...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
    }

    logger.error('Failed to connect to database after all retries:', lastError)
    throw lastError
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end()
      this.isConnected = false
      logger.info('Database connection closed')
    }
  }

  getPool() {
    if (!this.isConnected || !this.pool) {
      throw new Error('Database not connected. Call connect() first.')
    }
    return this.pool
  }

  async healthCheck() {
    try {
      const client = await this.pool.connect()
      const result = await client.query('SELECT NOW()')
      client.release()
      return { healthy: true, timestamp: result.rows[0].now }
    } catch (error) {
      logger.error('Database health check failed:', error)
      return { healthy: false, error: error.message }
    }
  }
}

const dbConnection = new DatabaseConnection()

module.exports = dbConnection