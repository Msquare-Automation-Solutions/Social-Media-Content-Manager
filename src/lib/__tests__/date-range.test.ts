import { describe, it, expect } from "vitest";
import { createdAtRange } from "@/lib/data";

describe("createdAtRange", () => {
  it("returns undefined when neither bound is set", () => {
    expect(createdAtRange(undefined, undefined)).toBeUndefined();
    expect(createdAtRange("", "")).toBeUndefined();
  });

  it("builds an inclusive day range (start-of-day → end-of-day)", () => {
    const r = createdAtRange("2026-03-01", "2026-03-31")!;
    // Parsed as local time; assert the local wall-clock bounds (TZ-agnostic).
    expect(r.gte?.getHours()).toBe(0);
    expect(r.gte?.getMinutes()).toBe(0);
    expect(r.lte?.getHours()).toBe(23);
    expect(r.lte?.getMinutes()).toBe(59);
    expect(r.gte!.getTime()).toBeLessThan(r.lte!.getTime());
  });

  it("supports an open-ended lower bound only", () => {
    const r = createdAtRange("2026-03-01", undefined)!;
    expect(r.gte).toBeInstanceOf(Date);
    expect(r.lte).toBeUndefined();
  });
});
