export interface CanonicalOrganizationDraft {
  name: string;
  organizationType: "employer" | "university";
  country: string;
  stateProvince: string;
  website: string;
  domain: string;
  registryRecordId?: string;
  registryName?: string;
}

export interface CanonicalOrganizationDraftContext {
  candidateEnteredName: string;
  verificationType: string;
  registryRecordId?: string | null;
  registryName?: string | null;
  registryCountry?: string | null;
  registryStateProvince?: string | null;
  registryWebsite?: string | null;
  registryPrimaryDomain?: string | null;
}

export function buildCanonicalOrganizationDraft(
  context: CanonicalOrganizationDraftContext,
): CanonicalOrganizationDraft {
  return {
    name: context.registryName?.trim() || context.candidateEnteredName,
    organizationType: context.verificationType === "education" ? "university" : "employer",
    country: context.registryCountry ?? "",
    stateProvince: context.registryStateProvince ?? "",
    website: context.registryWebsite ?? "",
    domain: context.registryPrimaryDomain ?? "",
    registryRecordId: context.registryRecordId ?? undefined,
    registryName: context.registryName ?? undefined,
  };
}

export function getAdminApprovalActionLabel(organizationResolved: boolean): string {
  return organizationResolved
    ? "Approve and send verifier invitation"
    : "Approve review and continue to organization resolution";
}

export const PENDING_ORGANIZATION_RESOLUTION_COPY = {
  title: "Admin approved — organization resolution required",
  description: "Outreach has not started.",
  action: "Resolve organization to send verifier invitation",
} as const;
