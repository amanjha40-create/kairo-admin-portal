// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ManualLocationDetail,
  PermanentAddressDetail,
} from "@/features/admin/data/permanent-address";
import { PermanentAddressWorkspace } from "./permanent-address-workspace";

const CANDIDATE_ID = "11111111-1111-4111-8111-111111111111";
const VERSION_ID = "22222222-2222-4222-8222-222222222222";
const DOCUMENT_ID = "33333333-3333-4333-8333-333333333333";

function baseDetail(): PermanentAddressDetail {
  return {
    permanentAddress: {
      candidateId: CANDIDATE_ID,
      addressVersionId: VERSION_ID,
      addressVersion: 2,
      overallStatus: "DOCUMENT_REQUIRED",
      documentStatus: "REQUIRED",
      successfulLocationChecks: 0,
      requiredLocationChecks: 3,
      todayComplete: false,
      separateDaysRequired: true,
      cycleExpiresAt: null,
      manualReviewStatus: null,
      pendingManualReviewTargetAvailable: false,
      manualLocationApprovalEligible: false,
      activeTargetSource: null,
      currentAttemptState: null,
    },
    claimedAddress: {
      addressLine1: "123 Review Street",
      addressLine2: null,
      locality: "Test Locality",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560001",
      country: "IN",
    },
    document: {
      present: false,
      documentId: null,
      documentType: null,
      uploadState: null,
      reviewState: "REQUIRED",
      uploadedAt: null,
      issuedOn: null,
      reviewedAt: null,
      previewAvailable: false,
      contentPath: null,
    },
    latestAttempt: null,
    versions: [
      {
        addressVersionId: VERSION_ID,
        addressVersion: 2,
        current: true,
        createdAt: "2026-10-14T08:00:00Z",
        invalidatedAt: null,
      },
      {
        addressVersionId: "99999999-9999-4999-8999-999999999999",
        addressVersion: 1,
        current: false,
        createdAt: "2026-10-01T08:00:00Z",
        invalidatedAt: "2026-10-14T07:59:00Z",
      },
    ],
    audit: [{ action: "approval_invalidated_by_address_edit", at: "2026-10-14T08:00:00Z" }],
  };
}

function manualAttempt(overrides: Partial<ManualLocationDetail> = {}): ManualLocationDetail {
  return {
    candidateId: CANDIDATE_ID,
    addressVersionId: VERSION_ID,
    sessionId: "44444444-4444-4444-8444-444444444444",
    attemptedAt: "2026-10-14T09:00:00Z",
    manualReviewStatus: "pending_review",
    addressVersion: 2,
    currentAddressVersion: true,
    pendingTargetAvailable: true,
    approvalEligible: false,
    gpsQuality: "passed",
    acceptedSampleCount: 5,
    accuracyM: 12,
    candidateCount: 1,
    candidateComparisons: [
      {
        countryMatch: true,
        stateMatch: true,
        cityMatch: true,
        postalCodeMatch: true,
        providerPostalCodePresent: true,
        reversePlaceType: "PointAddress",
        reverseEstimatedPointAddress: false,
        reversePrecisionSupported: true,
        streetMatch: false,
        streetDecisionReason: "street_conflict",
        addressNumberState: "conflict",
      },
    ],
    automaticResult: "NEEDS_REVIEW",
    automaticFailureReason: "street_conflict",
    documentStatus: "REQUIRED",
    priorAttemptCount: 1,
    history: [
      {
        sessionId: "44444444-4444-4444-8444-444444444444",
        attemptedAt: "2026-10-14T09:00:00Z",
        automaticResult: "NEEDS_REVIEW",
        manualReviewStatus: "pending_review",
      },
    ],
    resolutions: [],
    ...overrides,
  };
}

function renderWorkspace(detail: PermanentAddressDetail, overrides = {}) {
  const props = {
    detail,
    canReview: true,
    mutationPending: false,
    loadDocumentContent: vi.fn(async () => new Blob(["pdf"], { type: "application/pdf" })),
    onDocumentDecision: vi.fn(async () => undefined),
    onLocationDecision: vi.fn(async () => undefined),
    ...overrides,
  };
  return { ...render(<PermanentAddressWorkspace {...props} />), props };
}

describe("PermanentAddressWorkspace", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:protected-address-document"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders a required/no-document case with backend 0/3 truth", () => {
    renderWorkspace(baseDetail());

    expect(screen.getByText("Address document required")).toBeTruthy();
    expect(screen.getAllByText("0 of 3 completed").length).toBeGreaterThan(0);
    expect(screen.getByText("Document required")).toBeTruthy();
    expect(screen.queryByText("Verify Permanent Address")).toBeNull();
    expect(screen.getByText("Version 1")).toBeTruthy();
    expect(screen.getAllByText(/Invalidated/).length).toBeGreaterThan(0);
  });

  it("does not infer Verified from an approved document", () => {
    const detail = baseDetail();
    detail.permanentAddress.documentStatus = "MATCH";
    detail.permanentAddress.overallStatus = "LOCATION_CHECK_REQUIRED";
    detail.document = {
      present: true,
      documentId: DOCUMENT_ID,
      documentType: "address_proof",
      uploadState: "MATCH",
      reviewState: "MATCH",
      uploadedAt: "2026-10-14T08:00:00Z",
      issuedOn: null,
      reviewedAt: "2026-10-14T09:00:00Z",
      previewAvailable: true,
      contentPath: `/api/v1/permanent-address/reviews/${VERSION_ID}/content`,
    };
    renderWorkspace(detail);

    expect(screen.getAllByText("Approved").length).toBeGreaterThan(0);
    expect(screen.getByText("Location checks required")).toBeTruthy();
    expect(screen.queryByText(/backend explicitly reports/)).toBeNull();
  });

  it.each([
    ["UNDER_REVIEW", "Under review"],
    ["MATCH", "Approved"],
    ["REJECTED", "Rejected"],
    ["NEEDS_CORRECTION", "Needs correction"],
  ])("renders the authoritative %s document state", (reviewState, label) => {
    const detail = baseDetail();
    detail.permanentAddress.documentStatus = reviewState;
    detail.document = {
      present: true,
      documentId: DOCUMENT_ID,
      documentType: "address_proof",
      uploadState: reviewState,
      reviewState,
      uploadedAt: "2026-10-14T08:00:00Z",
      issuedOn: null,
      reviewedAt: null,
      previewAvailable: reviewState === "UNDER_REVIEW",
      contentPath:
        reviewState === "UNDER_REVIEW"
          ? `/api/v1/permanent-address/reviews/${VERSION_ID}/content`
          : null,
    };
    renderWorkspace(detail);

    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  });

  it("renders backend-owned 1/3 progress without deriving final verification", () => {
    const detail = baseDetail();
    detail.permanentAddress.successfulLocationChecks = 1;
    detail.permanentAddress.overallStatus = "LOCATION_CHECK_IN_PROGRESS";
    renderWorkspace(detail);

    expect(screen.getAllByText("1 of 3 completed").length).toBeGreaterThan(0);
    expect(screen.getByText("Location check in progress")).toBeTruthy();
    expect(screen.queryByText("Verified")).toBeNull();
  });

  it("shows Verified only when the backend returns the explicit final status", () => {
    const detail = baseDetail();
    detail.permanentAddress.overallStatus = "PERMANENT_ADDRESS_VERIFIED";
    detail.permanentAddress.documentStatus = "MATCH";
    detail.permanentAddress.successfulLocationChecks = 3;
    renderWorkspace(detail);

    expect(screen.getByText("Verified")).toBeTruthy();
    expect(
      screen.getByText(/backend explicitly reports this Permanent Address as verified/),
    ).toBeTruthy();
  });

  it("blocks onsite approval while the address document is not approved", () => {
    const detail = baseDetail();
    detail.latestAttempt = manualAttempt({ manualReviewStatus: "waiting_for_address_document" });
    detail.permanentAddress.pendingManualReviewTargetAvailable = true;
    detail.permanentAddress.manualReviewStatus = "waiting_for_address_document";
    renderWorkspace(detail);

    expect(screen.getByText(/Manual location approval unavailable/)).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Approve onsite location" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Request additional evidence" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("enables only the canonical manual review actions when backend eligibility is true", () => {
    const detail = baseDetail();
    detail.permanentAddress.documentStatus = "MATCH";
    detail.permanentAddress.pendingManualReviewTargetAvailable = true;
    detail.permanentAddress.manualLocationApprovalEligible = true;
    detail.latestAttempt = manualAttempt({
      documentStatus: "MATCH",
      approvalEligible: true,
    });
    renderWorkspace(detail);

    expect(
      (screen.getByRole("button", { name: "Approve onsite location" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(
      (screen.getByRole("button", { name: "Reject onsite location" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(
      (screen.getByRole("button", { name: "Request address correction" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(
      (screen.getByRole("button", { name: "Request additional evidence" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(screen.queryByText("Mark 3/3")).toBeNull();
    expect(screen.queryByText("Override progress")).toBeNull();
  });

  it("renders only privacy-safe diagnostics", () => {
    const detail = baseDetail();
    detail.latestAttempt = manualAttempt();
    renderWorkspace(detail);
    const text = document.body.textContent ?? "";

    expect(screen.getByText("PIN")).toBeTruthy();
    expect(text).toContain("Place type: Point Address");
    expect(screen.getByText("Estimated point").parentElement?.textContent).toContain("No");
    expect(text).not.toContain("latitude");
    expect(text).not.toContain("longitude");
    expect(text).not.toContain("ciphertext");
    expect(text).not.toContain("S3");
    expect(text).not.toContain("storage path");
  });

  it("renders an estimated provider point truthfully", () => {
    const detail = baseDetail();
    const attempt = manualAttempt();
    attempt.candidateComparisons[0].reverseEstimatedPointAddress = true;
    detail.latestAttempt = attempt;
    renderWorkspace(detail);

    expect(screen.getByText("Estimated point").parentElement?.textContent).toContain("Yes");
  });

  it("requires the protected preview to render before enabling a document decision", async () => {
    const detail = baseDetail();
    detail.document = {
      present: true,
      documentId: DOCUMENT_ID,
      documentType: "address_proof",
      uploadState: "UNDER_REVIEW",
      reviewState: "UNDER_REVIEW",
      uploadedAt: "2026-10-14T08:00:00Z",
      issuedOn: null,
      reviewedAt: null,
      previewAvailable: true,
      contentPath: `/api/v1/permanent-address/reviews/${VERSION_ID}/content`,
    };
    const { props } = renderWorkspace(detail);
    const approve = screen.getByRole("button", { name: "Approve matching" });
    expect((approve as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Open secure preview" }));
    await waitFor(() => expect(props.loadDocumentContent).toHaveBeenCalledTimes(1));
    fireEvent.load(await screen.findByTitle("Protected address document preview"));
    await waitFor(() => expect((approve as HTMLButtonElement).disabled).toBe(false));
    expect(document.body.textContent).not.toContain(detail.document.contentPath ?? "never");
  });
});
