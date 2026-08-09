import { describe, expect, it } from "vitest";
import { getAdminRouterRedirect, getAdminRouterView } from "./router-state";

describe("getAdminRouterRedirect", () => {
  it("redirects missing sessions on protected routes to login with the return URL", () => {
    expect(
      getAdminRouterRedirect("unauthenticated", "/admin/verifications/case-123", false),
    ).toEqual({
      to: "/admin/login",
      search: { redirect: "/admin/verifications/case-123" },
    });
  });

  it("redirects expired sessions on protected routes to login with the return URL", () => {
    expect(getAdminRouterRedirect("expired", "/admin", false)).toEqual({
      to: "/admin/login",
      search: { redirect: "/admin" },
    });
  });

  it("redirects authenticated public-route visits back into the workspace", () => {
    expect(getAdminRouterRedirect("authenticated", "/admin/login", true)).toEqual({
      to: "/admin",
    });
  });
});

describe("getAdminRouterView", () => {
  it("renders a recoverable error for protected-route bootstrap failures", () => {
    expect(getAdminRouterView("error", false)).toBe("error");
  });

  it("keeps public routes reachable during bootstrap failures", () => {
    expect(getAdminRouterView("error", true)).toBe("public");
  });
});
