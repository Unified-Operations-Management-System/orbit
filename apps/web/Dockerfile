# Build context: repo root  (docker build -f apps/web/Dockerfile .)
FROM node:24-alpine AS base
RUN npm install -g pnpm@12.11.2 turbo@2.11.8
ENV NEXT_TELEMETRY_DISABLED=1

# 1. Keep only what the web app needs from the monorepo.
FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune web --docker

# 2. Install deps (cached layer), then build.
FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
# Rewrites are resolved at build time, so the API address must be known here.
ARG API_URL=http://api:8080
ENV API_URL=$API_URL
# The generated client is committed, so no Go toolchain is needed in this image.
RUN pnpm --filter web run build

# 3. Minimal runtime image.
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
