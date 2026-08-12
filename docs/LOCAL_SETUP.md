# RecordHub: Local Developer Setup Guide

## Prerequisites
- Node.js 20.x LTS or higher
- pnpm 9.x or npm 10.x
- Docker Desktop with Docker Compose V2
- Android Studio Jellyfish / Ladybug (for Android Kotlin app testing)

---

## 1. Quickstart with Docker Compose

1. Clone the repository and copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Spin up local development services (MongoDB Replica Set, Redis, MinIO S3 Mock):
   ```bash
   docker compose -f infra/docker/docker-compose.yml up -d
   ```

3. Install monorepo dependencies:
   ```bash
   npm install
   ```

4. Run database migrations and seed realistic test data:
   ```bash
   npm run seed --workspace=apps/api
   ```

5. Start all local development servers:
   ```bash
   npm run dev
   ```

---

## 2. Default Access Endpoints & Credentials

- **Web Dashboard**: `http://localhost:3000`
- **NestJS REST API**: `http://localhost:4000/api/v1`
- **Swagger / OpenAPI Documentation**: `http://localhost:4000/docs`
- **MinIO Console (S3 Local Mock)**: `http://localhost:9001` (User: `minioadmin` / Pass: `minioadmin`)

### Default Seeded User Logins
- **Company Admin**: `admin@academically.com` / `Academically@01`
- **Sales Manager**: `manager@academically.com` / `Academically@01`
- **Sales Agent**: `agent@academically.com` / `Academically@01`
