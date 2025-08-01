#!/bin/bash

# VideoHarvester Deployment Script
echo "🚀 Starting VideoHarvester deployment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p Downloads
mkdir -p cookies

# Build and start the application
echo "🔨 Building and starting VideoHarvester..."
docker-compose up --build -d

# Wait for the application to start
echo "⏳ Waiting for application to start..."
sleep 10

# Check if the application is running
if curl -f http://localhost:5000/health &> /dev/null; then
    echo "✅ VideoHarvester is running successfully!"
    echo "🌐 Open your browser and go to: http://localhost:5000"
    echo "📁 Downloads will be saved to: ./Downloads"
    echo ""
    echo "📋 Useful commands:"
    echo "  - View logs: docker-compose logs -f"
    echo "  - Stop app: docker-compose down"
    echo "  - Restart app: docker-compose restart"
else
    echo "❌ Application failed to start. Check logs with: docker-compose logs"
    exit 1
fi 