const { readClient, writeClient } = require('../utils/http-clients')
const {
  expectTodoResponse,
  expectStatisticsData,
  generateUniqueTodoData,
  getDbTodoStatistics,
  getDbTodosByPriority,
  delay
} = require('../utils/test-helpers')

describe('Data Consistency Tests', () => {
  describe('Statistics Consistency', () => {
    test('should maintain accurate statistics after write operations', async () => {
      // 1. Get initial statistics
      const initialStatsResponse = await readClient.get('/api/todos/statistics')
      const initialStats = expectTodoResponse(initialStatsResponse, 200).data
      expectStatisticsData(initialStats)

      const initialDbStats = await getDbTodoStatistics()

      // Verify initial consistency
      expect(initialStats.total).toBe(initialDbStats.total)
      expect(initialStats.completed).toBe(initialDbStats.completed)
      expect(initialStats.pending).toBe(initialDbStats.pending)

      // 2. Create new todos with different priorities and status
      const todosToCreate = [
        { priority: 'high', completed: false },
        { priority: 'high', completed: true },
        { priority: 'medium', completed: false },
        { priority: 'low', completed: true }
      ]

      const createdTodos = []
      for (const todoSpec of todosToCreate) {
        const todoData = generateUniqueTodoData({
          title: `Statistics Test ${todoSpec.priority} ${todoSpec.completed ? 'completed' : 'pending'}`,
          ...todoSpec
        })

        const response = await writeClient.post('/api/todos', todoData)
        const todo = expectTodoResponse(response, 201).data
        createdTodos.push(todo)
      }

      await delay(200)

      // 3. Get updated statistics
      const updatedStatsResponse = await readClient.get('/api/todos/statistics')
      const updatedStats = expectTodoResponse(updatedStatsResponse, 200).data
      expectStatisticsData(updatedStats)

      const updatedDbStats = await getDbTodoStatistics()

      // 4. Verify statistics accuracy
      expect(updatedStats.total).toBe(initialStats.total + 4)
      expect(updatedStats.completed).toBe(initialStats.completed + 2) // 2 completed todos added
      expect(updatedStats.pending).toBe(initialStats.pending + 2) // 2 pending todos added

      // Verify database consistency
      expect(updatedStats.total).toBe(updatedDbStats.total)
      expect(updatedStats.completed).toBe(updatedDbStats.completed)
      expect(updatedStats.pending).toBe(updatedDbStats.pending)

      // 5. Update some todos and verify statistics
      const todoToComplete = createdTodos.find(t => !t.completed)
      if (todoToComplete) {
        const updateResponse = await writeClient.put(`/api/todos/${todoToComplete.id}`, {
          completed: true
        })
        expectTodoResponse(updateResponse, 200)

        await delay(100)

        const finalStatsResponse = await readClient.get('/api/todos/statistics')
        const finalStats = expectTodoResponse(finalStatsResponse, 200).data

        expect(finalStats.completed).toBe(updatedStats.completed + 1)
        expect(finalStats.pending).toBe(updatedStats.pending - 1)
        expect(finalStats.total).toBe(updatedStats.total) // Total should remain same
      }
    })

    test('should maintain priority breakdown accuracy', async () => {
      // 1. Get current priority breakdown
      const initialStatsResponse = await readClient.get('/api/todos/statistics')
      const initialStats = expectTodoResponse(initialStatsResponse, 200).data

      // 2. Create todos with specific priority distribution
      const priorityDistribution = {
        high: 3,
        medium: 2,
        low: 4
      }

      const createdTodos = []
      for (const [priority, count] of Object.entries(priorityDistribution)) {
        for (let i = 0; i < count; i++) {
          const todoData = generateUniqueTodoData({
            title: `Priority Test ${priority} ${i + 1}`,
            priority,
            completed: i % 2 === 0 // Alternate completed status
          })

          const response = await writeClient.post('/api/todos', todoData)
          const todo = expectTodoResponse(response, 201).data
          createdTodos.push(todo)
        }
      }

      await delay(200)

      // 3. Verify priority breakdown in statistics
      const updatedStatsResponse = await readClient.get('/api/todos/statistics')
      const updatedStats = expectTodoResponse(updatedStatsResponse, 200).data

      expect(updatedStats.byPriority.high).toBeGreaterThanOrEqual(initialStats.byPriority.high + 3)
      expect(updatedStats.byPriority.medium).toBeGreaterThanOrEqual(initialStats.byPriority.medium + 2)
      expect(updatedStats.byPriority.low).toBeGreaterThanOrEqual(initialStats.byPriority.low + 4)

      // 4. Verify against database
      const dbHighPriorityTodos = await getDbTodosByPriority('high')
      const dbMediumPriorityTodos = await getDbTodosByPriority('medium')
      const dbLowPriorityTodos = await getDbTodosByPriority('low')

      expect(updatedStats.byPriority.high).toBe(dbHighPriorityTodos.length)
      expect(updatedStats.byPriority.medium).toBe(dbMediumPriorityTodos.length)
      expect(updatedStats.byPriority.low).toBe(dbLowPriorityTodos.length)
    })
  })

  describe('Search Functionality Consistency', () => {
    test('should return consistent search results after data modifications', async () => {
      const searchKeyword = 'SearchConsistency'
      const uniqueIdentifier = Date.now()

      // 1. Create todos with searchable content
      const todosWithKeyword = [
        generateUniqueTodoData({
          title: `${searchKeyword} Frontend Task ${uniqueIdentifier}`,
          description: 'Building user interface components',
          priority: 'high'
        }),
        generateUniqueTodoData({
          title: `Backend Development ${uniqueIdentifier}`,
          description: `${searchKeyword} API endpoints creation`,
          priority: 'medium'
        }),
        generateUniqueTodoData({
          title: `Database ${searchKeyword} Setup ${uniqueIdentifier}`,
          description: 'Configure database connections',
          priority: 'low'
        })
      ]

      const createdTodos = []
      for (const todoData of todosWithKeyword) {
        const response = await writeClient.post('/api/todos', todoData)
        const todo = expectTodoResponse(response, 201).data
        createdTodos.push(todo)
      }

      await delay(200)

      // 2. Search by keyword
      const searchResponse = await readClient.get(`/api/todos?search=${searchKeyword}`)
      const searchResults = expectTodoResponse(searchResponse, 200).data

      expect(searchResults).toBeInstanceOf(Array)
      expect(searchResults.length).toBeGreaterThanOrEqual(3)

      // Find our created todos in search results
      const foundTodos = searchResults.filter(todo =>
        createdTodos.some(created => created.id === todo.id)
      )
      expect(foundTodos).toHaveLength(3)

      // 3. Update one todo's title and description
      const todoToUpdate = createdTodos[0]
      const updateData = {
        title: `Updated Title Without Keyword ${uniqueIdentifier}`,
        description: 'Updated description without the search term'
      }

      const updateResponse = await writeClient.put(`/api/todos/${todoToUpdate.id}`, updateData)
      expectTodoResponse(updateResponse, 200)

      await delay(100)

      // 4. Search again - should find one less result
      const secondSearchResponse = await readClient.get(`/api/todos?search=${searchKeyword}`)
      const secondSearchResults = expectTodoResponse(secondSearchResponse, 200).data

      const secondFoundTodos = secondSearchResults.filter(todo =>
        createdTodos.some(created => created.id === todo.id)
      )
      expect(secondFoundTodos).toHaveLength(2) // One less due to update

      // Ensure the updated todo is not in results
      const updatedTodoInResults = secondFoundTodos.find(todo => todo.id === todoToUpdate.id)
      expect(updatedTodoInResults).toBeUndefined()

      // 5. Add keyword back to the updated todo
      const revertUpdateResponse = await writeClient.put(`/api/todos/${todoToUpdate.id}`, {
        title: `${searchKeyword} Reverted Title ${uniqueIdentifier}`
      })
      expectTodoResponse(revertUpdateResponse, 200)

      await delay(100)

      // 6. Search should find all 3 again
      const thirdSearchResponse = await readClient.get(`/api/todos?search=${searchKeyword}`)
      const thirdSearchResults = expectTodoResponse(thirdSearchResponse, 200).data

      const thirdFoundTodos = thirdSearchResults.filter(todo =>
        createdTodos.some(created => created.id === todo.id)
      )
      expect(thirdFoundTodos).toHaveLength(3)
    })

    test('should handle search with filtering combinations', async () => {
      const searchTerm = 'FilterSearch'
      const testId = Date.now()

      // 1. Create todos with different priorities and completion status
      const testTodos = [
        generateUniqueTodoData({
          title: `${searchTerm} High Priority Task ${testId}`,
          priority: 'high',
          completed: false
        }),
        generateUniqueTodoData({
          title: `${searchTerm} Medium Priority Task ${testId}`,
          priority: 'medium',
          completed: true
        }),
        generateUniqueTodoData({
          title: `${searchTerm} Low Priority Task ${testId}`,
          priority: 'low',
          completed: false
        })
      ]

      for (const todoData of testTodos) {
        const response = await writeClient.post('/api/todos', todoData)
        expectTodoResponse(response, 201)
      }

      await delay(200)

      // 2. Search with priority filter
      const highPrioritySearchResponse = await readClient.get(
        `/api/todos?search=${searchTerm}&priority=high`
      )
      const highPriorityResults = expectTodoResponse(highPrioritySearchResponse, 200).data

      const highPriorityFound = highPriorityResults.filter(todo =>
        todo.title.includes(searchTerm) && todo.title.includes(testId.toString())
      )
      expect(highPriorityFound).toHaveLength(1)
      expect(highPriorityFound[0].priority).toBe('high')

      // 3. Search with completion status filter
      const completedSearchResponse = await readClient.get(
        `/api/todos?search=${searchTerm}&completed=true`
      )
      const completedResults = expectTodoResponse(completedSearchResponse, 200).data

      const completedFound = completedResults.filter(todo =>
        todo.title.includes(searchTerm) && todo.title.includes(testId.toString())
      )
      expect(completedFound).toHaveLength(1)
      expect(completedFound[0].completed).toBe(true)
      expect(completedFound[0].priority).toBe('medium')

      // 4. Search with both priority and completion filters
      const pendingHighResponse = await readClient.get(
        `/api/todos?search=${searchTerm}&priority=high&completed=false`
      )
      const pendingHighResults = expectTodoResponse(pendingHighResponse, 200).data

      const pendingHighFound = pendingHighResults.filter(todo =>
        todo.title.includes(searchTerm) && todo.title.includes(testId.toString())
      )
      expect(pendingHighFound).toHaveLength(1)
      expect(pendingHighFound[0].priority).toBe('high')
      expect(pendingHighFound[0].completed).toBe(false)
    })
  })

  describe('Pagination Consistency', () => {
    test('should maintain pagination consistency after bulk operations', async () => {
      // 1. Create a controlled set of todos for pagination testing
      const paginationTestTodos = []
      const testId = Date.now()

      for (let i = 0; i < 12; i++) {
        const todoData = generateUniqueTodoData({
          title: `Pagination Test Todo ${i + 1} ${testId}`,
          priority: ['low', 'medium', 'high'][i % 3],
          completed: i >= 6 // First 6 are pending, last 6 are completed
        })

        const response = await writeClient.post('/api/todos', todoData)
        const todo = expectTodoResponse(response, 201).data
        paginationTestTodos.push(todo)
      }

      await delay(200)

      // 2. Test pagination with search filter
      const page1Response = await readClient.get(
        '/api/todos?search=Pagination Test&page=1&limit=5'
      )
      const page1Data = expectTodoResponse(page1Response, 200)

      expect(page1Data.data).toBeInstanceOf(Array)
      expect(page1Data.data.length).toBeLessThanOrEqual(5)
      expect(page1Data.pagination).toBeDefined()
      expect(page1Data.pagination.page).toBe(1)
      expect(page1Data.pagination.limit).toBe(5)

      if (page1Data.pagination.totalPages > 1) {
        const page2Response = await readClient.get(
          '/api/todos?search=Pagination Test&page=2&limit=5'
        )
        const page2Data = expectTodoResponse(page2Response, 200)

        expect(page2Data.data).toBeInstanceOf(Array)
        expect(page2Data.pagination.page).toBe(2)

        // Ensure no duplicates between pages
        const page1Ids = page1Data.data.map(todo => todo.id)
        const page2Ids = page2Data.data.map(todo => todo.id)
        const commonIds = page1Ids.filter(id => page2Ids.includes(id))
        expect(commonIds).toHaveLength(0)
      }

      // 3. Perform bulk status update
      const firstSixIds = paginationTestTodos.slice(0, 6).map(todo => todo.id)
      const bulkUpdateResponse = await writeClient.patch('/api/todos/bulk-status', {
        ids: firstSixIds,
        completed: true
      })
      expectTodoResponse(bulkUpdateResponse, 200)

      await delay(200)

      // 4. Verify pagination still works correctly with updated data
      const afterUpdateResponse = await readClient.get(
        '/api/todos?search=Pagination Test&completed=true&page=1&limit=5'
      )
      const afterUpdateData = expectTodoResponse(afterUpdateResponse, 200)

      expect(afterUpdateData.data).toBeInstanceOf(Array)
      expect(afterUpdateData.data.every(todo => todo.completed)).toBe(true)

      // All created todos should now be completed
      const allCompletedResponse = await readClient.get(
        '/api/todos?search=Pagination Test&completed=true'
      )
      const allCompletedData = expectTodoResponse(allCompletedResponse, 200)

      const ourCompletedTodos = allCompletedData.data.filter(todo =>
        todo.title.includes(testId.toString())
      )
      expect(ourCompletedTodos).toHaveLength(12)
    })
  })
})