import type { AdminUserActionCapabilities } from "@/features/admin/data/users";
import type { WorkflowPermission } from "./types";

export type ManagedCandidateState =
  "checking" | "managed" | "candidate_managed" | "permission_denied" | "unavailable";

export interface CandidateDetailActionCapability {
  enabled: boolean;
  reason?: string;
}

export interface CandidateDetailCapabilities {
  assistedProfile: CandidateDetailActionCapability;
  cvReview: CandidateDetailActionCapability;
  activation: CandidateDetailActionCapability;
  verificationOperations: CandidateDetailActionCapability;
  createInvestigation: CandidateDetailActionCapability;
  sendPasswordReset: CandidateDetailActionCapability;
  revokeAllSessions: CandidateDetailActionCapability;
  suspendAccount: CandidateDetailActionCapability;
  restoreAccount: CandidateDetailActionCapability;
}

export interface CandidateVerificationOperationCapabilities {
  court: CandidateDetailActionCapability;
  inPerson: CandidateDetailActionCapability;
  report: CandidateDetailActionCapability;
}

export function getCandidateDetailCapabilities({
  permissions,
  managedCandidateState,
  accountCapabilities,
  activeSessionCount,
}: {
  permissions: WorkflowPermission[];
  managedCandidateState: ManagedCandidateState;
  accountCapabilities: AdminUserActionCapabilities;
  activeSessionCount: number;
}): CandidateDetailCapabilities {
  const profile = assistedCapability(
    managedCandidateState,
    permissions.includes("manage_assisted_profile"),
    "manage_assisted_profile",
  );
  const activation = assistedCapability(
    managedCandidateState,
    permissions.includes("send_candidate_activation"),
    "send_candidate_activation",
  );

  return {
    assistedProfile: profile,
    cvReview: profile,
    activation,
    verificationOperations: enabled(),
    createInvestigation: permissionCapability(
      permissions.includes("risk.create"),
      "The risk.create permission is required.",
    ),
    sendPasswordReset: backendCapability(
      accountCapabilities.sendPasswordReset,
      "Password reset is not available for the current account state or operator.",
    ),
    revokeAllSessions: backendCapability(
      accountCapabilities.revokeSessions && activeSessionCount > 0,
      activeSessionCount === 0
        ? "There are no active sessions to revoke."
        : "Session revocation is not available for the current account state or operator.",
    ),
    suspendAccount: backendCapability(
      accountCapabilities.suspend,
      "Suspension is not available for the current account state or operator.",
    ),
    restoreAccount: backendCapability(
      accountCapabilities.restore,
      "Restoration is not available for the current account state or operator.",
    ),
  };
}

export function getCandidateVerificationOperationCapabilities(
  permissions: WorkflowPermission[],
): CandidateVerificationOperationCapabilities {
  return {
    court: permissionCapability(
      permissions.includes("manage_court_check"),
      "The manage_court_check permission is required.",
    ),
    inPerson: permissionCapability(
      permissions.includes("perform_in_person_verification"),
      "The perform_in_person_verification permission is required.",
    ),
    report: permissionCapability(
      permissions.includes("users.view"),
      "The users.view permission is required.",
    ),
  };
}

function assistedCapability(
  state: ManagedCandidateState,
  hasActionPermission: boolean,
  permission: string,
): CandidateDetailActionCapability {
  if (state === "checking") {
    return blocked("Checking whether this Candidate is eligible for assisted operations.");
  }
  if (state === "candidate_managed") {
    return blocked("Available only for Candidates created through Admin assisted onboarding.");
  }
  if (state === "permission_denied" || !hasActionPermission) {
    return blocked(`The ${permission} permission is required.`);
  }
  if (state === "unavailable") {
    return blocked("Eligibility could not be confirmed. Refresh before attempting this action.");
  }
  return enabled();
}

function permissionCapability(allowed: boolean, reason: string): CandidateDetailActionCapability {
  return allowed ? enabled() : blocked(reason);
}

function backendCapability(allowed: boolean, reason: string): CandidateDetailActionCapability {
  return allowed ? enabled() : blocked(reason);
}

function enabled(): CandidateDetailActionCapability {
  return { enabled: true };
}

function blocked(reason: string): CandidateDetailActionCapability {
  return { enabled: false, reason };
}
