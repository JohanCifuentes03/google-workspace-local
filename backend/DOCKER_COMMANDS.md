# Build the image
docker build -t google-workspace-backend .

# Run the container (uses .env file from build)
docker run -d --name mcp-backend -p 3000:3000 google-workspace-backend

# View logs
docker logs -f mcp-backend

# Stop and remove
docker stop mcp-backend && docker rm mcp-backend
