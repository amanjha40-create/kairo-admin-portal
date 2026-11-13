import { describe, expect, it } from "vitest";
import type { ResumeReviewItem, ResumeReviewPlan } from "@/features/admin/data/admin-operations";
import {
  getResumeReviewSummary,
  getResumeReviewUpdateInput,
  isImportableResumeClaimType,
  resumeReviewBlockerLabel,
} from "./resume-review";

function item(
  id: string,
  claimType: string,
  selected: boolean,
  importAction: ResumeReviewItem["importAction"],
): ResumeReviewItem {
  return {
    id,
    claimType,
    sourceClaimId: `source-${id}`,
    originalPayload: { claim_type: claimType },
    editedPayload: { claim_type: claimType },
    selected,
    reviewStatus: selected ? "confirmed" : "excluded",
    duplicateStatus: "no_match",
    duplicateCandidates: [],
    conflictWarnings: [],
    importAction,
    version: 1,
  };
}

describe("Resume review presentation", () => {
  it.each(["freelance", "gig_platform", "portfolio"])(
    "treats %s as an actionable import category",
    (claimType) => expect(isImportableResumeClaimType(claimType)).toBe(true),
  );

  it("keeps an unknown type visible but unsupported", () => {
    expect(isImportableResumeClaimType("unknown_claim")).toBe(false);
    expect(getResumeReviewUpdateInput(item("u", "unknown_claim", true, "create_new"), "{")).toEqual(
      {
        expectedVersion: 1,
        selected: false,
        importAction: "skip",
      },
    );
  });

  it("preserves supported category edits and duplicate decisions", () => {
    const employment = item("e", "employment", true, "create_new");
    employment.duplicateStatus = "possible_match";
    expect(
      getResumeReviewUpdateInput(
        employment,
        JSON.stringify({ claim_type: "employment", company_name: "Kairo" }),
      ),
    ).toMatchObject({
      selected: true,
      editedPayload: { claim_type: "employment", company_name: "Kairo" },
      importAction: "create_new",
      confirmDistinctRole: true,
    });
  });

  it("counts mixed, excluded, unsupported, and blocked items without double-importing", () => {
    const items = [
      item("a", "freelance", true, "create_new"),
      item("b", "portfolio", false, "skip"),
      item("c", "unknown_claim", false, "skip"),
    ];
    const plan: ResumeReviewPlan = {
      sessionId: "session",
      ready: false,
      version: 2,
      items: [
        {
          itemId: "a",
          claimType: "freelance",
          action: "create_new",
          duplicateStatus: "no_match",
          fieldsToCreate: [],
          fieldsIgnored: [],
          blockers: ["missing_project_title"],
          warnings: [],
          verifiedRecordProtected: false,
        },
      ],
    };

    expect(getResumeReviewSummary(items, plan)).toEqual({
      detected: 3,
      selected: 1,
      excluded: 2,
      unsupported: 1,
      blocked: 1,
    });
    expect(resumeReviewBlockerLabel("missing_project_title")).toBe("Add project title.");
  });

  it("treats an all-excluded review as explicit and allows a supported item to be restored", () => {
    const excluded = [
      item("a", "freelance", false, "skip"),
      item("b", "gig_platform", false, "skip"),
      item("c", "portfolio", false, "skip"),
    ];

    expect(getResumeReviewSummary(excluded, null)).toEqual({
      detected: 3,
      selected: 0,
      excluded: 3,
      unsupported: 0,
      blocked: 0,
    });
    const restored = { ...excluded[0], selected: true, importAction: "create_new" as const };
    expect(
      getResumeReviewUpdateInput(restored, JSON.stringify(restored.editedPayload)),
    ).toMatchObject({
      selected: true,
      importAction: "create_new",
      editedPayload: { claim_type: "freelance" },
    });
  });
});
