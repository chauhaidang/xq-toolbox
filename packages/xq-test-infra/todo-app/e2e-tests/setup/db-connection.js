const { Pool } = require('pg')

let pool = null

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'todoapp',
  user: process.env.DB_USER || 'todouser',
  password: process.env.DB_PASSWORD || 'todopass',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
}

const getPool = () => {
  if (!pool) {
    pool = new Pool(dbConfig)

    pool.on('error', (err) => {
      console.error('Database pool error:', err)
    })
  }
  return pool
}

const connectDatabase = async () => {
  try {
    const client = getPool()
    await client.query('SELECT NOW()')
    console.log('✅ Database connected successfully')
    return client
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    throw error
  }
}

const closeDatabase = async () => {
  if (pool) {
    await pool.end()
    pool = null
    console.log('🔒 Database connection closed')
  }
}

const query = async (text, params) => {
  const client = getPool()
  try {
    const result = await client.query(text, params)
    return result
  } catch (error) {
    console.error('Database query error:', error.message)
    throw error
  }
}

module.exports = {
  connectDatabase,
  closeDatabase,
  query,
  getPool
}