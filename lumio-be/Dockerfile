FROM node:20-alpine AS base
# Prisma's engine can't detect libssl on bare Alpine and silently falls back to the wrong
# target, which then fails at runtime — install it explicitly instead of guessing.
RUN apk add --no-cache openssl
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./
EXPOSE 3001
CMD ["node", "dist/main.js"]
