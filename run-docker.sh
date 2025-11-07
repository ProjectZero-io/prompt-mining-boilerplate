#!/bin/bash

# Interactive Docker Setup and Run Script
# This script will guide you through building and running the app in Docker

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Prompt Mining Boilerplate - Docker Setup              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Step 1: Check prerequisites
echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi
echo -e "${GREEN}✓ Docker is installed: $(docker --version)${NC}"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}⚠ docker-compose not found, will use 'docker compose' instead${NC}"
    COMPOSE_CMD="docker compose"
else
    echo -e "${GREEN}✓ Docker Compose is installed: $(docker-compose --version)${NC}"
    COMPOSE_CMD="docker-compose"
fi

# Check .env file
if [ ! -f ".env" ]; then
    echo -e "${RED}✗ .env file not found${NC}"
    echo ""
    echo "Creating .env file from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env file${NC}"
        echo -e "${YELLOW}⚠ Please edit .env and add your configuration before continuing${NC}"
        echo ""
        read -p "Press Enter when you're done editing .env..."
    else
        echo -e "${RED}✗ .env.example not found${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ .env file exists${NC}"

# Check NPM token
echo ""
echo -e "${YELLOW}Step 2: Getting NPM authentication token...${NC}"
echo ""

NPM_TOKEN=""
if [ -f ~/.npmrc ]; then
    NPM_TOKEN=$(cat ~/.npmrc | grep "_authToken" | head -1 | cut -d'=' -f2)
fi

if [ -z "$NPM_TOKEN" ]; then
    echo -e "${RED}✗ No NPM token found in ~/.npmrc${NC}"
    echo ""
    echo "You need to login to npm first:"
    echo "  npm login"
    echo ""
    read -p "Do you want to run 'npm login' now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm login
        NPM_TOKEN=$(cat ~/.npmrc | grep "_authToken" | head -1 | cut -d'=' -f2)
        if [ -z "$NPM_TOKEN" ]; then
            echo -e "${RED}✗ Still no token found. Please check npm login.${NC}"
            exit 1
        fi
    else
        echo "Please run 'npm login' and try again"
        exit 1
    fi
fi

echo -e "${GREEN}✓ NPM token found: ${NPM_TOKEN:0:20}...${NC}"
export NPM_TOKEN

# Step 3: Choose build method
echo ""
echo -e "${YELLOW}Step 3: Choose how to build and run...${NC}"
echo ""
echo "1) Docker Compose (recommended - easiest)"
echo "2) Plain Docker commands (more control)"
echo "3) Just build, don't run"
echo ""
read -p "Enter your choice (1-3): " -n 1 -r
echo ""

case $REPLY in
    1)
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
        echo -e "${BLUE}Building with Docker Compose...${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
        echo ""
        
        # Export NPM_TOKEN for docker-compose
        export NPM_TOKEN
        
        # Build
        echo -e "${YELLOW}Building Docker image (this may take 2-3 minutes)...${NC}"
        $COMPOSE_CMD build
        
        echo ""
        echo -e "${GREEN}✓ Build complete!${NC}"
        echo ""
        
        # Ask to run
        read -p "Do you want to start the container now? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo ""
            echo -e "${YELLOW}Starting container...${NC}"
            $COMPOSE_CMD up -d
            
            echo ""
            echo -e "${GREEN}✓ Container is running!${NC}"
            echo ""
            echo "View logs:"
            echo "  $COMPOSE_CMD logs -f"
            echo ""
            echo "Stop container:"
            echo "  $COMPOSE_CMD down"
            echo ""
            
            # Wait a bit for container to start
            sleep 3
            
            # Test health endpoint
            echo -e "${YELLOW}Testing health endpoint...${NC}"
            if curl -s http://localhost:3000/health > /dev/null 2>&1; then
                echo -e "${GREEN}✓ API is responding!${NC}"
                curl -s http://localhost:3000/health | jq . 2>/dev/null || curl -s http://localhost:3000/health
            else
                echo -e "${YELLOW}⚠ Health endpoint not responding yet (may need more time to start)${NC}"
                echo ""
                echo "Check logs:"
                echo "  $COMPOSE_CMD logs -f"
            fi
        fi
        ;;
        
    2)
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
        echo -e "${BLUE}Building with plain Docker...${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
        echo ""
        
        IMAGE_NAME="prompt-mining-api"
        CONTAINER_NAME="prompt-mining-api"
        
        # Build
        echo -e "${YELLOW}Building Docker image (this may take 2-3 minutes)...${NC}"
        docker build --build-arg NPM_TOKEN=${NPM_TOKEN} -t ${IMAGE_NAME}:latest .
        
        echo ""
        echo -e "${GREEN}✓ Build complete!${NC}"
        echo ""
        
        # Ask to run
        read -p "Do you want to start the container now? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Stop existing container if running
            docker rm -f ${CONTAINER_NAME} 2>/dev/null || true
            
            echo ""
            echo -e "${YELLOW}Starting container...${NC}"
            docker run -d \
                --name ${CONTAINER_NAME} \
                -p 3000:3000 \
                --env-file .env \
                --restart unless-stopped \
                ${IMAGE_NAME}:latest
            
            echo ""
            echo -e "${GREEN}✓ Container is running!${NC}"
            echo ""
            echo "View logs:"
            echo "  docker logs -f ${CONTAINER_NAME}"
            echo ""
            echo "Stop container:"
            echo "  docker stop ${CONTAINER_NAME}"
            echo ""
            echo "Remove container:"
            echo "  docker rm -f ${CONTAINER_NAME}"
            echo ""
            
            # Wait a bit for container to start
            sleep 3
            
            # Test health endpoint
            echo -e "${YELLOW}Testing health endpoint...${NC}"
            if curl -s http://localhost:3000/health > /dev/null 2>&1; then
                echo -e "${GREEN}✓ API is responding!${NC}"
                curl -s http://localhost:3000/health | jq . 2>/dev/null || curl -s http://localhost:3000/health
            else
                echo -e "${YELLOW}⚠ Health endpoint not responding yet (may need more time to start)${NC}"
                echo ""
                echo "Check logs:"
                echo "  docker logs -f ${CONTAINER_NAME}"
            fi
        fi
        ;;
        
    3)
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
        echo -e "${BLUE}Building Docker image...${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
        echo ""
        
        IMAGE_NAME="prompt-mining-api"
        
        echo -e "${YELLOW}Building (this may take 2-3 minutes)...${NC}"
        docker build --build-arg NPM_TOKEN=${NPM_TOKEN} -t ${IMAGE_NAME}:latest .
        
        echo ""
        echo -e "${GREEN}✓ Build complete!${NC}"
        echo ""
        echo "Image: ${IMAGE_NAME}:latest"
        echo ""
        echo "To run the image:"
        echo "  docker run -d --name prompt-mining-api -p 3000:3000 --env-file .env ${IMAGE_NAME}:latest"
        ;;
        
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗"
echo -e "║                     Setup Complete!                        ║"
echo -e "╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Useful Commands:${NC}"
echo ""
if [ "$REPLY" = "1" ]; then
    echo "  ${COMPOSE_CMD} logs -f          # View logs"
    echo "  ${COMPOSE_CMD} restart         # Restart container"
    echo "  ${COMPOSE_CMD} down            # Stop and remove container"
    echo "  ${COMPOSE_CMD} up -d --build   # Rebuild and restart"
else
    echo "  docker logs -f prompt-mining-api     # View logs"
    echo "  docker restart prompt-mining-api     # Restart container"
    echo "  docker stop prompt-mining-api        # Stop container"
    echo "  docker rm -f prompt-mining-api       # Remove container"
fi
echo ""
echo -e "${GREEN}Test the API:${NC}"
echo "  curl http://localhost:3000/health"
echo ""
