# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Vite substitutes import.meta.env.VITE_API_URL at BUILD time, so the API
# origin is compiled into the bundle and cannot be changed by an environment
# variable later. Without this argument a production image ships pointing at
# localhost:3000 and every request from a real browser fails.
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.30-alpine as production-stage

# nginx's mime.types maps `js` but not `mjs`, so an ES module is served as
# application/octet-stream — and browsers refuse module scripts with a
# non-JavaScript MIME type. pdf.js ships its worker as pdf.worker.min.mjs, so
# without this the viewer silently drops to a main-thread "fake worker" and
# fails to render. Vite's dev server sets the type correctly, which is why this
# only ever appears in a built image.
RUN sed -i 's|application/javascript\( *\)js;|application/javascript\1js mjs;|' \
      /etc/nginx/mime.types \
 && grep -q 'js mjs;' /etc/nginx/mime.types

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
