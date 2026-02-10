#!/bin/bash
set -e

# Configuration
GATEWAY_URL="${GATEWAY_URL:-http://localhost:8080}"
MAX_ATTEMPTS="${MAX_WAIT_SECONDS:-60}"
SLEEP_INTERVAL=2

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏥 Waiting for services to be ready...${NC}"
echo -e "${BLUE}   Gateway URL: ${GATEWAY_URL}${NC}"
echo -e "${BLUE}   Max wait time: ${MAX_ATTEMPTS} seconds${NC}"
echo ""

# Function to check service health via gateway
check_service_health() {
  local service_name=$1
  local endpoint=$2
  local method=${3:-GET}

  if [ "$method" = "GET" ]; then
    response=$(curl -s -o /dev/null -w "%{http_code}" "${GATEWAY_URL}${endpoint}" 2>/dev/null || echo "000")
  else
    response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "${GATEWAY_URL}${endpoint}" 2>/dev/null || echo "000")
  fi

  if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ ${service_name} is healthy${NC}"
    return 0
  else
    echo -e "${YELLOW}⏳ ${service_name} not ready (HTTP ${response})${NC}"
    return 1
  fi
}

# Wait for gateway to be accessible
echo -e "${BLUE}📡 Checking gateway accessibility...${NC}"
attempt=0
gateway_ready=false

while [ $attempt -lt $MAX_ATTEMPTS ]; do
  if curl -s -o /dev/null -w "%{http_code}" "${GATEWAY_URL}" > /dev/null 2>&1; then
    gateway_ready=true
    echo -e "${GREEN}✅ Gateway is accessible${NC}"
    break
  fi

  attempt=$((attempt + 1))
  if [ $attempt -lt $MAX_ATTEMPTS ]; then
    echo -e "${YELLOW}⏳ Gateway not accessible, waiting... (${attempt}/${MAX_ATTEMPTS})${NC}"
    sleep $SLEEP_INTERVAL
  fi
done

if [ "$gateway_ready" = false ]; then
  echo -e "${RED}❌ Gateway did not become accessible within ${MAX_ATTEMPTS} seconds${NC}"
  echo -e "${RED}   Please check if services are running: docker ps${NC}"
  exit 1
fi

echo ""

# Wait for Read Service (via gateway intelligent routing)
echo -e "${BLUE}📖 Checking Read Service (via gateway)...${NC}"
attempt=0
read_service_ready=false

while [ $attempt -lt $MAX_ATTEMPTS ]; do
  if check_service_health "Read Service" "/health" "GET"; then
    read_service_ready=true
    break
  fi

  attempt=$((attempt + 1))
  if [ $attempt -lt $MAX_ATTEMPTS ]; then
    sleep $SLEEP_INTERVAL
  fi
done

if [ "$read_service_ready" = false ]; then
  echo -e "${RED}❌ Read Service did not become healthy within ${MAX_ATTEMPTS} seconds${NC}"
  echo -e "${RED}   Check logs with: ./bin/xq-infra.js logs${NC}"
  exit 1
fi

echo ""

# Wait for Write Service (via gateway intelligent routing)
echo -e "${BLUE}✍️  Checking Write Service (via gateway)...${NC}"
attempt=0
write_service_ready=false

while [ $attempt -lt $MAX_ATTEMPTS ]; do
  if check_service_health "Write Service" "/health" "GET"; then
    write_service_ready=true
    break
  fi

  attempt=$((attempt + 1))
  if [ $attempt -lt $MAX_ATTEMPTS ]; then
    sleep $SLEEP_INTERVAL
  fi
done

if [ "$write_service_ready" = false ]; then
  echo -e "${RED}❌ Write Service did not become healthy within ${MAX_ATTEMPTS} seconds${NC}"
  echo -e "${RED}   Check logs with: ./bin/xq-infra.js logs${NC}"
  exit 1
fi

echo ""

# Optional: Test gateway routing by checking API endpoints
echo -e "${BLUE}🔍 Verifying gateway routing...${NC}"

# Test GET request to /api/todos (should route to read service)
if check_service_health "Read Service routing" "/api/todos" "GET"; then
  echo -e "${GREEN}✅ Gateway routing to Read Service working${NC}"
else
  echo -e "${YELLOW}⚠️  Gateway routing test failed (may be expected if no data exists)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 All services are ready!${NC}"
echo -e "${GREEN}   Gateway: ${GATEWAY_URL}${NC}"
echo -e "${GREEN}   Read Service: Accessible via gateway with GET requests${NC}"
echo -e "${GREEN}   Write Service: Accessible via gateway with POST/PUT/DELETE requests${NC}"
echo ""

exit 0
