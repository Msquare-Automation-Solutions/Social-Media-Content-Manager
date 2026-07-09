import { PrismaClient } from "@prisma/client";
import { resolveTestDatabaseUrl } from "./test-env";

// Two jobs before the suite runs:
//  1. Wake the isolated test DB (a Neon branch cold-starts its compute and can
//     reset the first few connections — that surfaces as a 500 "server error"
//     page mid-render). We block on a real `SELECT 1` until it's reachable.
//  2. Warm the dev server's routes (Next compiles each on first hit), which
//     otherwise races the just-set session cookie on "/".

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function waitForDatabase() {
  const url = resolveTestDatabaseUrl();
  const prisma = new PrismaClient({ datasourceUrl: url });
  const deadline = Date.now() + 90_000;
  let lastErr: unknown;
  try {
    while (Date.now() < deadline) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return; // compute awake, connections stable
      } catch (err) {
        lastErr = err;
        await sleep(2500);
      }
    }
    throw new Error(
      `Test database never became reachable within 90s: ${String(lastErr)}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function warm(path: string) {
  try {
    await fetch(`http://localhost:3100${path}`, { redirect: "manual" });
  } catch {
    // server not up yet / transient — ignore, tests will still retry
  }
}

async function warmRoutes() {
  const routes = [
    "/login",
    "/api/auth/csrf",
    "/api/auth/session",
    "/",
    "/dashboard",
    "/blog-posts",
    "/thumbnails",
    "/images",
    "/videos",
    "/members",
    "/activity",
    "/trash",
  ];
  // Two passes: the first triggers compilation, the second confirms warmth.
  for (let pass = 0; pass < 2; pass++) {
    for (const r of routes) await warm(r);
  }
}

export default async function globalSetup() {
  await waitForDatabase();
  await warmRoutes();
}
