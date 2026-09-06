import { describe, expect, it } from "vitest";
import {
  PENDING_ORGANIZATION_RESOLUTION_COPY,
  buildCanonicalOrganizationDraft,
  getAdminApprovalActionLabel,
} from "./organization-resolution";

describe("Admin canonical organization resolution", () => {
  it("prefills creation from resolved Registry context without inventing values", () => {
    expect(
      buildCanonicalOrganizationDraft({
        candidateEnteredName: "Candidate-entered employer",
        verificationType: "employment",
        registryRecordId: "registry-1",
        registryName: "Canonical Employer",
        registryCountry: "IN",
        registryStateProvince: "Karnataka",
        registryWebsite: "https://employer.example",
        registryPrimaryDomain: "employer.example",
      }),
    ).toEqual({
      name: "Canonical Employer",
      organizationType: "employer",
      country: "IN",
      stateProvince: "Karnataka",
      website: "https://employer.example",
      domain: "employer.example",
      registryRecordId: "registry-1",
      registryName: "Canonical Employer",
    });
  });

  it("keeps missing optional Registry context empty", () => {
    expect(
      buildCanonicalOrganizationDraft({
        candidateEnteredName: "Candidate University",
        verificationType: "education",
      }),
    ).toMatchObject({
      name: "Candidate University",
      organizationType: "university",
      country: "",
      stateProvince: "",
      website: "",
      domain: "",
    });
  });

  it("uses truthful approval and pending-resolution copy", () => {
    expect(getAdminApprovalActionLabel(false)).toBe(
      "Approve review and continue to organization resolution",
    );
    expect(getAdminApprovalActionLabel(true)).toBe("Approve and send verifier invitation");
    expect(PENDING_ORGANIZATION_RESOLUTION_COPY).toEqual({
      title: "Admin approved — organization resolution required",
      description: "Outreach has not started.",
      action: "Resolve organization to send verifier invitation",
    });
  });
});
