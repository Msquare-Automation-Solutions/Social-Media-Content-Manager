import { describe, it, expect } from "vitest";
import { buildReviewTree, type ReviewAsset } from "@/lib/data";

const CHANNELS = [
  { id: "ig", name: "Instagram", icon: "📸", color: "#e1306c" },
  { id: "li", name: "LinkedIn", icon: "in", color: "#0a66c2" },
];

const person = { name: "Ava Reed", avatarColor: "#0e9f8f" };
const asset = (over: Partial<ReviewAsset>): ReviewAsset => ({
  id: "x",
  title: "t",
  type: "IMAGE",
  source: "UPLOAD",
  thumbnailUrl: null,
  createdAt: "2026-07-01T10:00:00.000Z",
  person,
  channels: [],
  ...over,
});

const chan = (id: string) => CHANNELS.find((c) => c.id === id)!;

describe("buildReviewTree", () => {
  it("groups by platform then category, and totals distinct assets", () => {
    const assets = [
      asset({ id: "a1", type: "IMAGE", channels: [chan("ig")] }),
      asset({ id: "a2", type: "VIDEO", channels: [chan("ig")] }),
      asset({ id: "a3", type: "BLOGPOST", channels: [chan("li")] }),
    ];
    const tree = buildReviewTree(assets, CHANNELS);
    expect(tree.total).toBe(3);
    expect(tree.groups.map((g) => g.id)).toEqual(["ig", "li"]);
    const ig = tree.groups[0];
    expect(ig.count).toBe(2);
    expect(ig.categories.map((c) => c.key)).toEqual(["IMAGE", "VIDEO"]);
    expect(ig.categories[0].assets.map((a) => a.id)).toEqual(["a1"]);
  });

  it("folds VIDEO_SCRIPT into the Videos category", () => {
    const tree = buildReviewTree(
      [asset({ id: "s1", type: "VIDEO_SCRIPT", channels: [chan("ig")] })],
      CHANNELS,
    );
    expect(tree.groups[0].categories[0].key).toBe("VIDEO");
    expect(tree.groups[0].categories[0].count).toBe(1);
  });

  it("shows a multi-platform asset under each of its platforms", () => {
    const tree = buildReviewTree(
      [asset({ id: "m1", type: "IMAGE", channels: [chan("ig"), chan("li")] })],
      CHANNELS,
    );
    expect(tree.total).toBe(1); // counted once overall
    expect(tree.groups.map((g) => g.id)).toEqual(["ig", "li"]); // but appears under both
    expect(tree.groups[0].categories[0].assets[0].id).toBe("m1");
    expect(tree.groups[1].categories[0].assets[0].id).toBe("m1");
  });

  it("buckets platform-less assets under a trailing Unassigned group", () => {
    const tree = buildReviewTree(
      [
        asset({ id: "a1", channels: [chan("ig")] }),
        asset({ id: "orphan", channels: [] }),
      ],
      CHANNELS,
    );
    const last = tree.groups[tree.groups.length - 1];
    expect(last.id).toBe("unassigned");
    expect(last.name).toBe("Unassigned");
    expect(last.categories[0].assets[0].id).toBe("orphan");
  });

  it("omits platforms and categories with nothing in queue", () => {
    const tree = buildReviewTree(
      [asset({ id: "a1", type: "IMAGE", channels: [chan("ig")] })],
      CHANNELS,
    );
    expect(tree.groups.map((g) => g.id)).toEqual(["ig"]); // no LinkedIn
    expect(tree.groups[0].categories.map((c) => c.key)).toEqual(["IMAGE"]); // only Images
  });
});
