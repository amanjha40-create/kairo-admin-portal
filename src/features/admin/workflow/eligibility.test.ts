import { describe, expect, it } from "vitest";
import { evaluateWorkflowEligibility, buildWorkflowCaseState } from "./eligibility";
import { permissionsForRole } from "./permissions";

function createDetail(
  status: "pending_admin_review" | "pending_admin_quality_review" | "in_progress" | "verified",
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
    expect(evaluateWorkflowEligibility(detail, "request_correction", actor, state)).toMatchObject({
      allowed: true,
      irrelevant: false,
      nextStatusOnSuccess: "awaiting_subject_corrections",
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

  it.each(["pending_admin_review", "in_progress", "pending_admin_quality_review"] as const)(
    "allows privileged direct confirmation from %s",
    (status) => {
      const detail = createDetail(status);
      const actor = {
        name: "Admin Reviewer",
        role: "Admin",
        roleKey: "admin" as const,
        permissions: permissionsForRole("admin"),
      };

      expect(
        evaluateWorkflowEligibility(
          detail,
          "direct_confirmation",
          actor,
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
});
