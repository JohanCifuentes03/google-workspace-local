FROM node:22-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for TypeScript compilation)
RUN npm ci --silent && npm cache clean --force

# Copy source code and tools (in one layer)
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies and source files to reduce image size
# Keep dist/ folder and node_modules for production
RUN npm prune --production && \
    rm -rf *.ts tsconfig.json tools/ && \
    rm -rf /root/.npm

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

# Use exec form for better signal handling
CMD ["node", "dist/http-server.js"]