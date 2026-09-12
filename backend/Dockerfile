# Multi-stage Dockerfile for Backend Service

# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy Prisma schema and application source
COPY prisma ./prisma/
COPY tsconfig*.json ./
COPY src ./src

# Generate Prisma Client and build TypeScript bundle
RUN npx prisma generate
RUN npm run build

# ── Stage 2: Production Runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL for Prisma engine compatibility on Alpine
RUN apk add --no-cache openssl

# Copy package descriptors and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy Prisma schema and re-generate Prisma client for runner target
COPY prisma ./prisma/
RUN npx prisma generate

# Copy built application distribution from builder
COPY --from=builder /app/dist ./dist
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
