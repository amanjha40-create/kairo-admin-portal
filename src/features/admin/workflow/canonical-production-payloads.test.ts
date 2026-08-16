import { describe, expect, it } from "vitest";
import {
  buildCanonicalProductionClarificationResponsePayload,
  buildCanonicalProductionOutreachPayload,
  buildCanonicalProductionRejectPayload,
  buildCanonicalProductionUnablePayload,
  buildCanonicalProductionVerifyPayload,
} from "./canonical-production-payloads";

const detail = {
  claim: {
    fields: [
      { key: "candidate", label: "Candidate", value: "Aman Jha", source: "candidate" },
      { key: "role", label: "Role", value: "Engineer", source: "candidate" },
    ],
  },
} as const;

describe("canonical production verification payload helpers", () => {
  it("builds the canonical production outreach payload", () => {
    expect(buildCanonicalProductionOutreachPayload("contact-1")).toEqual({
      contactId: "contact-1",
      channel: "email",
    });
  });

  it("builds the canonical production verify payload from claim fields", () => {
    expect(
      buildCanonicalProductionVerifyPayload(
        detail as never,
        "Verifier confirmed the employment dates and role.",
        "2026-08-16",
      ),
    ).toEqual({
      basis: "other_approved_basis",
      fieldConfirmations: {
        candidate: "not_applicable",
        role: "not_applicable",
      },
      decisionSummary: "Verifier confirmed the employment dates and role.",
      effectiveDate: "2026-08-16",
    });
  });

  it("builds the canonical production reject payload", () => {
    expect(
      buildCanonicalProductionRejectPayload("The verifier disproved the submitted claim."),
    ).toEqual({
      reason: "other_substantiated",
      decisionSummary: "The verifier disproved the submitted claim.",
      supportingEvidenceIds: [],
      candidateMessage: "The verifier disproved the submitted claim.",
      acknowledgement: true,
    });
  });

  it("builds the canonical production unable payload", () => {
    expect(
      buildCanonicalProductionUnablePayload(
        "The verifier could not confirm the record after repeated follow-up.",
      ),
    ).toEqual({
      reason: "insufficient_evidence",
      attemptsSummary: "The verifier could not confirm the record after repeated follow-up.",
      outstandingUncertainty: "",
      candidateMessage: "The verifier could not confirm the record after repeated follow-up.",
    });
  });

  it("builds the canonical production clarification response payload", () => {
    expect(
      buildCanonicalProductionClarificationResponsePayload("Candidate supplied the missing date."),
    ).toEqual({
      response: "Candidate supplied the missing date.",
      updatedFieldKeys: [],
      evidenceAdded: false,
    });
  });
});
