#!/bin/bash

# ========================================
# Google Workspace MCP - Test Setup Script
# ========================================

echo "🧪 Testing Google Workspace MCP Setup..."
echo "========================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is running
echo "🔍 Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi
print_status "Docker is running"

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found"
    exit 1
fi
print_status "docker-compose.yml found"

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    print_warning "backend/.env not found. Please copy backend/.env.example and configure it."
    echo "   cp backend/.env.example backend/.env"
    echo "   # Then edit backend/.env with your Google credentials"
    exit 1
fi
print_status "backend/.env found"

# Check if required environment variables are set
echo "🔍 Checking environment variables..."
if ! grep -q "GOOGLE_CLIENT_ID=.*[^[:space:]]" backend/.env; then
    print_error "GOOGLE_CLIENT_ID not set in backend/.env"
    exit 1
fi
print_status "GOOGLE_CLIENT_ID is set"

if ! grep -q "GOOGLE_CLIENT_SECRET=.*[^[:space:]]" backend/.env; then
    print_error "GOOGLE_CLIENT_SECRET not set in backend/.env"
    exit 1
fi
print_status "GOOGLE_CLIENT_SECRET is set"

# Start services
echo "🚀 Starting services..."
docker-compose up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    print_status "Services are running"
else
    print_error "Services failed to start"
    echo "🔍 Checking logs..."
    docker-compose logs
    exit 1
fi

# Test backend health
echo "🔍 Testing backend health..."
if curl -f http://localhost:3000/status/test > /dev/null 2>&1; then
    print_status "Backend is responding"
else
    print_warning "Backend health check failed, but this might be normal if no test endpoint exists"
fi

# Test frontend
echo "🔍 Testing frontend..."
if curl -f http://localhost:5173 > /dev/null 2>&1; then
    print_status "Frontend is responding"
else
    print_error "Frontend is not responding"
    exit 1
fi

# Test Redis
echo "🔍 Testing Redis..."
if docker-compose exec redis redis-cli ping | grep -q "PONG"; then
    print_status "Redis is responding"
else
    print_error "Redis is not responding"
    exit 1
fi

echo ""
echo "🎉 Setup test completed successfully!"
echo "========================================"
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "🔗 Backend:  http://localhost:3000"
echo "📊 Redis:   localhost:6379"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:5173"
echo "2. Click 'Crear Sesión y Conectar'"
echo "3. Complete Google OAuth"
echo "4. Copy your MCP URL"
echo ""
echo "To stop services: docker-compose down"
echo "To view logs: docker-compose logs -f"