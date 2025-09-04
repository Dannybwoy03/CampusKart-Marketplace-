FROM node:18-alpine

# Install necessary packages - Updated for Railway
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN cd server && npm install

# Copy source code
COPY . .

# Generate Prisma client with proper permissions
RUN cd server && chmod +x node_modules/.bin/prisma && npx prisma generate

# Alternative: Use npm run build if direct prisma fails
# RUN cd server && npm run build

# Expose port
EXPOSE 5000

# Start the server
CMD ["npm", "run", "railway:start"]
