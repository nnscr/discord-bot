# Use official Bun image (includes Bun + Node.js)
FROM oven/bun:1.2

# Set working directory
WORKDIR /app

# # Copy package files
# COPY bun.lock package.json tsconfig.json ./

# # Install dependencies (fast via Bun)
# RUN bun install

# Copy the rest of your code
COPY . .

# Build the TypeScript code
# RUN bun run build

# Default command to start the bot
CMD ["bun", "run", "start"]
