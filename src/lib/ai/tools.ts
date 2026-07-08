import type Anthropic from "@anthropic-ai/sdk";

// App-defined tools on the Anthropic Messages API (v1 Route A).
//
// CONTENT_TOOLS (the three create_* tools) are sent to the model. They return
// draft artifacts that render as cards in chat — nothing is persisted until
// the user hits Save, so they're terminal (no tool_result round-trip needed).
//
// READ_TOOLS (list_assets / get_asset) are DEFINED here for the roadmap but not
// sent to the API in v1, because they'd require a multi-turn tool-execution
// loop. Instead the chat route injects a compact recent-library summary into
// the system prompt (see buildLibraryContext), which covers "rewrite my last
// blog post" without a half-built agentic loop. When the native Agent Skills
// path lands, wire these into a real loop behind streamChat().

export const CONTENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "create_blogpost",
    description:
      "Create a blog post draft. Returns an artifact card; NOT saved to the library until the user hits Save.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Human-readable post title." },
        html: {
          type: "string",
          description:
            "Post body as clean semantic HTML (h2/h3, p, ul, strong). No inline styles.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional topical tags.",
        },
      },
      required: ["title", "html"],
    },
  },
  {
    name: "create_thumbnail_concept",
    description:
      "Create a YouTube/social thumbnail concept: title, 3 caption options, and design notes. Returns an artifact card.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        captionOptions: {
          type: "array",
          items: { type: "string" },
          description: "2-3 punchy on-thumbnail caption options.",
        },
        designNotes: {
          type: "string",
          description: "Concrete layout/color/focal-point direction.",
        },
      },
      required: ["title", "captionOptions", "designNotes"],
    },
  },
  {
    name: "create_video_script",
    description:
      "Create a video script with titled sections (Hook, Problem, Solution/Demo, CTA). Returns an artifact card.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              heading: { type: "string" },
              body: { type: "string" },
            },
            required: ["heading", "body"],
          },
        },
      },
      required: ["title", "sections"],
    },
  },
];

// Defined for the roadmap; not sent to the API in v1 (see header note).
export const READ_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_assets",
    description:
      "List existing library assets (optionally filtered) so you can reference or revise them.",
    input_schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["IMAGE", "THUMBNAIL", "VIDEO", "BLOGPOST", "VIDEO_SCRIPT"],
        },
        query: { type: "string", description: "Match against title/tags." },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_asset",
    description: "Fetch one library asset (including its html body) by id.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
];

export type ToolName =
  | "create_blogpost"
  | "create_thumbnail_concept"
  | "create_video_script"
  | "list_assets"
  | "get_asset";

// The artifact payload we persist on the assistant ChatMessage and render as a
// card. Draft only — becomes a MediaAsset on Save.
export type Artifact =
  | {
      kind: "BLOGPOST";
      title: string;
      html: string;
      tags?: string[];
    }
  | {
      kind: "THUMBNAIL";
      title: string;
      captionOptions: string[];
      designNotes: string;
    }
  | {
      kind: "VIDEO_SCRIPT";
      title: string;
      sections: { heading: string; body: string }[];
    };

/** Map a tool call to the artifact we render/persist (draft, not saved). */
export function toolCallToArtifact(
  name: ToolName,
  input: Record<string, unknown>,
): Artifact | null {
  switch (name) {
    case "create_blogpost":
      return {
        kind: "BLOGPOST",
        title: String(input.title ?? "Untitled post"),
        html: String(input.html ?? ""),
        tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
      };
    case "create_thumbnail_concept":
      return {
        kind: "THUMBNAIL",
        title: String(input.title ?? "Thumbnail concept"),
        captionOptions: Array.isArray(input.captionOptions)
          ? input.captionOptions.map(String)
          : [],
        designNotes: String(input.designNotes ?? ""),
      };
    case "create_video_script":
      return {
        kind: "VIDEO_SCRIPT",
        title: String(input.title ?? "Video script"),
        sections: Array.isArray(input.sections)
          ? (input.sections as { heading: string; body: string }[]).map((s) => ({
              heading: String(s.heading ?? ""),
              body: String(s.body ?? ""),
            }))
          : [],
      };
    default:
      return null;
  }
}
