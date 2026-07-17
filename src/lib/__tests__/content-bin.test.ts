import { describe, it, expect } from "vitest";
import { searchBinItems } from "@/lib/data";
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
  it("has New / Used / Discarded with labels", () => {
    expect(BIN_STATUSES).toEqual(["NEW", "USED", "DISCARDED"]);
    for (const s of BIN_STATUSES) expect(BIN_STATUS_LABELS[s]).toBeTruthy();
  });
});
