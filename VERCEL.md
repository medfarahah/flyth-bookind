# Deploy on Vercel

## 1. Repository

Push this project to GitHub (or GitLab / Bitbucket). Vercel imports from git.

## 2. New project

1. Open [vercel.com](https://vercel.com) → **Add New** → **Project** → import the repo.
2. **Framework Preset:** Vite (auto-detected).
3. **Root Directory:** leave default (repository root).
4. **Build Command:** `npm run build` (default).
5. **Output Directory:** `dist` (default for Vite).

## 3. Environment variables

Add these in **Project → Settings → Environment Variables** (Production and Preview as needed).

### Required for the browser build (`VITE_*`)

| Name | Notes |
|------|--------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys → **Publishable key** |

### Required for the API (serverless)

| Name | Notes |
|------|--------|
| `DATABASE_URL` | Neon **pooled** connection string — host must include **`-pooler`** (required at **runtime** for `PrismaNeon` adapter). |
| `DIRECT_URL` | Neon **direct** URL — host **without** `-pooler` (for `prisma generate` / migrations). Set for **Production**, **Preview**, and **Build** so installs succeed. |
| `JWT_SECRET` | Long random string (legacy JWT auth) |
| `CLERK_SECRET_KEY` | Clerk **Secret key** (must match the same Clerk app as the publishable key) |

### Strongly recommended

| Name | Notes |
|------|--------|
| `CLIENT_ORIGIN` | Your production URL, e.g. `https://your-app.vercel.app` (comma-separate multiple origins). Used for CORS. |

Vercel sets `VERCEL_URL` automatically; the server adds `https://$VERCEL_URL` to allowed origins for previews.

### Optional

| Name | Notes |
|------|--------|
| `SERPAPI_API_KEY` | Live Google Flights in search results |
| `VITE_API_URL` | Only if the API is hosted elsewhere; leave unset on Vercel so the app uses same-origin `/api`. |

After changing `VITE_*` variables, trigger a **redeploy** so the client bundle picks them up.

## 4. Clerk dashboard

Under **Configure → Domains**, add:

- Production: `your-app.vercel.app` and your custom domain if any.
- For previews, add `*.vercel.app` or specific preview URLs so sign-in works on preview deployments.

## 5. Database

Run migrations or `prisma db push` from your machine with `DIRECT_URL`, or use Neon’s SQL editor. Ensure `User` has `clerkId` if you use Clerk (see Prisma schema).

### Database not working after deploy (checklist)

1. **Both** `DATABASE_URL` and `DIRECT_URL` exist in Vercel → **Settings → Environment Variables**, for **Production** and **Preview** (and **Development** if you use `vercel dev`). Missing vars are the most common issue — local `.env` is **not** uploaded to Vercel.
2. **`DATABASE_URL`** must be the **pooled** Neon string (Dashboard → **Connection string** → **Pooled** / hostname contains `-pooler`). The app uses `@prisma/adapter-neon`, which expects that URL. Append `?sslmode=require` if Neon does not add it.
3. **`DIRECT_URL`** must be the **direct** (non-pooler) URL for Prisma CLI / `prisma generate` (`prisma.config.ts`). Add it to **Build** env vars too so `npm run build` / `prisma generate` can read it.
4. Open **`https://YOUR_APP.vercel.app/api/health`** — you should see `{"ok":true,"database":"connected"}`. If you see `503` and `database: "error"`, the URL is set but Neon rejected the connection (wrong password, DB deleted, or IP / project issue).
5. Redeploy after changing env vars (**Deployments → … → Redeploy**).

## 6. Local check

```bash
npm run build
```

Install [Vercel CLI](https://vercel.com/docs/cli) optional:

```bash
npx vercel
```

## 7. API returns HTML instead of JSON

If `/api/...` responses look like your `index.html` (DOCTYPE, `<div id="root">`), the SPA fallback was routing **all** paths to `index.html`, including `/api`.

This project’s `vercel.json` only rewrites **non-API** paths to `index.html` (see the `rewrites` entry). Redeploy after pulling that change.

Quick check in the browser: open `https://YOUR_DOMAIN/api/health` — you should see `{"ok":true,"database":"connected"}` as JSON, not HTML.

## Stack note (not Next.js)

This repo is **Vite + Express** on Vercel (`api/[[...path]].ts` + `serverless-http`). The same optimizations apply as for Next.js (Prisma singleton, indexes, `maxDuration`, bounded queries). **Do not use Edge Runtime** for these routes: Prisma + Neon adapter + Express require **Node.js**.

## 8. `FUNCTION_INVOCATION_TIMEOUT`

Serverless has a **max duration** (this repo sets **60s** and **3008 MB** in `vercel.json` + `api/[[...path]].ts`). On the **Hobby** plan, Vercel may still **cap** execution (often **10s**) — upgrade to **Pro** for longer limits, or keep responses fast.

After large seeds, flight search can be heavy. The API caps list results at **500** rows and adds an index on **`departureTime`**. Apply the index to Neon:

```bash
cd server && npx prisma db push
```
