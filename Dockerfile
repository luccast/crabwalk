# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

# NOTE: TanStack Start server entry produced by `vite build` does not bind a port
# on its own in this repo, so we run the Vite dev server in Docker for now.
# This makes the published image functional while we figure out a proper prod server.

ENV NODE_ENV=development

COPY package*.json ./
RUN npm ci

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/vite.config.ts ./
COPY --from=builder /app/tsconfig.json ./

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
