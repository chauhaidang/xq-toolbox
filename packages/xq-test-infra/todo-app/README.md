# Todo App

A microservices-based todo application designed as a test bed for the xq-test-infra CLI tool. This application demonstrates a production-ready Node.js microservices architecture with comprehensive testing and deployment automation.

## 🏗️ Architecture

The Todo App follows a microservices architecture with separate read and write services:

```
┌─────────────────┐    ┌─────────────────┐
│  Read Service   │    │  Write Service  │
│    Port: 3001   │    │    Port: 3002   │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          └──────────┬───────────┘
                     │
            ┌─────────▼───────┐
            │   PostgreSQL    │
            │    Port: 5432   │
            └─────────────────┘
```

### Services

- **Read Service** (`src/todo-services/read-service/`): Handles all read operations (GET endpoints)
- **Write Service** (`src/todo-services/write-service/`): Handles all write operations (POST, PUT, DELETE)
- **Shared Module** (`src/todo-services/shared/`): Common database utilities and configurations
- **Database** (`src/todo-services/database/`): PostgreSQL initialization scripts

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- GitHub token (for private package access)

### 1. Build Docker Images

```bash
# Build all services
./build-all-services.sh --github-token YOUR_GITHUB_TOKEN

# Or build individually
./build-read-service.sh --github-token YOUR_GITHUB_TOKEN
./build-write-service.sh --github-token YOUR_GITHUB_TOKEN
```

### 2. Start Services

Using xq-test-infra CLI (recommended):
```bash
# Generate and start with xq-infra
xq-infra generate -f todo-system.yml
xq-infra up -f xq-compose.yml
```

Or using Docker Compose directly:
```bash
# Start all services
docker-compose -f xq-compose.yml up -d

# Check service health
curl http://localhost:3001/health  # Read service
curl http://localhost:3002/health  # Write service
```

### 3. Test the Application

```bash
# Get all todos
curl http://localhost:3001/todos

# Create a new todo
curl -X POST http://localhost:3002/todos \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Test Todo",
    "description": "This is a test",
    "priority": "high"
  }'

# Update a todo
curl -X PUT http://localhost:3002/todos/1 \\
  -H "Content-Type: application/json" \\
  -d '{"completed": true}'
```

## 📁 Project Structure

```
todo-app/
├── src/todo-services/           # Microservices source code
│   ├── read-service/           # Read operations service
│   │   ├── src/               # Service implementation
│   │   ├── tests/             # Unit and integration tests
│   │   ├── Dockerfile         # Multi-stage Docker build
│   │   ├── .dockerignore      # Docker build context exclusions
│   │   ├── .npmrc             # NPM configuration
│   │   └── package.json       # Service dependencies
│   ├── write-service/          # Write operations service
│   │   ├── src/               # Service implementation
│   │   ├── tests/             # Unit and integration tests
│   │   ├── Dockerfile         # Multi-stage Docker build
│   │   ├── .dockerignore      # Docker build context exclusions
│   │   ├── .npmrc             # NPM configuration
│   │   └── package.json       # Service dependencies
│   ├── shared/                # Shared utilities
│   │   └── database.js        # Database connection utilities
│   └── database/              # Database initialization
│       └── init.sql           # Schema and sample data
├── e2e-tests/                 # End-to-end test suite
│   ├── tests/                 # E2E test cases
│   ├── setup/                 # Test environment setup
│   ├── utils/                 # Test utilities
│   └── package.json           # Test dependencies
├── build-read-service.sh      # Read service build script
├── build-write-service.sh     # Write service build script
├── build-all-services.sh      # Build all services script
├── docker-compose.e2e.yml     # E2E testing environment
├── todo-system.yml            # xq-infra service specification
├── xq-compose.yml             # Generated Docker Compose
└── nginx-gateway.conf         # Nginx proxy configuration
```

## 🛠️ Development

### Local Development Setup

1. **Start Database**:
   ```bash
   docker run -d --name todo-postgres \\
     -e POSTGRES_DB=todoapp \\
     -e POSTGRES_USER=todouser \\
     -e POSTGRES_PASSWORD=todopass \\
     -p 5432:5432 \\
     -v $(pwd)/src/todo-services/database/init.sql:/docker-entrypoint-initdb.d/init.sql \\
     postgres:15-alpine
   ```

2. **Install Dependencies**:
   ```bash
   cd src/todo-services/read-service && npm install
   cd ../write-service && npm install
   ```

3. **Set Environment Variables**:
   ```bash
   export DB_HOST=localhost
   export DB_USER=todouser
   export DB_PASSWORD=todopass
   export DB_NAME=todoapp
   export DB_PORT=5432
   export NODE_ENV=development
   ```

4. **Start Services**:
   ```bash
   # Terminal 1 - Read Service
   cd src/todo-services/read-service
   npm run dev

   # Terminal 2 - Write Service
   cd src/todo-services/write-service
   npm run dev
   ```

### Running Tests

#### Unit Tests
```bash
# Read service tests
cd src/todo-services/read-service && npm test

# Write service tests
cd src/todo-services/write-service && npm test

# With coverage
npm run test:coverage
```

#### Integration Tests
```bash
# Start test environment
docker-compose -f docker-compose.e2e.yml up -d

# Run E2E tests
cd e2e-tests && npm test

# Cleanup
docker-compose -f docker-compose.e2e.yml down
```

## 🔧 Build Scripts

### Security Features

All build scripts implement security best practices:
- Multi-stage Docker builds for smaller, secure images
- GitHub tokens only used in build stage, never persisted
- Automatic security verification after build
- Service-specific .dockerignore files

### Build Options

```bash
# Basic build
./build-all-services.sh

# With custom tag
./build-all-services.sh -t v1.0.0

# With GitHub token for private packages
./build-all-services.sh --github-token YOUR_TOKEN

# Custom image names
./build-all-services.sh --read-image my-read-service --write-image my-write-service
```

## 📊 API Documentation

### Read Service (Port 3001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/todos` | GET | Get all todos |
| `/todos/:id` | GET | Get todo by ID |
| `/todos?completed=true` | GET | Filter by completion status |
| `/todos?priority=high` | GET | Filter by priority |

### Write Service (Port 3002)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/todos` | POST | Create new todo |
| `/todos/:id` | PUT | Update existing todo |
| `/todos/:id` | DELETE | Delete todo |

### Request/Response Examples

**Create Todo:**
```json
POST /todos
{
  "title": "Learn Docker",
  "description": "Complete Docker tutorial",
  "priority": "medium",
  "due_date": "2024-02-01T10:00:00Z"
}
```

**Response:**
```json
{
  "id": 1,
  "title": "Learn Docker",
  "description": "Complete Docker tutorial",
  "completed": false,
  "priority": "medium",
  "due_date": "2024-02-01T10:00:00Z",
  "created_at": "2024-01-15T08:30:00Z",
  "updated_at": "2024-01-15T08:30:00Z"
}
```

## 🔍 Testing Strategy

### Test Pyramid

1. **Unit Tests**: Service logic, repositories, middleware (80% coverage minimum)
2. **Integration Tests**: API endpoints, database interactions
3. **E2E Tests**: Complete user workflows across services

### Test Categories

- **Database Integration**: Tests with real PostgreSQL
- **Cross-Service Communication**: Service interaction tests
- **Data Consistency**: CRUD workflow validation
- **Performance**: Load and stress testing

## 🚨 Troubleshooting

### Common Issues

**1. Build Failures**
```bash
# Check Docker daemon
docker info

# Clean build cache
docker system prune -a

# Rebuild with no cache
./build-all-services.sh --no-cache
```

**2. Database Connection Issues**
```bash
# Check PostgreSQL container
docker logs postgres-container-name

# Test connection
docker exec -it postgres-container-name psql -U todouser -d todoapp
```

**3. Port Conflicts**
```bash
# Check what's using ports
lsof -i :3001
lsof -i :3002
lsof -i :5432

# Kill conflicting processes
kill -9 <PID>
```

**4. GitHub Token Issues**
```bash
# Verify token has correct permissions
# Token needs: read:packages, read:org

# Test token
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user
```

### Logs and Monitoring

```bash
# Service logs
docker logs todo-read-service-container
docker logs todo-write-service-container

# Database logs
docker logs postgres-container

# Follow logs in real-time
docker logs -f container-name
```

### Health Checks

All services include health check endpoints:

```bash
# Check service health
curl http://localhost:3001/health
curl http://localhost:3002/health

# Docker health status
docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"
```

## 🔒 Security

- **Multi-stage Docker builds** prevent secrets leakage
- **Non-root users** in containers for security
- **Input validation** on all API endpoints
- **Security headers** via Helmet.js
- **Database connection pooling** prevents connection exhaustion

## 📈 Performance

- **Connection pooling** for database efficiency
- **Compression middleware** for response optimization
- **Health checks** for container orchestration
- **Index optimization** on frequently queried columns

## 🤝 Contributing

This is a test application for xq-test-infra. When making changes:

1. Run tests: `npm test`
2. Check code style: `npm run lint`
3. Update documentation as needed
4. Test with xq-infra CLI tools

## 📝 License

This project follows the same license as the parent xq-test-infra project (Apache 2.0).

---

For more information about the xq-test-infra CLI tool, see the [main README](../README.md).