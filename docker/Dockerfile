# ── Stage 1: Install dependencies ─────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++ openssl
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: Build the application ────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Inject dummy env vars for Next.js build-time tracing (SDK initialization checks)
ARG OPENAI_API_KEY="dummy_key_for_build"
ARG UPSTASH_REDIS_REST_URL="https://dummy.url"
ARG UPSTASH_REDIS_REST_TOKEN="dummy_token"
ARG REDIS_URL="redis://dummy:6379"

# Build Next.js (standalone output)
RUN npm run build

# Compile TypeScript workers
RUN npx tsc --project tsconfig.worker.json || true

# ── Stage 3: Production image ─────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install OS dependencies: FFmpeg for video processing, OpenSSL for Prisma
RUN apk add --no-cache ffmpeg openssl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone build output (Web App)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy full node_modules because workers need them
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy compiled worker files (Background Workers)
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist

# Copy Prisma client (needed at runtime by both)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Copy the universal startup script
COPY --chown=nextjs:nodejs start.sh ./start.sh
RUN chmod +x ./start.sh

USER nextjs

# Cloud Run uses port 8080 by default
EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Start both web and worker processes
CMD ["sh", "./start.sh"]
