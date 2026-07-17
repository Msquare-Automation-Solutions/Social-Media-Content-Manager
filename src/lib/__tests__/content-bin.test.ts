import { describe, it, expect } from "vitest";
import { searchBinItems } from "@/lib/data";
import { validateSaveAsset } from "@/lib/validation/save-asset";
import { BIN_STATUSES, BIN_STATUS_LABELS } from "@/lib/enums";

const item = (over: Partial<Parameters<typeof searchBinItems>[0][number]> = {}) => ({
  title: "",
  note: "",
  tags: [] as string[],
  links: [] as string[],
  ...over,
});

describe("searchBinItems (Content Bin search)", () => {
  const items = [
    item({ title: "Hook thread", tags: ["reel"], links: ["x.com/foo"] }),
    item({ title: "Onboarding case study", note: "day-by-day framing" }),
    item({ title: "Trends report", links: ["later.com/blog/short-form"] }),
  ];

  it("returns everything when the query is empty/whitespace", () => {
    expect(searchBinItems(items, "")).toHaveLength(3);
    expect(searchBinItems(items, "   ")).toHaveLength(3);
    expect(searchBinItems(items, undefined)).toHaveLength(3);
  });

  it("matches on title (case-insensitive)", () => {
    expect(searchBinItems(items, "HOOK")).toHaveLength(1);
  });

  it("matches on note, tags, and links", () => {
    expect(searchBinItems(items, "framing")[0].title).toBe("Onboarding case study");
    expect(searchBinItems(items, "reel")[0].title).toBe("Hook thread");
    expect(searchBinItems(items, "later.com")[0].title).toBe("Trends report");
  });

  it("returns nothing when there is no match", () => {
    expect(searchBinItems(items, "zzz")).toHaveLength(0);
  });
});

describe("BIN_STATUSES", () => {
  it("has a label for every status", () => {
    for (const s of BIN_STATUSES) expect(BIN_STATUS_LABELS[s]).toBeTruthy();
  });
});

describe("Save validation — promoted screenshot cover", () => {
  const base = {
    title: "Promoted idea",
    type: "IMAGE",
    source: "GENERATED",
    personId: "person_1",
    channels: [{ channelId: "chan_1", scheduledFor: null }],
  };

  it("accepts an optional pre-made thumbnailUrl", () => {
    const r = validateSaveAsset({ ...base, thumbnailUrl: "https://cdn.example/r2/shot.png" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.thumbnailUrl).toBe("https://cdn.example/r2/shot.png");
  });

  it("is fine without a thumbnailUrl", () => {
    const r = validateSaveAsset(base);
    expect(r.ok).toBe(true);
  });
});
