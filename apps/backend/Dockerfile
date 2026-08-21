# Builds the Quietjar backend as a container (Bunny Magic Container).
# Build from the MONOREPO ROOT (so workspace resolution works):
#   docker build -f apps/backend/Dockerfile -t quietjar-backend .

# --- Build stage: install only the backend's production dependencies ---
FROM oven/bun:1.2 AS build
WORKDIR /app
COPY package.json bun.lock* ./
COPY apps ./apps
# Root workspaces metadata + backend deps only.
RUN bun install --filter @quietjar/backend --production

# --- Runtime stage ---
FROM oven/bun:1.2 AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Node port that the container listens on (Magic Container maps a public port).
ENV PORT=3000
USER bun

COPY --from=build --chown=bun:bun /app/node_modules ./node_modules
COPY --chown=bun:bun /app/package.json ./package.json
COPY --chown=bun:bun /app/apps/backend/src ./apps/backend/src

WORKDIR /app/apps/backend
EXPOSE 3000
CMD ["bash", "-c", "cd /app/apps/backend && bun run start"]
