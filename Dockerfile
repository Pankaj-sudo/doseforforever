# Use a node image with build tools
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* tsconfig.json vite.config.ts .env.example ./
COPY firebase-applet-config.json ./
COPY src ./src
COPY public ./public

RUN npm install
RUN npm run build

# Production image
FROM node:20-alpine AS runtime
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

EXPOSE 3000

ENV NODE_ENV=production
CMD ["node", "dist/server.cjs"]

# Vercel container root uses Dockerfile build staging. If you deploy via Vercel, ensure this Dockerfile is used.
