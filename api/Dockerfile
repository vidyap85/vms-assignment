FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
COPY openapi.yaml ./openapi.yaml
RUN npm run build

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && npx prisma db seed && node dist/server.js"]
