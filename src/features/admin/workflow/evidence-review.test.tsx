import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { EvidenceReviewAction } from "../components/evidence-review-action";
import {
  canReviewEvidence,
  createEvidenceReviewSubmit,
  evidenceDispositionLabel,
  evidenceReviewError,
  evidenceReviewProgress,
} from "./evidence-review";
import { buildWorkflowCaseState, evaluateWorkflowEligibility } from "./eligibility";
import { permissionsForRole } from "./permissions";
import type { VerificationCaseDetail } from "../data/verification-review";

const item = {
  id: "synthetic-evidence",
  reviewed: false,
  reviewApplicable: true,
  disposition: "accepted",
};
function markup(overrides = {}, canReview = true) {
  return renderToStaticMarkup(
    createElement(EvidenceReviewAction, {
      item: { ...item, ...overrides },
      canReview,
      inspectable: true,
      onReview: vi.fn(),
    }),
  );
}
function detail(reviewed: number, applicable = true) {
  return {
    summary: { status: "pending_admin_quality_review", verificationType: "employment" },
    flags: [],
    contacts: [],
    corrections: [],
    organization: { state: "resolved" },
    evidence: [0, 1].map((n) => ({
      ...item,
      id: String(n),
      reviewed: n < reviewed,
      reviewApplicable: applicable,
    })),
  } as unknown as VerificationCaseDetail;
}

describe("authoritative evidence review", () => {
  it("offers only a per-evidence semantic action with explicit inspection confirmation", () => {
    const html = markup();
    expect(html).toContain("Mark as reviewed");
    expect(html).toContain('type="button"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("disabled");
    expect(html).toContain("I inspected this evidence");
    expect(html).not.toContain("Mark All");
    expect(html).not.toContain("Finalize");
  });
  it("announces readable status without relying on color", () => {
    expect(markup()).toContain('role="status"');
    expect(markup()).toContain('aria-live="polite"');
    expect(markup()).toContain("Not reviewed");
    expect(markup()).toContain("focus-visible:outline");
  });
  it("renders authoritative timestamp but never the raw reviewer ID", () => {
    const html = markup({
      reviewed: true,
      reviewedAt: "2026-10-12T12:00:00Z",
      reviewedByUserId: "private-internal-reviewer",
    });
    expect(html).toContain("Reviewed at");
    expect(html).toContain('dateTime="2026-10-12T12:00:00Z"');
    expect(html).not.toContain("private-internal-reviewer");
    expect(html).not.toContain("Mark as reviewed");
  });
  it("does not invent a timestamp or reviewer", () => {
    expect(markup({ reviewed: true })).not.toContain("Reviewed at");
    expect(markup({ reviewed: true })).not.toContain("Reviewed by");
  });
  it("reopening or reloading preserves authoritative reviewed rendering", () => {
    expect(markup({ reviewed: true })).toEqual(markup({ reviewed: true }));
    expect(markup({ reviewed: true })).not.toContain("Mark as reviewed");
  });
  it("replacement/refetch can restore the unreviewed action", () => {
    expect(markup({ reviewed: true })).not.toContain("Mark as reviewed");
    expect(markup({ reviewed: false, contentVersion: "replacement" })).toContain(
      "Mark as reviewed",
    );
  });
  it("hides actions for unauthorized operators", () => {
    expect(markup({}, false)).not.toContain("Mark as reviewed");
    expect(canReviewEvidence("pending_admin_review", [])).toBe(false);
    expect(canReviewEvidence("pending_admin_review", ["verification.verify"])).toBe(false);
  });
  it.each(["pending_admin_review", "pending_admin_re_review", "pending_admin_quality_review"])(
    "allows dispatch-authorized review in %s",
    (status) => {
      expect(canReviewEvidence(status, ["verification.approve_outreach"])).toBe(true);
    },
  );
  it.each(["verified", "rejected", "cancelled", "in_progress", "draft"])(
    "cannot review a closed or ineligible %s case",
    (status) => {
      expect(canReviewEvidence(status, ["verification.approve_outreach"])).toBe(false);
    },
  );
  it("excludes historical/non-applicable evidence from actions and counts", () => {
    expect(markup({ reviewApplicable: false })).not.toContain("Mark as reviewed");
    expect(evidenceReviewProgress([{ ...item, reviewed: true, reviewApplicable: false }])).toEqual({
      required: 0,
      reviewed: 0,
    });
  });
  it("does not infer review from accepted or legacy approved disposition", () => {
    expect(evidenceReviewProgress([item, { ...item, disposition: "approved" }])).toEqual({
      required: 2,
      reviewed: 0,
    });
    expect(evidenceDispositionLabel("accepted")).toBe("Accepted");
    expect(evidenceDispositionLabel("approved")).toBe("Unavailable");
    expect(markup({ disposition: "rejected", reviewed: true })).toContain("Reviewed");
  });
  it.each([0, 1, 2])("counts %i of 2 explicitly, gating each final-quality outcome", (count) => {
    const current = detail(count);
    expect(evidenceReviewProgress(current.evidence)).toEqual({ required: 2, reviewed: count });
    const state = buildWorkflowCaseState(current, { usesCanonicalDispatchContract: true });
    const actor = {
      name: "Synthetic Admin",
      role: "Admin",
      roleKey: "admin" as const,
      permissions: permissionsForRole("admin"),
    };
    for (const action of ["verify", "reject", "unable_to_verify"] as const) {
      expect(evaluateWorkflowEligibility(current, action, actor, state).allowed).toBe(count === 2);
    }
  });
  it("preserves zero applicable evidence backend predicate without inventing a minimum", () => {
    const current = detail(0, false);
    const actor = {
      name: "Admin",
      role: "Admin",
      roleKey: "admin" as const,
      permissions: permissionsForRole("admin"),
    };
    expect(
      evaluateWorkflowEligibility(
        current,
        "verify",
        actor,
        buildWorkflowCaseState(current, { usesCanonicalDispatchContract: true }),
      ).allowed,
    ).toBe(true);
  });
  it("prevents rapid duplicate submissions until the first operation settles", async () => {
    const submit = createEvidenceReviewSubmit();
    let finish!: () => void;
    const operation = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const first = submit(operation);
    await submit(operation);
    expect(operation).toHaveBeenCalledTimes(1);
    finish();
    await first;
  });
  it("propagates failure without false success and releases the pending guard", async () => {
    const submit = createEvidenceReviewSubmit();
    await expect(
      submit(async () => {
        throw new Error("network");
      }),
    ).rejects.toThrow("network");
    const next = vi.fn(async () => {});
    await submit(next);
    expect(next).toHaveBeenCalledOnce();
  });
  it.each([401, 403, 404, 409, 500])(
    "renders safe HTTP %i error copy without raw data",
    (status) => {
      const error = new ApiError({ code: "unknown", message: "RAW PRIVATE PROVIDER BODY", status });
      expect(evidenceReviewError(error)).not.toContain("RAW PRIVATE");
      expect(evidenceReviewError(error).length).toBeGreaterThan(20);
    },
  );
  it("redacts unexpected and transport failures", () => {
    expect(evidenceReviewError(new Error("SECRET"))).not.toContain("SECRET");
  });
});
