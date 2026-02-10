#!/bin/bash

# Build script for todo-app write service
# This script builds the Docker image for the write service

set -e

# Default values
IMAGE_NAME="todo-write-service"
TAG="latest"
GITHUB_TOKEN=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -n|--name)
            IMAGE_NAME="$2"
            shift 2
            ;;
        --github-token)
            GITHUB_TOKEN="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -t, --tag TAG          Image tag (default: latest)"
            echo "  -n, --name NAME        Image name (default: todo-write-service)"
            echo "  --github-token TOKEN   GitHub token for private packages"
            echo "  -h, --help             Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

echo "Building Docker image for write service..."
echo "Image: ${IMAGE_NAME}:${TAG}"
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

# Build the Docker image with multi-stage build
docker build \
    ${BUILD_ARGS} \
    --target production \
    -t "${IMAGE_NAME}:${TAG}" \
    -f src/todo-services/write-service/Dockerfile \
    src/todo-services/

# Security verification
echo "🔒 Verifying image security..."
docker run --rm "${IMAGE_NAME}:${TAG}" sh -c 'env | grep -i github || echo "✅ No GitHub tokens found in environment"'

echo ""
echo "✅ Successfully built ${IMAGE_NAME}:${TAG}"