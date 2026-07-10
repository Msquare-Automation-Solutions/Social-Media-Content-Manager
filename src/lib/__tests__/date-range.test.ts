import { describe, it, expect } from "vitest";
import { createdAtRange, aggregateDashboard } from "@/lib/data";

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

describe("aggregateDashboard with a range", () => {
  const CH = [{ id: "ig", name: "Instagram", icon: "📷", color: "#e1306c" }];
  const iso = (y: number, m: number, d: number) => new Date(y, m - 1, d).toISOString();
  const asset = (id: string, when: string) => ({
    id,
    title: id,
    type: "IMAGE",
    status: "APPROVED",
    channels: [{ channelId: "ig", scheduledFor: when }],
  });

  it("counts scheduled posts inside the supplied window, not the calendar month", () => {
    const assets = [asset("a", iso(2026, 3, 10)), asset("b", iso(2026, 5, 10))];
    const d = aggregateDashboard(assets, CH, [], new Date(2026, 0, 1), {
      start: new Date("2026-03-01T00:00:00"),
      end: new Date("2026-03-31T23:59:59"),
    });
    // Only "a" falls in March; the month of `now` (January) is ignored.
    expect(d.scheduledThisMonth).toBe(1);
  });
});
