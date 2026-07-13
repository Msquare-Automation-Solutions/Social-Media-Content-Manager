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

const chans = [
  { channelId: "c1", scheduledFor: "2026-07-20T00:00:00.000Z" },
  { channelId: "c2", scheduledFor: null },
];

describe("assetSnapshot (version snapshots)", () => {
  it("captures every versioned field plus channels with post dates", () => {
    const snap = assetSnapshot(asset, chans);
    expect(snap).toMatchObject({
      title: "Post",
      type: "BLOGPOST",
      personId: "p1",
      tags: '["x"]',
      html: "<p>hi</p>",
      thumbnailUrl: "/uploads/thumbs/a.png",
      source: "GENERATED",
      channels: chans,
    });
  });

  it("is JSON-serializable (stored as snapshotJson string)", () => {
    const snap = assetSnapshot(asset, chans);
    const roundtrip = JSON.parse(JSON.stringify(snap));
    expect(roundtrip.channels).toEqual(chans);
    expect(roundtrip.title).toBe("Post");
  });

  it("preserves empty channel list", () => {
    expect(assetSnapshot(asset, []).channels).toEqual([]);
  });
});

describe("canMutateAsset (asset ownership rules)", () => {
  it("ADMIN+ may mutate any asset", () => {
    expect(canMutateAsset({ id: "u1", role: "ADMIN" }, { createdById: "other" })).toBe(true);
    expect(canMutateAsset({ id: "u1", role: "OWNER" }, { createdById: "other" })).toBe(true);
  });

  it("EDITOR may mutate their own", () => {
    expect(canMutateAsset({ id: "u1", role: "EDITOR" }, { createdById: "u1" })).toBe(true);
    expect(canMutateAsset({ id: "u1", role: "EDITOR" }, { createdById: "u2" })).toBe(false);
  });

  it("EDITOR may mutate content assigned to them (person linked to their user)", () => {
    // Created by someone else, but the assigned Person is linked to u1 → allowed.
    expect(
      canMutateAsset(
        { id: "u1", role: "EDITOR" },
        { createdById: "u2", person: { userId: "u1" } },
      ),
    ).toBe(true);
    // Assigned to a different user's person → not allowed.
    expect(
      canMutateAsset(
        { id: "u1", role: "EDITOR" },
        { createdById: "u2", person: { userId: "u3" } },
      ),
    ).toBe(false);
    // Standalone person (no linked user) → falls back to creator check.
    expect(
      canMutateAsset(
        { id: "u1", role: "EDITOR" },
        { createdById: "u2", person: { userId: null } },
      ),
    ).toBe(false);
  });

  it("VIEWER may not mutate anything, even assigned to them", () => {
    expect(canMutateAsset({ id: "u1", role: "VIEWER" }, { createdById: "u1" })).toBe(false);
    expect(
      canMutateAsset(
        { id: "u1", role: "VIEWER" },
        { createdById: "u2", person: { userId: "u1" } },
      ),
    ).toBe(false);
  });
});
