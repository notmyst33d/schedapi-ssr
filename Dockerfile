FROM oven/bun:alpine AS builder

WORKDIR /app
COPY . .

RUN bun install
RUN bun run build

FROM oven/bun:alpine

WORKDIR /app
COPY --from=builder /app/schedapi-ssr .
COPY --from=builder /app/public ./public

CMD ["/app/schedapi-ssr"]
