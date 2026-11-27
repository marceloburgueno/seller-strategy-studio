FROM oven/bun:1
WORKDIR /app
COPY . .
RUN bun install
ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "bun run dev -- --host 0.0.0.0 --port ${PORT:-8080}"]
