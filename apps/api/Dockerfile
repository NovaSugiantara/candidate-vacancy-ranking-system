# syntax=docker/dockerfile:1

# ---- build -------------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app

# Workspace manifests first so the dependency layer caches independently of source.
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN npm ci

COPY apps/api ./apps/api
RUN npm run build -w @jobseeker/api

# ---- runtime -----------------------------------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# ponytail: full node_modules (dev deps included) keeps the workspace symlinks intact.
# Add `npm prune --omit=dev` here if image size starts to matter.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist

USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
