# HY-Uni/server/Dockerfile
FROM node:20-slim AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM node:20-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Cloud Run은 PORT 환경변수를 자동 주입합니다.
# Node 코드는 반드시 process.env.PORT로 listen 해야 합니다.
CMD ["node", "dist/index.js"]