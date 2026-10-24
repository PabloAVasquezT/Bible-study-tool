# Builds the static app and serves it with nginx. There is no backend.

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# A failing check stops the deploy, so the running version stays up.
RUN npm run typecheck && npm test && npm run build
# Precompress text files once, so nginx can serve them with gzip_static.
RUN find dist -type f \( -name '*.html' -o -name '*.js' -o -name '*.css' -o -name '*.json' -o -name '*.svg' -o -name '*.txt' \) \
    -exec gzip -9 -k {} +

FROM nginx:stable-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
