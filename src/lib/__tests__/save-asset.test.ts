import { describe, it, expect } from "vitest";
import { validateSaveAsset } from "@/lib/validation/save-asset";

const valid = {
  title: "My Post",
  type: "BLOGPOST",
  source: "GENERATED",
  personId: "person_1",
  channelIds: ["chan_1"],
  tags: ["a", "b"],
};

describe("validateSaveAsset (Save-dialog server validation)", () => {
  it("accepts a well-formed payload", () => {
    const r = validateSaveAsset(valid);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.title).toBe("My Post");
      expect(r.data.channelIds).toEqual(["chan_1"]);
    }
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
    const r = validateSaveAsset({ ...valid, channelIds: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.channelIds).toBeTruthy();
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
