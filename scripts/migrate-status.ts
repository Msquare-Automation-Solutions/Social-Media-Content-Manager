import { PrismaClient } from "@prisma/client";

// One-shot data migration for the status rename: any asset still marked with the
// legacy "IN_QUEUE" status becomes "PENDING" (pending approval). Idempotent —
// re-running it is a no-op once no IN_QUEUE rows remain. Run against whatever
// DATABASE_URL points at (prod and the e2e branch).
//
//   npm run migrate:status

const prisma = new PrismaClient();

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
  const res = await withRetry(() =>
    prisma.mediaAsset.updateMany({
      where: { status: "IN_QUEUE" },
      data: { status: "PENDING" },
    }),
  );
  console.log(`Migrated ${res.count} asset(s) from IN_QUEUE → PENDING.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
