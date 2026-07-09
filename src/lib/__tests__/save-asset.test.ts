import { describe, it, expect } from "vitest";
import { validateSaveAsset } from "@/lib/validation/save-asset";

const valid = {
  title: "My Post",
  type: "BLOGPOST",
  source: "GENERATED",
  personId: "person_1",
  channels: [
    { channelId: "chan_1", scheduledFor: "2026-07-20T00:00:00.000Z" },
    { channelId: "chan_2", scheduledFor: null },
  ],
  tags: ["a", "b"],
};

describe("validateSaveAsset (Save-dialog server validation)", () => {
  it("accepts a well-formed payload with per-platform dates", () => {
    const r = validateSaveAsset(valid);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.title).toBe("My Post");
      expect(r.data.channels[0].channelId).toBe("chan_1");
      expect(r.data.channels[0].scheduledFor).toBe("2026-07-20T00:00:00.000Z");
    }
  });

  it("rejects a non-ISO post date", () => {
    const r = validateSaveAsset({
      ...valid,
      channels: [{ channelId: "chan_1", scheduledFor: "not-a-date" }],
    });
    expect(r.ok).toBe(false);
  });

  it("requires a non-empty name", () => {
    const r = validateSaveAsset({ ...valid, title: "   " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.title).toBeTruthy();
  });

  it("requires a person", () => {
    const r = validateSaveAsset({ ...valid, personId: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.personId).toBeTruthy();
  });

  it("requires at least one platform", () => {
    const r = validateSaveAsset({ ...valid, channels: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.channels).toBeTruthy();
  });

  it("rejects an invalid category", () => {
    const r = validateSaveAsset({ ...valid, type: "NONSENSE" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.type).toBeTruthy();
  });

  it("rejects an invalid source", () => {
    const r = validateSaveAsset({ ...valid, source: "MAGIC" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.source).toBeTruthy();
  });

  it("defaults tags to an empty array when omitted", () => {
    const { tags, ...noTags } = valid;
    void tags;
    const r = validateSaveAsset(noTags);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.tags).toEqual([]);
  });
});
