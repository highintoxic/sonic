# syntax=docker/dockerfile:1

FROM node:18-alpine AS base

# Install FFmpeg and other dependencies
RUN apk add --no-cache ffmpeg

# Install pnpm
RUN npm install -g pnpm

# 1. Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat ffmpeg
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# 2. Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client and build TypeScript
RUN pnpm exec prisma generate
RUN pnpm run build

# 3. Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# Copy built application
COPY --from=builder --chown=expressjs:nodejs /app/dist ./dist
COPY --from=builder --chown=expressjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=expressjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=expressjs:nodejs /app/prisma ./prisma

USER expressjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "dist/index.js"]

