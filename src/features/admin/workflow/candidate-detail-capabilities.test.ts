import { describe, expect, it } from "vitest";
import {
  getCandidateDetailCapabilities,
  getCandidateVerificationOperationCapabilities,
  type ManagedCandidateState,
} from "./candidate-detail-capabilities";
import type { AdminUserActionCapabilities } from "../data/users";
import type { WorkflowPermission } from "./types";

const noAccountActions: AdminUserActionCapabilities = {
  viewNotes: false,
  addNote: false,
  suspend: false,
  restore: false,
  revokeSessions: false,
  sendPasswordReset: false,
};

function capabilities(
  managedCandidateState: ManagedCandidateState,
  permissions: WorkflowPermission[] = [],
  accountCapabilities: AdminUserActionCapabilities = noAccountActions,
  activeSessionCount = 0,
) {
  return getCandidateDetailCapabilities({
    managedCandidateState,
    permissions,
    accountCapabilities,
    activeSessionCount,
  });
}

describe("Candidate detail capability model", () => {
  it("fails closed while assisted eligibility is loading or unavailable", () => {
    const permissions: WorkflowPermission[] = [
      "manage_assisted_profile",
      "send_candidate_activation",
    ];
    for (const state of ["checking", "unavailable"] as const) {
      const result = capabilities(state, permissions);
      expect(result.assistedProfile.enabled).toBe(false);
      expect(result.cvReview.enabled).toBe(false);
      expect(result.activation.enabled).toBe(false);
      expect(result.assistedProfile.reason).toBeTruthy();
    }
  });

  it("blocks all assisted controls for a Candidate-managed account", () => {
    const result = capabilities("candidate_managed", [
      "manage_assisted_profile",
      "send_candidate_activation",
    ]);
    expect(result.assistedProfile.enabled).toBe(false);
    expect(result.cvReview.enabled).toBe(false);
    expect(result.activation.enabled).toBe(false);
    expect(result.assistedProfile.reason).toContain("Admin assisted onboarding");
  });

  it("enables only permission-backed assisted actions for an Admin-managed account", () => {
    const profileOnly = capabilities("managed", ["manage_assisted_profile"]);
    expect(profileOnly.assistedProfile.enabled).toBe(true);
    expect(profileOnly.cvReview.enabled).toBe(true);
    expect(profileOnly.activation.enabled).toBe(false);

    const all = capabilities("managed", ["manage_assisted_profile", "send_candidate_activation"]);
    expect(all.assistedProfile.enabled).toBe(true);
    expect(all.cvReview.enabled).toBe(true);
    expect(all.activation.enabled).toBe(true);
  });

  it("uses authoritative backend account capabilities and active-session truth", () => {
    const result = capabilities(
      "candidate_managed",
      [],
      {
        ...noAccountActions,
        suspend: true,
        revokeSessions: true,
        sendPasswordReset: true,
      },
      1,
    );
    expect(result.suspendAccount.enabled).toBe(true);
    expect(result.revokeAllSessions.enabled).toBe(true);
    expect(result.sendPasswordReset.enabled).toBe(true);
    expect(result.restoreAccount.enabled).toBe(false);
  });

  it("enforces the exact permission for every verification operation", () => {
    const result = getCandidateVerificationOperationCapabilities([
      "users.view",
      "manage_court_check",
    ]);
    expect(result.court.enabled).toBe(true);
    expect(result.report.enabled).toBe(true);
    expect(result.inPerson.enabled).toBe(false);
    expect(result.inPerson.reason).toContain("perform_in_person_verification");
  });
});
