# Dev-mode container: docker-compose bind-mounts the source tree over /app (see
# docker-compose.yml at the repo root) so `next dev` hot-reloads on host file changes.
# node_modules and .next are anonymous volumes so the bind mount doesn't shadow what's
# installed/built inside the image with an empty (or host-OS-mismatched) host directory.
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
