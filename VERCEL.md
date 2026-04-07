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
| `DATABASE_URL` | Neon **pooled** connection string (`-pooler` in host) |
| `DIRECT_URL` | Neon **direct** URL (for Prisma CLI if you run migrations from CI) |
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

Quick check in the browser: open `https://YOUR_DOMAIN/api/health` — you should see `{"ok":true}` as JSON, not HTML.
