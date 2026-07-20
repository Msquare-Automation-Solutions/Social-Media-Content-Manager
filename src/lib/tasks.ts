import { TASK_STAGES, type TaskStageKey } from "@/lib/enums";

// Content types for the task pipeline (from the team's content calendar). Each
// maps to the production stages it needs — PUBLISHING then ANALYTICS always
// follow, so they're not listed here. Adjust freely; this is the single source
// of truth for "stages by content type".
export type TaskContentType = { key: string; label: string; stages: TaskStageKey[] };

const WRITTEN: TaskStageKey[] = ["CONTENT"];
const CAROUSEL: TaskStageKey[] = ["CONTENT", "GRAPHICS"];
const VIDEO: TaskStageKey[] = ["CONTENT", "VIDEO", "GRAPHICS"];
const GRAPHIC: TaskStageKey[] = ["GRAPHICS"];

export const TASK_CONTENT_TYPES: TaskContentType[] = [
  { key: "ARTICLE", label: "Article", stages: WRITTEN },
  { key: "BLOG", label: "Blog", stages: WRITTEN },
  { key: "FOUNDER_POST", label: "Founder Authority Post", stages: WRITTEN },
  { key: "SERVICE_PROMO", label: "Service Promotion", stages: WRITTEN },
  { key: "CASE_STUDY", label: "Case Study", stages: WRITTEN },
  { key: "CAROUSEL", label: "Carousels", stages: CAROUSEL },
  { key: "REEL", label: "Reels", stages: VIDEO },
  { key: "YT_SHORT", label: "YT Shorts", stages: VIDEO },
  { key: "LONG_VIDEO", label: "Long Video", stages: VIDEO },
  { key: "DEEP_TUTORIAL", label: "Deep Tutorial", stages: VIDEO },
  { key: "AI_EXPERT_TALK", label: "AI Expert Talk", stages: VIDEO },
  { key: "AD_VIDEO", label: "Ad Video", stages: VIDEO },
  { key: "YT_COMMUNITY", label: "YT Community Post", stages: WRITTEN },
  { key: "TESTIMONIAL", label: "Testimonial", stages: VIDEO },
  { key: "CREATIVE_POSTER", label: "Creative Poster", stages: GRAPHIC },
  { key: "AD_POSTER", label: "Ad Poster", stages: GRAPHIC },
  { key: "BROCHURE", label: "Brochure", stages: GRAPHIC },
  { key: "OTHER", label: "Other", stages: WRITTEN },
];

const BY_KEY = new Map(TASK_CONTENT_TYPES.map((t) => [t.key, t]));
// Also look up by (lowercased) label so legacy key-based tasks and new
// name-based types both resolve.
const BY_LABEL = new Map(TASK_CONTENT_TYPES.map((t) => [t.label.toLowerCase(), t]));

// The default content-type names seeded into a new workspace.
export const DEFAULT_TASK_TYPE_NAMES = TASK_CONTENT_TYPES.map((t) => t.label);

export function contentTypeLabel(value: string): string {
  // Legacy tasks stored the KEY (e.g. "REEL"); new tasks store the name.
  return BY_KEY.get(value)?.label ?? value;
}

/** A sensible default set of stages to pre-check when a type is picked. Types
 * are free-form now, so this is only a suggestion — the planner edits it. */
export function suggestStages(typeNameOrKey: string): TaskStageKey[] {
  const t = BY_KEY.get(typeNameOrKey) ?? BY_LABEL.get(typeNameOrKey.toLowerCase());
  return t ? [...t.stages] : ["CONTENT"];
}

export function isTaskContentType(key: string): boolean {
  return BY_KEY.has(key);
}

// Week label from a date, e.g. 2026-07-10 → "July W2" (week = ceil(day/7)).
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export function weekLabelForDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const week = Math.ceil(d.getDate() / 7);
  return `${MONTHS[d.getMonth()]} W${week}`;
}

type StageState = { stage: string; reviewStatus: string };

/**
 * Pure: given a task's stages (with review status), its publish status, and
 * whether metrics are recorded, return the board column it currently sits in —
 * the first production stage not yet APPROVED, else PUBLISHING (until
 * published), else ANALYTICS (until metrics recorded), else DONE.
 */
export function computeCurrentStage(
  stages: StageState[],
  publishStatus: string,
  hasMetrics: boolean,
): string {
  // Production stages follow the canonical order.
  for (const key of TASK_STAGES) {
    const st = stages.find((s) => s.stage === key);
    if (st && st.reviewStatus !== "APPROVED") return key;
  }
  const published = publishStatus.startsWith("PUBLISHED");
  if (!published) return "PUBLISHING";
  if (!hasMetrics) return "ANALYTICS";
  return "DONE";
}

// ── Analytics rollup (pure, unit-testable) ───────────────────────────────────
export type TaskMetric = {
  platform: string | null;
  publishStatus: string;
  clicks: number | null;
  leads: number | null;
  eng: number | null;
  impressions: number | null;
  reach: number | null;
  saves: number | null;
  shares: number | null;
};
type MetricTotals = {
  clicks: number;
  leads: number;
  eng: number;
  impressions: number;
  reach: number;
  saves: number;
  shares: number;
};
export type TaskSummary = MetricTotals & {
  planned: number;
  published: number;
  byPlatform: (MetricTotals & {
    platform: string;
    planned: number;
    published: number;
  })[];
};

/** Planned-vs-published rollup + summed metrics, overall and per platform. */
export function summarizeTasks(tasks: TaskMetric[]): TaskSummary {
  const zero = (): MetricTotals => ({
    clicks: 0, leads: 0, eng: 0, impressions: 0, reach: 0, saves: 0, shares: 0,
  });
  const addMetrics = (dst: MetricTotals, t: TaskMetric) => {
    dst.clicks += t.clicks ?? 0;
    dst.leads += t.leads ?? 0;
    dst.eng += t.eng ?? 0;
    dst.impressions += t.impressions ?? 0;
    dst.reach += t.reach ?? 0;
    dst.saves += t.saves ?? 0;
    dst.shares += t.shares ?? 0;
  };
  const s: TaskSummary = { planned: 0, published: 0, ...zero(), byPlatform: [] };
  const byPlat = new Map<string, TaskSummary["byPlatform"][number]>();
  for (const t of tasks) {
    const isPub = t.publishStatus.startsWith("PUBLISHED");
    s.planned++;
    if (isPub) {
      s.published++;
      addMetrics(s, t);
    }
    const key = t.platform ?? "Unassigned";
    let p = byPlat.get(key);
    if (!p) {
      p = { platform: key, planned: 0, published: 0, ...zero() };
      byPlat.set(key, p);
    }
    p.planned++;
    if (isPub) {
      p.published++;
      addMetrics(p, t);
    }
  }
  s.byPlatform = [...byPlat.values()];
  return s;
}
