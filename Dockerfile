FROM node:22-alpine

# Install build tools for native dependencies (like better-sqlite3)
RUN apk add --no-cache python3 make g++ 

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --include=dev

# Copy project files
COPY . .

# Build the frontend
RUN npm run build

# Keep the runtime image focused on production dependencies.
RUN npm prune --omit=dev

# Expose the port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["npm", "run", "start"]
