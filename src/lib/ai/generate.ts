import Anthropic from "@anthropic-ai/sdk";
import { CONTENT_TOOLS, type ToolName } from "./tools";

// ── Single seam for the Anthropic call ──────────────────────────────────────
// Everything AI-related goes through streamChat(). v1 uses ordinary
// app-defined tools on the Messages API (Route A: instructions live in the
// Skill.systemPrompt). A native Agent Skills path can replace the body here
// later without touching any UI or route code.
//
// When ANTHROPIC_API_KEY is empty we fall back to a canned mock stream so the
// whole product is demoable without a key. Drop a key in .env and it goes live.

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ToolCall = {
  id: string;
  name: ToolName;
  input: Record<string, unknown>;
};

export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool"; call: ToolCall }
  | { type: "done" };

export type GenerateParams = {
  systemPrompt: string;
  messages: ChatTurn[];
  /** Set false to force plain text (no artifact tools). Default true. */
  enableTools?: boolean;
};

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function* streamChat(
  params: GenerateParams,
): AsyncGenerator<StreamEvent> {
  if (!isAiConfigured()) {
    yield* mockStream(params);
    return;
  }
  yield* liveStream(params);
}

// ── Live Anthropic streaming ────────────────────────────────────────────────
async function* liveStream(
  params: GenerateParams,
): AsyncGenerator<StreamEvent> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const useTools = params.enableTools !== false;

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 2048,
    system: params.systemPrompt,
    messages: params.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    ...(useTools ? { tools: CONTENT_TOOLS } : {}),
  });

  // Accumulate streaming tool_use input JSON per content block.
  const toolBlocks = new Map<number, { id: string; name: string; json: string }>();

  for await (const ev of stream) {
    if (ev.type === "content_block_start") {
      if (ev.content_block.type === "tool_use") {
        toolBlocks.set(ev.index, {
          id: ev.content_block.id,
          name: ev.content_block.name,
          json: "",
        });
      }
    } else if (ev.type === "content_block_delta") {
      if (ev.delta.type === "text_delta" && ev.delta.text) {
        yield { type: "text", text: ev.delta.text };
      } else if (ev.delta.type === "input_json_delta") {
        const block = toolBlocks.get(ev.index);
        if (block) block.json += ev.delta.partial_json;
      }
    } else if (ev.type === "content_block_stop") {
      const block = toolBlocks.get(ev.index);
      if (block) {
        let input: Record<string, unknown> = {};
        try {
          input = block.json ? JSON.parse(block.json) : {};
        } catch {
          input = {};
        }
        yield {
          type: "tool",
          call: { id: block.id, name: block.name as ToolName, input },
        };
        toolBlocks.delete(ev.index);
      }
    }
  }

  yield { type: "done" };
}

// ── Mock stream (no API key) ────────────────────────────────────────────────
// Produces a short intro + one artifact tool call chosen by keyword, so the
// full chat → artifact → Save flow works end-to-end without Anthropic.
async function* mockStream(
  params: GenerateParams,
): AsyncGenerator<StreamEvent> {
  const last = [...params.messages].reverse().find((m) => m.role === "user");
  const prompt = (last?.content || "").toLowerCase();
  const useTools = params.enableTools !== false;

  const intro =
    "Here's a first draft — hit **Save…** when you're happy with it, or ask me to tweak anything first.";
  for (const chunk of intro.match(/\S+\s*/g) || [intro]) {
    yield { type: "text", text: chunk };
    await sleep(18);
  }

  if (!useTools) {
    yield { type: "done" };
    return;
  }

  const call = mockToolFor(prompt);
  if (call) yield { type: "tool", call };
  yield { type: "done" };
}

function mockToolFor(prompt: string): ToolCall | null {
  const id = "mock_" + Math.abs(hash(prompt)).toString(36);
  if (prompt.includes("thumbnail")) {
    return {
      id,
      name: "create_thumbnail_concept",
      input: {
        title: "YT Thumb — n8n Invoice Automation",
        captionOptions: [
          "Invoices Done in 0 Clicks",
          "This Automation Prints Time",
          "Stop Typing Invoices. Forever.",
        ],
        designNotes:
          "Teal→navy gradient background, bold yellow caption band across the lower third, n8n logo bottom-right, surprised founder face on the left.",
      },
    };
  }
  if (prompt.includes("script") || prompt.includes("video")) {
    return {
      id,
      name: "create_video_script",
      input: {
        title: "Script — AI Voice Assistants for Real Estate",
        sections: [
          { heading: "Hook", body: "Every missed call is a missed listing." },
          { heading: "Problem", body: "Agents lose 40% of after-hours leads." },
          {
            heading: "Solution",
            body: "An AI voice agent answers, qualifies, and books viewings straight into the CRM.",
          },
          { heading: "CTA", body: "Book a free automation consult." },
        ],
      },
    };
  }
  return {
    id,
    name: "create_blogpost",
    input: {
      title: "Automating Lead Capture with Make.com",
      html: "<h2>Automating Lead Capture with Make.com</h2><p>Every lead that sits in an inbox overnight is money cooling off. In this guide we wire a form → CRM → instant follow-up pipeline in Make.com — with enrichment and Slack alerts, no code, in about 20 minutes.</p><h3>The pipeline</h3><p>Form submission triggers the scenario, we enrich the contact, upsert it into the CRM, and fire an instant templated reply.</p>",
      tags: ["lead-capture", "make"],
    },
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
