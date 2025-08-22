FROM oven/bun:canary-alpine

WORKDIR /app
COPY . .

RUN bun --bun install

CMD ["bun", "./src/index.tsx"]
