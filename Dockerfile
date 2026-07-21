FROM oven/bun:1

WORKDIR /app

COPY . .

RUN timeout 5m bun install -v --production --frozen-lockfile --no-save < /dev/null

ENV NODE_ENV=production
ENV PORT=9902

EXPOSE 9902

CMD ["bun", "server.js"]