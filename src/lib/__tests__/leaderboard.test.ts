import { describe, it, expect } from "vitest";
import { rankContributors } from "@/lib/data";
import { hasRole, roleLabel, isContributor } from "@/lib/roles";

const PEOPLE = [
  { id: "u1", name: "Ava", avatarColor: "#0e9f8f", avatarUrl: null },
  { id: "u2", name: "Ben", avatarColor: "#7a4fc9", avatarUrl: null },
  { id: "u3", name: "Cleo", avatarColor: "#2a6fb8", avatarUrl: null },
  { id: "u4", name: "Dev", avatarColor: "#e0912b", avatarUrl: null },
];

describe("rankContributors", () => {
  it("orders by count, most first", () => {
    const rows = rankContributors(
      [
        { userId: "u2", count: 3 },
        { userId: "u1", count: 9 },
        { userId: "u3", count: 5 },
      ],
      PEOPLE,
    );
    expect(rows.map((r) => r.name)).toEqual(["Ava", "Cleo", "Ben"]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("gives tied counts the same rank, and skips the ones they consume", () => {
    const rows = rankContributors(
      [
        { userId: "u1", count: 9 },
        { userId: "u2", count: 4 },
        { userId: "u3", count: 4 },
        { userId: "u4", count: 1 },
      ],
      PEOPLE,
    );
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 2, 4]);
    // Ties break by name so the order doesn't wobble between renders.
    expect(rows.map((r) => r.name)).toEqual(["Ava", "Ben", "Cleo", "Dev"]);
  });

  it("leaves out anyone with nothing to their name", () => {
    const rows = rankContributors(
      [
        { userId: "u1", count: 2 },
        { userId: "u2", count: 0 },
      ],
      PEOPLE,
    );
    expect(rows.map((r) => r.userId)).toEqual(["u1"]);
  });

  it("survives a tally for a user who no longer exists", () => {
    const rows = rankContributors([{ userId: "gone", count: 3 }], PEOPLE);
    expect(rows[0].name).toBe("Unknown");
    expect(rows[0].count).toBe(3);
  });

  it("returns nothing for an empty month", () => {
    expect(rankContributors([], PEOPLE)).toEqual([]);
  });
});

describe("CONTRIBUTOR sits at the bottom of the role ladder", () => {
  it("cannot reach anything guarded at VIEWER or above", () => {
    expect(hasRole("CONTRIBUTOR", "VIEWER")).toBe(false);
    expect(hasRole("CONTRIBUTOR", "EDITOR")).toBe(false);
    expect(hasRole("CONTRIBUTOR", "ADMIN")).toBe(false);
  });

  it("everyone else inherits Content Bin access", () => {
    for (const role of ["VIEWER", "EDITOR", "ADMIN", "OWNER"] as const) {
      expect(hasRole(role, "CONTRIBUTOR")).toBe(true);
    }
  });

  it("labels itself distinctly in the accounts table", () => {
    expect(roleLabel("CONTRIBUTOR")).toBe("Contributor");
    expect(roleLabel("EDITOR")).toBe("User");
    expect(roleLabel("ADMIN")).toBe("Admin");
    expect(isContributor("CONTRIBUTOR")).toBe(true);
    expect(isContributor("EDITOR")).toBe(false);
  });
});
