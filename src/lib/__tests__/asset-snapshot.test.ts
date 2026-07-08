import { describe, it, expect } from "vitest";
import { assetSnapshot, canMutateAsset } from "@/lib/assets";

const asset = {
  title: "Post",
  type: "BLOGPOST",
  personId: "p1",
  tags: '["x"]',
  html: "<p>hi</p>",
  url: null,
  thumbnailUrl: "/uploads/thumbs/a.png",
  filename: null,
  mimeType: null,
  sizeBytes: null,
  source: "GENERATED",
};

describe("assetSnapshot (version snapshots)", () => {
  it("captures every versioned field plus channel ids", () => {
    const snap = assetSnapshot(asset, ["c1", "c2"]);
    expect(snap).toMatchObject({
      title: "Post",
      type: "BLOGPOST",
      personId: "p1",
      tags: '["x"]',
      html: "<p>hi</p>",
      thumbnailUrl: "/uploads/thumbs/a.png",
      source: "GENERATED",
      channelIds: ["c1", "c2"],
    });
  });

  it("is JSON-serializable (stored as snapshotJson string)", () => {
    const snap = assetSnapshot(asset, ["c1"]);
    const roundtrip = JSON.parse(JSON.stringify(snap));
    expect(roundtrip.channelIds).toEqual(["c1"]);
    expect(roundtrip.title).toBe("Post");
  });

  it("preserves empty channel list", () => {
    expect(assetSnapshot(asset, []).channelIds).toEqual([]);
  });
});

describe("canMutateAsset (asset ownership rules)", () => {
  it("ADMIN+ may mutate any asset", () => {
    expect(canMutateAsset({ id: "u1", role: "ADMIN" }, { createdById: "other" })).toBe(true);
    expect(canMutateAsset({ id: "u1", role: "OWNER" }, { createdById: "other" })).toBe(true);
  });

  it("EDITOR may mutate only their own", () => {
    expect(canMutateAsset({ id: "u1", role: "EDITOR" }, { createdById: "u1" })).toBe(true);
    expect(canMutateAsset({ id: "u1", role: "EDITOR" }, { createdById: "u2" })).toBe(false);
  });

  it("VIEWER may not mutate anything", () => {
    expect(canMutateAsset({ id: "u1", role: "VIEWER" }, { createdById: "u1" })).toBe(false);
  });
});
