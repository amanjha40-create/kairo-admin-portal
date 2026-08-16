import type { VerificationCaseDetail } from "../runtime/verification-review";
import type {
  ClarificationResponsePayload,
  OutreachActionPayload,
  RejectActionPayload,
  UnableActionPayload,
  VerifyActionPayload,
} from "./types";

export function buildCanonicalProductionOutreachPayload(contactId: string): OutreachActionPayload {
  return {
    contactId,
    channel: "email",
  };
}

export function buildCanonicalProductionVerifyPayload(
  detail: VerificationCaseDetail,
  decisionSummary: string,
  effectiveDate: string,
): VerifyActionPayload {
  return {
    basis: "other_approved_basis",
    fieldConfirmations: Object.fromEntries(
      detail.claim.fields.map((field) => [field.key, "not_applicable" as const]),
    ),
    decisionSummary,
    effectiveDate,
  };
}

export function buildCanonicalProductionRejectPayload(
  decisionSummary: string,
): RejectActionPayload {
  return {
    reason: "other_substantiated",
    decisionSummary,
    supportingEvidenceIds: [],
    candidateMessage: decisionSummary,
    acknowledgement: true,
  };
}

export function buildCanonicalProductionUnablePayload(
  decisionSummary: string,
): UnableActionPayload {
  return {
    reason: "insufficient_evidence",
    attemptsSummary: decisionSummary,
    outstandingUncertainty: "",
    candidateMessage: decisionSummary,
  };
}

export function buildCanonicalProductionClarificationResponsePayload(
  response: string,
): ClarificationResponsePayload {
  return {
    response,
    updatedFieldKeys: [],
    evidenceAdded: false,
  };
}
