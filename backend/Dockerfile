FROM oven/bun:1

WORKDIR /app

# Deps first so a source-only change does not reinstall the world.
COPY --chown=bun:bun package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY --chown=bun:bun . .

# Bun runs the TypeScript directly - there is no build step to cache here.
USER bun
EXPOSE 4001

CMD ["bun", "run", "src/index.ts"]
