# Sign Se Pehle — one Cloud Run container serving the JSON API and the built web app.
#
# Stage 1 installs every workspace dependency and builds core -> web -> server.
# Stage 2 installs production dependencies only and copies the three dist folders,
# so the runtime image carries no compilers, sources or dev tooling.

FROM node:24-alpine AS build
WORKDIR /app

# Manifests first: the dependency layer stays cached until a package.json or the lockfile changes.
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci --no-audit --no-fund

# Sources only (not whole package folders) so a developer's local .env can never enter a layer.
COPY packages/core/tsconfig.json packages/core/
COPY packages/core/src packages/core/src
COPY apps/server/tsconfig.json apps/server/
COPY apps/server/src apps/server/src
COPY apps/web apps/web
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
# Pick up Alpine security patches released after the base image was published.
RUN apk upgrade --no-cache
ENV NODE_ENV=production \
    PORT=8080

COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
# Production dependencies only; npm also links the core workspace that the server imports.
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=build /app/packages/core/dist packages/core/dist
COPY --from=build /app/apps/server/dist apps/server/dist
COPY --from=build /app/apps/web/dist apps/web/dist

USER node
EXPOSE 8080
CMD ["node", "apps/server/dist/index.js"]
