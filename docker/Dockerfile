# ── Stage 1: Install dependencies ─────────────────────
FROM --platform=linux/amd64 node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++ openssl
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: Build the application ────────────────────
FROM --platform=linux/amd64 node:20-alpine AS builder
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

# Inject Clerk public keys for frontend build
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL=/login
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL
ENV NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL

# Build Next.js (standalone output)
RUN npm run build

# Compile TypeScript workers (fail-fast: no || true)
RUN npx tsc --project tsconfig.worker.json

# ── Stage 3: Production image ─────────────────────────
FROM --platform=linux/amd64 node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install OS dependencies: OpenSSL for Prisma (no FFmpeg — web container doesn't render)
RUN apk add --no-cache openssl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone build output (Web App)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy node_modules for the Next.js standalone server
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy Prisma client (needed at runtime by both)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# (Web App container should exclusively run Next.js)
USER nextjs

# Cloud Run uses port 8080 by default
EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Start ONLY the Next.js web app (workers run in a separate container)
CMD ["node", "server.js"]
