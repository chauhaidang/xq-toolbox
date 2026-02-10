const { readClient, writeClient } = require('../utils/http-clients')
const {
  expectTodoResponse,
  expectTodoData,
  generateUniqueTodoData,
  getDbTodoById,
  delay
} = require('../utils/test-helpers')

describe('Cross-Service Integration Tests', () => {
  describe('Write-then-Read Basic Flow', () => {
    test('should create todo via Write Service and read via Read Service', async () => {
      const todoData = generateUniqueTodoData({
        title: 'Cross-Service Test Todo',
        description: 'Testing write-then-read flow',
        priority: 'high'
      })

      // 1. Create todo via Write Service
      const createResponse = await writeClient.post('/api/todos', todoData)
      const createData = expectTodoResponse(createResponse, 201)

      expect(createData.data).toBeDefined()
      expectTodoData(createData.data)
      expect(createData.data.title).toBe(todoData.title)
      expect(createData.data.description).toBe(todoData.description)
      expect(createData.data.priority).toBe(todoData.priority)

      const createdId = createData.data.id

      // Small delay to ensure data consistency
      await delay(100)

      // 2. Read todo via Read Service
      const readResponse = await readClient.get(`/api/todos/${createdId}`)
      const readData = expectTodoResponse(readResponse, 200)

      expect(readData.data).toBeDefined()
      expectTodoData(readData.data)
      expect(readData.data.id).toBe(createdId)
      expect(readData.data.title).toBe(todoData.title)
      expect(readData.data.description).toBe(todoData.description)
      expect(readData.data.priority).toBe(todoData.priority)
    })

    test('should update todo via Write Service and verify changes via Read Service', async () => {
      // 1. Create initial todo
      const initialTodo = generateUniqueTodoData({
        title: 'Update Test Todo',
        priority: 'low',
        completed: false
      })

      const createResponse = await writeClient.post('/api/todos', initialTodo)
      const createdTodo = expectTodoResponse(createResponse, 201).data
      const todoId = createdTodo.id

      await delay(100)

      // 2. Update todo via Write Service
      const updateData = {
        title: 'Updated Todo Title',
        priority: 'high',
        completed: true
      }

      const updateResponse = await writeClient.put(`/api/todos/${todoId}`, updateData)
      const updatedTodo = expectTodoResponse(updateResponse, 200).data

      expect(updatedTodo.title).toBe(updateData.title)
      expect(updatedTodo.priority).toBe(updateData.priority)
      expect(updatedTodo.completed).toBe(updateData.completed)

      await delay(100)

      // 3. Verify changes via Read Service
      const readResponse = await readClient.get(`/api/todos/${todoId}`)
      const readTodo = expectTodoResponse(readResponse, 200).data

      expect(readTodo.id).toBe(todoId)
      expect(readTodo.title).toBe(updateData.title)
      expect(readTodo.priority).toBe(updateData.priority)
      expect(readTodo.completed).toBe(updateData.completed)
      expect(new Date(readTodo.updated_at).getTime()).toBeGreaterThan(
        new Date(createdTodo.updated_at).getTime()
      )
    })

    test('should delete todo via Write Service and verify removal via Read Service', async () => {
      // 1. Create todo to delete
      const todoData = generateUniqueTodoData({
        title: 'Delete Test Todo'
      })

      const createResponse = await writeClient.post('/api/todos', todoData)
      const createdTodo = expectTodoResponse(createResponse, 201).data
      const todoId = createdTodo.id

      await delay(100)

      // 2. Verify todo exists via Read Service
      const readResponse = await readClient.get(`/api/todos/${todoId}`)
      expectTodoResponse(readResponse, 200)

      // 3. Delete todo via Write Service
      const deleteResponse = await writeClient.delete(`/api/todos/${todoId}`)
      expectTodoResponse(deleteResponse, 200)

      await delay(100)

      // 4. Verify todo is removed via Read Service
      try {
        await readClient.get(`/api/todos/${todoId}`)
        // eslint-disable-next-line no-undef
        fail('Expected 404 error when reading deleted todo')
      } catch (error) {
        expect(error.response.status).toBe(404)
        expect(error.response.data.success).toBe(false)
        expect(error.response.data.message).toContain('not found')
      }

      // 5. Verify todo is removed from database
      const dbTodo = await getDbTodoById(todoId)
      expect(dbTodo).toBeNull()
    })
  })

  describe('Bulk Operations Cross-Service', () => {
    test('should bulk update status via Write Service and verify via Read Service', async () => {
      // 1. Create multiple todos
      const todoIds = []
      const todosToCreate = [
        generateUniqueTodoData({ title: 'Bulk Test Todo 1', completed: false }),
        generateUniqueTodoData({ title: 'Bulk Test Todo 2', completed: false }),
        generateUniqueTodoData({ title: 'Bulk Test Todo 3', completed: false })
      ]

      for (const todoData of todosToCreate) {
        const response = await writeClient.post('/api/todos', todoData)
        const todo = expectTodoResponse(response, 201).data
        todoIds.push(todo.id)
      }

      await delay(100)

      // 2. Verify all todos are not completed via Read Service
      for (const id of todoIds) {
        const response = await readClient.get(`/api/todos/${id}`)
        const todo = expectTodoResponse(response, 200).data
        expect(todo.completed).toBe(false)
      }

      // 3. Bulk update status via Write Service
      const bulkUpdateResponse = await writeClient.patch('/api/todos/bulk-status', {
        ids: todoIds,
        completed: true
      })

      expectTodoResponse(bulkUpdateResponse, 200)

      await delay(100)

      // 4. Verify all todos are completed via Read Service
      for (const id of todoIds) {
        const response = await readClient.get(`/api/todos/${id}`)
        const todo = expectTodoResponse(response, 200).data
        expect(todo.completed).toBe(true)
      }
    })

    test('should delete completed todos via Write Service and verify via Read Service', async () => {
      // 1. Create mix of completed and pending todos
      const completedTodos = []
      const pendingTodos = []

      // Create completed todos
      for (let i = 0; i < 3; i++) {
        const todoData = generateUniqueTodoData({
          title: `Completed Todo ${i + 1}`,
          completed: true
        })
        const response = await writeClient.post('/api/todos', todoData)
        const todo = expectTodoResponse(response, 201).data
        completedTodos.push(todo.id)
      }

      // Create pending todos
      for (let i = 0; i < 2; i++) {
        const todoData = generateUniqueTodoData({
          title: `Pending Todo ${i + 1}`,
          completed: false
        })
        const response = await writeClient.post('/api/todos', todoData)
        const todo = expectTodoResponse(response, 201).data
        pendingTodos.push(todo.id)
      }

      await delay(100)

      // 2. Verify all todos exist via Read Service
      const allTodoIds = [...completedTodos, ...pendingTodos]
      for (const id of allTodoIds) {
        const response = await readClient.get(`/api/todos/${id}`)
        expectTodoResponse(response, 200)
      }

      // 3. Delete completed todos via Write Service
      const deleteResponse = await writeClient.delete('/api/todos/completed')
      expectTodoResponse(deleteResponse, 200)

      await delay(100)

      // 4. Verify completed todos are deleted via Read Service
      for (const id of completedTodos) {
        try {
          await readClient.get(`/api/todos/${id}`)
          // eslint-disable-next-line no-undef
          fail(`Expected 404 for deleted completed todo ${id}`)
        } catch (error) {
          expect(error.response.status).toBe(404)
        }
      }

      // 5. Verify pending todos still exist via Read Service
      for (const id of pendingTodos) {
        const response = await readClient.get(`/api/todos/${id}`)
        const todo = expectTodoResponse(response, 200).data
        expect(todo.completed).toBe(false)
      }
    })
  })

  describe('Error Handling Cross-Service', () => {
    test('should handle Write Service errors gracefully', async () => {
      // Try to create invalid todo
      try {
        await writeClient.post('/api/todos', {
          // Missing required title
          description: 'No title provided'
        })
        // eslint-disable-next-line no-undef
        fail('Expected 400 error for invalid todo data')
      } catch (error) {
        expect(error.response.status).toBe(400)
        expect(error.response.data.success).toBe(false)
      }
    })

    test('should handle Read Service errors gracefully', async () => {
      // Try to read non-existent todo
      try {
        await readClient.get('/api/todos/999999')
        // eslint-disable-next-line no-undef
        fail('Expected 404 error for non-existent todo')
      } catch (error) {
        expect(error.response.status).toBe(404)
        expect(error.response.data.success).toBe(false)
      }
    })
  })
})