#!/bin/bash

# Build script for all todo-app services
# This script builds Docker images for both read and write services

set -e

# Default values
TAG="latest"
GITHUB_TOKEN=""
READ_IMAGE="todo-read-service"
WRITE_IMAGE="todo-write-service"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        --github-token)
            GITHUB_TOKEN="$2"
            shift 2
            ;;
        --read-image)
            READ_IMAGE="$2"
            shift 2
            ;;
        --write-image)
            WRITE_IMAGE="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -t, --tag TAG             Image tag for both services (default: latest)"
            echo "  --github-token TOKEN      GitHub token for private packages"
            echo "  --read-image NAME         Read service image name (default: todo-read-service)"
            echo "  --write-image NAME        Write service image name (default: todo-write-service)"
            echo "  -h, --help                Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

echo "🚀 Building all todo-app services..."
echo "Tag: ${TAG}"
echo "Context: src/todo-services/"
echo ""

# Security check for GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
    echo "⚠️  WARNING: GITHUB_TOKEN not provided. Build may fail if private packages are required."
    echo "   Use: --github-token YOUR_TOKEN"
fi

# Build arguments (token only used in build stage, not persisted)
BUILD_ARGS=""
if [ ! -z "$GITHUB_TOKEN" ]; then
    BUILD_ARGS="--build-arg GITHUB_TOKEN=${GITHUB_TOKEN}"
fi

# Build read service
echo "📖 Building read service..."
docker build \
    ${BUILD_ARGS} \
    --target production \
    -t "${READ_IMAGE}:${TAG}" \
    -f src/todo-services/read-service/Dockerfile \
    src/todo-services/

echo "✅ Read service built: ${READ_IMAGE}:${TAG}"
echo ""

# Build write service
echo "✏️  Building write service..."
docker build \
    ${BUILD_ARGS} \
    --target production \
    -t "${WRITE_IMAGE}:${TAG}" \
    -f src/todo-services/write-service/Dockerfile \
    src/todo-services/

echo "✅ Write service built: ${WRITE_IMAGE}:${TAG}"
echo ""

# Security verification
echo "🔒 Verifying image security..."
echo "Checking read service..."
docker run --rm "${READ_IMAGE}:${TAG}" sh -c 'env | grep -i github || echo "✅ No GitHub tokens found"'
echo "Checking write service..."
docker run --rm "${WRITE_IMAGE}:${TAG}" sh -c 'env | grep -i github || echo "✅ No GitHub tokens found"'

echo ""

echo "🎉 All services built successfully!"
echo "Images created:"
echo "  - ${READ_IMAGE}:${TAG}"
echo "  - ${WRITE_IMAGE}:${TAG}"