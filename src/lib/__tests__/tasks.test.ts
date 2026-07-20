import { describe, it, expect } from "vitest";
import { suggestStages, computeCurrentStage, summarizeTasks, weekLabelForDate } from "@/lib/tasks";

describe("suggestStages (default stage suggestion)", () => {
  it("suggests Content only for written types (by key or name)", () => {
    expect(suggestStages("ARTICLE")).toEqual(["CONTENT"]);
    expect(suggestStages("Article")).toEqual(["CONTENT"]);
  });
  it("suggests Content + Graphics for carousels", () => {
    expect(suggestStages("Carousels")).toEqual(["CONTENT", "GRAPHICS"]);
  });
  it("suggests Content + Video + Graphics for video types", () => {
    expect(suggestStages("Reels")).toEqual(["CONTENT", "VIDEO", "GRAPHICS"]);
  });
  it("suggests Graphics only for posters", () => {
    expect(suggestStages("Ad Poster")).toEqual(["GRAPHICS"]);
  });
  it("defaults unknown/custom types to Content", () => {
    expect(suggestStages("My Custom Type")).toEqual(["CONTENT"]);
  });
});

describe("weekLabelForDate", () => {
  it("derives month + week-of-month", () => {
    expect(weekLabelForDate("2026-07-03")).toBe("July W1");
    expect(weekLabelForDate("2026-07-10")).toBe("July W2");
    expect(weekLabelForDate("2026-07-30")).toBe("July W5");
  });
  it("returns empty for an invalid date", () => {
    expect(weekLabelForDate("nope")).toBe("");
  });
});

describe("computeCurrentStage", () => {
  const vid = [
    { stage: "CONTENT", reviewStatus: "APPROVED" },
    { stage: "VIDEO", reviewStatus: "PENDING" },
    { stage: "GRAPHICS", reviewStatus: "NOT_SUBMITTED" },
  ];
  it("returns the first non-approved production stage", () => {
    expect(computeCurrentStage(vid, "NOT_PUBLISHED", false)).toBe("VIDEO");
  });
  it("moves to Publishing once all stages approved but not published", () => {
    const done = vid.map((s) => ({ ...s, reviewStatus: "APPROVED" }));
    expect(computeCurrentStage(done, "NOT_PUBLISHED", false)).toBe("PUBLISHING");
  });
  it("moves to Analytics once published without metrics", () => {
    const done = vid.map((s) => ({ ...s, reviewStatus: "APPROVED" }));
    expect(computeCurrentStage(done, "PUBLISHED_ON_TIME", false)).toBe("ANALYTICS");
  });
  it("is Done once published with metrics", () => {
    const done = vid.map((s) => ({ ...s, reviewStatus: "APPROVED" }));
    expect(computeCurrentStage(done, "PUBLISHED_ON_TIME", true)).toBe("DONE");
  });
});

describe("summarizeTasks", () => {
  it("rolls up planned vs published + metrics by platform", () => {
    const s = summarizeTasks([
      { platform: "LinkedIn", publishStatus: "PUBLISHED_ON_TIME", clicks: 100, leads: 4, eng: 20 },
      { platform: "LinkedIn", publishStatus: "NOT_PUBLISHED", clicks: null, leads: null, eng: null },
      { platform: "YouTube", publishStatus: "PUBLISHED_DELAY", clicks: 50, leads: 1, eng: 5 },
    ]);
    expect(s.planned).toBe(3);
    expect(s.published).toBe(2);
    expect(s.clicks).toBe(150);
    expect(s.leads).toBe(5);
    const li = s.byPlatform.find((p) => p.platform === "LinkedIn")!;
    expect(li.planned).toBe(2);
    expect(li.published).toBe(1);
    expect(li.clicks).toBe(100);
  });
});
