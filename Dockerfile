# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.30-alpine as production-stage

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf

# The CSP names the API and storage origins, which differ per deployment, so it
# is generated at container start rather than baked in. The default snippet is
# copied first so the server still starts with a policy if the entrypoint
# scripts are skipped — a container that boots without one would be the failure
# nobody notices.
RUN mkdir -p /etc/nginx/snippets
COPY nginx-security-headers.default.conf /etc/nginx/snippets/security-headers.conf
COPY docker-entrypoint.d/30-csp.sh /docker-entrypoint.d/30-csp.sh
RUN chmod +x /docker-entrypoint.d/30-csp.sh

# Overridden per environment; see docker-entrypoint.d/30-csp.sh for the full set.
ENV API_ORIGIN=http://localhost:3000
ENV STORAGE_ORIGIN=http://localhost:9000

COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
