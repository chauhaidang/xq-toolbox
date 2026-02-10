const { connectDatabase, closeDatabase, query } = require('./db-connection')
const { getAllSeedTodos } = require('./seed-data')
const { readClient, writeClient } = require('../utils/http-clients')

let isSetupComplete = false

const cleanDatabase = async () => {
  console.log('🧹 Cleaning database...')

  try {
    // Delete all todos
    await query('DELETE FROM todos')

    // Reset auto-increment sequence
    await query('ALTER SEQUENCE todos_id_seq RESTART WITH 1')

    console.log('✅ Database cleaned successfully')
  } catch (error) {
    console.error('❌ Database cleanup failed:', error.message)
    throw error
  }
}

const seedDatabase = async () => {
  console.log('🌱 Seeding database...')

  try {
    const todos = getAllSeedTodos()

    for (const todo of todos) {
      const insertQuery = `
        INSERT INTO todos (title, description, priority, completed, due_date, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `

      await query(insertQuery, [
        todo.title,
        todo.description,
        todo.priority,
        todo.completed,
        todo.due_date
      ])
    }

    // Verify seeding
    const result = await query('SELECT COUNT(*) as count FROM todos')
    const count = parseInt(result.rows[0].count)

    console.log(`✅ Database seeded with ${count} todos`)

    if (count !== todos.length) {
      throw new Error(`Expected ${todos.length} todos, but found ${count}`)
    }

  } catch (error) {
    console.error('❌ Database seeding failed:', error.message)
    throw error
  }
}

const checkServiceHealth = async () => {
  console.log('🏥 Checking service health...')

  try {
    const [readHealth, writeHealth] = await Promise.all([
      readClient.get('/health'),
      writeClient.get('/health')
    ])

    if (readHealth.status === 200 && writeHealth.status === 200) {
      console.log('✅ Both services are healthy')
      console.log(`   📖 Read Service: ${readHealth.data.data.service}`)
      console.log(`   ✍️ Write Service: ${writeHealth.data.data.service}`)
    } else {
      throw new Error('Services returned non-200 status codes')
    }

  } catch (error) {
    console.error('❌ Service health check failed:', error.message)
    console.error('   Make sure both services are running:')
    console.error('   📖 Read Service: http://localhost:3001/health')
    console.error('   ✍️ Write Service: http://localhost:3002/health')
    throw error
  }
}

beforeAll(async () => {
  if (isSetupComplete) return

  try {
    console.log('🚀 Starting E2E Test Setup...')

    // Connect to database
    await connectDatabase()

    // Clean and seed database
    await cleanDatabase()
    await seedDatabase()

    // Check service health
    await checkServiceHealth()

    console.log('✅ E2E Test Setup Complete!')
    isSetupComplete = true

  } catch (error) {
    console.error('❌ E2E Test Setup Failed:', error.message)
    // Don't use process.exit() - let Jest handle the error so reporters can run
    throw error
  }
})

afterAll(async () => {
  try {
    await closeDatabase()
  } catch (error) {
    console.error('Error closing database:', error.message)
  }
})