import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Keeps the database awake during working hours.
 *
 * Neon suspends an idle compute after a few minutes, and the next query pays a
 * ~3s wake-up (measured). With a small team the database is idle most of the day,
 * so the first person to open the app each morning wore that delay — which is
 * what the "2 second lag" was. A cron hitting this every few minutes between
 * 09:00 and 20:00 IST costs one trivial query and keeps mornings fast, while
 * still letting the compute sleep overnight and at weekends so Neon's free
 * compute-hour allowance isn't spent on nothing.
 *
 * Deliberately cheap: one `SELECT 1`, no application data, no auth needed — there
 * is nothing here to abuse or leak.
 */
export async function GET() {
  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json(
      { ok: true, ms: Date.now() - t0 },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return new Response("Database unreachable", { status: 503 });
  }
}
