import { describe, it, expect } from "vitest";
import { notificationTargets } from "@/lib/notifications";

describe("notificationTargets", () => {
  it("removes the actor from the recipient set", () => {
    // Uploader "u1" acts; admins are u1 (self) + a2 + a3.
    expect(notificationTargets("u1", ["u1", "a2", "a3"])).toEqual(["a2", "a3"]);
  });

  it("de-duplicates recipients (uploader who is also an admin)", () => {
    // Uploader u1 is also in the admin list; actor is a different admin a2.
    expect(notificationTargets("a2", ["u1", "u1", "a2"]).sort()).toEqual(["u1"]);
  });

  it("returns empty when the only recipient is the actor", () => {
    expect(notificationTargets("u1", ["u1"])).toEqual([]);
  });

  it("drops empty ids", () => {
    expect(notificationTargets("a2", ["", "u1"])).toEqual(["u1"]);
  });
});
