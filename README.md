# Flyth — full-stack flight booking

React + Tailwind frontend with **[Clerk](https://clerk.com/docs/react/getting-started/quickstart)** (`@clerk/react`), **TypeScript** Express API, **PostgreSQL** via **Prisma 7** + **Neon** (`@prisma/adapter-neon`). Bookings use **Clerk session JWTs** verified with **`CLERK_SECRET_KEY`** (legacy **JWT** still supported if Clerk is not configured).

## Prerequisites

- Node.js 20+
- A Postgres database ([Neon](https://neon.tech) recommended) or local PostgreSQL

## 1. Neon + Prisma (backend)

In the [Neon Console](https://console.neon.tech), copy **two** connection strings:

1. **Pooled** — used as `DATABASE_URL` (hostname includes `-pooler`).
2. **Direct** — used as `DIRECT_URL` for Prisma CLI (`migrate`, `db push`).

Create `server/.env` from `server/.env.example` and set both URLs, **`CLERK_SECRET_KEY`** (Clerk Dashboard → API keys), `JWT_SECRET`, and optional `PORT` / `CLIENT_ORIGIN`.

Prisma 7 reads the CLI datasource from `server/prisma.config.ts` (`DIRECT_URL`). The running app uses `src/db.ts` with `PrismaNeon` and **`DATABASE_URL` (pooled)**.

```bash
cd server
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

- **`npx prisma generate`** — required after install or schema changes (client is emitted to `server/src/generated/prisma`, gitignored by default).
- **`npx prisma db push`** — syncs schema to Neon (or use `npx prisma migrate dev` if you prefer migrations).

### CRUD smoke test (Neon + adapter)

With `DATABASE_URL` set in `server/.env`:

```bash
cd server
npm run crud
```

This runs `src/main.ts` and performs create / read / update / delete on the **`DemoUser`** model (sample table for connectivity checks). Auth **`User`** / **`Flight`** / **`Booking`** models are unchanged for the app.

## 2. Frontend (project root)

Add **`VITE_CLERK_PUBLISHABLE_KEY`** (Clerk Dashboard → API keys → **Publishable key**). Prefer **`.env.local`** for local secrets; `.env` also works.

```bash
npm install
cp .env.example .env
# set VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
npm run dev
```

Open `http://localhost:5173`. Add `http://localhost:5173` under Clerk **Allowed origins** / redirect URLs if prompted.

**How the UI talks to the API**

| Piece | Role |
|--------|------|
| `src/api/client.js` | `fetch` wrapper, JWT header, errors → `ApiError` |
| `src/api/endpoints.js` | Paths: `/auth/*`, `/flights`, `/bookings/*` |
| `src/api/authApi.js`, `flightsApi.js`, `bookingsApi.js` | Thin wrappers used by pages |
| Vite `server.proxy` | In **dev**, requests go to **`/api/...`** and are proxied to Express (default `http://localhost:4000`), path rewritten so the server still sees `/auth`, `/flights`, etc. |

By default **`VITE_API_URL` is unset** in dev → the client uses **`/api`** (proxy). Set **`VITE_API_URL=http://localhost:4000`** if you want the browser to call the API directly (then CORS must allow the UI origin via **`CLIENT_ORIGIN`** in `server/.env`). Optional **`API_PROXY_TARGET`** in the root `.env` changes the proxy target.

Run **backend** (`cd server && npm run dev`) and **frontend** together for full-stack dev.

## Try the app

1. Register or log in (booking requires auth).
2. Search **New York** → **Los Angeles**, date **2026-04-10** (matches seed data).
3. Select a flight, complete passenger forms, **Book flight**.
4. Open **My bookings**.

## API summary

| Method | Path | Auth |
|--------|------|------|
| POST | `/auth/register` | — |
| POST | `/auth/login` | — |
| GET | `/flights?from=&to=&date=YYYY-MM-DD` | — |
| POST | `/bookings` | Bearer JWT |
| GET | `/bookings/my` | Bearer JWT |

## Scripts

| Location | Command | Purpose |
|----------|---------|---------|
| Root | `npm run dev` | Vite dev server |
| Root | `npm run build` | Production frontend build |
| `server/` | `npm run dev` | API (`tsx watch`) |
| `server/` | `npm run crud` | Demo CRUD on `DemoUser` |
| `server/` | `npm run typecheck` | `tsc --noEmit` |
| `server/` | `npx prisma generate` | Generate client into `src/generated/prisma` |
| `server/` | `npx prisma db push` | Push schema to DB |
| `server/` | `npx prisma db seed` | Seed flights |

## Implementation notes

- **Do not** import `PrismaClient` from `@prisma/client` in app code; use `./generated/prisma/client.js` via `src/db.ts`.
- `@neondatabase/serverless` is **not** declared in this repo’s `package.json`; it is installed **transitively** by `@prisma/adapter-neon`, per Prisma’s adapter design.
