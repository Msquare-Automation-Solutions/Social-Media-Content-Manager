# CLAUDE.md — MediaChat: Chat-First Content Creation Studio

## What this app is
A chat-first content studio (like Claude.ai, but purpose-built for one job): the user opens the app and lands directly in a chat interface powered by a built-in **content-generation skill**. The chat produces drafts (blog posts, thumbnail concepts, video scripts, images). When the user is happy with a creation, they explicitly **Save** it — a save dialog tags the item with *who it belongs to*, *what type it is*, and *which social platform it's for*. Those tags drive the filters in the library. Users can also upload files manually (same save/tag dialog). Team members share the workspace with roles.

**There is NO calendar/scheduler in v1.** The product is: chat → create → **save & tag** → browse/filter → download.

## Layout (exact)
- **Left sidebar (fixed, ~240px):**
  1. Logo + workspace name
  2. **⬆ Upload** button (primary; opens upload flow → save dialog)
  3. **💬 Home (Chat)** — default view, active on load
  4. Library section (each with count badge; opens filterable grid):
     - 🖼 Images
     - 🎯 Thumbnails
     - 🎬 Videos
     - 📝 Blog posts
  5. Divider
  6. 🧑‍🤝‍🧑 Members
  7. 🚪 Sign out (bottom, with current user's email + role)
- **Main area:** chat by default. Library views swap into the main area; "← Back to chat" returns. Recent chat sessions dropdown + "New chat" in the chat header.

## THE SAVE FLOW (core UX — get this exactly right)
Nothing generated in chat is auto-saved to the library. Every AI artifact card and every upload goes through the **Save dialog**:

Fields (all required unless noted):
1. **Name** — pre-filled from the artifact/filename, editable. Every asset MUST have a human-readable name (not just the raw filename).
2. **Thumbnail** — every asset MUST have a thumbnail, shown as a live preview in the dialog:
   - Images: auto-generated from the file itself (`sharp` resize, ~400px).
   - Videos: auto-extract a poster frame (ffmpeg, frame at 1s); user can pick a different frame or upload a custom image.
   - Blog posts / scripts / concepts: auto-generate a styled cover card (title on brand-color gradient) as fallback; user can upload a custom cover image.
   - A "Change thumbnail" button in the dialog lets the user replace the auto thumbnail with any image upload (≤ 2MB, cropped to 16:9).
   - Thumbnails are stored as separate files (`thumbnailUrl`) so library grids load fast without touching the original.
3. **Person / Creator** — dropdown of workspace people (`Person` records — the company's team/creators, may differ from login users). Includes **“＋ Add person”** inline: expands a small form (name, optional email/role label) and creates the record right there without leaving the dialog, then selects it.
4. **Category (type)** — Image / Thumbnail / Video / Blog post. Pre-selected from what the AI generated or MIME type of the upload, but changeable (e.g. mark an uploaded image as Thumbnail).
5. **Social platform** — dropdown of the workspace's `SocialChannel` records (e.g. Instagram, YouTube, LinkedIn, Facebook, TikTok, X, Blog/Website). Includes **“＋ Add platform”** inline: name + pick an icon/color, created in place and selected. Multi-select allowed (one asset can target several platforms).
6. **Tags** (optional free-form).

Behavior:
- On save: create `MediaAsset` with `personId`, `type`, `channelIds[]`, `source` (GENERATED or UPLOAD), link to originating `chatMessageId` if generated. Toast: "Saved to Thumbnails ✓" with a "View" action.
- Artifact card in chat switches to a "✓ Saved" state (still shows Open/Download); unsaved cards show a prominent **Save…** button.
- Inline creation ("+ Add person", "+ Add platform") is available to EDITOR and above; the new record is immediately available everywhere (dropdowns, filters).
- Editing an asset later reopens the same dialog (writes an `AssetVersion` snapshot first).

## Library views & filtering (the payoff of tagging)
When the user opens e.g. **Images** from the sidebar:
- Grid of asset cards: preview, title, type badge, person avatar/name, platform icon(s), source badge (AI/Upload), date.
- **Filter bar at top:**
  - **Person** dropdown (All people / each person)
  - **Social platform** dropdown (All platforms / each channel)
  - Search box (title + tags), sort (newest / name)
- Filters combine with AND and persist in URL query params.
- Same filter bar on all four library types.
- Asset detail drawer: preview / rendered blog post, edit tags & fields (via save dialog), download, replace file (keeps old as version), delete (soft).

## Tech stack
- Next.js 14+ (App Router), TypeScript, Tailwind, shadcn/ui, TanStack Query
- Prisma + PostgreSQL (SQLite dev)
- NextAuth.js (email/password + Google)
- `StorageProvider` abstraction (local `/uploads` dev → S3/R2 later); `sharp` thumbnails; video poster frames
- Anthropic API (`claude-sonnet-4-6`) server-side, streaming, tool use

## The Skill
One job: generate branded content. Server-side system prompt + tools, loaded per workspace from a `Skill` table (editable by OWNER/ADMIN in a Skill settings page, v1.1).

Tools:
- `create_blogpost(title, html, tags)` → returns draft artifact (NOT saved until user hits Save)
- `create_thumbnail_concept(title, captionOptions[], designNotes)`
- `create_video_script(title, sections[])`
- `list_assets(filters)` / `get_asset(id)` → chat can reference library ("rewrite my last blog post")

Rules:
- Artifacts render as cards in chat with **Save…**, Open, Download.
- Streaming; sessions/messages persist (`ChatSession`, `ChatMessage`); API key server-side only.

## Uploading (manual)
- Upload button or 📎 in chat composer or drag-drop anywhere → file picker/drop zone → then the SAME Save dialog per file (batch mode: apply person/platform to all, per-file overrides).
- Auto-classify type by MIME (changeable in dialog). Validate: images ≤ 10MB, videos ≤ 512MB; .md/.html/.docx → Blog post (docx via mammoth).

## Members & roles (server-enforced)
- OWNER: everything; ADMIN: manage members (not owners), edit skill, all content, manage people/platforms; EDITOR: chat/generate, upload, save, add people/platforms inline, delete own assets; VIEWER: read-only library.
- Note: **login users (Members)** and **Person/Creator records** are separate concepts. A Person may be linked to a User (`Person.userId?`) but can also exist standalone (e.g. a creator who never logs in). Seed both.
- Members page: list, invite by email token, change role, remove.

## Auth
- **Single login page** at `/login`: email + password only (no social logins in v1). Clean centered card, app logo, "Forgot password?" link. New members join via invite links (which set their password on first visit) — there is no open public signup.
- **Forgot / reset password flow:**
  - "Forgot password?" → `/forgot-password`: enter email → always respond "If an account exists, we've sent a reset link" (never reveal whether the email exists).
  - Email contains a single-use, 30-minute-expiry token link → `/reset-password?token=…` → new password + confirm → on success, invalidate all existing sessions and redirect to login with a "Password updated" notice.
  - Store tokens hashed in a `PasswordResetToken` table; rate-limit requests (max 3 per email per hour).
  - Dev mode: log the reset link to console instead of sending email; production: send via Resend (or SMTP env config).
- **Change password while logged in:** Account settings → current password + new password + confirm. Invalidate other sessions on change.
- Passwords hashed with bcrypt (cost 12); minimum 8 chars; generic error messages on failed login ("Invalid email or password").
- After login land in chat. Sign out in sidebar footer.

## Data safety (non-negotiable)
- All deletes soft (`deletedAt`) + Trash view with restore (30 days).
- `AssetVersion` snapshot before every asset edit; version history with restore. Replacing a file keeps the old one.
- Chat history never deleted implicitly; sessions archivable.
- Optimistic updates roll back on failure with toast. Blog editor autosaves (5s debounce) + "Saved · HH:MM".

## Prisma model
```
User, Workspace, Membership (role enum)
Skill         (id, workspaceId, name, systemPrompt, updatedById, updatedAt)
Person        (id, workspaceId, name, email?, label?, userId?, avatarColor, createdAt)
SocialChannel (id, workspaceId, name, icon, color, createdAt)
MediaAsset    (id, workspaceId, personId, createdById, type: IMAGE|THUMBNAIL|VIDEO|BLOGPOST|VIDEO_SCRIPT,
               title, filename?, url?, thumbnailUrl?, mimeType?, sizeBytes?, html?, tags[],
               source: UPLOAD|GENERATED, chatMessageId?, createdAt, deletedAt?)
AssetChannel  (assetId, channelId)            // many-to-many: asset ↔ social platforms
AssetVersion  (id, assetId, snapshotJson, editedById, createdAt)
ChatSession   (id, workspaceId, userId, title, createdAt, archivedAt?)
ChatMessage   (id, sessionId, role, content, attachments[], artifactJson?, createdAt)
Invite        (id, workspaceId, email, role, token, expiresAt, acceptedAt?)
PasswordResetToken (id, userId, tokenHash, expiresAt, usedAt?)
```

## Build phases (commit per phase)
1. Scaffold + auth + workspace/membership + seed (4 members, 5 Person records, 6 SocialChannels, ~14 tagged assets, default skill).
2. App shell: sidebar, chat UI, streaming Anthropic integration, persisted sessions.
3. Skill tools → artifact cards in chat + **Save dialog** (with inline add-person / add-platform).
4. Upload flow (button, 📎, drag-drop) → same Save dialog (batch mode) + library grids with person/platform filters + asset drawer + blog reader/editor.
5. Members page + invites + role enforcement + sign out.
6. Versioning, trash/restore, autosave, polish, Playwright happy path (login → generate blog post → Save with new platform added inline → filter Blog posts by that platform → edit → version history → delete → restore).

## Quality gates
- `npm run lint && npm run typecheck` before commits; unit tests for requireRole, save-dialog server validation, version snapshots.
