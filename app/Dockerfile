# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies needed for native modules (sharp, @napi-rs/canvas)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    pkgconfig \
    pixman-dev \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Runtime libraries for @napi-rs/canvas and sharp; wget for healthcheck
RUN apk add --no-cache \
    libc6-compat \
    pixman \
    cairo \
    pango \
    jpeg \
    giflib \
    librsvg \
    wget

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy built output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Migration script (plain JS — pg is available in the standalone node_modules)
RUN mkdir -p scripts
COPY --chown=nextjs:nodejs scripts/migrate.mjs ./scripts/migrate.mjs

# Startup script: runs migration then starts Next.js
COPY --chown=nextjs:nodejs start.sh ./start.sh
RUN chmod +x ./start.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Libuv thread pool (fs/crypto) — Sharp benefits from a slightly larger pool on
# Hobby+ where the service can use 1–2+ vCPU. Default Node value is 4. Override
# in Railway "Variables" if you scale vCPU.
ENV UV_THREADPOOL_SIZE=8

# start.sh runs migrations first, then exec's into server.js
CMD ["sh", "start.sh"]
