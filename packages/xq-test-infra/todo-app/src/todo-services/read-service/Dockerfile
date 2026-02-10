# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY read-service/package*.json ./
COPY read-service/.npmrc ./.npmrc

# Install dependencies with token (only in build stage)
ARG GITHUB_TOKEN
RUN GITHUB_TOKEN=${GITHUB_TOKEN} npm ci --only=production --no-audit --no-fund && \
    rm -f .npmrc

# Copy shared dependencies and application code
COPY shared ./shared
COPY read-service/src/ ./src/

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install only runtime dependencies
RUN apk add --no-cache tini

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S readservice -u 1001 -G nodejs

# Copy only production files from builder
COPY --from=builder --chown=readservice:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=readservice:nodejs /app/shared ./shared
COPY --from=builder --chown=readservice:nodejs /app/src ./src
COPY --from=builder --chown=readservice:nodejs /app/package*.json ./

# Switch to non-root user
USER readservice

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "start"]