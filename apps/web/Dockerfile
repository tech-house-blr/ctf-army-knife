# Build context is the repo root: the web build needs the root workspace
# lockfile, and CyberChef needs vendor/, integration/ and scripts/cyberchef*.mjs.

# CyberChef only depends on its own inputs, so this stage stays cached until
# vendor/, integration/ or its build scripts change. Editing the app (or the
# other developer scripts) never rebuilds it.
FROM node:24-bookworm AS cyberchef
WORKDIR /app
ENV NODE_OPTIONS=--max-old-space-size=8192
COPY package.json ./
COPY scripts/cyberchef*.mjs scripts/
COPY integration integration
COPY vendor vendor
RUN npm run cyberchef:build


FROM node:24-bookworm AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
RUN npm ci --no-audit --no-fund

COPY apps/web apps/web
COPY --from=cyberchef /app/apps/web/public/tools/cyberchef apps/web/public/tools/cyberchef
# Build the workspace directly: the root prebuild hook would re-check CyberChef
# against vendor/, which this stage intentionally does not copy.
RUN npm run build -w @ctf-army-knife/web && npm prune --omit=dev


FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 \
    # Where the /api proxy forwards to; read per request, so override at runtime.
    API_URL=http://api:8000

COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/web/package.json /app/apps/web/next.config.ts ./apps/web/
COPY --from=build --chown=node:node /app/apps/web/.next ./apps/web/.next
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public

USER node
WORKDIR /app/apps/web
EXPOSE 4000
CMD ["node", "/app/node_modules/next/dist/bin/next", "start", "-p", "4000"]
