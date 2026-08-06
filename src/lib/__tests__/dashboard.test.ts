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

const iso = (y: number, m: number, d: number) => new Date(y, m, d, 10).toISOString();

const task = (t: Partial<DashTask> & Pick<DashTask, "id">): DashTask => ({
  title: t.id,
  contentTypeLabel: "Reels",
  channelId: "ig",
  accountName: "Msquare",
  currentStage: "CONTENT",
  publishStatus: "NOT_PUBLISHED",
  publishedDate: null,
  scheduledPublishDate: null,
  stages: [],
  ...t,
});

const TASKS: DashTask[] = [
  // Being produced: nothing submitted yet.
  task({ id: "t1", stages: [{ reviewStatus: "NOT_SUBMITTED" }] }),
  // Awaiting review.
  task({ id: "t2", currentStage: "GRAPHICS", stages: [{ reviewStatus: "PENDING" }] }),
  // Sent back.
  task({ id: "t3", currentStage: "VIDEO", channelId: "yt", stages: [{ reviewStatus: "REWORK" }] }),
  // All stages approved → ready to publish.
  task({
    id: "t4",
    currentStage: "PUBLISHING",
    stages: [{ reviewStatus: "APPROVED" }, { reviewStatus: "APPROVED" }],
    scheduledPublishDate: iso(2026, 2, 20),
  }),
  task({ id: "t5", currentStage: "PUBLISHING", channelId: "yt", stages: [{ reviewStatus: "APPROVED" }] }),
  // Live already — the newer one is listed second here, so ordering must come
  // from the published date, not array order.
  task({
    id: "t6",
    currentStage: "DONE",
    channelId: "yt",
    publishStatus: "PUBLISHED_ON_TIME",
    publishedDate: iso(2026, 2, 2),
    stages: [{ reviewStatus: "APPROVED" }],
  }),
  task({
    id: "t7",
    currentStage: "DONE",
    accountName: "AI Lab",
    publishStatus: "PUBLISHED_DELAY",
    publishedDate: iso(2026, 2, 12),
    stages: [{ reviewStatus: "APPROVED" }],
  }),
];

describe("aggregateDashboard (task-based)", () => {
  const d = aggregateDashboard(TASKS, CHANNELS, CREATORS);

  it("counts the task pipeline", () => {
    expect(d.totalTasks).toBe(7);
    expect(d.taskCounts).toEqual({
      inProgress: 1, // t1
      toReview: 1, // t2
      inRework: 1, // t3
      ready: 2, // t4, t5
      published: 2, // t6, t7
    });
  });

  it("lists the latest published posts newest first, with account + platform", () => {
    expect(d.latest.map((l) => l.id)).toEqual(["t7", "t6"]);
    expect(d.latest[0].accountName).toBe("AI Lab");
    expect(d.latest[0].platformName).toBe("Instagram");
    expect(d.latest[1].platformName).toBe("YouTube");
  });

  it("ranks top creators by asset count, dropping zeros", () => {
    expect(d.topCreators.map((c) => c.name)).toEqual(["Ava", "Ben"]);
  });
});
