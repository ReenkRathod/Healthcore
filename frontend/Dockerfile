# Multi-stage Dockerfile for Frontend Service (Vite + Nginx)

# ── Stage 1: Builder ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package descriptors and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and configuration files
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY eslint.config.js ./
COPY components.json ./
COPY public ./public
COPY src ./src

# Build static bundle using Vite / Nitro
RUN npm run build

# ── Stage 2: Nginx Web Server ──────────────────────────────────────────────────
FROM nginx:alpine AS runner

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static build output from builder stage
COPY --from=builder /app/.output/public /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
