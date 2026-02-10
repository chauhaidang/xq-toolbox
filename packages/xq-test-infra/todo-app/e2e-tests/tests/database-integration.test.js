const { query } = require('../setup/db-connection')
const { getAllSeedTodos } = require('../setup/seed-data')

describe('Database Integration Tests', () => {
  test('should connect to test database successfully', async () => {
    const result = await query('SELECT NOW() as current_time')
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].current_time).toBeDefined()
  })

  test('should verify seed data was inserted correctly', async () => {
    const result = await query('SELECT COUNT(*) as count FROM todos')
    const expectedCount = getAllSeedTodos().length

    expect(parseInt(result.rows[0].count)).toBeGreaterThanOrEqual(expectedCount)
    console.log(`✅ Found ${result.rows[0].count} todos in database (expected at least ${expectedCount})`)
  })

  test('should be able to perform CRUD operations on todos table', async () => {
    // Create a new todo
    const insertResult = await query(
      `INSERT INTO todos (title, description, priority, completed, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
      ['Database Test Todo', 'Testing direct database operations', 'high', false]
    )

    expect(insertResult.rows).toHaveLength(1)
    const createdTodo = insertResult.rows[0]
    expect(createdTodo.title).toBe('Database Test Todo')
    expect(createdTodo.priority).toBe('high')
    expect(createdTodo.completed).toBe(false)

    const todoId = createdTodo.id

    // Read the todo
    const selectResult = await query('SELECT * FROM todos WHERE id = $1', [todoId])
    expect(selectResult.rows).toHaveLength(1)
    expect(selectResult.rows[0].title).toBe('Database Test Todo')

    // Update the todo
    const updateResult = await query(
      `UPDATE todos
       SET title      = $1,
           completed  = $2,
           updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      ['Updated Database Test Todo', true, todoId]
    )

    expect(updateResult.rows).toHaveLength(1)
    expect(updateResult.rows[0].title).toBe('Updated Database Test Todo')
    expect(updateResult.rows[0].completed).toBe(true)

    // Delete the todo
    const deleteResult = await query('DELETE FROM todos WHERE id = $1 RETURNING *', [todoId])
    expect(deleteResult.rows).toHaveLength(1)

    // Verify deletion
    const verifyResult = await query('SELECT * FROM todos WHERE id = $1', [todoId])
    expect(verifyResult.rows).toHaveLength(0)
  })

  test('should support filtering and searching operations', async () => {
    // Test priority filtering
    const highPriorityResult = await query(
      'SELECT * FROM todos WHERE priority = \'high\' ORDER BY id'
    )
    expect(highPriorityResult.rows.length).toBeGreaterThan(0)
    highPriorityResult.rows.forEach(todo => {
      expect(todo.priority).toBe('high')
    })

    // Test completion status filtering
    const completedResult = await query(
      'SELECT * FROM todos WHERE completed = true ORDER BY id'
    )
    expect(completedResult.rows.length).toBeGreaterThan(0)
    completedResult.rows.forEach(todo => {
      expect(todo.completed).toBe(true)
    })

    // Test text search functionality
    const searchResult = await query(
      'SELECT * FROM todos WHERE title ILIKE \'%Development%\' OR description ILIKE \'%Development%\''
    )
    expect(searchResult.rows.length).toBeGreaterThan(0)
    searchResult.rows.forEach(todo => {
      const hasSearchTerm =
        todo.title.toLowerCase().includes('development') ||
        (todo.description && todo.description.toLowerCase().includes('development'))
      expect(hasSearchTerm).toBe(true)
    })
  })

  test('should support statistics queries', async () => {
    // Get total count
    const totalResult = await query('SELECT COUNT(*) as total FROM todos')
    const total = parseInt(totalResult.rows[0].total)

    // Get completed count
    const completedResult = await query('SELECT COUNT(*) as completed FROM todos WHERE completed = true')
    const completed = parseInt(completedResult.rows[0].completed)

    // Get pending count
    const pending = total - completed

    expect(total).toBeGreaterThan(0)
    expect(completed).toBeGreaterThanOrEqual(0)
    expect(pending).toBeGreaterThanOrEqual(0)
    expect(total).toBe(completed + pending)

    // Get priority breakdown
    const priorityResult = await query(`
        SELECT priority, COUNT(*) as count
        FROM todos
        GROUP BY priority
        ORDER BY priority
    `)

    expect(priorityResult.rows.length).toBeGreaterThan(0)
    let totalByPriority = 0
    priorityResult.rows.forEach(row => {
      expect(['high', 'medium', 'low']).toContain(row.priority)
      expect(parseInt(row.count)).toBeGreaterThan(0)
      totalByPriority += parseInt(row.count)
    })
    expect(totalByPriority).toBe(total)

    console.log('📊 Statistics Summary:')
    console.log(`   Total: ${total}`)
    console.log(`   Completed: ${completed}`)
    console.log(`   Pending: ${pending}`)
    console.log('   Priority Breakdown:')
    priorityResult.rows.forEach(row => {
      console.log(`     ${row.priority}: ${row.count}`)
    })
  })

  test('should handle database constraints and validations', async () => {
    // Test NOT NULL constraint on title
    try {
      await query(
        `INSERT INTO todos (title, description, priority, completed, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [null, 'No title provided', 'medium', false]
      )
      // eslint-disable-next-line no-undef
      fail('Expected NOT NULL constraint violation')
    } catch (error) {
      expect(error.code).toBe('23502') // NOT NULL violation
    }

    // Test priority constraint (should only allow 'low', 'medium', 'high')
    try {
      await query(
        `INSERT INTO todos (title, description, priority, completed, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        ['Test Todo', 'Testing priority constraint', 'invalid', false]
      )
      // eslint-disable-next-line no-undef
      fail('Expected CHECK constraint violation for priority')
    } catch (error) {
      expect(error.code).toBe('23514') // CHECK constraint violation
    }
  })
})