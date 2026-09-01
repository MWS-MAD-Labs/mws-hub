FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
# Kept OUT of conf.d on purpose. 30-nginx-server-name.sh renders the live
# config from this template on every container start, so it always edits a
# pristine source. Editing conf.d/default.conf in place is what let a plain
# container restart delete the whole config and leave nginx listening on
# nothing, which reads as 502 at the gateway.
COPY nginx.conf /etc/nginx/hub-site.conf.template
COPY docker-entrypoint.d/ /docker-entrypoint.d/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
