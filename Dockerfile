FROM node:20-slim

# Install system dependencies: Python (edge-tts), Chromium (Remotion), fonts
RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    chromium \
    fonts-noto-cjk \
    ca-certificates \
    --no-install-recommends \
    && pip3 install edge-tts --break-system-packages \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy server and video package manifests (for pnpm workspace resolution)
COPY apps/server/package.json ./apps/server/
COPY packages/video/package.json ./packages/video/

# Install dependencies (only server workspace)
RUN pnpm install --frozen-lockfile --filter server...

# Copy source
COPY apps/server/ ./apps/server/
COPY packages/video/ ./packages/video/

# Generate Prisma Client (requires DATABASE_URL format, but doesn't connect)
RUN DATABASE_URL="postgresql://user:pass@localhost:5432/dummy" pnpm --filter server db:generate

# Build server TypeScript
RUN pnpm --filter server build

# Chromium path for Remotion
ENV CHROME_PATH=/usr/bin/chromium

WORKDIR /app/apps/server
