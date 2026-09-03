import { describe, expect, it } from "vitest";
import type { VerificationStatus } from "../data/types";
import { evaluateWorkflowEligibility, buildWorkflowCaseState } from "./eligibility";
import { permissionsForRole } from "./permissions";

function createDetail(
  status: VerificationStatus,
  options: {
    verificationType?: "employment" | "education";
    consentGrantedAt?: string | null;
    consentFields?: string[];
    consentEvidenceScope?: string[];
    contacts?: Array<{
      id: string;
      outreachEligible: boolean;
      internalApprovalStatus: "not_started" | "pending" | "approved" | "rejected";
    }>;
    flags?: Array<{ id: string; state: "open"; severity: "high"; flag: string }>;
    organizationState?: "resolved" | "unresolved";
    evidence?: Array<{ id: string; reviewStatus: "reviewed" }>;
    corrections?: Array<{ id: string; state: "requested" }>;
  } = {},
) {
  return {
    summary: { status, verificationType: options.verificationType ?? "employment" },
    consent: {
      grantedAt: options.consentGrantedAt ?? "2026-09-03T10:00:00.000Z",
      fields: options.consentFields ?? ["role"],
      evidenceScope: options.consentEvidenceScope ?? [],
    },
    flags: options.flags ?? [],
    contacts: options.contacts ?? [
      {
        id: "contact-1",
        outreachEligible: true,
        internalApprovalStatus: "approved",
      },
    ],
    corrections: options.corrections ?? [],
    evidence: options.evidence ?? [{ id: "evidence-1", reviewStatus: "reviewed" }],
    organization: { state: options.organizationState ?? "resolved" },
  } as never;
}

const adminActor = {
  name: "Admin Reviewer",
  role: "Admin",
  roleKey: "admin" as const,
  permissions: permissionsForRole("admin"),
};

function canonicalState(detail: never) {
  return buildWorkflowCaseState(detail, { usesCanonicalDispatchContract: true });
}

describe("verification workflow eligibility", () => {
  it("allows final-review actions for an admin in pending admin quality review", () => {
    const detail = createDetail("pending_admin_quality_review");
    const state = buildWorkflowCaseState(detail);

    expect(evaluateWorkflowEligibility(detail, "verify", adminActor, state)).toMatchObject({
      allowed: true,
      irrelevant: false,
      nextStatusOnSuccess: "verified",
    });
    expect(
      evaluateWorkflowEligibility(detail, "return_to_verifier", adminActor, state),
    ).toMatchObject({
      allowed: true,
      irrelevant: false,
      nextStatusOnSuccess: "in_progress",
    });
    expect(evaluateWorkflowEligibility(detail, "cancel", adminActor, state)).toMatchObject({
      allowed: true,
      irrelevant: false,
      nextStatusOnSuccess: "cancelled",
    });
    expect(
      evaluateWorkflowEligibility(detail, "request_correction", adminActor, state),
    ).toMatchObject({
      allowed: true,
      irrelevant: false,
      nextStatusOnSuccess: "awaiting_subject_corrections",
    });
  });

  it("marks final-review-only actions irrelevant before verifier work is complete", () => {
    const detail = createDetail("pending_admin_review");
    const state = buildWorkflowCaseState(detail);

    const verify = evaluateWorkflowEligibility(detail, "verify", adminActor, state);
    const returnToVerifier = evaluateWorkflowEligibility(
      detail,
      "return_to_verifier",
      adminActor,
      state,
    );

    expect(verify.allowed).toBe(false);
    expect(verify.irrelevant).toBe(true);
    expect(returnToVerifier.allowed).toBe(false);
    expect(returnToVerifier.irrelevant).toBe(true);
  });

  it.each(["pending_admin_review", "in_progress", "pending_admin_quality_review"] as const)(
    "allows privileged direct confirmation from %s",
    (status) => {
      const detail = createDetail(status);

      expect(
        evaluateWorkflowEligibility(
          detail,
          "direct_confirmation",
          adminActor,
          buildWorkflowCaseState(detail),
        ),
      ).toMatchObject({ allowed: true, irrelevant: false, nextStatusOnSuccess: "verified" });
    },
  );

  it("blocks direct confirmation for unauthorized and terminal cases", () => {
    const reviewer = {
      name: "Read Only Reviewer",
      role: "Read only",
      roleKey: "read_only" as const,
      permissions: permissionsForRole("read_only"),
    };
    const active = createDetail("pending_admin_review");
    const terminal = createDetail("verified");

    expect(
      evaluateWorkflowEligibility(
        active,
        "direct_confirmation",
        reviewer,
        buildWorkflowCaseState(active),
      ).allowed,
    ).toBe(false);
    expect(
      evaluateWorkflowEligibility(
        terminal,
        "direct_confirmation",
        {
          ...reviewer,
          roleKey: "admin",
          permissions: permissionsForRole("admin"),
        },
        buildWorkflowCaseState(terminal),
      ),
    ).toMatchObject({ allowed: false, irrelevant: true });
  });

  it("requires elevated permission for high-risk rejection reasons", () => {
    const detail = createDetail("pending_admin_quality_review");
    const actor = {
      name: "Case Reviewer",
      role: "Reviewer",
      roleKey: "reviewer" as const,
      permissions: permissionsForRole("reviewer"),
    };
    const state = buildWorkflowCaseState(detail);

    const result = evaluateWorkflowEligibility(detail, "reject", actor, state, {
      rejectionIsHighRisk: true,
    });

    expect(result.allowed).toBe(false);
    expect(result.blockingReasons).toContain(
      "Fraud or identity-related rejection requires Trust & Safety or Admin permission.",
    );
  });

  it.each(["pending_admin_review", "pending_admin_re_review"] as const)(
    "allows canonical dispatch from backend-eligible state %s",
    (status) => {
      const detail = createDetail(status);

      expect(
        evaluateWorkflowEligibility(detail, "approve_outreach", adminActor, canonicalState(detail)),
      ).toMatchObject({ allowed: true, irrelevant: false });
    },
  );

  it("allows unresolved organizations and predicts the canonical resolution transition", () => {
    const detail = createDetail("pending_admin_review", { organizationState: "unresolved" });
    const result = evaluateWorkflowEligibility(
      detail,
      "approve_outreach",
      adminActor,
      canonicalState(detail),
    );

    expect(result).toMatchObject({
      allowed: true,
      nextStatusOnSuccess: "pending_organization_resolution",
    });
    expect(result.warnings).toContain(
      "Organization is not resolved yet. Approval will move this case into organization resolution without sending outreach.",
    );
  });

  it("predicts organization acceptance after dispatch to a resolved organization", () => {
    const detail = createDetail("pending_admin_review");

    expect(
      evaluateWorkflowEligibility(detail, "approve_outreach", adminActor, canonicalState(detail)),
    ).toMatchObject({ allowed: true, nextStatusOnSuccess: "pending_organization_acceptance" });
  });

  it("blocks canonical dispatch when authoritative consent metadata is missing", () => {
    const detail = createDetail("pending_admin_review", {
      consentGrantedAt: null,
      consentFields: [],
      consentEvidenceScope: [],
    });
    const result = evaluateWorkflowEligibility(
      detail,
      "approve_outreach",
      adminActor,
      canonicalState(detail),
    );

    expect(result.allowed).toBe(false);
    expect(result.blockingReasons).toContain(
      "Authoritative candidate consent is missing. Ask the candidate to resubmit the request with consented fields or evidence before approving for dispatch.",
    );
  });

  it("blocks employment dispatch until the current verifier contact is approved", () => {
    const detail = createDetail("pending_admin_review", {
      contacts: [{ id: "contact-1", outreachEligible: false, internalApprovalStatus: "pending" }],
    });

    expect(
      evaluateWorkflowEligibility(detail, "approve_outreach", adminActor, canonicalState(detail)),
    ).toMatchObject({
      allowed: false,
      blockingReasons: ["Approve the current verifier contact before dispatching this request."],
    });
  });

  it("allows education dispatch without a contact when all other backend prerequisites pass", () => {
    const detail = createDetail("pending_admin_review", {
      verificationType: "education",
      contacts: [],
    });

    expect(
      evaluateWorkflowEligibility(detail, "approve_outreach", adminActor, canonicalState(detail)),
    ).toMatchObject({ allowed: true });
  });

  it("treats open flags as warnings because the backend does not categorically block dispatch", () => {
    const detail = createDetail("pending_admin_review", {
      flags: [{ id: "flag-1", state: "open", severity: "high", flag: "risk_review_required" }],
    });
    const result = evaluateWorkflowEligibility(
      detail,
      "approve_outreach",
      adminActor,
      canonicalState(detail),
    );

    expect(result.allowed).toBe(true);
    expect(result.warnings).toContain(
      "An open critical risk flag is present. Review it before dispatch.",
    );
  });

  it.each(["verified", "rejected", "unable_to_verify", "cancelled", "expired"] as const)(
    "does not expose dispatch for terminal state %s",
    (status) => {
      const detail = createDetail(status);

      expect(
        evaluateWorkflowEligibility(detail, "approve_outreach", adminActor, canonicalState(detail)),
      ).toMatchObject({ allowed: false, irrelevant: true });
    },
  );

  it("does not expose dispatch while awaiting candidate corrections", () => {
    const detail = createDetail("awaiting_subject_corrections");

    expect(
      evaluateWorkflowEligibility(detail, "approve_outreach", adminActor, canonicalState(detail)),
    ).toMatchObject({ allowed: false, irrelevant: true });
  });

  it.each([
    [
      "request_correction",
      ["pending_admin_review", "pending_admin_re_review", "pending_admin_quality_review"],
    ],
    [
      "direct_confirmation",
      [
        "pending_admin_review",
        "pending_admin_re_review",
        "approved_for_organization_verification",
        "pending_organization_resolution",
        "pending_organization_acceptance",
        "in_progress",
        "pending_admin_quality_review",
      ],
    ],
    ["reject", ["pending_admin_review", "pending_admin_re_review", "pending_admin_quality_review"]],
  ] as const)("matches backend state eligibility for %s", (action, allowedStatuses) => {
    const allowedStatusSet = new Set<VerificationStatus>(allowedStatuses);
    const statuses: VerificationStatus[] = [
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

    for (const status of statuses) {
      const detail = createDetail(status);
      const result = evaluateWorkflowEligibility(
        detail,
        action,
        adminActor,
        canonicalState(detail),
      );
      expect(result.allowed, `${action} from ${status}`).toBe(allowedStatusSet.has(status));
    }
  });

  it("matches the backend cancel rule for every non-terminal state", () => {
    const nonTerminalStatuses: VerificationStatus[] = [
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
    ];

    for (const status of nonTerminalStatuses) {
      const detail = createDetail(status);
      expect(
        evaluateWorkflowEligibility(detail, "cancel", adminActor, canonicalState(detail)).allowed,
        `cancel from ${status}`,
      ).toBe(true);
    }
  });
});
