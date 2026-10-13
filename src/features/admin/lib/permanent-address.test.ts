import { describe, expect, it } from "vitest";
import type { ManualLocationDetail, PermanentAddressDocument } from "../data/permanent-address";
import { ApiError } from "@/lib/api/errors";
import {
  canReviewAddressDocument,
  formatAddressDocumentStatus,
  formatMachineValue,
  isBackendVerified,
  manualLocationActionState,
  permanentAddressActionErrorMessage,
} from "./permanent-address";

const document: PermanentAddressDocument = {
  present: true,
  documentId: "33333333-3333-4333-8333-333333333333",
  documentType: "address_proof",
  uploadState: "UNDER_REVIEW",
  reviewState: "UNDER_REVIEW",
  uploadedAt: "2026-10-14T09:00:00Z",
  issuedOn: null,
  reviewedAt: null,
  previewAvailable: true,
  contentPath: "/api/v1/permanent-address/reviews/22222222-2222-4222-8222-222222222222/content",
};

const attempt: ManualLocationDetail = {
  candidateId: "11111111-1111-4111-8111-111111111111",
  addressVersionId: "22222222-2222-4222-8222-222222222222",
  sessionId: "44444444-4444-4444-8444-444444444444",
  attemptedAt: "2026-10-14T09:00:00Z",
  manualReviewStatus: "pending_review",
  addressVersion: 1,
  currentAddressVersion: true,
  pendingTargetAvailable: true,
  approvalEligible: true,
  gpsQuality: "passed",
  acceptedSampleCount: 5,
  accuracyM: 12,
  candidateCount: 1,
  candidateComparisons: [],
  automaticResult: "NEEDS_REVIEW",
  automaticFailureReason: "street_conflict",
  documentStatus: "MATCH",
  priorAttemptCount: 0,
  history: [],
  resolutions: [],
};

describe("Permanent Address UI truth helpers", () => {
  it("recognizes only the explicit backend final state as Verified", () => {
    expect(isBackendVerified("PERMANENT_ADDRESS_VERIFIED")).toBe(true);
    expect(isBackendVerified("LOCATION_CONFIRMED")).toBe(false);
    expect(isBackendVerified("MATCH")).toBe(false);
    expect(isBackendVerified("NEEDS_REVIEW")).toBe(false);
  });

  it("labels backend document states without equating approval to address verification", () => {
    expect(formatAddressDocumentStatus("MATCH")).toBe("Approved");
    expect(formatAddressDocumentStatus("REQUIRED")).toBe("Required");
    expect(formatAddressDocumentStatus("NEEDS_CORRECTION")).toBe("Needs correction");
  });

  it("formats camel-case provider labels without exposing raw machine tokens", () => {
    expect(formatMachineValue("PointAddress")).toBe("Point Address");
  });

  it("presents safe stale-state guidance without exposing backend payloads", () => {
    expect(
      permanentAddressActionErrorMessage(
        new ApiError({ code: "conflict", message: "generic", status: 409, details: { raw: true } }),
      ),
    ).toContain("latest backend state");
    expect(
      permanentAddressActionErrorMessage(
        new ApiError({ code: "unknown", message: "generic", status: 400 }),
      ),
    ).toContain("prerequisites");
  });

  it("requires a present inspectable current document before showing document decisions", () => {
    expect(canReviewAddressDocument(document)).toBe(true);
    expect(canReviewAddressDocument({ ...document, present: false })).toBe(false);
    expect(canReviewAddressDocument({ ...document, previewAvailable: false })).toBe(false);
    expect(canReviewAddressDocument({ ...document, reviewState: "MATCH" })).toBe(false);
  });

  it("blocks onsite approval until both backend eligibility and MATCH evidence are true", () => {
    expect(manualLocationActionState(attempt, "MATCH")).toEqual({
      actionsAvailable: true,
      approvalAvailable: true,
      approvalBlockedReason: null,
    });
    expect(manualLocationActionState(attempt, "REQUIRED")).toMatchObject({
      actionsAvailable: true,
      approvalAvailable: false,
      approvalBlockedReason: "Approved matching address document required.",
    });
    expect(
      manualLocationActionState({ ...attempt, approvalEligible: false }, "MATCH"),
    ).toMatchObject({
      actionsAvailable: true,
      approvalAvailable: false,
    });
  });

  it("does not offer actions for missing targets, historical versions, or terminal reviews", () => {
    expect(
      manualLocationActionState({ ...attempt, pendingTargetAvailable: false }, "MATCH")
        .actionsAvailable,
    ).toBe(false);
    expect(
      manualLocationActionState({ ...attempt, currentAddressVersion: false }, "MATCH")
        .actionsAvailable,
    ).toBe(false);
    expect(
      manualLocationActionState({ ...attempt, manualReviewStatus: "approved" }, "MATCH")
        .actionsAvailable,
    ).toBe(false);
  });
});
