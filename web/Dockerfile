FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
# Copy only what the Vite build actually needs — nginx.conf is deliberately excluded
# so editing it doesn't invalidate this layer and force a full rebuild.
COPY index.html vite.config.ts tailwind.config.js postcss.config.js tsconfig*.json ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
