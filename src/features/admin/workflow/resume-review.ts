import type { ResumeReviewItem, ResumeReviewPlan } from "@/features/admin/data/admin-operations";

const IMPORTABLE_CLAIM_TYPES = new Set([
  "employment",
  "education",
  "internship",
  "freelance",
  "gig_platform",
  "certification",
  "portfolio",
  "project",
  "skill",
]);

export function isImportableResumeClaimType(claimType: string) {
  return IMPORTABLE_CLAIM_TYPES.has(claimType);
}

export function getResumeReviewUpdateInput(item: ResumeReviewItem, draft: string) {
  if (!isImportableResumeClaimType(item.claimType)) {
    return {
      expectedVersion: item.version,
      selected: false,
      importAction: "skip" as const,
    };
  }

  return {
    expectedVersion: item.version,
    selected: item.selected,
    editedPayload: JSON.parse(draft) as Record<string, unknown>,
    importAction: item.importAction,
    targetRecordId: item.targetRecordId,
    confirmDistinctRole:
      item.claimType === "employment" &&
      item.importAction === "create_new" &&
      item.duplicateStatus !== "no_match",
  };
}

export function getResumeReviewSummary(items: ResumeReviewItem[], plan: ResumeReviewPlan | null) {
  const blockersByItem = new Map(
    (plan?.items ?? []).map((item) => [item.itemId, item.blockers] as const),
  );

  return {
    detected: items.length,
    selected: items.filter((item) => item.selected && item.importAction !== "skip").length,
    excluded: items.filter((item) => !item.selected || item.importAction === "skip").length,
    unsupported: items.filter((item) => !isImportableResumeClaimType(item.claimType)).length,
    blocked: items.filter((item) => (blockersByItem.get(item.id)?.length ?? 0) > 0).length,
  };
}

export function resumeReviewBlockerLabel(blocker: string) {
  const labels: Record<string, string> = {
    candidate_review_required: "Confirm or exclude this item.",
    duplicate_requires_candidate_resolution: "Resolve the possible duplicate.",
    employment_merge_not_supported: "Keep the existing role or create a distinct role.",
    protected_record: "A source-verified record cannot be overwritten.",
    target_record_not_found: "The selected target record no longer exists.",
    target_record_required: "Choose an existing target record.",
    unsupported_import_target: "This claim type is not supported for import.",
  };
  if (labels[blocker]) return labels[blocker];
  if (blocker.startsWith("missing_")) {
    return `Add ${blocker.slice("missing_".length).replaceAll("_", " ")}.`;
  }
  return blocker.replaceAll("_", " ");
}
