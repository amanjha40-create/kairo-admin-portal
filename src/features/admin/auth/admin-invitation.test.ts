import { describe, expect, it } from "vitest";
import { getAdminInvitationSetupError, readAdminInvitationToken } from "./admin-invitation";

describe("Admin invitation acceptance helpers", () => {
  it("reads a token from the fragment without exposing it as page content", () => {
    const token = "safe-single-use-token-value-1234567890";
    expect(readAdminInvitationToken(`#token=${token}`)).toBe(token);
  });

  it("rejects missing or malformed token fragments", () => {
    expect(readAdminInvitationToken("")).toBeNull();
    expect(readAdminInvitationToken("#token=short")).toBeNull();
    expect(readAdminInvitationToken("#other=value")).toBeNull();
  });

  it("allows existing users to accept without account setup fields", () => {
    expect(getAdminInvitationSetupError("", "", "")).toBeNull();
  });

  it("validates new account setup without returning sensitive values", () => {
    expect(getAdminInvitationSetupError("", "StrongPassword123!", "StrongPassword123!")).toBe(
      "Enter your full name to create your Admin account.",
    );
    expect(getAdminInvitationSetupError("New Admin", "short", "short")).toBe(
      "Password must be at least 8 characters.",
    );
    expect(getAdminInvitationSetupError("New Admin", "StrongPassword123!", "different")).toBe(
      "Passwords do not match.",
    );
  });
});
