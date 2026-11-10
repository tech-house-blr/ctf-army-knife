# Build context is the repo root: the web build needs the root workspace
# lockfile plus vendor/, integration/ and scripts/ for the CyberChef bundle.
FROM node:24-bookworm AS build

WORKDIR /app
# Baked into the client bundle; this is the URL the *browser* uses to reach the API.
ARG NEXT_PUBLIC_SOLVER_API_URL=http://localhost:8000/api/solve
ENV NEXT_PUBLIC_SOLVER_API_URL=$NEXT_PUBLIC_SOLVER_API_URL \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=--max-old-space-size=8192

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
RUN npm ci --no-audit --no-fund

COPY . .
# Builds CyberChef into apps/web/public/tools/cyberchef, then the Next.js app.
RUN npm run build && npm prune --omit=dev


FROM node:24-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1

COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/web/package.json /app/apps/web/next.config.ts ./apps/web/
COPY --from=build --chown=node:node /app/apps/web/.next ./apps/web/.next
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public

USER node
WORKDIR /app/apps/web
EXPOSE 4000
CMD ["node", "/app/node_modules/next/dist/bin/next", "start", "-p", "4000"]
