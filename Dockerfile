# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY server/package*.json ./server/

# Install dependencies
WORKDIR /app/server
RUN npm ci --only=production

# Copy Prisma schema
COPY server/prisma ./prisma/

# Generate Prisma client with proper permissions
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy server source code
COPY server/ ./

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
