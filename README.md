# Lumio LMS

[![Build Status](https://github.com/sandip-gavade/lumiolms/actions/workflows/ci.yml/badge.svg)](https://github.com/sandip-gavade/lumiolms/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Multi-tenant B2B SaaS Learning Management System. Organizations sign up as tenants and get a
branded instance with their own Students, Instructors, and Org Admins, plus a platform-level
Super Admin role across all tenants. Supports paid courses via Stripe.

**Stack:** NestJS + Prisma + PostgreSQL (backend), Next.js + React (frontend), Redis + BullMQ
(async jobs), Docker Compose for local dev.

See [`docs/requirements.md`](docs/requirements.md) for full functional/non-functional
requirements and [`docs/design/lumio-system-design.html`](docs/design/lumio-system-design.html)
for the system design.

## Project structure

```
lumio-be/   NestJS API (Prisma/PostgreSQL, JWT auth, Stripe, BullMQ)
lumio-fe/   Next.js frontend
docs/       Requirements & system design
notes/      Working notes from development
```

## Prerequisites

- Node.js 20+
- Docker & Docker Compose (for Postgres/Redis, or running the full stack in containers)

## Quick start (Docker Compose)

Runs Postgres, Redis, the API, and the web app together.

```bash
cp lumio-be/.env.example lumio-be/.env
cp lumio-fe/.env.example lumio-fe/.env

docker compose up --build
```

- Web: http://localhost:3000
- API: http://localhost:3001

On first run, apply migrations and seed demo data inside the `api` container:

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run seed:demo
```

## Local development (without Docker)

### Backend (`lumio-be`)

```bash
cd lumio-be
cp .env.example .env   # update DATABASE_URL/REDIS_URL if not using docker-compose's ports
npm install
npx prisma migrate dev
npm run seed:plans      # optional: seed subscription plans
npm run seed:demo       # optional: seed a demo tenant + users
npm run start:dev
```

API runs at http://localhost:3001. Swagger/OpenAPI JSON can be regenerated with
`npm run docs:json`.

Backend env vars (`lumio-be/.env.example`):

| Var | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string (BullMQ broker) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing secrets |
| `PORT` | API port (default 3001) |
| `APP_URL` | Frontend URL, used in emails/links |
| `GOOGLE_CLIENT_ID` | Google OAuth login |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe payments |
| `PLATFORM_REVENUE_SHARE_PERCENT` | Platform revenue share on paid courses |

### Frontend (`lumio-fe`)

```bash
cd lumio-fe
cp .env.example .env
npm install
npm run dev
```

App runs at http://localhost:3000.

Frontend env vars (`lumio-fe/.env.example`):

| Var | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_TENANT_ID` | Fixed dev tenant id (seeded by `npm run seed:demo`), sent as `x-tenant-id` header so local dev doesn't need subdomain-based tenant routing |

## Testing

```bash
cd lumio-be
npm run test        # unit tests
npm run test:e2e    # e2e tests
npm run test:cov    # coverage
```

## Linting & formatting

```bash
# backend
cd lumio-be && npm run lint && npm run format

# frontend
cd lumio-fe && npm run lint
```
