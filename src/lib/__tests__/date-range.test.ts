import { describe, it, expect } from "vitest";
import { createdAtRange, aggregateDashboard } from "@/lib/data";

describe("createdAtRange", () => {
  it("returns undefined when neither bound is set", () => {
    expect(createdAtRange(undefined, undefined)).toBeUndefined();
    expect(createdAtRange("", "")).toBeUndefined();
  });

  it("builds an inclusive day range (start-of-day → end-of-day)", () => {
    const r = createdAtRange("2026-03-01", "2026-03-31")!;
    // Parsed as local time; assert the local wall-clock bounds (TZ-agnostic).
    expect(r.gte?.getHours()).toBe(0);
    expect(r.gte?.getMinutes()).toBe(0);
    expect(r.lte?.getHours()).toBe(23);
    expect(r.lte?.getMinutes()).toBe(59);
    expect(r.gte!.getTime()).toBeLessThan(r.lte!.getTime());
  });

  it("supports an open-ended lower bound only", () => {
    const r = createdAtRange("2026-03-01", undefined)!;
    expect(r.gte).toBeInstanceOf(Date);
    expect(r.lte).toBeUndefined();
  });
});

describe("aggregateDashboard upcoming window", () => {
  const CH = [{ id: "ig", name: "Instagram", icon: "📷", color: "#e1306c" }];
  const iso = (y: number, m: number, d: number) => new Date(y, m - 1, d).toISOString();
  const task = (id: string, when: string | null) => ({
    id,
    title: id,
    contentTypeLabel: "Reels",
    channelId: "ig",
    currentStage: "PUBLISHING",
    publishStatus: "NOT_PUBLISHED",
    scheduledPublishDate: when,
    stages: [{ reviewStatus: "APPROVED" }],
  });

  it("lists only publish dates from today onward, regardless of the report range", () => {
    // The date range scopes which tasks are fetched; upcoming is always forward-
    // looking from `now`, so a past publish date never shows.
    const d = aggregateDashboard(
      [task("past", iso(2026, 3, 10)), task("future", iso(2026, 5, 10)), task("undated", null)],
      CH,
      [],
      new Date(2026, 3, 1), // 1 Apr 2026
    );
    expect(d.upcoming.map((u) => u.id)).toEqual(["future"]);
  });
});
