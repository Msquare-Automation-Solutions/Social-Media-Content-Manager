import { describe, it, expect } from "vitest";
import { buildWorkspaceOverview } from "@/lib/data";

const CHANNELS = [
  { id: "ig", name: "Instagram", icon: "📸", color: "#e1306c" },
  { id: "li", name: "LinkedIn", icon: "in", color: "#0a66c2" },
];
const ACCOUNTS = [
  { id: "faasil", name: "Faasil", icon: "🧑", color: "#0e9f8f" },
  { id: "msquare", name: "Msquare", icon: "◆", color: "#0866ff" },
];

type OA = {
  id: string;
  title: string;
  type: string;
  thumbnailUrl: string | null;
  status: string;
  channels: { id: string }[];
  accounts: { id: string }[];
};
const asset = (over: Partial<OA>): OA => ({
  id: "x",
  title: "t",
  type: "IMAGE",
  thumbnailUrl: null,
  status: "PENDING",
  channels: [],
  accounts: [],
  ...over,
});

// Assets with no account fall under a single "No account" sub-group, so a
// platform's content-type cards live at groups[i].accounts[0].categories.
describe("buildWorkspaceOverview", () => {
  it("shows all four content-type cards per platform with counts", () => {
    const o = buildWorkspaceOverview(
      [
        asset({ id: "a1", type: "IMAGE", channels: [{ id: "ig" }] }),
        asset({ id: "a2", type: "VIDEO", channels: [{ id: "ig" }] }),
      ],
      CHANNELS,
      ACCOUNTS,
    );
    expect(o.total).toBe(2);
    expect(o.groups.map((g) => g.id)).toEqual(["ig"]);
    const cats = o.groups[0].accounts[0].categories;
    expect(cats.map((c) => c.key)).toEqual(["IMAGE", "THUMBNAIL", "VIDEO", "BLOGPOST"]);
    expect(cats.find((c) => c.key === "IMAGE")!.count).toBe(1);
    expect(cats.find((c) => c.key === "VIDEO")!.count).toBe(1);
    expect(cats.find((c) => c.key === "THUMBNAIL")!.count).toBe(0);
  });

  it("branches a platform into the accounts present on it", () => {
    const o = buildWorkspaceOverview(
      [
        asset({ id: "a1", type: "IMAGE", channels: [{ id: "ig" }], accounts: [{ id: "faasil" }] }),
        asset({ id: "a2", type: "VIDEO", channels: [{ id: "ig" }], accounts: [{ id: "msquare" }] }),
      ],
      CHANNELS,
      ACCOUNTS,
    );
    const ig = o.groups[0];
    // Only the accounts that actually have content, in account order.
    expect(ig.accounts.map((a) => a.id)).toEqual(["faasil", "msquare"]);
    expect(ig.accounts.find((a) => a.id === "faasil")!.categories.find((c) => c.key === "IMAGE")!.count).toBe(1);
    expect(ig.accounts.find((a) => a.id === "msquare")!.categories.find((c) => c.key === "VIDEO")!.count).toBe(1);
  });

  it("puts account-less content under a trailing 'No account' sub-group", () => {
    const o = buildWorkspaceOverview(
      [asset({ id: "a1", type: "IMAGE", channels: [{ id: "ig" }] })],
      CHANNELS,
      ACCOUNTS,
    );
    const last = o.groups[0].accounts.at(-1)!;
    expect(last.id).toBe("unassigned");
    expect(last.name).toBe("No account");
  });

  it("keeps OTHER-typed assets out of the tree (groups and total)", () => {
    const o = buildWorkspaceOverview(
      [
        asset({ id: "img", type: "IMAGE", channels: [{ id: "ig" }] }),
        asset({ id: "misc", type: "OTHER", channels: [{ id: "ig" }] }),
      ],
      CHANNELS,
      ACCOUNTS,
    );
    expect(o.total).toBe(1);
    expect(o.groups[0].count).toBe(1);
    expect(o.recent.map((r) => r.id)).toContain("misc");
  });

  it("folds VIDEO_SCRIPT into the Video card", () => {
    const o = buildWorkspaceOverview(
      [asset({ id: "s1", type: "VIDEO_SCRIPT", channels: [{ id: "ig" }] })],
      CHANNELS,
      ACCOUNTS,
    );
    expect(
      o.groups[0].accounts[0].categories.find((c) => c.key === "VIDEO")!.count,
    ).toBe(1);
  });

  it("caps previews at four per category", () => {
    const many = Array.from({ length: 6 }, (_, i) =>
      asset({ id: `p${i}`, type: "IMAGE", channels: [{ id: "ig" }] }),
    );
    const o = buildWorkspaceOverview(many, CHANNELS, ACCOUNTS);
    const img = o.groups[0].accounts[0].categories.find((c) => c.key === "IMAGE")!;
    expect(img.count).toBe(6);
    expect(img.previews).toHaveLength(4);
  });

  it("duplicates a multi-platform asset under each platform but totals it once", () => {
    const o = buildWorkspaceOverview(
      [asset({ id: "m1", type: "IMAGE", channels: [{ id: "ig" }, { id: "li" }] })],
      CHANNELS,
      ACCOUNTS,
    );
    expect(o.total).toBe(1);
    expect(o.groups.map((g) => g.id)).toEqual(["ig", "li"]);
  });

  it("buckets platform-less assets under a trailing Unassigned group", () => {
    const o = buildWorkspaceOverview([asset({ id: "orphan", channels: [] })], CHANNELS, ACCOUNTS);
    const last = o.groups[o.groups.length - 1];
    expect(last.id).toBe("unassigned");
    expect(last.name).toBe("Unassigned");
  });

  it("surfaces the newest 8 assets (input order) with their first platform", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      asset({ id: `r${i}`, status: "APPROVED", channels: [{ id: "ig" }] }),
    );
    const o = buildWorkspaceOverview(many, CHANNELS, ACCOUNTS);
    expect(o.recent).toHaveLength(8);
    expect(o.recent.map((r) => r.id)).toEqual(["r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7"]);
    expect(o.recent[0].platform?.name).toBe("Instagram");
    expect(o.recent[0].status).toBe("APPROVED");
  });

  it("leaves the platform null for an unassigned recent asset", () => {
    const o = buildWorkspaceOverview([asset({ id: "orphan", channels: [] })], CHANNELS, ACCOUNTS);
    expect(o.recent[0].platform).toBeNull();
  });
});
