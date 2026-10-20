// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CandidateDetailActionBar } from "./candidate-detail-action-bar";
import type { CandidateDetailCapabilities } from "../workflow/candidate-detail-capabilities";

afterEach(cleanup);

const enabled = { enabled: true } as const;
const disabled = { enabled: false, reason: "Admin-managed Candidates only." } as const;

function capabilities(
  overrides: Partial<CandidateDetailCapabilities> = {},
): CandidateDetailCapabilities {
  return {
    assistedProfile: enabled,
    cvReview: enabled,
    activation: enabled,
    verificationOperations: enabled,
    createInvestigation: enabled,
    sendPasswordReset: enabled,
    revokeAllSessions: enabled,
    suspendAccount: enabled,
    restoreAccount: { enabled: false, reason: "Not suspended." },
    ...overrides,
  };
}

function renderActions(value: CandidateDetailCapabilities) {
  const actions = {
    passwordReset: vi.fn(),
    revokeAll: vi.fn(),
    suspend: vi.fn(),
    restore: vi.fn(),
  };
  render(
    <CandidateDetailActionBar
      capabilities={value}
      investigationHref="/admin/risk?create=1&subjectType=user&subjectPublicId=user-1"
      onPasswordReset={actions.passwordReset}
      onRevokeAllSessions={actions.revokeAll}
      onSuspend={actions.suspend}
      onRestore={actions.restore}
    />,
  );
  return actions;
}

describe("Candidate detail action bar", () => {
  it("renders real anchors only for eligible assisted operations", () => {
    renderActions(capabilities());
    expect(screen.getByRole("link", { name: "Edit Profile" }).getAttribute("href")).toBe(
      "#assisted-profile",
    );
    expect(screen.getByRole("link", { name: "Upload / Review CV" }).getAttribute("href")).toBe(
      "#cv-review",
    );
    expect(screen.getByRole("link", { name: "Activation" }).getAttribute("href")).toBe(
      "#account-activation",
    );
    expect(screen.getByRole("link", { name: "Verification Operations" }).getAttribute("href")).toBe(
      "#verification-operations",
    );
  });

  it("uses semantic disabled controls with no href or handler for Candidate-managed accounts", () => {
    const actions = renderActions(
      capabilities({ assistedProfile: disabled, cvReview: disabled, activation: disabled }),
    );
    for (const label of ["Edit Profile", "Upload / Review CV", "Activation"]) {
      const button = screen.getByRole("button", { name: `${label} unavailable` });
      expect((button as HTMLButtonElement).disabled).toBe(true);
      fireEvent.click(button);
      fireEvent.keyDown(button, { key: "Enter" });
      fireEvent.keyDown(button, { key: " " });
    }
    expect(screen.queryByRole("link", { name: "Edit Profile" })).toBeNull();
    expect(screen.getByRole("note").textContent).toContain("Admin-managed Candidates only");
    expect(actions.passwordReset).not.toHaveBeenCalled();
    expect(actions.revokeAll).not.toHaveBeenCalled();
    expect(actions.suspend).not.toHaveBeenCalled();
  });

  it("wires every visible account and risk action to a real destination or handler", () => {
    const actions = renderActions(capabilities());
    expect(screen.getByRole("link", { name: "Create investigation" }).getAttribute("href")).toBe(
      "/admin/risk?create=1&subjectType=user&subjectPublicId=user-1",
    );
    fireEvent.click(screen.getByRole("button", { name: "Send password reset" }));
    fireEvent.click(screen.getByRole("button", { name: "Revoke all sessions" }));
    fireEvent.click(screen.getByRole("button", { name: "Suspend account" }));
    expect(actions.passwordReset).toHaveBeenCalledOnce();
    expect(actions.revokeAll).toHaveBeenCalledOnce();
    expect(actions.suspend).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Restore account" })).toBeNull();
  });

  it("hides permission-denied investigation and backend-ineligible account controls", () => {
    renderActions(
      capabilities({
        createInvestigation: { enabled: false, reason: "Permission required." },
        sendPasswordReset: { enabled: false, reason: "Unavailable." },
        revokeAllSessions: { enabled: false, reason: "No active sessions." },
        suspendAccount: { enabled: false, reason: "Unavailable." },
      }),
    );
    expect(screen.queryByRole("link", { name: "Create investigation" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Send password reset" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Revoke all sessions" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Suspend account" })).toBeNull();
  });
});
