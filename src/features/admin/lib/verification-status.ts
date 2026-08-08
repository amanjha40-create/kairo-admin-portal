import type { VerificationStatus } from "@/features/admin/data/types";

export const BACKEND_VERIFICATION_STATUSES: VerificationStatus[] = [
  "draft",
  "pending_subject_acceptance",
  "accepted",
  "pending_subject_submission",
  "pending_admin_review",
  "awaiting_subject_corrections",
  "pending_admin_re_review",
  "approved_for_organization_verification",
  "pending_organization_resolution",
  "pending_organization_acceptance",
  "in_progress",
  "awaiting_information",
  "pending_admin_quality_review",
  "verified",
  "rejected",
  "unable_to_verify",
  "cancelled",
  "expired",
];

const BACKEND_STATUS_SET = new Set<VerificationStatus>(BACKEND_VERIFICATION_STATUSES);

export const COMPLETED_VERIFICATION_STATUSES: VerificationStatus[] = [
  "verified",
  "rejected",
  "unable_to_verify",
  "cancelled",
  "expired",
];

export function isVerificationStatus(value: string): value is VerificationStatus {
  return BACKEND_STATUS_SET.has(value as VerificationStatus);
}

export function mapLegacyMockVerificationStatus(status: string): VerificationStatus {
  switch (status) {
    case "pending_review":
      return "pending_admin_review";
    case "corrections_requested":
      return "awaiting_subject_corrections";
    case "resubmitted":
      return "pending_admin_re_review";
    case "awaiting_organization":
      return "pending_organization_resolution";
    case "awaiting_employer":
      return "in_progress";
    case "clarification_requested":
    case "failed_outreach":
      return "awaiting_information";
    case "verified":
    case "rejected":
    case "unable_to_verify":
    case "cancelled":
    case "expired":
      return status;
    default:
      return "pending_admin_review";
  }
}

export function isCompletedVerificationStatus(status: VerificationStatus): boolean {
  return COMPLETED_VERIFICATION_STATUSES.includes(status);
}

export function isPreDispatchVerificationStatus(status: VerificationStatus): boolean {
  return status === "pending_admin_review" || status === "pending_admin_re_review";
}

export function isAwaitingVerifierVerificationStatus(status: VerificationStatus): boolean {
  return (
    status === "approved_for_organization_verification" ||
    status === "pending_organization_resolution" ||
    status === "pending_organization_acceptance" ||
    status === "in_progress" ||
    status === "awaiting_information"
  );
}

export function getWorkflowOwnerLabel(status: VerificationStatus): string {
  switch (status) {
    case "pending_admin_review":
      return "Admin review";
    case "pending_admin_re_review":
      return "Admin re-review";
    case "pending_admin_quality_review":
      return "Admin quality review";
    case "pending_organization_resolution":
      return "Admin resolution";
    case "approved_for_organization_verification":
      return "Dispatch";
    case "pending_organization_acceptance":
      return "Verifier acceptance";
    case "in_progress":
    case "awaiting_information":
      return "Verifier";
    case "awaiting_subject_corrections":
      return "Candidate";
    case "verified":
    case "rejected":
    case "unable_to_verify":
    case "cancelled":
    case "expired":
      return "Completed";
    default:
      return "System";
  }
}
