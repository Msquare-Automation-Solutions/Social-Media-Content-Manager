import { describe, it, expect } from "vitest";
import {
  aggregateDashboard,
  type DashTask,
  type DashChannel,
} from "@/lib/data";

const CHANNELS: DashChannel[] = [
  { id: "ig", name: "Instagram", icon: "📸", color: "#e5533d" },
  { id: "yt", name: "YouTube", icon: "▶", color: "#c2185b" },
];

const CREATORS = [
  { name: "Ava", avatarColor: "#0e9f8f", assetCount: 5 },
  { name: "Ben", avatarColor: "#7a4fc9", assetCount: 2 },
  { name: "Cleo", avatarColor: "#2a6fb8", assetCount: 0 },
];

// Reference "now" = 15 Mar 2026.
const NOW = new Date(2026, 2, 15, 12, 0, 0);
const iso = (y: number, m: number, d: number) => new Date(y, m, d, 10).toISOString();

const task = (t: Partial<DashTask> & Pick<DashTask, "id">): DashTask => ({
  title: t.id,
  contentTypeLabel: "Reels",
  channelId: "ig",
  currentStage: "CONTENT",
  publishStatus: "NOT_PUBLISHED",
  scheduledPublishDate: null,
  stages: [],
  ...t,
});

const TASKS: DashTask[] = [
  // Being produced: nothing submitted yet.
  task({ id: "t1", currentStage: "CONTENT", stages: [{ reviewStatus: "NOT_SUBMITTED" }] }),
  // Awaiting review.
  task({ id: "t2", currentStage: "GRAPHICS", contentTypeLabel: "Carousels", stages: [{ reviewStatus: "PENDING" }] }),
  // Sent back.
  task({ id: "t3", currentStage: "VIDEO", channelId: "yt", stages: [{ reviewStatus: "REWORK" }] }),
  // All stages approved, scheduled ahead → ready to publish.
  task({
    id: "t4",
    currentStage: "PUBLISHING",
    stages: [{ reviewStatus: "APPROVED" }, { reviewStatus: "APPROVED" }],
    scheduledPublishDate: iso(2026, 2, 20),
  }),
  // Approved but its publish date already passed — still ready, not upcoming.
  task({
    id: "t5",
    currentStage: "PUBLISHING",
    channelId: "yt",
    stages: [{ reviewStatus: "APPROVED" }],
    scheduledPublishDate: iso(2026, 1, 10),
  }),
  // Live already.
  task({ id: "t6", currentStage: "DONE", channelId: "yt", publishStatus: "PUBLISHED_ON_TIME", stages: [{ reviewStatus: "APPROVED" }] }),
];

describe("aggregateDashboard (task-based)", () => {
  const d = aggregateDashboard(TASKS, CHANNELS, CREATORS, NOW);

  it("counts the task pipeline", () => {
    expect(d.totalTasks).toBe(6);
    expect(d.taskCounts).toEqual({
      inProgress: 1, // t1
      toReview: 1, // t2
      inRework: 1, // t3
      ready: 2, // t4, t5
      published: 1, // t6
    });
  });

  it("groups tasks by board stage in pipeline order", () => {
    expect(d.byStage.map((s) => s.key)).toEqual([
      "CONTENT",
      "VIDEO",
      "GRAPHICS",
      "PUBLISHING",
      "DONE",
      "ANALYTICS",
    ]);
    expect(d.byStage.find((s) => s.key === "PUBLISHING")?.count).toBe(2); // t4, t5
    expect(d.byStage.find((s) => s.key === "ANALYTICS")?.count).toBe(0);
  });

  it("groups tasks by content type, busiest first", () => {
    expect(d.byContentType[0]).toEqual({ key: "Reels", label: "Reels", count: 5 });
    expect(d.byContentType.find((t) => t.key === "Carousels")?.count).toBe(1);
  });

  it("counts tasks per platform", () => {
    expect(d.perPlatform.find((p) => p.id === "ig")?.total).toBe(3); // t1, t2, t4
    expect(d.perPlatform.find((p) => p.id === "yt")?.total).toBe(3); // t3, t5, t6
  });

  it("lists unpublished tasks due from today onward, soonest first", () => {
    // t4 (20 Mar) qualifies; t5's date is past, t6 is already live.
    expect(d.upcoming.map((u) => u.id)).toEqual(["t4"]);
    expect(d.upcoming[0].platformName).toBe("Instagram");
  });

  it("ranks top creators by asset count, dropping zeros", () => {
    expect(d.topCreators.map((c) => c.name)).toEqual(["Ava", "Ben"]);
  });
});
