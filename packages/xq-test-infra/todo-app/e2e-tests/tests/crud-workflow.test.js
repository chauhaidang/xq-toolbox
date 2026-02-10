const { readClient, writeClient } = require('../utils/http-clients')
const {
  expectTodoResponse,
  expectTodoData,
  generateUniqueTodoData,
  getDbTodoById,
  getDbTodoCount,
  delay
} = require('../utils/test-helpers')

describe('Complete CRUD Workflow Tests', () => {
  describe('Full Todo Lifecycle', () => {
    test('should handle complete todo lifecycle: Create → Read → Update → Read → Delete → Verify', async () => {
      // 1. CREATE: Create new todo via Write Service
      const initialTodoData = generateUniqueTodoData({
        title: 'Lifecycle Test Todo',
        description: 'Testing complete CRUD lifecycle',
        priority: 'medium',
        completed: false,
        due_date: '2024-12-31T23:59:59.000Z'
      })

      const createResponse = await writeClient.post('/api/todos', initialTodoData)
      const createData = expectTodoResponse(createResponse, 201)

      expect(createData.data).toBeDefined()
      expectTodoData(createData.data)
      expect(createData.data.title).toBe(initialTodoData.title)
      expect(createData.data.description).toBe(initialTodoData.description)
      expect(createData.data.priority).toBe(initialTodoData.priority)
      expect(createData.data.completed).toBe(false)

      const todoId = createData.data.id
      const createdAt = createData.data.created_at

      await delay(100)

      // 2. READ: Verify todo exists via Read Service
      const firstReadResponse = await readClient.get(`/api/todos/${todoId}`)
      const firstReadData = expectTodoResponse(firstReadResponse, 200)

      expect(firstReadData.data.id).toBe(todoId)
      expect(firstReadData.data.title).toBe(initialTodoData.title)
      expect(firstReadData.data.description).toBe(initialTodoData.description)
      expect(firstReadData.data.priority).toBe(initialTodoData.priority)
      expect(firstReadData.data.completed).toBe(false)
      expect(firstReadData.data.created_at).toBe(createdAt)

      // 3. UPDATE: Modify todo via Write Service
      const updateData = {
        title: 'Updated Lifecycle Todo',
        description: 'Updated description for lifecycle test',
        priority: 'high',
        completed: true
      }

      const updateResponse = await writeClient.put(`/api/todos/${todoId}`, updateData)
      const updateResponseData = expectTodoResponse(updateResponse, 200)

      expect(updateResponseData.data.id).toBe(todoId)
      expect(updateResponseData.data.title).toBe(updateData.title)
      expect(updateResponseData.data.description).toBe(updateData.description)
      expect(updateResponseData.data.priority).toBe(updateData.priority)
      expect(updateResponseData.data.completed).toBe(true)
      expect(updateResponseData.data.created_at).toBe(createdAt) // Should remain same
      expect(new Date(updateResponseData.data.updated_at).getTime()).toBeGreaterThan(
        new Date(createdAt).getTime()
      )

      await delay(100)

      // 4. READ: Verify updates via Read Service
      const secondReadResponse = await readClient.get(`/api/todos/${todoId}`)
      const secondReadData = expectTodoResponse(secondReadResponse, 200)

      expect(secondReadData.data.id).toBe(todoId)
      expect(secondReadData.data.title).toBe(updateData.title)
      expect(secondReadData.data.description).toBe(updateData.description)
      expect(secondReadData.data.priority).toBe(updateData.priority)
      expect(secondReadData.data.completed).toBe(true)
      expect(secondReadData.data.created_at).toBe(createdAt)

      // 5. DELETE: Remove todo via Write Service
      const deleteResponse = await writeClient.delete(`/api/todos/${todoId}`)
      expectTodoResponse(deleteResponse, 200)

      await delay(100)

      // 6. VERIFY: Confirm deletion via Read Service (should return 404)
      try {
        await readClient.get(`/api/todos/${todoId}`)
        // eslint-disable-next-line no-undef
        fail('Expected 404 error when reading deleted todo')
      } catch (error) {
        expect(error.response.status).toBe(404)
        expect(error.response.data.success).toBe(false)
      }

      // 7. VERIFY: Confirm deletion in database
      const dbTodo = await getDbTodoById(todoId)
      expect(dbTodo).toBeNull()
    })
  })

  describe('Priority-based Workflow', () => {
    test('should handle priority-based workflow: Create high priority → Filter → Update → Filter', async () => {
      await getDbTodoCount()

      // 1. Create high priority todos
      const highPriorityTodos = []
      for (let i = 0; i < 3; i++) {
        const todoData = generateUniqueTodoData({
          title: `High Priority Task ${i + 1}`,
          priority: 'high',
          completed: false
        })

        const response = await writeClient.post('/api/todos', todoData)
        const todo = expectTodoResponse(response, 201).data
        highPriorityTodos.push(todo)
      }

      // 2. Create medium priority todo for contrast
      const mediumTodoData = generateUniqueTodoData({
        title: 'Medium Priority Task',
        priority: 'medium',
        completed: false
      })

      const mediumResponse = await writeClient.post('/api/todos', mediumTodoData)
      expectTodoResponse(mediumResponse, 201)

      await delay(100)

      // 3. Filter by high priority via Read Service
      const highPriorityResponse = await readClient.get('/api/todos?priority=high')
      const highPriorityData = expectTodoResponse(highPriorityResponse, 200)

      expect(highPriorityData.data).toBeInstanceOf(Array)
      expect(highPriorityData.data.length).toBeGreaterThanOrEqual(3)

      // Find our created todos in the results
      const ourHighPriorityTodos = highPriorityData.data.filter(todo =>
        highPriorityTodos.some(created => created.id === todo.id)
      )
      expect(ourHighPriorityTodos).toHaveLength(3)

      ourHighPriorityTodos.forEach(todo => {
        expect(todo.priority).toBe('high')
        expect(todo.completed).toBe(false)
      })

      // 4. Update one high priority todo to completed
      const todoToComplete = highPriorityTodos[0]
      const updateResponse = await writeClient.put(`/api/todos/${todoToComplete.id}`, {
        completed: true
      })
      expectTodoResponse(updateResponse, 200)

      await delay(100)

      // 5. Filter by high priority and completed status
      const completedHighResponse = await readClient.get('/api/todos?priority=high&completed=true')
      const completedHighData = expectTodoResponse(completedHighResponse, 200)

      const ourCompletedTodo = completedHighData.data.find(todo => todo.id === todoToComplete.id)
      expect(ourCompletedTodo).toBeDefined()
      expect(ourCompletedTodo.priority).toBe('high')
      expect(ourCompletedTodo.completed).toBe(true)

      // 6. Filter by high priority and pending status
      const pendingHighResponse = await readClient.get('/api/todos?priority=high&completed=false')
      const pendingHighData = expectTodoResponse(pendingHighResponse, 200)

      const ourPendingTodos = pendingHighData.data.filter(todo =>
        highPriorityTodos.slice(1).some(created => created.id === todo.id)
      )
      expect(ourPendingTodos).toHaveLength(2)

      ourPendingTodos.forEach(todo => {
        expect(todo.priority).toBe('high')
        expect(todo.completed).toBe(false)
      })
    })
  })

  describe('Due Date Workflow', () => {
    test('should handle due date scenarios: Create with due date → Update due date → Verify', async () => {
      const originalDueDate = '2024-12-31T23:59:59.000Z'
      const updatedDueDate = '2025-01-15T12:00:00.000Z'

      // 1. Create todo with due date
      const todoData = generateUniqueTodoData({
        title: 'Due Date Test Todo',
        description: 'Testing due date functionality',
        priority: 'medium',
        completed: false,
        due_date: originalDueDate
      })

      const createResponse = await writeClient.post('/api/todos', todoData)
      const createdTodo = expectTodoResponse(createResponse, 201).data

      expect(createdTodo.due_date).toBe(originalDueDate)

      await delay(100)

      // 2. Verify due date via Read Service
      const readResponse = await readClient.get(`/api/todos/${createdTodo.id}`)
      const readTodo = expectTodoResponse(readResponse, 200).data

      expect(readTodo.due_date).toBe(originalDueDate)

      // 3. Update due date via Write Service
      const updateResponse = await writeClient.put(`/api/todos/${createdTodo.id}`, {
        due_date: updatedDueDate
      })
      const updatedTodo = expectTodoResponse(updateResponse, 200).data

      expect(updatedTodo.due_date).toBe(updatedDueDate)
      expect(updatedTodo.title).toBe(todoData.title) // Other fields should remain
      expect(updatedTodo.priority).toBe(todoData.priority)

      await delay(100)

      // 4. Verify updated due date via Read Service
      const finalReadResponse = await readClient.get(`/api/todos/${createdTodo.id}`)
      const finalTodo = expectTodoResponse(finalReadResponse, 200).data

      expect(finalTodo.due_date).toBe(updatedDueDate)

      // 5. Clear due date (set to null)
      const clearDueDateResponse = await writeClient.put(`/api/todos/${createdTodo.id}`, {
        due_date: null
      })
      const todoWithNoDueDate = expectTodoResponse(clearDueDateResponse, 200).data

      expect(todoWithNoDueDate.due_date).toBeNull()

      await delay(100)

      // 6. Verify cleared due date via Read Service
      const noDueDateReadResponse = await readClient.get(`/api/todos/${createdTodo.id}`)
      const noDueDateTodo = expectTodoResponse(noDueDateReadResponse, 200).data

      expect(noDueDateTodo.due_date).toBeNull()
    })
  })

  describe('Validation Workflow', () => {
    test('should handle validation errors consistently across services', async () => {
      // Test Write Service validation
      const invalidCases = [
        {
          name: 'empty title',
          data: { title: '', description: 'Valid description' },
          expectedError: /title/i
        },
        {
          name: 'invalid priority',
          data: { title: 'Valid title', priority: 'invalid' },
          expectedError: /priority/i
        },
        {
          name: 'invalid due_date',
          data: { title: 'Valid title', due_date: 'not-a-date' },
          expectedError: /date/i
        },
        {
          name: 'invalid completed value',
          data: { title: 'Valid title', completed: 'not-boolean' },
          expectedError: /completed/i
        }
      ]

      for (const testCase of invalidCases) {
        try {
          await writeClient.post('/api/todos', testCase.data)
          // eslint-disable-next-line no-undef
          fail(`Expected validation error for ${testCase.name}`)
        } catch (error) {
          expect(error.response.status).toBe(400)
          expect(error.response.data.success).toBe(false)
          expect(error.response.data).toHaveProperty('errors')
        }
      }

      // Test Read Service validation
      try {
        await readClient.get('/api/todos/invalid-id')
        // eslint-disable-next-line no-undef
        fail('Expected validation error for invalid ID')
      } catch (error) {
        expect(error.response.status).toBe(400)
        expect(error.response.data.success).toBe(false)
      }

      // Test invalid query parameters
      try {
        await readClient.get('/api/todos?priority=invalid&completed=not-boolean&page=-1')
        // eslint-disable-next-line no-undef
        fail('Expected validation error for invalid query parameters')
      } catch (error) {
        expect(error.response.status).toBe(400)
        expect(error.response.data.success).toBe(false)
        expect(error.response.data).toHaveProperty('errors')
      }
    })
  })
})