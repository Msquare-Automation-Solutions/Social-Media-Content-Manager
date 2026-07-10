import { describe, it, expect } from "vitest";
import { buildWorkspaceOverview } from "@/lib/data";

const CHANNELS = [
  { id: "ig", name: "Instagram", icon: "📸", color: "#e1306c" },
  { id: "li", name: "LinkedIn", icon: "in", color: "#0a66c2" },
];

type OA = {
  id: string;
  title: string;
  type: string;
  thumbnailUrl: string | null;
  status: string;
  channels: { id: string }[];
};
const asset = (over: Partial<OA>): OA => ({
  id: "x",
  title: "t",
  type: "IMAGE",
  thumbnailUrl: null,
  status: "PENDING",
  channels: [],
  ...over,
});

describe("buildWorkspaceOverview", () => {
  it("shows all four content-type cards per platform with counts", () => {
    const o = buildWorkspaceOverview(
      [
        asset({ id: "a1", type: "IMAGE", channels: [{ id: "ig" }] }),
        asset({ id: "a2", type: "VIDEO", channels: [{ id: "ig" }] }),
      ],
      CHANNELS,
    );
    expect(o.total).toBe(2);
    expect(o.groups.map((g) => g.id)).toEqual(["ig"]);
    const ig = o.groups[0];
    // Every category is present (even the empty ones), in library order.
    expect(ig.categories.map((c) => c.key)).toEqual(["IMAGE", "THUMBNAIL", "VIDEO", "BLOGPOST"]);
    expect(ig.categories.find((c) => c.key === "IMAGE")!.count).toBe(1);
    expect(ig.categories.find((c) => c.key === "VIDEO")!.count).toBe(1);
    expect(ig.categories.find((c) => c.key === "THUMBNAIL")!.count).toBe(0);
  });

  it("folds VIDEO_SCRIPT into the Video card", () => {
    const o = buildWorkspaceOverview(
      [asset({ id: "s1", type: "VIDEO_SCRIPT", channels: [{ id: "ig" }] })],
      CHANNELS,
    );
    expect(o.groups[0].categories.find((c) => c.key === "VIDEO")!.count).toBe(1);
  });

  it("caps previews at four per category", () => {
    const many = Array.from({ length: 6 }, (_, i) =>
      asset({ id: `p${i}`, type: "IMAGE", channels: [{ id: "ig" }] }),
    );
    const o = buildWorkspaceOverview(many, CHANNELS);
    const img = o.groups[0].categories.find((c) => c.key === "IMAGE")!;
    expect(img.count).toBe(6);
    expect(img.previews).toHaveLength(4);
  });

  it("duplicates a multi-platform asset under each platform but totals it once", () => {
    const o = buildWorkspaceOverview(
      [asset({ id: "m1", type: "IMAGE", channels: [{ id: "ig" }, { id: "li" }] })],
      CHANNELS,
    );
    expect(o.total).toBe(1);
    expect(o.groups.map((g) => g.id)).toEqual(["ig", "li"]);
  });

  it("buckets platform-less assets under a trailing Unassigned group", () => {
    const o = buildWorkspaceOverview(
      [asset({ id: "orphan", channels: [] })],
      CHANNELS,
    );
    const last = o.groups[o.groups.length - 1];
    expect(last.id).toBe("unassigned");
    expect(last.name).toBe("Unassigned");
  });

  it("surfaces the newest 8 assets (input order) with their first platform", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      asset({ id: `r${i}`, status: "APPROVED", channels: [{ id: "ig" }] }),
    );
    const o = buildWorkspaceOverview(many, CHANNELS);
    expect(o.recent).toHaveLength(8);
    expect(o.recent.map((r) => r.id)).toEqual([
      "r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7",
    ]);
    expect(o.recent[0].platform?.name).toBe("Instagram");
    expect(o.recent[0].status).toBe("APPROVED");
  });

  it("leaves the platform null for an unassigned recent asset", () => {
    const o = buildWorkspaceOverview([asset({ id: "orphan", channels: [] })], CHANNELS);
    expect(o.recent[0].platform).toBeNull();
  });
});
