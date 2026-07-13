import { describe, it, expect } from "vitest";
import {
  aggregateDashboard,
  type DashAsset,
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

// Reference "now" = 15 Mar 2026, so "this month" = March 2026.
const NOW = new Date(2026, 2, 15, 12, 0, 0);
const iso = (y: number, m: number, d: number) => new Date(y, m, d, 10).toISOString();

const ASSETS: DashAsset[] = [
  {
    id: "a1",
    title: "Reel",
    type: "VIDEO",
    status: "APPROVED",
    channels: [{ channelId: "ig", scheduledFor: iso(2026, 2, 20) }], // this month
  },
  {
    id: "a2",
    title: "Cover",
    type: "IMAGE",
    status: "PENDING",
    channels: [
      { channelId: "ig", scheduledFor: iso(2026, 2, 5) }, // this month (past-in-month)
      { channelId: "yt", scheduledFor: iso(2026, 3, 2) }, // next month
    ],
  },
  {
    id: "a3",
    title: "Script",
    type: "VIDEO_SCRIPT", // folds into the VIDEO library view
    status: "REWORK",
    channels: [{ channelId: "yt", scheduledFor: null }],
  },
  {
    id: "a4",
    title: "Old post",
    type: "BLOGPOST",
    status: "APPROVED",
    channels: [{ channelId: "ig", scheduledFor: iso(2026, 1, 10) }], // last month
  },
];

describe("aggregateDashboard", () => {
  const d = aggregateDashboard(ASSETS, CHANNELS, CREATORS, NOW);

  it("counts totals and status buckets", () => {
    expect(d.totalAssets).toBe(4);
    expect(d.statusCounts).toEqual({ PENDING: 1, REWORK: 1, APPROVED: 2, PUBLISHED: 0 });
  });

  it("counts distinct assets scheduled this month (not per-date)", () => {
    // a1 and a2 each have a March date; a2's second date is April but must not double-count.
    expect(d.scheduledThisMonth).toBe(2);
  });

  it("counts assets scheduled from today onward (ignores range end)", () => {
    // a1 (20 Mar, future) and a2 (its yt date 2 Apr is future, even though its
    // ig date 5 Mar is past). a4 (10 Feb) is in the past → excluded.
    expect(d.scheduledAhead).toBe(2);
  });

  it("folds VIDEO_SCRIPT into the VIDEO library view for by-type", () => {
    const video = d.byType.find((t) => t.key === "VIDEO");
    expect(video?.count).toBe(2); // a1 (VIDEO) + a3 (VIDEO_SCRIPT)
    const image = d.byType.find((t) => t.key === "IMAGE");
    expect(image?.count).toBe(1);
  });

  it("breaks down per platform with its own month count", () => {
    const ig = d.perPlatform.find((p) => p.id === "ig")!;
    expect(ig.total).toBe(3); // a1, a2, a4
    expect(ig.scheduledThisMonth).toBe(2); // a1, a2 (a4 is last month)
    const yt = d.perPlatform.find((p) => p.id === "yt")!;
    expect(yt.total).toBe(2); // a2, a3
    expect(yt.scheduledThisMonth).toBe(0); // a2's yt date is April, a3 has none
  });

  it("lists only future post dates, soonest first", () => {
    // From NOW (15 Mar): a1 ig 20 Mar, a2 yt 2 Apr. Past dates (5 Mar, 10 Feb) excluded.
    expect(d.upcoming.map((u) => u.id)).toEqual(["a1", "a2"]);
    expect(d.upcoming[0].platformName).toBe("Instagram");
  });

  it("ranks top creators by asset count, dropping zeros", () => {
    expect(d.topCreators.map((c) => c.name)).toEqual(["Ava", "Ben"]);
  });
});
