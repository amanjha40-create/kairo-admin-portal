/**
 * Central workflow eligibility engine.
 *
 * All "can this operator perform action X on case Y right now?" logic
 * lives here so eligibility is testable and does not drift between the
 * button that opens a dialog and the confirm button inside it.
 */
import type { VerificationCaseDetail } from "../data/verification-review";
import type { VerificationStatus } from "../data/types";
import type {
  WorkflowAction,
  WorkflowActor,
  WorkflowEligibilityResult,
  WorkflowPermission,
  WorkflowTransitionRule,
} from "./types";
import { hasPermission } from "./permissions";

/**
 * Base transition rules. `getWorkflowEligibility` applies these first and
 * then layers case-specific evidence / flag / contact checks on top.
 */
export const TRANSITION_RULES: WorkflowTransitionRule[] = [
  {
    action: "request_correction",
    fromStatuses: ["pending_admin_review", "pending_admin_re_review"],
    toStatus: "awaiting_subject_corrections",
    requiredPermission: "verification.request_correction",
  },
  {
    action: "approve_outreach",
    fromStatuses: ["pending_admin_review", "pending_admin_re_review"],
    toStatus: "approved_for_organization_verification",
    requiredPermission: "verification.approve_outreach",
  },
  {
    action: "verify",
    fromStatuses: ["pending_admin_quality_review"],
    toStatus: "verified",
    requiredPermission: "verification.verify",
  },
  {
    action: "reject",
    fromStatuses: [
      "pending_admin_review",
      "pending_admin_re_review",
      "pending_admin_quality_review",
    ],
    toStatus: "rejected",
    requiredPermission: "verification.reject",
  },
  {
    action: "unable_to_verify",
    fromStatuses: ["pending_admin_quality_review"],
    toStatus: "unable_to_verify",
    requiredPermission: "verification.mark_unable",
  },
  {
    action: "cancel",
    fromStatuses: [
      "pending_admin_review",
      "pending_admin_re_review",
      "approved_for_organization_verification",
      "pending_organization_resolution",
      "pending_organization_acceptance",
      "in_progress",
      "awaiting_information",
      "pending_admin_quality_review",
    ],
    toStatus: "cancelled",
    requiredPermission: "verification.cancel",
  },
  {
    action: "return_to_verifier",
    fromStatuses: ["pending_admin_quality_review"],
    toStatus: "in_progress",
    requiredPermission: "verification.return_to_verifier",
  },
  {
    action: "record_clarification_request",
    fromStatuses: ["in_progress"],
    toStatus: "awaiting_information",
    requiredPermission: "verification.record_clarification",
  },
  {
    action: "record_clarification_response",
    fromStatuses: ["awaiting_information"],
    toStatus: "in_progress",
    requiredPermission: "verification.record_clarification",
  },
];

/** Case state the engine consumes. Includes any session overrides. */
export interface WorkflowCaseState {
  currentStatus: VerificationStatus;
  hasEligibleContact: boolean;
  hasOpenCriticalFlag: boolean;
  hasOpenHighFlag: boolean;
  hasOpenDocumentMismatch: boolean;
  hasOpenPossibleDuplicate: boolean;
  organizationResolved: boolean;
  outstandingCorrection: boolean;
  evidenceCount: number;
  evidenceReviewedCount: number;
}

/** Build a workflow case state from a case detail + acknowledged flag ids. */
export function buildWorkflowCaseState(
  detail: VerificationCaseDetail,
  overrides: {
    currentStatus?: VerificationStatus;
    acknowledgedFlagIds?: Set<string>;
    hasOutstandingCorrectionOverride?: boolean;
  } = {},
): WorkflowCaseState {
  const ack = overrides.acknowledgedFlagIds ?? new Set<string>();
  const openFlags = detail.flags.filter((f) => f.state === "open" && !ack.has(f.id));
  const hasOpenCriticalFlag = openFlags.some(
    (f) =>
      f.severity === "high" &&
      (f.flag === "risk_review_required" || f.flag === "document_mismatch"),
  );
  const hasOpenHighFlag = openFlags.some((f) => f.severity === "high");
  const hasOpenDocumentMismatch = openFlags.some((f) => f.flag === "document_mismatch");
  const hasOpenPossibleDuplicate = openFlags.some((f) => f.flag === "possible_duplicate");
  const hasEligibleContact = detail.contacts.some(
    (c) => c.outreachEligible && c.internalApprovalStatus === "approved",
  );
  const outstandingCorrection =
    overrides.hasOutstandingCorrectionOverride ??
    detail.corrections.some((c) => c.state !== "resolved" && c.state !== "closed");

  return {
    currentStatus: overrides.currentStatus ?? detail.summary.status,
    hasEligibleContact,
    hasOpenCriticalFlag,
    hasOpenHighFlag,
    hasOpenDocumentMismatch,
    hasOpenPossibleDuplicate,
    organizationResolved: detail.organization.state === "resolved",
    outstandingCorrection,
    evidenceCount: detail.evidence.length,
    evidenceReviewedCount: detail.evidence.filter((e) => e.reviewStatus === "reviewed").length,
  };
}

const TERMINAL_STATUSES: VerificationStatus[] = [
  "verified",
  "rejected",
  "unable_to_verify",
  "cancelled",
  "expired",
];

export function isTerminalStatus(status: VerificationStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

function requiredPermissionFor(action: WorkflowAction): WorkflowPermission {
  const rule = TRANSITION_RULES.find((r) => r.action === action);
  if (!rule) throw new Error(`No transition rule for ${action}`);
  return rule.requiredPermission;
}

function nextStatusFor(
  action: WorkflowAction,
  currentStatus: VerificationStatus,
): VerificationStatus {
  const rule = TRANSITION_RULES.find(
    (r) => r.action === action && r.fromStatuses.includes(currentStatus),
  );
  return rule?.toStatus ?? currentStatus;
}

export function evaluateWorkflowEligibility(
  detail: VerificationCaseDetail,
  action: WorkflowAction,
  actor: WorkflowActor,
  state: WorkflowCaseState,
  opts: { rejectionIsHighRisk?: boolean } = {},
): WorkflowEligibilityResult {
  const requiredPermission = requiredPermissionFor(action);
  const blockingReasons: string[] = [];
  const warnings: string[] = [];
  const rule = TRANSITION_RULES.find((r) => r.action === action);
  const applicable = rule?.fromStatuses.includes(state.currentStatus) ?? false;
  const irrelevant = isTerminalStatus(state.currentStatus) || !applicable;

  if (isTerminalStatus(state.currentStatus)) {
    blockingReasons.push(
      "Case is in a terminal state; no further workflow transitions are permitted in this build.",
    );
  } else if (!applicable) {
    blockingReasons.push(
      `Action is not available from the current status "${state.currentStatus.replace(/_/g, " ")}".`,
    );
  }

  if (!hasPermission(actor.permissions, requiredPermission)) {
    blockingReasons.push(
      `Your role (${actor.role}) does not have the "${requiredPermission}" permission.`,
    );
  }

  // Action-specific rules
  switch (action) {
    case "request_correction":
      if (state.outstandingCorrection) {
        warnings.push("A correction request is already outstanding on this case.");
      }
      break;
    case "approve_outreach":
      if (!state.hasEligibleContact) {
        blockingReasons.push("At least one approved, outreach-eligible contact is required.");
      }
      if (state.hasOpenCriticalFlag) {
        blockingReasons.push("Open critical risk flag blocks dispatch. Resolve it first.");
      }
      if (state.outstandingCorrection) {
        blockingReasons.push(
          "Cannot approve for dispatch while a candidate correction is outstanding.",
        );
      }
      if (state.evidenceCount === 0) {
        blockingReasons.push("Required evidence has not been uploaded.");
      }
      if (!state.organizationResolved) {
        warnings.push(
          "Organization is not resolved yet. The backend may move this case into organization resolution after dispatch approval.",
        );
      }
      if (state.hasOpenPossibleDuplicate) {
        warnings.push("Possible duplicate flag is open. Confirm this is not a duplicate case.");
      }
      break;
    case "verify":
      if (state.hasOpenCriticalFlag) {
        blockingReasons.push("Open critical risk flag blocks verification.");
      }
      if (state.hasOpenDocumentMismatch) {
        blockingReasons.push("Document mismatch flag must be reviewed before verifying.");
      }
      if (state.outstandingCorrection) {
        blockingReasons.push("Outstanding candidate correction must be resolved first.");
      }
      if (state.hasOpenPossibleDuplicate) {
        blockingReasons.push("Possible duplicate must be resolved before a terminal decision.");
      }
      if (state.evidenceCount === 0) {
        blockingReasons.push("No evidence attached to this case.");
      }
      if (state.evidenceReviewedCount === 0 && state.evidenceCount > 0) {
        warnings.push("No evidence has been marked as reviewed yet.");
      }
      break;
    case "reject":
      if (state.hasOpenPossibleDuplicate) {
        blockingReasons.push("Possible duplicate must be resolved before a terminal decision.");
      }
      if (
        opts.rejectionIsHighRisk &&
        actor.roleKey !== "trust_safety" &&
        actor.roleKey !== "admin" &&
        actor.roleKey !== "operations_lead"
      ) {
        blockingReasons.push(
          "Fraud or identity-related rejection requires Trust & Safety or Admin permission.",
        );
      }
      break;
    case "unable_to_verify":
    case "cancel":
    case "return_to_verifier":
      // No additional frontend-only constraints beyond status and permission gating.
      break;
    case "record_clarification_request":
    case "record_clarification_response":
      // Clarification recording is secondary to the backend workflow state.
      break;
  }

  const allowed = blockingReasons.length === 0;
  return {
    action,
    allowed,
    blockingReasons,
    warnings,
    requiredPermission,
    nextStatusOnSuccess: nextStatusFor(action, state.currentStatus),
    irrelevant,
  };
}

/** Convenience — evaluate every primary decision action for a case. */
export function getAvailableWorkflowActions(
  detail: VerificationCaseDetail,
  actor: WorkflowActor,
  state: WorkflowCaseState,
): Record<WorkflowAction, WorkflowEligibilityResult> {
  const actions: WorkflowAction[] = [
    "request_correction",
    "approve_outreach",
    "verify",
    "reject",
    "unable_to_verify",
    "cancel",
    "return_to_verifier",
    "record_clarification_request",
    "record_clarification_response",
  ];
  return actions.reduce(
    (acc, a) => {
      acc[a] = evaluateWorkflowEligibility(detail, a, actor, state);
      return acc;
    },
    {} as Record<WorkflowAction, WorkflowEligibilityResult>,
  );
}
