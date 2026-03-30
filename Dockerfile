# Stage 1: Build Stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build tools)
RUN npm install

# Copy source code
COPY . .

# Build the application (Vite + Esbuild)
RUN npm run build

# Stage 2: Runtime Stage
FROM node:18-alpine

WORKDIR /app

# Install production system dependencies
RUN apk add --no-cache python3 py3-pip ffmpeg curl

# Install yt-dlp via pip (more reliable for Linux)
RUN pip3 install yt-dlp

# Copy production node_modules from builder or install fresh
COPY package*.json ./
RUN npm ci --only=production

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
# Copy shared schema/types if needed by the runner
COPY --from=builder /app/shared ./shared

# Create necessary directories
RUN mkdir -p Downloads cookies

# Expose port
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:10000/health || exit 1

# Start the application
CMD ["npm", "start"]