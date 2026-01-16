# Use the official Bun image
FROM oven/bun:1-slim

WORKDIR /app

# Copy dependency definitions first to cache them
COPY package.json bun.lock ./

# Install dependencies
# --frozen-lockfile ensures we use the exact versions in bun.lock
RUN bun install --frozen-lockfile --production

# Copy the rest of the application code
COPY . .

# Run the start script defined in package.json ("bun run index.ts")
CMD ["bun", "run", "dev"]