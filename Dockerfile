# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Production image ────────────────────────────────────────────────
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Only install runtime deps (no devDependencies)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built frontend + bundled server from build stage
COPY --from=builder /app/dist ./dist

# Copy Bible data files (verse lookup reads these at runtime)
COPY data ./data

EXPOSE 8080
CMD ["node", "dist/server.cjs"]
