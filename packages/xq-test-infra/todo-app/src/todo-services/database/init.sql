-- Database initialization script for Todo App
-- Creates tables and initial data

-- Create todos table
CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);

-- Insert sample data
INSERT INTO todos (title, description, priority, due_date, completed) VALUES
('Setup Development Environment', 'Install Node.js, Docker, and configure development tools', 'high', '2024-01-15 10:00:00', true),
('Design Database Schema', 'Create tables and relationships for todo application', 'high', '2024-01-16 15:00:00', true),
('Implement Read Service', 'Build REST API for reading todo items', 'medium', '2024-01-20 12:00:00', false),
('Implement Write Service', 'Build REST API for creating, updating, and deleting todos', 'medium', '2024-01-22 14:00:00', false),
('Write Tests', 'Create comprehensive test suite for both services', 'high', '2024-01-25 16:00:00', false),
('Deploy to Production', 'Configure CI/CD and deploy services', 'low', '2024-01-30 10:00:00', false);