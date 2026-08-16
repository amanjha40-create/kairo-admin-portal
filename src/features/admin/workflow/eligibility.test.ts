import { describe, expect, it } from "vitest";
import { evaluateWorkflowEligibility, buildWorkflowCaseState } from "./eligibility";
import { permissionsForRole } from "./permissions";

function createDetail(
  status: "pending_admin_review" | "pending_admin_quality_review" | "verified",
) {
  return {
    summary: { status },
    flags: [],
    contacts: [
      {
        id: "contact-1",
        outreachEligible: true,
        internalApprovalStatus: "approved",
      },
    ],
    corrections: [],
    evidence: [{ id: "evidence-1", reviewStatus: "reviewed" }],
    organization: { state: "resolved" },
  } as never;
}

describe("verification workflow eligibility", () => {
  it("allows final-review actions for an admin in pending admin quality review", () => {
    const detail = createDetail("pending_admin_quality_review");
    const actor = {
      name: "Admin Reviewer",
      role: "Admin",
      roleKey: "admin" as const,
      permissions: permissionsForRole("admin"),
    };
    const state = buildWorkflowCaseState(detail);

    expect(evaluateWorkflowEligibility(detail, "verify", actor, state)).toMatchObject({
      allowed: true,
      irrelevant: false,
      nextStatusOnSuccess: "verified",
    });
    expect(evaluateWorkflowEligibility(detail, "return_to_verifier", actor, state)).toMatchObject({
      allowed: true,
      irrelevant: false,
      nextStatusOnSuccess: "in_progress",
    });
    expect(evaluateWorkflowEligibility(detail, "cancel", actor, state)).toMatchObject({
      allowed: true,
      irrelevant: false,
      nextStatusOnSuccess: "cancelled",
    });
  });

  it("marks final-review-only actions irrelevant before verifier work is complete", () => {
    const detail = createDetail("pending_admin_review");
    const actor = {
      name: "Admin Reviewer",
      role: "Admin",
      roleKey: "admin" as const,
      permissions: permissionsForRole("admin"),
    };
    const state = buildWorkflowCaseState(detail);

    const verify = evaluateWorkflowEligibility(detail, "verify", actor, state);
    const returnToVerifier = evaluateWorkflowEligibility(
      detail,
      "return_to_verifier",
      actor,
      state,
    );

    expect(verify.allowed).toBe(false);
    expect(verify.irrelevant).toBe(true);
    expect(returnToVerifier.allowed).toBe(false);
    expect(returnToVerifier.irrelevant).toBe(true);
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
});
