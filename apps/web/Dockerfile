# ---- build -------------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app

# Both workspace manifests are needed for `npm ci` to resolve the root lockfile.
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN npm ci

COPY apps/web ./apps/web

# Baked into the bundle at build time; nginx proxies /api to the api service.
ENV VITE_API_BASE_URL=/api
RUN npm run build -w @jobseeker/web

# ---- runtime -----------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
