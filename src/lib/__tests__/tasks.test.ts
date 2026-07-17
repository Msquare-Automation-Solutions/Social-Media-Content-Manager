import { describe, it, expect } from "vitest";
import { stagesForType, computeCurrentStage, summarizeTasks, isTaskContentType } from "@/lib/tasks";

describe("stagesForType", () => {
  it("maps written types to Content only", () => {
    expect(stagesForType("ARTICLE")).toEqual(["CONTENT"]);
  });
  it("maps carousels to Content + Graphics", () => {
    expect(stagesForType("CAROUSEL")).toEqual(["CONTENT", "GRAPHICS"]);
  });
  it("maps video types to Content + Video + Graphics", () => {
    expect(stagesForType("REEL")).toEqual(["CONTENT", "VIDEO", "GRAPHICS"]);
  });
  it("maps posters to Graphics only", () => {
    expect(stagesForType("AD_POSTER")).toEqual(["GRAPHICS"]);
  });
  it("defaults unknown types to Content", () => {
    expect(stagesForType("???")).toEqual(["CONTENT"]);
    expect(isTaskContentType("???")).toBe(false);
    expect(isTaskContentType("REEL")).toBe(true);
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
