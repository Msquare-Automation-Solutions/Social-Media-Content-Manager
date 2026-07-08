import { describe, it, expect } from "vitest";
import { hasRole, requireRole, RoleError } from "@/lib/roles";

describe("requireRole / hasRole", () => {
  it("grants when the role meets or exceeds the requirement", () => {
    expect(hasRole("OWNER", "ADMIN")).toBe(true);
    expect(hasRole("ADMIN", "ADMIN")).toBe(true);
    expect(hasRole("ADMIN", "EDITOR")).toBe(true);
    expect(hasRole("EDITOR", "EDITOR")).toBe(true);
    expect(hasRole("VIEWER", "VIEWER")).toBe(true);
  });

  it("denies when the role is below the requirement", () => {
    expect(hasRole("EDITOR", "ADMIN")).toBe(false);
    expect(hasRole("VIEWER", "EDITOR")).toBe(false);
    expect(hasRole("ADMIN", "OWNER")).toBe(false);
  });

  it("denies for missing/undefined roles", () => {
    expect(hasRole(null, "VIEWER")).toBe(false);
    expect(hasRole(undefined, "VIEWER")).toBe(false);
  });

  it("requireRole returns the role on success", () => {
    expect(requireRole("ADMIN", "EDITOR")).toBe("ADMIN");
  });

  it("requireRole throws RoleError on failure", () => {
    expect(() => requireRole("VIEWER", "EDITOR")).toThrow(RoleError);
    expect(() => requireRole(null, "VIEWER")).toThrow(RoleError);
    try {
      requireRole("EDITOR", "ADMIN");
    } catch (e) {
      expect(e).toBeInstanceOf(RoleError);
      expect((e as RoleError).required).toBe("ADMIN");
      expect((e as RoleError).actual).toBe("EDITOR");
    }
  });
});
