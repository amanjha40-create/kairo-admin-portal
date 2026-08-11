import { describe, expect, it } from "vitest";
import { resolveAdminNotificationTarget } from "./admin-notification-target";

describe("resolveAdminNotificationTarget", () => {
  it("prioritizes verification requests", () => {
    expect(
      resolveAdminNotificationTarget({
        verification_request_public_id: "case-1",
        candidate_user_public_id: "user-1",
      }),
    ).toEqual({ kind: "verification", id: "case-1" });
  });

  it("falls back to candidate user links", () => {
    expect(
      resolveAdminNotificationTarget({
        candidate_user_public_id: "user-1",
      }),
    ).toEqual({ kind: "user", id: "user-1" });
  });

  it("uses the notification detail route when no related object is available", () => {
    expect(resolveAdminNotificationTarget({}, "notif-1")).toEqual({
      kind: "notification",
      id: "notif-1",
    });
  });

  it("returns null when there is no usable target", () => {
    expect(resolveAdminNotificationTarget(null)).toBeNull();
  });
});
