"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Artifact } from "@/lib/ai/tools";
import { initials } from "@/lib/colors";
import { ArtifactCard } from "@/components/chat/artifact-card";
import { useUploadDialog } from "@/components/save/dialog-context";

export type UiMessage = {
  id: string;
  dbId?: string; // persisted ChatMessage id, used for Save linkage
  role: "user" | "assistant";
  content: string;
  artifact?: Artifact | null;
  saved?: boolean;
  savedType?: string;
  streaming?: boolean;
};

type SessionSummary = { id: string; title: string };

type Props = {
  skillName: string;
  user: { name: string; avatarColor: string };
  sessions: SessionSummary[];
  initialSessionId: string | null;
  initialMessages: UiMessage[];
};

const PROMPTS = [
  "Write a blog post about automating lead capture with Make.com",
  "Create a YouTube thumbnail concept for our n8n invoice automation video",
  "Draft a video script about AI voice assistants for real estate",
];

export function ChatView({
  skillName,
  user,
  sessions,
  initialSessionId,
  initialMessages,
}: Props) {
  const router = useRouter();
  const upload = useUploadDialog();
  const [messages, setMessages] = useState<UiMessage[]>(initialMessages);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  };

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setInput("");
    setBusy(true);

    const userMsg: UiMessage = { id: uid(), role: "user", content };
    const assistantMsg: UiMessage = {
      id: uid(),
      role: "assistant",
      content: "",
      streaming: true,
    };
    setMessages((m) => [...m, userMsg, assistantMsg]);
    scrollToBottom();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: content }),
      });
      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let newSessionId = sessionId;

      const patchAssistant = (patch: Partial<UiMessage>) =>
        setMessages((m) =>
          m.map((msg) => (msg.id === assistantMsg.id ? { ...msg, ...patch } : msg)),
        );

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line);
          if (ev.type === "session") {
            newSessionId = ev.sessionId;
            // Attach the persisted assistant message id for Save linkage.
            patchAssistant({ dbId: ev.assistantMessageId });
          } else if (ev.type === "text") {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantMsg.id
                  ? { ...msg, content: msg.content + ev.text }
                  : msg,
              ),
            );
            scrollToBottom();
          } else if (ev.type === "artifact") {
            patchAssistant({ artifact: ev.artifact as Artifact });
            scrollToBottom();
          } else if (ev.type === "error") {
            patchAssistant({ content: ev.message });
          }
        }
      }
      patchAssistant({ streaming: false });
      if (newSessionId && newSessionId !== sessionId) {
        setSessionId(newSessionId);
        // Reflect the new session in the URL + refresh the header list.
        window.history.replaceState(null, "", `/?s=${newSessionId}`);
        router.refresh();
      }
    } catch {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantMsg.id
            ? { ...msg, streaming: false, content: "Something went wrong. Please retry." }
            : msg,
        ),
      );
    } finally {
      setBusy(false);
      scrollToBottom();
    }
  }

  function newChat() {
    setMessages([]);
    setSessionId(null);
    window.history.replaceState(null, "", "/");
  }

  const showHello = messages.length === 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-line bg-card px-6 py-3.5">
        <h2 className="font-display text-[15px] font-semibold">Content Studio</h2>
        <span className="rounded-full bg-teal-soft px-3 py-1 text-[11.5px] font-semibold text-teal-dark">
          ✨ Skill: {skillName}
        </span>
        {sessions.length > 0 && (
          <select
            value={sessionId ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              if (id) router.push(`/?s=${id}`);
            }}
            className="ml-auto rounded-[10px] border border-line px-3 py-1.5 text-[12.5px] text-slate outline-none"
          >
            <option value="" disabled>
              Recent chats…
            </option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={newChat}
          className={`${
            sessions.length > 0 ? "" : "ml-auto"
          } rounded-[10px] border border-line px-3.5 py-1.5 font-semibold text-slate hover:bg-bg`}
        >
          ＋ New chat
        </button>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-7">
        <div className="mx-auto flex max-w-[760px] flex-col gap-5 px-6">
          {showHello ? (
            <Hello onPick={send} />
          ) : (
            messages.map((m) => (
              <MessageRow key={m.id} message={m} user={user} setMessages={setMessages} />
            ))
          )}
        </div>
      </div>

      {/* composer */}
      <div className="bg-gradient-to-t from-bg to-transparent px-6 pb-6 pt-3.5">
        <div className="mx-auto max-w-[760px] rounded-xl2 border border-line/70 bg-card p-3.5 shadow-card transition duration-200 focus-within:border-teal/40 focus-within:shadow-lift">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask me to create a blog post, thumbnail, video script…"
            rows={1}
            className="max-h-40 min-h-[44px] w-full resize-none outline-none"
          />
          <div className="mt-1.5 flex items-center gap-2.5">
            <button
              onClick={() => upload.open()}
              title="Attach files"
              className="text-[16px] text-slate hover:text-teal-dark"
            >
              📎
            </button>
            <span className="text-[11.5px] text-[#9aa7b6]">
              Enter to send · Shift+Enter for a new line
            </span>
            <button
              onClick={() => send(input)}
              disabled={busy || !input.trim()}
              className="btn-premium ml-auto rounded-[11px] px-5 py-2 font-semibold disabled:opacity-50 disabled:shadow-none"
            >
              {busy ? "Generating…" : "Send ↑"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hello({ onPick }: { onPick: (t: string) => void }) {
  return (
    <div className="py-10 text-center">
      <div className="mx-auto mb-3.5 grid h-[52px] w-[52px] place-items-center rounded-[16px] bg-brand-teal text-2xl text-white shadow-glow">
        ◆
      </div>
      <h1 className="mb-2 font-display text-2xl">What are we creating today?</h1>
      <p className="mx-auto max-w-[460px] leading-relaxed text-slate">
        I generate blog posts, thumbnail concepts, and video scripts. When you&apos;re
        happy with a result, hit <b>Save…</b> to tag it with a person, category and
        platform — so it&apos;s easy to filter later.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        {["📝 Write a blog post", "🎯 Thumbnail concept", "🎬 Video script"].map(
          (label, i) => (
            <button
              key={i}
              onClick={() => onPick(PROMPTS[i])}
              className="rounded-full border border-line bg-card px-4 py-2 text-[12.5px] font-medium text-slate hover:border-teal hover:text-teal-dark"
            >
              {label}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

function MessageRow({
  message,
  user,
  setMessages,
}: {
  message: UiMessage;
  user: { name: string; avatarColor: string };
  setMessages: React.Dispatch<React.SetStateAction<UiMessage[]>>;
}) {
  const isUser = message.role === "user";
  return (
    <div className="flex gap-3">
      <div
        className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-[9px] text-[13px] font-bold text-white"
        style={{
          background: isUser
            ? user.avatarColor
            : "linear-gradient(135deg,#0e9f8f,#0b6f88)",
        }}
      >
        {isUser ? initials(user.name) : "◆"}
      </div>
      <div className="flex-1 pt-0.5 leading-relaxed">
        {isUser ? (
          <div className="inline-block rounded-[14px] border border-line bg-card px-4 py-3">
            {message.content}
          </div>
        ) : (
          <div>
            {message.content ? (
              <div className="whitespace-pre-wrap">{renderInline(message.content)}</div>
            ) : message.streaming && !message.artifact ? (
              <span className="text-slate">Generating…</span>
            ) : null}
            {message.artifact && (
              <ArtifactCard
                artifact={message.artifact}
                messageId={message.dbId ?? message.id}
                saved={message.saved}
                savedType={message.savedType}
                onSaved={(type) =>
                  setMessages((m) =>
                    m.map((x) =>
                      x.id === message.id ? { ...x, saved: true, savedType: type } : x,
                    ),
                  )
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Minimal **bold** rendering for the assistant's short intro text.
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <b key={i}>{p.slice(2, -2)}</b>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

let counter = 0;
function uid() {
  return `m${Date.now()}_${++counter}`;
}
