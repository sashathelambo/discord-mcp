#!/bin/bash

# Exit on any error
set -e

echo "Building Discord MCP..."

# Clean previous build
echo "Cleaning dist directory..."
rm -rf dist

# Create dist directory
mkdir -p dist

# Compile TypeScript
echo "Compiling TypeScript..."
npx tsc

# Copy other necessary files
echo "Copying assets..."
cp -r src/core dist/
cp -r src/utils dist/

# Copy package.json and other config files
echo "Copying configuration files..."
cp package.json dist/
cp README.md dist/ 2>/dev/null || echo "README.md not found"
cp LICENSE dist/ 2>/dev/null || echo "LICENSE not found"

echo "Build completed successfully!"