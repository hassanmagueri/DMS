FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY apps/api apps/api

WORKDIR /app/apps/api
ENV DATABASE_URL=postgresql://dms:dms@postgres:5432/dms?schema=public
RUN npx prisma generate

ENV NODE_ENV=production
EXPOSE 4000
CMD ["npx", "tsx", "src/index.ts"]
