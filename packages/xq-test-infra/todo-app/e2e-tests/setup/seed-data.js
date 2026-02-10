const seedData = {
  // Base todos for consistent testing
  baseTodos: [
    {
      title: 'High Priority Task',
      description: 'Important task that needs attention',
      priority: 'high',
      completed: false,
      due_date: null
    },
    {
      title: 'Medium Priority Task',
      description: 'Regular task for testing',
      priority: 'medium',
      completed: true,
      due_date: null
    },
    {
      title: 'Low Priority Task',
      description: 'Minor task for testing',
      priority: 'low',
      completed: false,
      due_date: '2024-12-31T23:59:59.000Z'
    }
  ],

  // Todos for pagination testing
  paginationTodos: Array.from({ length: 15 }, (_, i) => ({
    title: `Pagination Todo ${i + 1}`,
    description: `Description for pagination todo ${i + 1}`,
    priority: ['low', 'medium', 'high'][i % 3],
    completed: i % 4 === 0,
    due_date: i % 5 === 0 ? '2024-12-31T23:59:59.000Z' : null
  })),

  // Todos for search testing
  searchTodos: [
    {
      title: 'Frontend Development',
      description: 'Build React components and UI',
      priority: 'high',
      completed: false,
      due_date: null
    },
    {
      title: 'Backend API Development',
      description: 'Create Node.js REST endpoints',
      priority: 'medium',
      completed: false,
      due_date: null
    },
    {
      title: 'Database Setup',
      description: 'Configure PostgreSQL database',
      priority: 'low',
      completed: true,
      due_date: null
    }
  ]
}

const getAllSeedTodos = () => {
  return [
    ...seedData.baseTodos,
    ...seedData.paginationTodos,
    ...seedData.searchTodos
  ]
}

module.exports = {
  seedData,
  getAllSeedTodos
}