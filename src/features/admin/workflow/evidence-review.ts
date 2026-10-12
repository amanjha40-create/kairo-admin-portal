import { ApiError } from "@/lib/api/errors";
import type { WorkflowPermission } from "./types";

export interface EvidenceReviewMetadata {
  reviewed?: boolean;
  reviewedAt?: string | null;
  reviewedByUserId?: string | null;
  reviewApplicable?: boolean;
  disposition?: string;
  contentVersion?: string;
}

export interface EvidenceReviewResponse {
  evidence_public_id: string;
  reviewed: boolean;
  reviewed_at: string;
  reviewed_by_user_id: string | null;
}

export function evidenceReviewProgress(items: EvidenceReviewMetadata[]) {
  const applicable = items.filter((item) => item.reviewApplicable === true);
  return {
    required: applicable.length,
    reviewed: applicable.filter((item) => item.reviewed === true).length,
  };
}

export function canReviewEvidence(status: string, permissions: WorkflowPermission[]) {
  // Production auth maps this existing permission only from dispatch_verification.
  return (
    permissions.includes("verification.approve_outreach") &&
    ["pending_admin_review", "pending_admin_re_review", "pending_admin_quality_review"].includes(
      status,
    )
  );
}

export function evidenceDispositionLabel(status?: string) {
  const labels: Record<string, string> = {
    submitted: "Submitted",
    under_review: "Under review",
    accepted: "Accepted",
    rejected: "Rejected",
    needs_correction: "Needs correction",
    superseded: "Superseded",
  };
  return (status && labels[status]) || "Unavailable";
}

export function evidenceReviewError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401)
      return "Your session expired. Sign in again before reviewing evidence.";
    if (error.status === 403) return "You do not have permission to review this evidence.";
    if (error.status === 404)
      return "This evidence is no longer available in this case. Refresh the case.";
    if (error.status === 409)
      return "The evidence or case has changed, or its upload is incomplete. Refresh and inspect it again.";
  }
  return "Review could not be confirmed. Refresh the case before trying again.";
}

// The lock is acquired synchronously, before React can render the pending button.
export function createEvidenceReviewSubmit() {
  let pending = false;
  return async (operation: () => Promise<void>) => {
    if (pending) return;
    pending = true;
    try {
      await operation();
    } finally {
      pending = false;
    }
  };
}
