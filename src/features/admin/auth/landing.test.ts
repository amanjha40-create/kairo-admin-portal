import { describe, expect, it } from "vitest";
import { resolveAdminLandingPath } from "./landing";
import type { AdminAuthAdapter } from "./types";

function buildAdapter(
  status: "authenticated" | "unauthenticated" | "expired" | "forbidden" | "error",
): AdminAuthAdapter {
  return {
    mode: "demo",
    isConfigured: true,
    notice: null,
    restoreSession: async () =>
      status === "authenticated"
        ? {
            status,
            account: {
              id: "u-1",
              email: "demo@kairo.internal",
              name: "Demo User",
              initials: "DU",
              roleKey: "admin",
              role: "Admin",
              permissions: [],
            },
            signedInAt: new Date("2026-07-24T10:00:00.000Z").toISOString(),
          }
        : status === "error"
          ? { status, error: "The admin session could not be verified. Try again." }
          : { status },
    login: async () => ({ ok: false, error: "unused" }),
    logout: async () => undefined,
    forgotPassword: async () => ({ ok: false, error: "unused" }),
    acceptInvitation: async () => ({ ok: false, error: "unused" }),
  };
}

describe("resolveAdminLandingPath", () => {
  it("routes authenticated sessions to /admin", async () => {
    await expect(resolveAdminLandingPath(buildAdapter("authenticated"))).resolves.toBe("/admin");
  });

  it("routes unauthenticated sessions to /admin/login", async () => {
    await expect(resolveAdminLandingPath(buildAdapter("unauthenticated"))).resolves.toBe(
      "/admin/login",
    );
  });

  it("routes expired sessions to /admin/login", async () => {
    await expect(resolveAdminLandingPath(buildAdapter("expired"))).resolves.toBe("/admin/login");
  });

  it("routes forbidden sessions into /admin so access denied can render", async () => {
    await expect(resolveAdminLandingPath(buildAdapter("forbidden"))).resolves.toBe("/admin");
  });

  it("routes bootstrap errors into /admin so the recoverable error state can render", async () => {
    await expect(resolveAdminLandingPath(buildAdapter("error"))).resolves.toBe("/admin");
  });
});
