import type {
  ManualLocationDetail,
  PermanentAddressDocument,
} from "@/features/admin/data/permanent-address";
import { ApiError } from "@/lib/api/errors";

const OVERALL_STATUS_LABELS: Record<string, string> = {
  PERMANENT_ADDRESS_VERIFIED: "Verified",
  LOCATION_CONFIRMED: "Location confirmed",
  NEEDS_REVIEW: "Needs review",
  LOCATION_CHECK_IN_PROGRESS: "Location check in progress",
  DOCUMENT_REQUIRED: "Document required",
  DOCUMENT_UNDER_REVIEW: "Document under review",
  LOCATION_CHECK_REQUIRED: "Location checks required",
  NOT_STARTED: "Not started",
};

const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  REQUIRED: "Required",
  UPLOADING: "Uploading",
  UPLOADED: "Uploaded",
  PENDING: "Under review",
  NEEDS_REVIEW: "Under review",
  UNDER_REVIEW: "Under review",
  MATCH: "Approved",
  APPROVED_MATCHING: "Approved",
  NEEDS_CORRECTION: "Needs correction",
  MISMATCH: "Rejected",
  REJECTED: "Rejected",
  SUPERSEDED: "Superseded",
};

const MANUAL_STATUS_LABELS: Record<string, string> = {
  pending_review: "Pending review",
  waiting_for_address_document: "Waiting for approved document",
  approved: "Approved",
  rejected: "Rejected",
  address_correction_requested: "Address correction requested",
  additional_evidence_requested: "Additional evidence requested",
};

export function formatPermanentAddressStatus(value: string | null | undefined): string {
  if (!value) return "Not available";
  return OVERALL_STATUS_LABELS[value] ?? formatMachineValue(value);
}

export function formatAddressDocumentStatus(value: string | null | undefined): string {
  if (!value) return "Required";
  return DOCUMENT_STATUS_LABELS[value] ?? formatMachineValue(value);
}

export function formatManualReviewStatus(value: string | null | undefined): string {
  if (!value) return "Not pending";
  return MANUAL_STATUS_LABELS[value] ?? formatMachineValue(value);
}

export function formatMachineValue(value: string): string {
  return value
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function permanentAddressActionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return "This review no longer meets the required document or location prerequisites. The latest backend state has been loaded.";
    }
    if (error.status === 404) {
      return "The current address version, document, or location attempt is no longer available. Reopen the latest case.";
    }
    if (error.status === 409) {
      return "This review changed or was already resolved. The latest backend state has been loaded.";
    }
  }

  return error instanceof Error ? error.message : "The review action could not be completed.";
}

export function isBackendVerified(status: string): boolean {
  return status === "PERMANENT_ADDRESS_VERIFIED";
}

export function canReviewAddressDocument(document: PermanentAddressDocument): boolean {
  return Boolean(
    document.present &&
    document.documentId &&
    document.previewAvailable &&
    document.contentPath &&
    ["NEEDS_REVIEW", "UNDER_REVIEW", "NEEDS_CORRECTION"].includes(document.reviewState),
  );
}

export function manualLocationActionState(
  attempt: ManualLocationDetail | null,
  documentStatus: string,
): {
  actionsAvailable: boolean;
  approvalAvailable: boolean;
  approvalBlockedReason: string | null;
} {
  if (!attempt || !attempt.currentAddressVersion || !attempt.pendingTargetAvailable) {
    return {
      actionsAvailable: false,
      approvalAvailable: false,
      approvalBlockedReason: null,
    };
  }

  const terminal = new Set([
    "approved",
    "rejected",
    "address_correction_requested",
    "additional_evidence_requested",
  ]).has(attempt.manualReviewStatus ?? "");
  if (terminal) {
    return {
      actionsAvailable: false,
      approvalAvailable: false,
      approvalBlockedReason: null,
    };
  }

  const documentApproved = documentStatus === "MATCH";
  const approvalAvailable = attempt.approvalEligible && documentApproved;
  return {
    actionsAvailable: true,
    approvalAvailable,
    approvalBlockedReason: approvalAvailable
      ? null
      : documentApproved
        ? "The backend has not marked this attempt eligible for approval. Refresh before acting."
        : "Approved matching address document required.",
  };
}

export function statusTone(value: string): string {
  if (["PERMANENT_ADDRESS_VERIFIED", "MATCH", "approved", "MATCHED"].includes(value)) {
    return "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60";
  }
  if (
    [
      "NEEDS_REVIEW",
      "NEEDS_CORRECTION",
      "waiting_for_address_document",
      "pending_review",
      "DOCUMENT_REQUIRED",
      "REQUIRED",
    ].includes(value)
  ) {
    return "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60";
  }
  if (["REJECTED", "MISMATCH", "rejected", "FAILED"].includes(value)) {
    return "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/60";
  }
  return "bg-muted text-muted-foreground ring-border";
}
