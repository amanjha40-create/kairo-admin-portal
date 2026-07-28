import { describe, expect, it } from "vitest";
import { buildAdminLoginRedirect, isSafeAdminRedirect, normalizeAdminRedirect } from "./redirects";

describe("admin redirects", () => {
  it("accepts internal admin redirects", () => {
    expect(isSafeAdminRedirect("/admin/verifications")).toBe(true);
    expect(normalizeAdminRedirect("/admin/users")).toBe("/admin/users");
  });

  it("rejects open redirects", () => {
    expect(isSafeAdminRedirect("https://evil.example")).toBe(false);
    expect(isSafeAdminRedirect("//evil.example")).toBe(false);
    expect(isSafeAdminRedirect("/profile")).toBe(false);
    expect(normalizeAdminRedirect("https://evil.example")).toBe("/admin");
  });

  it("preserves protected admin deep links for login restoration", () => {
    expect(buildAdminLoginRedirect("/admin/verifications/case-123")).toBe(
      "/admin/verifications/case-123",
    );
    expect(buildAdminLoginRedirect("/admin/registry/org-123")).toBe("/admin/registry/org-123");
    expect(buildAdminLoginRedirect("/admin/login")).toBeUndefined();
  });
});
