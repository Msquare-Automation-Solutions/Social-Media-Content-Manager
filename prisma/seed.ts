import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  DEFAULT_SKILL_NAME,
  DEFAULT_SKILL_SYSTEM_PROMPT,
} from "../src/lib/ai/default-skill";

const prisma = new PrismaClient();

// Shared office login password (min 8 chars, bcrypt cost 12).
const DEV_PASSWORD = "msquare2026";

async function main() {
  console.log("🌱 Seeding MediaChat…");

  // Clean slate (order respects FKs).
  await prisma.assetChannel.deleteMany();
  await prisma.assetVersion.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.person.deleteMany();
  await prisma.socialChannel.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  // ---- Workspace ----
  const workspace = await prisma.workspace.create({
    data: { name: "MSquare Studio" },
  });

  // ---- Single shared office login (full-access Owner) ----
  // One account the whole team signs in with. Person/creator records below are
  // separate from this login (they're just who content is tagged to).
  const sharedUser = await prisma.user.create({
    data: {
      name: "MSquare Team",
      email: "team@msquare.pro",
      passwordHash,
      avatarColor: "#0e9f8f",
      memberships: {
        create: { workspaceId: workspace.id, role: "OWNER" },
      },
    },
  });

  // All authorship/ownership references in the seed resolve to the shared user.
  const users: Record<string, { id: string }> = new Proxy(
    {},
    { get: () => ({ id: sharedUser.id }) },
  );

  // ---- Skill (v1 Route A: instructions baked into systemPrompt) ----
  await prisma.skill.create({
    data: {
      workspaceId: workspace.id,
      name: DEFAULT_SKILL_NAME,
      systemPrompt: DEFAULT_SKILL_SYSTEM_PROMPT,
      updatedById: users.Fahila.id,
    },
  });

  // ---- Social channels (the prototype's 6) ----
  const channelDefs = [
    { name: "Instagram", icon: "📷", color: "#e1306c" },
    { name: "YouTube", icon: "▶️", color: "#ff0000" },
    { name: "LinkedIn", icon: "💼", color: "#0a66c2" },
    { name: "Facebook", icon: "📘", color: "#1877f2" },
    { name: "TikTok", icon: "🎵", color: "#010101" },
    { name: "Blog / Website", icon: "🌐", color: "#0e9f8f" },
  ];
  const channels: Record<string, { id: string }> = {};
  for (const c of channelDefs) {
    const ch = await prisma.socialChannel.create({
      data: { workspaceId: workspace.id, ...c },
    });
    channels[c.name] = { id: ch.id };
  }

  // ---- People (5 records; Person is separate from login User) ----
  // Three linked to login users; two standalone creators who never log in.
  const personDefs = [
    { name: "Fahila", color: "#e5533d", userName: "Fahila", label: "Founder" },
    { name: "Mira", color: "#0e9f8f", userName: "Mira", label: "Content lead" },
    { name: "Aron", color: "#7a4fc9", userName: "Aron", label: "Editor" },
    { name: "Fasil", color: "#b07514", label: "Video editor (freelance)" },
    { name: "Layla", color: "#c2185b", label: "Designer (freelance)" },
  ];
  const people: Record<string, { id: string }> = {};
  for (const p of personDefs) {
    const person = await prisma.person.create({
      data: {
        workspaceId: workspace.id,
        name: p.name,
        label: p.label,
        avatarColor: p.color,
        userId: p.userName ? users[p.userName].id : null,
      },
    });
    people[p.name] = { id: person.id };
  }

  // ---- Media assets (~14, tagged, across all types & sources) ----
  type AssetSeed = {
    type: string;
    title: string;
    person: string;
    createdBy: string;
    source: "UPLOAD" | "GENERATED";
    channels: string[];
    tags: string[];
    filename?: string;
    mimeType?: string;
    sizeBytes?: number;
    html?: string;
    thumbnailUrl?: string;
  };

  const assetSeeds: AssetSeed[] = [
    // Images
    {
      type: "IMAGE",
      title: "Autumn Campaign — Hero Shot",
      person: "Layla",
      createdBy: "Fahila",
      source: "UPLOAD",
      channels: ["Instagram"],
      tags: ["autumn-campaign", "q3"],
      filename: "autumn-campaign-01.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 2_400_000,
      thumbnailUrl: "/uploads/thumbs/autumn-campaign-01.png",
    },
    {
      type: "IMAGE",
      title: "Office Automation — Desk Setup",
      person: "Mira",
      createdBy: "Mira",
      source: "UPLOAD",
      channels: ["LinkedIn"],
      tags: ["behind-the-scenes"],
      filename: "office-automation.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1_850_000,
      thumbnailUrl: "/uploads/thumbs/office-automation.png",
    },
    {
      type: "IMAGE",
      title: "Client Logo Wall",
      person: "Fahila",
      createdBy: "Fahila",
      source: "UPLOAD",
      channels: ["LinkedIn", "Facebook"],
      tags: ["social-proof"],
      filename: "logo-wall.png",
      mimeType: "image/png",
      sizeBytes: 900_000,
      thumbnailUrl: "/uploads/thumbs/logo-wall.png",
    },
    {
      type: "IMAGE",
      title: "Team Offsite — Group Photo",
      person: "Aron",
      createdBy: "Aron",
      source: "UPLOAD",
      channels: ["Instagram", "Facebook"],
      tags: ["culture", "team"],
      filename: "offsite-group.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 3_100_000,
      thumbnailUrl: "/uploads/thumbs/offsite-group.png",
    },

    // Thumbnails
    {
      type: "THUMBNAIL",
      title: "YT Thumb — n8n Invoice Automation v3",
      person: "Fasil",
      createdBy: "Aron",
      source: "GENERATED",
      channels: ["YouTube"],
      tags: ["n8n", "invoices", "automation"],
      thumbnailUrl: "/uploads/thumbs/yt-invoices-v3.png",
    },
    {
      type: "THUMBNAIL",
      title: "YT Thumb — AI Voice Agents for Real Estate",
      person: "Layla",
      createdBy: "Mira",
      source: "GENERATED",
      channels: ["YouTube"],
      tags: ["ai-agents", "real-estate"],
      thumbnailUrl: "/uploads/thumbs/yt-voice-agents.png",
    },
    {
      type: "THUMBNAIL",
      title: "Reel Cover — Make.com in 60 Seconds",
      person: "Layla",
      createdBy: "Aron",
      source: "GENERATED",
      channels: ["Instagram", "TikTok"],
      tags: ["make", "shorts"],
      thumbnailUrl: "/uploads/thumbs/reel-make-60s.png",
    },

    // Videos
    {
      type: "VIDEO",
      title: "n8n Walkthrough — Full Build",
      person: "Aron",
      createdBy: "Aron",
      source: "UPLOAD",
      channels: ["YouTube"],
      tags: ["n8n", "walkthrough"],
      filename: "n8n-walkthrough.mp4",
      mimeType: "video/mp4",
      sizeBytes: 118_000_000,
      thumbnailUrl: "/uploads/thumbs/n8n-walkthrough.png",
    },
    {
      type: "VIDEO",
      title: "Promo Cut — Q3 Automation Push",
      person: "Fasil",
      createdBy: "Mira",
      source: "UPLOAD",
      channels: ["Instagram", "TikTok"],
      tags: ["promo", "q3-campaign"],
      filename: "promo-cut-final.mp4",
      mimeType: "video/mp4",
      sizeBytes: 96_000_000,
      thumbnailUrl: "/uploads/thumbs/promo-cut-final.png",
    },

    // Blog posts
    {
      type: "BLOGPOST",
      title: "How AI Agents Cut Manual Work by 70%",
      person: "Fahila",
      createdBy: "Fahila",
      source: "GENERATED",
      channels: ["Blog / Website", "LinkedIn"],
      tags: ["ai-agents", "productivity"],
      html: "<h2>How AI Agents Cut Manual Work by 70%</h2><p>Most back-office work is repetitive by design. Here's how we replace it with agents that read, decide, and act — without a human babysitting each step.</p><h3>Where the time actually goes</h3><p>Invoice triage, lead routing, and status chasing eat the calendar. We instrument the workflow first, then automate the tallest bars.</p>",
    },
    {
      type: "BLOGPOST",
      title: "Make.com vs n8n: A Practical Guide",
      person: "Mira",
      createdBy: "Mira",
      source: "GENERATED",
      channels: ["Blog / Website"],
      tags: ["make", "n8n", "comparison"],
      html: "<h2>Make.com vs n8n: A Practical Guide</h2><p>Both automate the same jobs, but they trade off differently on hosting, price, and control. Here's how we pick per client.</p><h3>When we reach for n8n</h3><p>Self-hosting, custom code nodes, and data that can't leave the building.</p>",
    },
    {
      type: "BLOGPOST",
      title: "Automating Lead Capture with Make.com",
      person: "Aron",
      createdBy: "Aron",
      source: "GENERATED",
      channels: ["Blog / Website", "LinkedIn"],
      tags: ["lead-capture", "make"],
      html: "<h2>Automating Lead Capture with Make.com</h2><p>Every lead that sits in an inbox overnight is money cooling off. We wire form → CRM → instant follow-up in about 20 minutes, no code.</p>",
    },

    // Video scripts
    {
      type: "VIDEO_SCRIPT",
      title: "Script — AI Voice Assistants for Real Estate",
      person: "Fahila",
      createdBy: "Fahila",
      source: "GENERATED",
      channels: ["YouTube"],
      tags: ["ai-agents", "real-estate", "script"],
      html: "<h2>Script — AI Voice Assistants for Real Estate</h2><h3>Hook</h3><p>Every missed call is a missed listing.</p><h3>Problem</h3><p>Agents lose 40% of after-hours leads.</p><h3>Solution</h3><p>An AI voice agent answers, qualifies, and books viewings into the CRM.</p><h3>CTA</h3><p>Book a free automation consult.</p>",
    },
    {
      type: "VIDEO_SCRIPT",
      title: "Script — Invoices Done in Zero Clicks",
      person: "Mira",
      createdBy: "Aron",
      source: "GENERATED",
      channels: ["YouTube", "LinkedIn"],
      tags: ["invoices", "n8n", "script"],
      html: "<h2>Script — Invoices Done in Zero Clicks</h2><h3>Hook</h3><p>What if invoices just… processed themselves?</p><h3>Demo</h3><p>Email in, data extracted, approval routed, entry posted.</p><h3>CTA</h3><p>See the full n8n build.</p>",
    },
  ];

  for (const a of assetSeeds) {
    await prisma.mediaAsset.create({
      data: {
        workspaceId: workspace.id,
        personId: people[a.person].id,
        createdById: users[a.createdBy].id,
        type: a.type,
        title: a.title,
        source: a.source,
        tags: JSON.stringify(a.tags),
        filename: a.filename,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        html: a.html,
        thumbnailUrl: a.thumbnailUrl,
        channels: {
          create: a.channels.map((name) => ({ channelId: channels[name].id })),
        },
      },
    });
  }

  console.log(`✅ Seed complete.
  Workspace : ${workspace.name}
  Members   : 1 (shared office login)
  People    : ${personDefs.length} (creators)
  Channels  : ${channelDefs.length}
  Assets    : ${assetSeeds.length}
  Skill     : ${DEFAULT_SKILL_NAME}

  Shared login (Owner — full access):
    email    : team@msquare.pro
    password : ${DEV_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
