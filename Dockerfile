# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Install necessary build tools
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY server/package*.json ./server/

# Install dependencies (including dev dependencies for Prisma)
WORKDIR /app/server
RUN npm ci

# Copy Prisma schema
COPY server/prisma ./prisma/

# Generate Prisma client with proper permissions
RUN chmod +x node_modules/.bin/prisma
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy server source code
COPY server/ ./

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
