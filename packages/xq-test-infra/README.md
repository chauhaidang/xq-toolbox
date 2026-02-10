# XQ Test Infrastructure CLI

A simplified CLI tool for spinning up Docker-based test environments with automatic log capture and built-in gateway support.

Part of [xq-toolbox](https://github.com/chauhaidang/xq-toolbox). CI runs in the monorepo.
## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Create your XQ spec (YAML)
cat > my-app.yaml << EOF
services:
  web:
    image: nginx
    tag: alpine
    ports:
      - "8080:80"
  api:
    image: node
    tag: 18-alpine
    ports:
      - "3000:3000"
EOF

# Generate and start environment
./bin/xq-infra.js generate -f my-app.yaml
./bin/xq-infra.js up

# View logs when needed
./bin/xq-infra.js logs
./bin/xq-infra.js logs -f  # Follow in real-time

# Stop when done
./bin/xq-infra.js down
```

## 🎯 Features

- **Simplified Commands**: No complex arguments - just `generate`, `up`, and `down`
- **Intelligent Routing**: Route requests by HTTP method and path patterns ✨ NEW
- **Multi-File Configuration**: Organize services in separate files for better maintainability
- **On-Demand Log Viewing**: Flexible log viewing with service filtering and real-time following
- **Built-in Gateway**: Nginx reverse proxy for unified service access
- **Service Overrides**: JSON-based configuration overrides for different environments
- **Docker Integration**: Works with Docker Compose v2 and v1
- **CI/CD Ready**: GitHub Actions integration examples
- **Multi-stage Security**: Secure Docker builds with token management

## 📋 Table of Contents

- [Installation](#installation)
- [Commands](#commands)
- [XQ Specification Format](#xq-specification-format)
- [Multi-File Service Configuration](#multi-file-service-configuration)
- [Log Viewing](#log-viewing)
- [Service Overrides](#service-overrides)
- [Gateway Configuration](#gateway-configuration)
- [Registry Authentication](#registry-authentication)
- [GitHub Actions Integration](#github-actions-integration)
- [Examples](#examples)
- [Todo App Example](#todo-app-example)
- [Migration Guide](#migration-guide)
- [Troubleshooting](#troubleshooting)

## 📦 Installation

### Prerequisites
- Node.js 18+ or 20+ (LTS recommended)
- Docker Engine 20.10+ with Compose plugin
- Git (for cloning)

### Install from GitHub Package Registry

#### 1. Authenticate to GitHub Packages
Create or update your `~/.npmrc` file with GitHub authentication:

```bash
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> ~/.npmrc
echo "@chauhaidang:registry=https://npm.pkg.github.com" >> ~/.npmrc
```

Replace `YOUR_GITHUB_TOKEN` with a GitHub Personal Access Token that has `read:packages` permission.

#### 2. Install the CLI
```bash
# Install globally
npm install -g @chauhaidang/xq-test-infra

# Or install in your project
npm install --save-dev @chauhaidang/xq-test-infra
```

#### 3. Verify Installation
```bash
xq-infra --version
xq-infra --help
```

### Install from Source
```bash
git clone https://github.com/chauhaidang/xq-toolbox.git
cd xq-toolbox/packages/xq-test-infra
npm install
npm link  # Optional: make xq-infra available globally
```

### Verify Installation
```bash
./bin/xq-infra.js --version
./bin/xq-infra.js --help
```

## 🛠️ Commands

| Command | Description | Output |
|---------|-------------|---------|
| `generate -f spec.yaml` | Create docker-compose from XQ spec | `xq-compose.yml` |
| `up` | Start services (detached + logging) | Containers running |
| `down` | Stop services and cleanup | Clean shutdown |
| `logs [service]` | View container logs | Log output |

### Generate Command
Generate `xq-compose.yml` from an XQ specification.

```bash
xq-infra generate [options]

Options:
  -f, --file <path>         Path to XQ YAML spec file or directory containing *.service.yml files (required)
  --no-gateway              Disable default gateway injection
  --keep-file               Keep generated compose file after run
  --overrides <path>        Path to JSON file with overrides
```

**Examples:**
```bash
# Basic generation from single file (creates xq-compose.yml)
xq-infra generate -f services.yaml

# Generate from directory with multiple service files
xq-infra generate -f ./services

# Without gateway
xq-infra generate -f services.yaml --no-gateway

# With overrides
xq-infra generate -f services.yaml --overrides overrides.json
```

### Up Command
Start services from `xq-compose.yml` in detached mode. By default, attempts to pull images from registries but gracefully falls back to local images.

```bash
xq-infra up [options]

Options:
  --no-pull                 Skip pulling images (uses cached/local images only)
```

**Pull Behavior:**
- **Default (no flag)**: Attempts to pull images from registries. If an image fails to pull (e.g., custom/local image), the CLI logs a warning and continues using the local image if available.
- **With `--no-pull`**: Skips pulling entirely and uses only cached/local images.
- **Image priority**: Always tries to pull missing images first, then falls back to local images.

This approach works for:
- ✅ Registry images (Docker Hub, GitHub Container Registry, custom registries)
- ✅ Locally built images (e.g., `my-custom-service:latest`)
- ✅ Mixed environments (some images from registry, some locally built)

### Down Command
Stop and remove services from `xq-compose.yml`.

```bash
xq-infra down
```

### Logs Command
View logs from services in `xq-compose.yml`.

```bash
xq-infra logs [service] [options]

Options:
  -f, --follow              Follow log output in real-time
  -t, --tail <lines>        Number of lines to show (default: 100)
  --timestamps              Show timestamps
  [service]                 Optional: specific service name
```

## 📝 XQ Specification Format

The XQ spec is a YAML file that defines your test environment services:

```yaml
services:
  service-name:
    image: image-name          # Required: Docker image name
    tag: image-tag             # Optional: defaults to 'latest'
    ports:                     # Optional: port mappings
      - "host:container"
      - "container"
    environment:               # Optional: environment variables
      KEY: value
    volumes:                   # Optional: volume mounts
      - "/host/path:/container/path"
      - "volume-name:/container/path"
    command:                   # Optional: override container command
      - "command"
      - "arg1"
      - "arg2"
    depends_on:               # Optional: service dependencies
      - "other-service"
```

### Complete Example
```yaml
services:
  api:
    image: node
    tag: 18-alpine
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://user:pass@database:5432/mydb
    volumes:
      - "./src:/app/src"
      - "node_modules:/app/node_modules"
    command:
      - "npm"
      - "run"
      - "start:prod"
    depends_on:
      - database

  database:
    image: postgres
    tag: "15"
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - "pgdata:/var/lib/postgresql/data"
```

## 📁 Multi-File Service Configuration

For better maintainability and organization, you can split your services into separate files instead of using a single YAML file.

### Directory Structure

```
services/
├── xq.config.yml              # Optional: Global configuration
├── postgres.service.yml       # Database service
├── api-service.service.yml    # API service
└── web-service.service.yml    # Web service
```

### Service File Format

Each service file contains a single service definition:

```yaml
# postgres.service.yml
name: postgres                 # Service name (optional, defaults to filename)
image: postgres
tag: latest
environment:
  POSTGRES_DB: myapp
  POSTGRES_USER: user
  POSTGRES_PASSWORD: pass
ports:
  - "5432:5432"
```

```yaml
# api-service.service.yml
name: api-service
image: node
tag: 18-alpine
port: 3000                     # Auto-assigned host port
environment:
  DB_HOST: postgres
  DB_PORT: 5432
depends_on:
  - postgres
```

### Global Configuration File

The optional `xq.config.yml` file contains shared settings:

```yaml
# xq.config.yml
portRange:
  start: 3001                  # Starting port for auto-assignment

dependencies:                  # Centralized dependency groups
  database:
    - postgres
  cache:
    - redis
```

Services can reference dependency groups:

```yaml
# api-service.service.yml
name: api-service
image: node
tag: 18-alpine
port: 3000
dependencyGroups:
  - database                   # References xq.config.yml dependencies
  - cache
```

### Usage

Generate compose from directory:

```bash
# Generate from directory containing service files
xq-infra generate -f ./services
xq-infra up

# Works the same as single-file approach
xq-infra logs
xq-infra down
```

### Benefits

- **Modularity**: Each service in its own file
- **Version Control**: Easier to track service-specific changes
- **Scalability**: Simple to add/remove services
- **Team Collaboration**: Reduced merge conflicts
- **Reusability**: Share common services across projects

### File Naming Convention

- Service files: `<service-name>.service.yml` or `<service-name>.service.yaml`
- Global config: `xq.config.yml` or `xq.config.yaml`
- Service name defaults to filename without `.service.yml` extension

### Complete Example

See [examples/multi-service/](./examples/multi-service/) for a working example with:
- PostgreSQL database
- Node.js API service
- Nginx web service
- Global configuration

## 📊 Log Viewing

The CLI provides flexible log viewing capabilities through the `logs` command.

### Features
- **On-demand viewing**: Logs are shown only when requested
- **Service-specific logs**: View logs from individual services or all services
- **Real-time following**: Use `-f` flag for live log streaming
- **Customizable output**: Control number of lines and timestamp display
- **No background processes**: Commands return immediately

### Examples

```bash
# View all service logs (last 100 lines)
xq-infra logs

# Follow logs in real-time
xq-infra logs -f

# View specific service logs
xq-infra logs frontend
xq-infra logs backend -f

# Customized output
xq-infra logs --tail 50 --timestamps

# Combine with standard tools
xq-infra logs | grep -i error
xq-infra logs backend | grep "database connection"
```

## 🔧 Service Overrides

Override specific service configurations without modifying the original XQ spec.

### Override File Format
Create a JSON file with overrides:

```json
{
  "services": {
    "web-app": {
      "tag": "latest",
      "environment": {
        "DEBUG": "true",
        "LOG_LEVEL": "debug"
      },
      "ports": ["9090:80"]
    },
    "database": {
      "tag": "14",
      "environment": {
        "POSTGRES_PASSWORD": "newpassword"
      }
    }
  }
}
```

### Using Overrides
```bash
xq-infra generate -f base-spec.yaml --overrides dev-overrides.json
```

### Precedence Order
1. Override file values (highest priority)
2. Original XQ spec values
3. Default values (lowest priority)

## 🌐 Gateway Configuration

The CLI automatically adds an nginx gateway service that provides:
- Single entry point for all services
- Intelligent routing based on HTTP methods and paths
- Service routing via path prefixes (backward compatible)
- Load balancing and health checking

### Gateway Features
- **Intelligent Routing**: Route requests by HTTP method and path patterns
- **Service-Name Routing**: Backward compatible `/{service-name}/` routing
- **Service Discovery**: Automatic upstream configuration
- **Port Detection**: Extracts container ports from service definitions
- **Health Checks**: Basic nginx proxy health checking

### Intelligent Routing (NEW)

Define route-based routing in service files to enable method and path-based request routing:

```yaml
# todo-read-service.service.yml
name: todo-read-service
image: todo-read-service
tag: latest
port: 3000
routes:
  - methods: [GET]
    paths: ["/api/todos/*", "/health"]
```

```yaml
# todo-write-service.service.yml
name: todo-write-service
image: todo-write-service
tag: latest
port: 3000
routes:
  - methods: [POST, PUT, DELETE]
    paths: ["/api/todos/*"]
```

With intelligent routing configured:
- `GET http://localhost:8080/api/todos` routes to `todo-read-service`
- `POST http://localhost:8080/api/todos` routes to `todo-write-service`
- `PUT/DELETE http://localhost:8080/api/todos/1` route to `todo-write-service`

#### Benefits
- E2E tests only need ONE gateway URL
- Separation of read and write operations (CQRS pattern)
- Method-based routing for microservices
- Path pattern matching with wildcards

#### Route Configuration

```yaml
routes:
  - methods: [GET, POST]           # HTTP methods (optional, defaults to all)
    paths:                         # Path patterns to match
      - "/api/users"              # Exact path match
      - "/api/users/*"            # Wildcard match
      - "/health"                 # Health check endpoint
```

- **methods**: Array of HTTP methods (GET, POST, PUT, DELETE, PATCH). If omitted, all methods are matched
- **paths**: Array of path patterns. Use `/*` suffix for wildcard matching
- Multiple route blocks per service are supported
- Routes are processed in order defined

### Service-Name Routing (Backward Compatible)

Traditional service-name based routing continues to work:

```bash
# Access services by name
http://localhost:8080/todo-read-service/
http://localhost:8080/todo-write-service/
http://localhost:8080/database/
```

### Gateway Access Examples

With intelligent routing:
```bash
# Unified API endpoint - routes by method and path
curl http://localhost:8080/api/todos                    # GET -> read-service
curl -X POST http://localhost:8080/api/todos            # POST -> write-service
curl -X PUT http://localhost:8080/api/todos/1           # PUT -> write-service
curl http://localhost:8080/health                       # GET -> read-service
```

Without intelligent routing (service-name routing):
```bash
# Traditional service-specific endpoints
curl http://localhost:8080/api-service/
curl http://localhost:8080/web-service/
```

### Routing Priority

The gateway processes routes in this order:
1. **Path-based routes** (higher priority) - Intelligent routing by method and path
2. **Service-name routes** (fallback) - Traditional `/{service-name}/` routing

This ensures backward compatibility while enabling intelligent routing for services that configure it.

### Disabling Gateway
```bash
xq-infra generate -f services.yaml --no-gateway
```

## 🔐 Registry Authentication

### Local Development
For private registries, authenticate before running:

```bash
# Docker Hub
docker login

# GitHub Container Registry
docker login ghcr.io -u USERNAME -p TOKEN

# Private registry
docker login registry.example.com -u USERNAME -p PASSWORD
```

### Environment Variables
Set these variables for automatic authentication:

```bash
export DOCKER_USERNAME="your-username"
export DOCKER_PASSWORD="your-password"
# or
export REGISTRY_USERNAME="your-username"
export REGISTRY_PASSWORD="your-password"
```

## 🚀 GitHub Actions Integration

### E2E Testing Workflow

This repository includes a comprehensive E2E testing workflow that validates the entire test infrastructure:

**Features:**
- Automatic Docker image building with GitHub token authentication
- Service orchestration using xq-infra CLI
- Intelligent health check waiting with retry logic
- Complete test execution with JUnit XML and markdown reporting
- Automatic log capture on failure
- Proper cleanup regardless of test outcome

**Test Reporting:**
- JUnit XML format for CI/CD integration
- Custom markdown reports in GitHub Actions summary
- Collapsible sections for passed tests (compact view)
- Detailed stack traces for failures
- Artifacts uploaded with 7-day retention

See [`.github/workflows/e2e-tests.yml`](.github/workflows/e2e-tests.yml) for the complete implementation.

### Basic Workflow Template

```yaml
name: Test Infrastructure

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install xq-infra
      run: npm install

    - name: Setup Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Login to GitHub Container Registry
      uses: docker/login-action@v3
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Start test environment
      run: |
        ./bin/xq-infra.js generate -f test-spec.yaml
        ./bin/xq-infra.js up

    - name: Run tests
      run: |
        npm test

        # View logs if tests fail
        if [ $? -ne 0 ]; then
          ./bin/xq-infra.js logs
        fi

    - name: Cleanup
      if: always()
      run: ./bin/xq-infra.js down
```

### Reliability Features

The todo-app example demonstrates production-ready patterns for CI/CD:

**Database Connection Resilience:**
- Automatic retry with exponential backoff (30 attempts over ~2.5 minutes)
- Graceful degradation instead of immediate crashes
- Proper connection pool cleanup between retries

**Service Health Checks:**
- Docker Compose healthcheck integration
- Services wait for dependencies to be healthy before starting
- Gateway ensures backend services are ready before accepting traffic

**Test Reporting:**
- JUnit XML for machine-readable results
- Markdown summaries in GitHub UI
- Automatic artifact upload for historical analysis

## 📚 Examples

### Example 1: Web Application with Database
```yaml
# web-app.yaml
services:
  frontend:
    image: nginx
    tag: alpine
    ports:
      - "8080:80"
    volumes:
      - "./public:/usr/share/nginx/html"

  backend:
    image: node
    tag: 18-alpine
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://app:secret@postgres:5432/appdb
      NODE_ENV: development
    depends_on:
      - postgres

  postgres:
    image: postgres
    tag: "15"
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
    volumes:
      - "pgdata:/var/lib/postgresql/data"
```

```bash
# Start the environment
xq-infra generate -f web-app.yaml
xq-infra up

# Access services
curl http://localhost:8080/
curl http://localhost:8081/backend/health  # Via gateway

# View logs
xq-infra logs
xq-infra logs -f  # Follow in real-time
```

### Example 2: Microservices with Message Queue
```yaml
# microservices.yaml
services:
  user-service:
    image: myapp/user-service
    tag: latest
    ports:
      - "3001:3000"
    environment:
      REDIS_URL: redis://redis:6379
      DB_HOST: postgres
    depends_on:
      - postgres
      - redis

  order-service:
    image: myapp/order-service
    tag: latest
    ports:
      - "3002:3000"
    environment:
      REDIS_URL: redis://redis:6379
      USER_SERVICE_URL: http://user-service:3000
    depends_on:
      - redis
      - user-service

  postgres:
    image: postgres
    tag: "15"
    environment:
      POSTGRES_DB: microservices
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin123

  redis:
    image: redis
    tag: alpine
    ports:
      - "6379:6379"
```

### Example 3: Development with Override
Base specification (`base.yaml`):
```yaml
services:
  api:
    image: myapp/api
    tag: stable
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
```

Development overrides (`dev-overrides.json`):
```json
{
  "services": {
    "api": {
      "tag": "development",
      "environment": {
        "NODE_ENV": "development",
        "DEBUG": "true",
        "LOG_LEVEL": "debug"
      },
      "volumes": [
        "./src:/app/src",
        "./package.json:/app/package.json"
      ]
    }
  }
}
```

```bash
# Generate development environment
xq-infra generate -f base.yaml --overrides dev-overrides.json
xq-infra up
```

### Example 4: Multi-File Service Organization

Directory structure:
```
my-project/services/
├── xq.config.yml
├── postgres.service.yml
├── redis.service.yml
├── api-service.service.yml
└── web-service.service.yml
```

`services/xq.config.yml`:
```yaml
portRange:
  start: 3001

dependencies:
  backend:
    - postgres
    - redis
```

`services/postgres.service.yml`:
```yaml
name: postgres
image: postgres
tag: "15"
environment:
  POSTGRES_DB: myapp
  POSTGRES_USER: admin
  POSTGRES_PASSWORD: secret
ports:
  - "5432:5432"
```

`services/api-service.service.yml`:
```yaml
name: api-service
image: myapp/api
tag: latest
port: 3000
environment:
  NODE_ENV: production
dependencyGroups:
  - backend
```

```bash
# Generate from directory
xq-infra generate -f my-project/services
xq-infra up

# Access via gateway
curl http://localhost:8080/api-service/health
```

## 🧪 Todo App Example

This repository includes a complete todo application example that demonstrates real-world usage:

### Architecture
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

### Quick Start with Todo App

The todo-app now supports both single-file and multi-file configurations:

#### Option 1: Single-File Configuration (Traditional)
```bash
# Build the todo app images
cd todo-app
./build-all-services.sh --github-token YOUR_TOKEN

# Generate and start with xq-infra
cd ..
./bin/xq-infra.js generate -f todo-app/todo-system.yml
./bin/xq-infra.js up

# Test the application
curl http://localhost:3002/todos          # Get todos (auto-assigned port)
curl -X POST http://localhost:3003/todos \  # Create todo (auto-assigned port)
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "priority": "high"}'

# View logs
./bin/xq-infra.js logs
```

#### Option 2: Multi-File Configuration (Recommended)
```bash
# Build the todo app images
cd todo-app
./build-all-services.sh --github-token YOUR_TOKEN

# Generate from multi-file directory
cd ..
./bin/xq-infra.js generate -f todo-app/services
./bin/xq-infra.js up

# Services available at:
# - postgres: localhost:5432
# - todo-read-service: localhost:3002 (auto-assigned)
# - todo-write-service: localhost:3003 (auto-assigned)
# - Gateway: localhost:8080

# Test via gateway
curl http://localhost:8080/todo-read-service/todos
curl -X POST http://localhost:8080/todo-write-service/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "priority": "high"}'

# View logs
./bin/xq-infra.js logs
```

The multi-file structure in `todo-app/services/` contains:
- `postgres.service.yml` - Database configuration
- `todo-read-service.service.yml` - Read service
- `todo-write-service.service.yml` - Write service
- `xq.config.yml` - Global settings (port range, dependencies)

For complete todo app documentation, see [todo-app/README.md](./todo-app/README.md).

## 🔄 Migration Guide

### Migrating from Single-File to Multi-File Configuration

If you have an existing single-file XQ spec and want to split it into multiple service files:

#### Step 1: Create Services Directory

```bash
mkdir services
```

#### Step 2: Split Services into Individual Files

For each service in your original spec, create a separate `.service.yml` file:

**Original `my-app.yaml`:**
```yaml
services:
  postgres:
    image: postgres
    tag: latest
    environment:
      POSTGRES_DB: mydb
    ports:
      - "5432:5432"

  api:
    image: node
    tag: 18-alpine
    port: 3000
    depends_on:
      - postgres
```

**New structure:**

`services/postgres.service.yml`:
```yaml
name: postgres
image: postgres
tag: latest
environment:
  POSTGRES_DB: mydb
ports:
  - "5432:5432"
```

`services/api.service.yml`:
```yaml
name: api
image: node
tag: 18-alpine
port: 3000
depends_on:
  - postgres
```

#### Step 3: Extract Global Configuration (Optional)

If you have shared settings like `portRange` or centralized `dependencies`, create `xq.config.yml`:

```yaml
# services/xq.config.yml
portRange:
  start: 3001

dependencies:
  database:
    - postgres
```

#### Step 4: Update Your Commands

```bash
# Old command
xq-infra generate -f my-app.yaml

# New command
xq-infra generate -f ./services

# Everything else stays the same
xq-infra up
xq-infra logs
xq-infra down
```

#### Benefits After Migration

- ✅ Easier to manage individual services
- ✅ Better for version control (smaller diffs)
- ✅ Simpler to add/remove services
- ✅ Reduced merge conflicts in team environments
- ✅ Service files can be reused across projects

#### Backward Compatibility

**Important**: The single-file approach continues to work! You can:
- Keep using your existing single-file specs
- Gradually migrate services one at a time
- Mix both approaches in different projects

## 🛠️ Troubleshooting

### Common Issues

#### 1. Docker Compose Not Found
```
Error: Neither "docker compose" nor "docker-compose" command found
```
**Solution**: Install Docker with Compose plugin or docker-compose standalone.

#### 2. Permission Denied
```
Error: docker: permission denied
```
**Solution**: Add user to docker group:
```bash
sudo usermod -aG docker $USER
# Log out and back in
```

#### 3. Port Already in Use
```
Error: bind: address already in use
```
**Solution**: Change ports in your XQ spec or stop conflicting services:
```bash
docker ps  # Check running containers
docker stop <container-id>
```

#### 4. Image Pull Failures
```
Error: pull access denied for image
```
**Solution**: Authenticate to the registry:
```bash
docker login <registry-url>
```

#### 5. Service Not Starting
```bash
# Check service logs
xq-infra logs <service-name>

# Check service status
docker compose -f xq-compose.yml ps
```

### Debug Mode
Enable verbose logging:
```bash
export DEBUG=xq-infra:*
xq-infra generate -f services.yaml
```

### File Validation
Validate your XQ spec:
```bash
# Check YAML syntax
python -c "import yaml; yaml.safe_load(open('services.yaml'))"

# Generate and validate compose file
xq-infra generate -f services.yaml
docker compose -f xq-compose.yml config
```

## 📄 Requirements

- Node.js 18+ or 20+ (LTS recommended)
- Docker Engine 20.10+ with Compose plugin
- Git (for cloning)

## 📊 Version

Current version: **0.1.0** - Key improvements:
- Intelligent routing with HTTP method and path-based routing
- Multi-file service configuration support
- Simplified command interface
- Integrated log viewing with flexible options
- Comprehensive E2E testing workflow with JUnit XML and markdown reporting
- Database connection resilience with automatic retry logic
- Docker Compose healthcheck integration
- Better CI/CD integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests and documentation
5. Submit a pull request

## 🔗 Links

- **Repository**: https://github.com/chauhaidang/xq-toolbox (package: `packages/xq-test-infra`)
- **Issues**: https://github.com/chauhaidang/xq-toolbox/issues
- **Examples**: [./examples/](./examples/)

## 📝 License

Apache License 2.0 - see [LICENSE](LICENSE) file for details.

---

**Getting Help**
- Check command help: `xq-infra <command> --help`
- View logs: `xq-infra logs`
- Report issues: https://github.com/chauhaidang/xq-toolbox/issues