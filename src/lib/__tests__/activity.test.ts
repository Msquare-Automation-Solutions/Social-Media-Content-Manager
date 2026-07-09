import { describe, it, expect } from "vitest";
import { ACTIONS, describeActivity } from "@/lib/activity-format";

describe("activity catalog + describeActivity", () => {
  it("every action maps to a valid category", () => {
    const cats = new Set(["content", "account", "creator", "platform"]);
    for (const def of Object.values(ACTIONS)) {
      expect(cats.has(def.category)).toBe(true);
      expect(def.verb.length).toBeGreaterThan(0);
    }
  });

  it("formats a content action with target", () => {
    expect(
      describeActivity({
        action: "asset.created",
        targetType: "blog post",
        targetLabel: "Lead Capture",
      }),
    ).toBe("saved blog post “Lead Capture”");
  });

  it("includes the target in a role change", () => {
    expect(
      describeActivity({
        action: "account.role_changed",
        targetLabel: "Bob",
        metadata: { from: "User", to: "Admin" },
      }),
    ).toBe("changed the role of “Bob” to Admin");
  });

  it("notes the reassign target on account deletion", () => {
    expect(
      describeActivity({
        action: "account.deleted",
        targetLabel: "Bob",
        metadata: { reassignTo: "Admin" },
      }),
    ).toBe("deleted account “Bob”, content reassigned to Admin");
  });

  it("names the new creator on bulk reassignment", () => {
    expect(
      describeActivity({
        action: "asset.bulk_setPerson",
        targetLabel: "5 items",
        metadata: { to: "Mira" },
      }),
    ).toBe("reassigned the creator of “5 items” to Mira");
  });
});
