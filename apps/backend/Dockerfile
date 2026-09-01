# Builds the Quietjar backend as a container (Bunny Magic Container).
# Build from the MONOREPO ROOT (so workspace resolution works):
#   docker build -f apps/backend/Dockerfile -t quietjar-backend .

# --- Build stage: install only the backend's production dependencies ---
FROM --platform=$BUILDPLATFORM oven/bun:1.4 AS build
WORKDIR /app
COPY package.json bun.lock* ./
# Copy every workspace manifest so bun sees the full workspace set from the
# lockfile; otherwise the install fails its frozen-lockfile check and prunes src.
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/widget/package.json ./apps/widget/package.json
COPY apps/backend/src ./apps/backend/src
# Root workspaces metadata + backend deps only. This stage runs on the native
# builder arch (Bun segfaults under qemu emulation), so the optional native deps
# are pinned to the runtime target with --os/--cpu.
# --linker=hoisted keeps every dependency in /app/node_modules (Bun >=1.4
# defaults workspaces to the isolated linker, which scatters them into
# apps/*/node_modules symlinks that the runtime stage never copies).
RUN bun install --filter @quietjar/backend --production --os=linux --cpu=x64 --linker=hoisted

# --- Runtime stage ---
FROM oven/bun:1.4 AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Node port that the container listens on (Magic Container maps a public port).
ENV PORT=3000
USER bun

COPY --from=build --chown=bun:bun /app/node_modules ./node_modules
# Copy manifests and source from the build context so the runtime stage never
# depends on the build stage retaining them after `bun install --production`.
COPY --chown=bun:bun package.json ./package.json
COPY --chown=bun:bun apps/backend/package.json ./apps/backend/package.json
COPY --chown=bun:bun apps/backend/src ./apps/backend/src

WORKDIR /app/apps/backend
EXPOSE 3000
CMD ["bash", "-c", "cd /app/apps/backend && bun run start"]
