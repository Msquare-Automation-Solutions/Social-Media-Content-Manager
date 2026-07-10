import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";

// Demo data for the Review Queue: fills every platform with all four
// categories, each holding 2–3 IN_QUEUE items (a mix of AI-generated, uploads,
// and external URLs). Idempotent — every item is tagged "review-demo" and
// re-running deletes the previous batch first, so it never piles up.
//
//   npm run seed:review        (targets whatever DATABASE_URL points at)

const prisma = new PrismaClient();
const DEMO_TAG = "review-demo";

// The four library categories → the asset type stored for each.
const CATEGORIES: { type: string; noun: string }[] = [
  { type: "IMAGE", noun: "graphic" },
  { type: "THUMBNAIL", noun: "thumbnail" },
  { type: "VIDEO", noun: "reel" },
  { type: "BLOGPOST", noun: "article" },
];

const TOPICS = [
  "Automation demo",
  "Client success story",
  "Product teaser",
  "Behind the scenes",
  "How-to walkthrough",
  "Launch announcement",
  "Quick tips",
  "Case study",
  "Founder Q&A",
  "Feature spotlight",
];

const LINK_URLS = [
  "https://drive.google.com/file/d/1aB2cD3eF4gH5iJ/view",
  "https://youtu.be/dQw4w9WgXcQ",
  "https://www.dropbox.com/s/x1y2z3q4/asset.mp4",
];

const blogHtml = (title: string, topic: string) =>
  `<h2>${title}</h2><p><em>${topic}</em></p>` +
  `<p>Draft awaiting review. Replace this copy with the finished piece before publishing.</p>` +
  `<h3>Hook</h3><p>Why this matters to the audience in one line.</p>` +
  `<h3>Body</h3><p>Two or three short paragraphs that carry the story.</p>` +
  `<h3>Call to action</h3><p>What we want the reader to do next.</p>`;

async function withRetry<T>(fn: () => Promise<T>, n = 6): Promise<T> {
  for (let i = 0; i < n; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === n - 1) throw err;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error("unreachable");
}

async function main() {
  const channels = await withRetry(() =>
    prisma.socialChannel.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, workspaceId: true },
    }),
  );
  if (channels.length === 0) throw new Error("No social channels found — seed the workspace first.");

  const workspaceId = channels[0].workspaceId;
  const persons = await prisma.person.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const membership = await prisma.membership.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    select: { userId: true },
  });
  if (persons.length === 0 || !membership) throw new Error("Missing people or members in the workspace.");
  const createdById = membership.userId;

  // Clear any previous demo batch (cascade removes their AssetChannel rows).
  const cleared = await withRetry(() =>
    prisma.mediaAsset.deleteMany({ where: { workspaceId, tags: { contains: DEMO_TAG } } }),
  );

  // Build every row in memory with pre-generated ids, then insert in two bulk
  // calls — far fewer round-trips, which the free-tier compute handles reliably.
  const assets: {
    id: string;
    workspaceId: string;
    personId: string;
    createdById: string;
    type: string;
    title: string;
    source: string;
    status: string;
    url: string | null;
    html: string | null;
    thumbnailUrl: null;
    tags: string;
  }[] = [];
  const links: { assetId: string; channelId: string }[] = [];

  let personIdx = 0;
  for (let ci = 0; ci < channels.length; ci++) {
    const channel = channels[ci];
    for (let gi = 0; gi < CATEGORIES.length; gi++) {
      const cat = CATEGORIES[gi];
      const perCat = (ci + gi) % 3 === 0 ? 3 : 2; // 2 or 3 per category
      for (let k = 0; k < perCat; k++) {
        const topic = TOPICS[(ci * 3 + gi * 2 + k) % TOPICS.length];
        const title = `${channel.name} ${cat.noun} — ${topic}`;
        const source = k === 0 ? "GENERATED" : k === 1 ? "UPLOAD" : "LINK";
        const id = randomUUID();
        assets.push({
          id,
          workspaceId,
          personId: persons[personIdx++ % persons.length].id,
          createdById,
          type: cat.type,
          title,
          source,
          status: "IN_QUEUE",
          url: source === "LINK" ? LINK_URLS[k % LINK_URLS.length] : null,
          html: cat.type === "BLOGPOST" && source !== "LINK" ? blogHtml(title, topic) : null,
          thumbnailUrl: null, // falls back to the branded gradient + glyph preview
          tags: JSON.stringify([DEMO_TAG, topic.toLowerCase().split(" ")[0]]),
        });
        links.push({ assetId: id, channelId: channel.id });
      }
    }
  }

  await withRetry(() => prisma.mediaAsset.createMany({ data: assets }));
  await withRetry(() => prisma.assetChannel.createMany({ data: links }));

  console.log(`Cleared ${cleared.count} previous demo items.`);
  console.log(`Seeded ${assets.length} IN_QUEUE demo items across ${channels.length} platforms × ${CATEGORIES.length} categories.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
