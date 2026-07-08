import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getSkill, buildLibraryContext } from "@/lib/data";
import { streamChat, type ChatTurn } from "@/lib/ai/generate";
import { toolCallToArtifact } from "@/lib/ai/tools";
import { serializeJson } from "@/lib/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  sessionId: z.string().optional(),
  message: z.string().min(1).max(8000),
});

function titleFrom(message: string): string {
  const t = message.trim().replace(/\s+/g, " ");
  return t.length > 48 ? t.slice(0, 47) + "…" : t;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  const { message } = parsed.data;

  // Resolve or create the session (scoped to this workspace + user).
  let session = parsed.data.sessionId
    ? await prisma.chatSession.findFirst({
        where: {
          id: parsed.data.sessionId,
          workspaceId: user.workspaceId,
          userId: user.id,
        },
      })
    : null;
  if (!session) {
    session = await prisma.chatSession.create({
      data: {
        workspaceId: user.workspaceId,
        userId: user.id,
        title: titleFrom(message),
      },
    });
  }

  // Persist the user's message, then a placeholder assistant message so the
  // client has a stable id to attach the artifact's "Save" action to.
  await prisma.chatMessage.create({
    data: { sessionId: session.id, role: "user", content: message },
  });
  const assistantMessage = await prisma.chatMessage.create({
    data: { sessionId: session.id, role: "assistant", content: "" },
  });

  // Build history + system prompt.
  const history = await prisma.chatMessage.findMany({
    where: { sessionId: session.id, NOT: { id: assistantMessage.id } },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });
  const turns: ChatTurn[] = history
    .filter((m) => m.content.trim().length > 0)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const skill = await getSkill(user.workspaceId);
  const libraryContext = await buildLibraryContext(user.workspaceId);
  const systemPrompt =
    (skill?.systemPrompt || "You are a helpful content assistant.") +
    libraryContext;

  const workspaceId = user.workspaceId;
  const sessionId = session.id;
  const assistantId = assistantMessage.id;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      send({
        type: "session",
        sessionId,
        title: session!.title,
        assistantMessageId: assistantId,
      });

      let text = "";
      let artifact: ReturnType<typeof toolCallToArtifact> | null = null;

      try {
        for await (const ev of streamChat({ systemPrompt, messages: turns })) {
          if (ev.type === "text") {
            text += ev.text;
            send({ type: "text", text: ev.text });
          } else if (ev.type === "tool") {
            const a = toolCallToArtifact(ev.call.name, ev.call.input);
            if (a) {
              artifact = a;
              send({ type: "artifact", artifact: a, messageId: assistantId });
            }
          }
        }
      } catch (err) {
        console.error("chat stream error", err);
        send({ type: "error", message: "Generation failed. Please retry." });
      }

      // Persist the completed assistant message (text + artifact).
      await prisma.chatMessage.update({
        where: { id: assistantId },
        data: {
          content: text,
          artifactJson: artifact ? serializeJson(artifact) : null,
        },
      });
      // Keep the library-context summary fresh for the next turn.
      void workspaceId;

      send({ type: "done", messageId: assistantId });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
