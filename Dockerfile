FROM oven/bun:1

WORKDIR /app

COPY . .

RUN bun install --production

ENV NODE_ENV=production
ENV PORT=9902

EXPOSE 9902

CMD ["bun", "server.js"]