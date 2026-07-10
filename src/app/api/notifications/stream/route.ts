import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Keep the stream open as long as the platform allows; the client's EventSource
// auto-reconnects when the connection is cut, so delivery stays continuous.
export const maxDuration = 300;

// Server-Sent Events: pushes a small "changed" signal whenever the caller's
// notification inbox changes (new arrivals or read-state updates). The client
// reacts by refetching the feed — no page refresh, no long poll interval.
export async function GET(req: Request) {
  const g = await guard();
  if (!g.ok) return g.response;
  const userId = g.user.id;

  const encoder = new TextEncoder();
  let closed = false;
  let interval: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          closed = true;
        }
      };

      let last = "";
      const tick = async () => {
        if (closed) return;
        try {
          const [unread, top] = await Promise.all([
            prisma.notification.count({ where: { recipientId: userId, readAt: null } }),
            prisma.notification.findFirst({
              where: { recipientId: userId },
              orderBy: { createdAt: "desc" },
              select: { id: true },
            }),
          ]);
          const sig = `${unread}:${top?.id ?? ""}`;
          if (sig !== last) {
            last = sig;
            send({ unread, topId: top?.id ?? null });
          }
        } catch {
          // Transient DB hiccup — keep the stream alive and try again next tick.
        }
      };

      await tick(); // initial state so the client syncs on connect
      interval = setInterval(tick, 4000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        if (interval) clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      closed = true;
      if (interval) clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
