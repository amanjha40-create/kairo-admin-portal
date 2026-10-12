import type {
  EmploymentReferencesOverview,
  ManagerReferenceInviteResult,
} from "../data/employment-references";
import type { VerificationStatus } from "../data/types";
import type { WorkflowPermission } from "./types";

export interface ManagerInvitationEligibility {
  allowed: boolean;
  reason: string | null;
}

const BLOCKED_REASON_COPY: Record<string, string> = {
  awaiting_hr_validation: "The reporting manager must be confirmed by the employer first.",
  employment_not_verified: "The employment verification must be finalized first.",
  email_required: "An employer-confirmed manager email is required before sending.",
};

export function evaluateManagerInvitationEligibility({
  references,
  caseStatus,
  canonicalEmploymentStatus,
  permissions,
}: {
  references: EmploymentReferencesOverview;
  caseStatus: VerificationStatus;
  canonicalEmploymentStatus?: string;
  permissions: WorkflowPermission[];
}): ManagerInvitationEligibility {
  const manager = references.reportingManager;

  if (!permissions.includes("verification.approve_outreach")) {
    return { allowed: false, reason: "You do not have permission to send reference requests." };
  }
  if (caseStatus !== "verified" || canonicalEmploymentStatus !== "verified") {
    return { allowed: false, reason: "The employment verification must be finalized first." };
  }
  if (!manager.relationshipConfirmedByHr) {
    return {
      allowed: false,
      reason: "The reporting manager must be confirmed by the employer first.",
    };
  }
  if (manager.invitationBlockedReason) {
    return {
      allowed: false,
      reason:
        BLOCKED_REASON_COPY[manager.invitationBlockedReason] ??
        "The backend has not made this reference eligible for invitation.",
    };
  }
  if (manager.status !== "ready_to_invite" || !manager.nominationId) {
    return {
      allowed: false,
      reason: "The backend has not made this reference eligible for invitation.",
    };
  }

  return { allowed: true, reason: null };
}

export async function sendAndConfirmManagerInvitation({
  send,
  refresh,
}: {
  send: () => Promise<ManagerReferenceInviteResult>;
  refresh: () => Promise<EmploymentReferencesOverview>;
}): Promise<EmploymentReferencesOverview> {
  const delivery = await send();
  const refreshed = await refresh();

  if (
    delivery.deliveryStatus !== "sent" ||
    refreshed.reportingManager.status === "ready_to_invite"
  ) {
    throw new Error("The manager invitation could not be confirmed from backend state.");
  }

  return refreshed;
}
