# MediaChat — Chat-First Content Studio

A team content studio for social media: **create → save & tag → browse/filter → download**.
Generate drafts (blog posts, thumbnail concepts, video scripts) in a built-in AI chat,
or upload files (images, video, **PDF**, **Word**), then tag each item by _creator_,
_content type_, and _social platform_ so your whole team can filter the library.
Includes a review/approval workflow, roles, dark mode, and a workspace overview tree.

> Built with Next.js (App Router), TypeScript, Prisma + PostgreSQL, NextAuth, the
> Anthropic API, and S3-compatible storage (Cloudflare R2). This README shows you how
> to run your own copy from scratch.

---

## Features

- **Chat-first creation** — an AI "content generation" skill produces drafts as cards you explicitly **Save**.
- **Save & tag dialog** — every asset gets a name, a thumbnail, a creator (Person), a content type, and one or more social platforms.
- **Library** — filterable grids per type (Images, Carousels, Video, Articles) by person / platform / status / date.
- **Uploads** — images, video, PDF, and Word (`.docx`) files; PDFs preview inline, `.docx` renders as HTML.
- **Review workflow** — Pending → Approved / Needs rework → Published, with notifications.
- **Roles** — Owner / Admin / Editor / Viewer, server-enforced.
- **Workspace overview** — an org-chart tree of content across every platform.
- **Dark mode**, versioning, trash/restore, and password reset flows.

## Tech stack

| Area      | Choice |
| --------- | ------ |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling   | Tailwind CSS |
| Data      | Prisma ORM + PostgreSQL |
| Auth      | NextAuth (email + password) |
| AI        | Anthropic API (`@anthropic-ai/sdk`), streaming + tool use |
| Storage   | S3-compatible (`@aws-sdk/client-s3`) — local disk in dev, Cloudflare R2/S3 in prod |
| Images    | `sharp` (thumbnails), `mammoth` (`.docx` → HTML) |
| State     | TanStack Query |
| Tests     | Vitest (unit) + Playwright (e2e) |

---

## Prerequisites

- **Node.js 20+** and npm
- A **PostgreSQL** database — a free [Neon](https://neon.tech) project works great (or local Postgres)
- An **Anthropic API key** — from [console.anthropic.com](https://console.anthropic.com) (only needed for the chat/AI features)
- _(Optional for production)_ An **S3-compatible bucket** — e.g. [Cloudflare R2](https://developers.cloudflare.com/r2/) — for storing uploaded files. Local disk is used automatically in dev.

## Quick start

> **Want a guided, illustrated walkthrough?** Download
> **[Setup-and-Deployment-Guide.docx](Setup-and-Deployment-Guide.docx)** — a
> professional step-by-step guide (with screenshots) that takes you from forking
> the repo → free database → deploying live on Vercel. No experience required.

```bash
# 1. Clone and install
git clone https://github.com/Msquare-Automation-Solutions/Social-Media-Content-Manager.git
cd Social-Media-Content-Manager
npm install

# 2. Configure environment
cp .env.example .env
#   then edit .env — see the table below (minimum: DATABASE_URL + NEXTAUTH_SECRET)

# 3. Set up the database schema + seed demo data
npm run db:migrate      # creates the tables
npm run db:seed         # seeds a workspace, members, people, platforms, sample assets

# 4. Run it
npm run dev             # http://localhost:3000
```

Generate a value for `NEXTAUTH_SECRET` with:

```bash
openssl rand -base64 32
```

### Default login (from the seed)

After `npm run db:seed`, sign in at `/login` with:

- **Email:** `admin@msquare.pro`
- **Password:** `msquare2026`

Change these in `prisma/seed.ts` before seeding if you like.

---

## Environment variables

Copy `.env.example` → `.env` and fill these in:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Neon: use the **pooled** URL, keep `?sslmode=require`). |
| `NEXTAUTH_URL` | ✅ | App URL, e.g. `http://localhost:3000` in dev. |
| `NEXTAUTH_SECRET` | ✅ | Random secret (`openssl rand -base64 32`). |
| `ANTHROPIC_API_KEY` | For AI chat | Server-side Anthropic key. Chat/generation is disabled without it. |
| `ANTHROPIC_MODEL` | optional | Override the default model. |
| `STORAGE_DRIVER` | optional | `local` (default in dev — files under `/public/uploads`) or `s3` for R2/S3. |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` | If `STORAGE_DRIVER=s3` | Your R2/S3 bucket details. |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | If `STORAGE_DRIVER=s3` | Bucket API credentials. |
| `S3_PUBLIC_BASE_URL` | If `STORAGE_DRIVER=s3` | Public base URL objects are served from. |
| `RESEND_API_KEY` / `EMAIL_FROM` | optional | For sending password-reset emails. In dev, reset links are logged to the console instead. |

> **Never commit `.env`** — it's already in `.gitignore`. Only `.env.example` (placeholders) is tracked.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed demo workspace + data |
| `npm run db:reset` | Drop + recreate + reseed (⚠️ destroys data) |
| `npm run lint` / `npm run typecheck` | Lint / type-check |
| `npm test` | Unit tests (Vitest) |
| `npm run e2e` | End-to-end tests (Playwright) |

---

## Deployment

The app runs well on **Vercel**:

1. Push your fork to GitHub and import it in Vercel.
2. Add all the environment variables above in the Vercel project settings — set `STORAGE_DRIVER=s3` and provide the R2/S3 vars (local disk isn't persistent on serverless), and set `NEXTAUTH_URL` to your production URL.
3. Point `DATABASE_URL` at a hosted Postgres (e.g. Neon) and run `npm run db:migrate` against it (once).
4. Deploy. Uploaded files are served from your bucket's `S3_PUBLIC_BASE_URL`.

---

## Project layout

```
src/
  app/            # Next.js App Router routes + API endpoints
  components/     # UI (sidebar, chat, library, save dialog, overview tree, …)
  lib/            # data access, auth, storage, thumbnails, docx, validation
prisma/
  schema.prisma   # data model
  seed.ts         # demo data
scripts/          # one-off migration/seed utilities
```

`CLAUDE.md` documents the product spec and conventions in detail.

## Credits

Built by **Msquare Automation Solutions**.

- 📧 Email: [admin@msquare.pro](mailto:admin@msquare.pro)
- 📞 Phone: [+91 77365 07130](tel:+917736507130)

## License

[MIT](LICENSE) — free to use, modify, and distribute. Attribution appreciated but not required.
