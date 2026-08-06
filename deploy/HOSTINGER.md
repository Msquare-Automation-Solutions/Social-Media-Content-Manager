# Deploying on Hostinger Web Apps

The app runs at **https://marketing.msquare.pro** on the company's Hostinger
**Cloud Startup** plan, using Hostinger's *Web Apps* (managed Node.js) feature.
Every push to `main` redeploys automatically.

Moved here from Vercel on 2026-08-06, after Vercel's Hobby tier paused the
deployment for compute overuse. Vercel's free tier is also non-commercial-only,
which this app isn't.

## What runs where

| | |
|---|---|
| Host | Hostinger Web Apps, Cloud Startup plan (Websites → Web Apps) |
| Datacentre | North America (USA, Arizona) — CDN edge terminates in Mumbai |
| URL | https://marketing.msquare.pro (subdomain of the WordPress site's domain) |
| Node | 22.x |
| Framework preset | Next.js, root `./`, default build/output (`npm run build` / `npm start`) |
| Source | GitHub `Social-Media-Content-Manager`, branch `main`, auto-deploy on push |
| Database | Neon Postgres, `us-east-1` — **unchanged by the move** |
| Files | Cloudflare R2 (`mediachat-uploads`) — **unchanged by the move** |
| TLS | Managed by Hostinger |

`msquare.pro` itself still serves WordPress from the same plan. The app is a
separate site entry on a subdomain and touches nothing of that install.

## Environment variables

Set in hPanel → the app → **Settings & Redeploy → Environment variables**. Changes
need a redeploy to take effect.

Carried over from Vercel unchanged:
`DATABASE_URL` (Neon pooled, keep `?sslmode=require`), `ANTHROPIC_API_KEY`,
`ANTHROPIC_MODEL`, `STORAGE_DRIVER=s3`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`,
`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`, `RESEND_API_KEY`.

Specific to this host:

- **`NEXTAUTH_URL=https://marketing.msquare.pro`** — must match the public URL exactly.
- **`NEXTAUTH_SECRET`** — copied **verbatim** from Vercel. Sessions are JWT
  (`src/lib/auth.ts`), so a different secret silently signs every user out. No
  passwords change when moving hosts.
- **`TZ=Asia/Kolkata`** — shared hosting can't have its system clock set, and Node
  honours `TZ`. This governs what counts as "today": on-time-vs-delayed publishing
  compares calendar days server-side (`src/app/api/tasks/[id]/route.ts`), and the
  reminder cron fires on server time. Vercel ran UTC, so a task due 6 Aug now stops
  being on time at 23:59 IST rather than 05:30 IST the next morning.
- **`CRON_SECRET`** — see below.

Deliberately **not** set here: `STORAGE_LIMIT_GB` (optional; the sidebar gauge
defaults to R2's 10 GB free tier), `MOCK_AI` and `NODE_ENV` (dev-only / set for us),
`EMAIL_FROM` (nothing reads it), and the local tooling credentials from `.env`
(`GITHUB_TOKEN`, `VERCEL_TOKEN`, `NEON_API_KEY`, `CLOUDFLARE_*`) — the app never
reads them and a shared host is no place for them.

## Shell access

Enabled per-site: hPanel → Websites → `msquare.pro` → Advanced → SSH Access.

```
ssh -p 65002 u922050140@82.197.88.119
```

Used for `npx prisma migrate deploy` after a schema change, and for reading logs.
Migrations are **not** part of the build, so a deploy never mutates the database on
its own — run them deliberately.

## The daily reminder cron

Vercel Cron doesn't exist here, so the job lives in hPanel → Advanced → **Cron Jobs**,
type **Custom**, scheduled daily at 04:00:

```
curl -fsS -H "Authorization: Bearer <CRON_SECRET>" https://marketing.msquare.pro/api/cron/deadline-reminders
```

The route checks the bearer token only when `CRON_SECRET` is set
(`src/app/api/cron/deadline-reminders/route.ts`) — before this move no secret was
configured, so the endpoint was reachable by anyone who knew the URL. Generate one
with `openssl rand -hex 32`, set it as an env var, and use the same value here.

hPanel's cron editor rejects shell metacharacters such as `>/dev/null 2>&1`; wrap the
command in a `.sh` file if you need them.

**This job fails silently.** If it's missing or the token is wrong, deadline
reminders simply stop and nobody is told. Check hPanel's *View Output* occasionally.

## Keeping the database awake (the "2 second lag")

Measured: the first query after Neon's compute has been idle takes **~3.6 s**;
subsequent ones ~0.6 s. With a handful of users the database sleeps most of the day,
so whoever opened the app first wore that delay. Second cron job, hPanel →
Advanced → Cron Jobs, type **Custom**:

```
*/5 9-20 * * *   curl -fsS https://marketing.msquare.pro/api/warm
```

Every 5 minutes from 09:00 to 20:00 server time (`TZ=Asia/Kolkata`), so the compute
stays warm through the working day and still sleeps overnight and at weekends —
important, because Neon's free plan has a monthly compute-hour allowance and keeping
it awake 24/7 would eat most of it. `/api/warm` runs a single `SELECT 1` and returns
`{ ok, ms }`; nothing to abuse, so it needs no token.

## R2 CORS

No action needed. The bucket allows `*` origins for `PUT`/`GET`/`HEAD`
(`scripts/set-r2-cors.ts`), which is safe because the presigned URL is itself the
authorisation. Verify any time with:

```bash
npx tsx --env-file=.env scripts/check-r2-cors.ts
```

Browser uploads go straight to R2 via `src/app/api/uploads/presign/route.ts`, so
large videos never pass through the app server at all.

## Known constraints of this host

- **No root**, so `ffmpeg` can't be installed. Video poster frames use the generated
  cover fallback — identical behaviour to Vercel, no code change.
- Invite and password-reset emails are **not actually sent**: `src/lib/mailer.ts` is
  a stub that logs the link. Retrieve links from the app logs until it's implemented.

## Verifying a deployment

1. `curl -I https://marketing.msquare.pro/login` → `200`, `x-powered-by: Next.js`.
2. Log in as an existing user with their existing password — proves `NEXTAUTH_SECRET`
   and `DATABASE_URL` came across.
3. Library grids and thumbnails render → R2 URLs still resolve.
4. Upload an image (presign → R2) **and** paste a screenshot into a rework note
   (server-side path).
5. Act in one browser, confirm a second catches up within ~20s (`/api/live`).
6. Publish a task and check on-time vs delayed matches the Indian calendar day.
7. Push a trivial commit and confirm it redeploys unattended.

A quick way to tell whether a deploy actually shipped: `/api/live` should return
`401` when unauthenticated, and `/api/notifications/stream` (deleted) should `404`.

## Rollback

The Vercel project and `vercel.json` are intact but the deployment is **paused**, so
falling back needs an upgrade or a billing-cycle reset first — it isn't instant. Both
hosts talk to the same Neon database and R2 bucket, so no data has to be moved or
restored in either direction.
