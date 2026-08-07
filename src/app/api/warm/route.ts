import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Keeps the database awake during working hours.
 *
 * Neon suspends an idle compute after a few minutes, and the next query pays a
 * ~3s wake-up (measured). With a small team the database is idle most of the day,
 * so the first person to open the app each morning wore that delay — which is
 * what the "2 second lag" was. A cron hits this every few minutes; the endpoint
 * decides for itself whether it's working hours (see below), so the schedule can
 * run around the clock without the timezone of the cron daemon mattering.
 *
 * Deliberately cheap: one `SELECT 1`, no application data, no auth needed — there
 * is nothing here to abuse or leak.
 */
/** Hour of day in the team's timezone, independent of the server's clock. */
function istHour(): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
  );
}

const WAKE_FROM = 9; // 09:00 IST
const WAKE_UNTIL = 19; // 19:00 IST

export async function GET() {
  // The working-hours limit lives here, not in the cron's schedule, because cron
  // runs on the server's clock (not IST) and getting that wrong either wastes the
  // allowance overnight or leaves the database asleep through the team's morning.
  // Neon Free gives ~400 hours of active compute a month and autosuspend can't be
  // turned off; 10 hours a day is ~300, which leaves room for real use outside them.
  const hour = istHour();
  if (hour < WAKE_FROM || hour >= WAKE_UNTIL) {
    return Response.json(
      { ok: true, skipped: "outside working hours", hour },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

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
