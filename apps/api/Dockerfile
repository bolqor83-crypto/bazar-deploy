# Образ API Bazar (заготовка на будущее: в песочнице Docker недоступен).
# Multi-stage: зависимости → сборка → рантайм без dev-инструментов.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && pnpm build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY prisma ./prisma
# Статика mobile монтируется в /app/mobile-dist (MOBILE_DIST_PATH).
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
