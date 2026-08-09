import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { getAdminRestoreErrorMessage, resolveAdminAuthSession } from "./restore-session";
import type { AdminAuthAdapter } from "./types";

function buildAdapter(
  restoreSession: AdminAuthAdapter["restoreSession"],
): Pick<AdminAuthAdapter, "restoreSession"> {
  return { restoreSession };
}

describe("resolveAdminAuthSession", () => {
  it("passes through successful authenticated restores", async () => {
    await expect(
      resolveAdminAuthSession(
        buildAdapter(async () => ({
          status: "authenticated",
          account: {
            id: "user-1",
            email: "admin@kairoid.com",
            name: "Admin User",
            initials: "AU",
            roleKey: "admin",
            role: "Admin",
            permissions: [],
          },
          signedInAt: "2026-08-09T10:00:00.000Z",
        })),
      ),
    ).resolves.toEqual({
      status: "authenticated",
      account: {
        id: "user-1",
        email: "admin@kairoid.com",
        name: "Admin User",
        initials: "AU",
        roleKey: "admin",
        role: "Admin",
        permissions: [],
      },
      signedInAt: "2026-08-09T10:00:00.000Z",
    });
  });

  it("terminates loading with an error state when restore rejects", async () => {
    await expect(
      resolveAdminAuthSession(
        buildAdapter(async () => {
          throw new ApiError({
            code: "server",
            message: "The admin service is temporarily unavailable. Try again shortly.",
            status: 503,
            requestId: "req-123",
          });
        }),
      ),
    ).resolves.toEqual({
      status: "error",
      error: "The admin service is temporarily unavailable. Try again shortly.",
    });
  });
});

describe("getAdminRestoreErrorMessage", () => {
  it("falls back to a safe generic message", () => {
    expect(getAdminRestoreErrorMessage(null)).toBe(
      "The admin session could not be verified. Try again.",
    );
  });
});
