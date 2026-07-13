import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getSkill, listSessions, getSessionWithMessages } from "@/lib/data";
import { DEFAULT_SKILL_NAME } from "@/lib/ai/default-skill";
import { parseJson } from "@/lib/json";
import type { Artifact } from "@/lib/ai/tools";
import { ChatView, type UiMessage } from "@/components/chat/chat-view";

export const dynamic = "force-dynamic";

// The Content Creator (chat) studio. Lives at /create; the app now lands on the
// workspace overview instead.
export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s: selectedParam } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [skill, sessions] = await Promise.all([
    getSkill(user.workspaceId),
    listSessions(user.workspaceId, user.id),
  ]);

  const selectedId = selectedParam ?? null;
  let initialMessages: UiMessage[] = [];
  if (selectedId) {
    const session = await getSessionWithMessages(selectedId, user.workspaceId);
    if (session) {
      initialMessages = session.messages
        .filter((m) => m.content.trim().length > 0 || m.artifactJson)
        .map((m) => ({
          id: m.id,
          dbId: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          artifact: m.artifactJson
            ? parseJson<Artifact | null>(m.artifactJson, null)
            : null,
        }));
    }
  }

  return (
    <ChatView
      skillName={skill?.name ?? DEFAULT_SKILL_NAME}
      user={{ name: user.name, avatarColor: user.avatarColor }}
      sessions={sessions.map((s) => ({ id: s.id, title: s.title }))}
      initialSessionId={selectedId}
      initialMessages={initialMessages}
    />
  );
}
