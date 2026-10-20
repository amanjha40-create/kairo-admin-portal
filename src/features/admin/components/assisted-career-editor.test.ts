import { describe, expect, it } from "vitest";
import {
  CAREER_TYPES,
  buildCareerPayload,
  careerRecordToDraft,
  createCareerDraft,
  validateCareerDraft,
} from "./assisted-career-editor";

describe("assisted career editor contract", () => {
  it("offers every API42 Career type", () => {
    expect(CAREER_TYPES).toEqual([
      "employment",
      "education",
      "internship",
      "freelance",
      "certification",
      "portfolio",
      "project",
      "skill",
      "gig_platform",
    ]);
  });

  it("builds canonical create payloads without verification fields", () => {
    expect(
      buildCareerPayload("portfolio", {
        title: "Selected work",
        url: "https://example.com/work",
        tags: "design, operations",
        description: "Candidate portfolio",
      }),
    ).toEqual({
      title: "Selected work",
      url: "https://example.com/work",
      tags: ["design", "operations"],
      description: "Candidate portfolio",
    });
    expect(
      buildCareerPayload("gig_platform", {
        platform_name: "Example Platform",
        partner_role: "Delivery partner",
        started_at: "2025-01-01",
        ended_at: "",
        is_active: true,
        partner_id: "partner-42",
        rating: "4.8",
      }),
    ).toEqual({
      platform_name: "Example Platform",
      partner_role: "Delivery partner",
      started_at: "2025-01-01",
      is_active: true,
      partner_id: "partner-42",
      rating: "4.8",
    });
  });

  it("sends only changed fields and uses explicit null to clear nullable values", () => {
    const original = {
      title: "Original",
      role: "Lead",
      organization_name: "Example",
      start_date: "2024-01-01",
      end_date: "2024-12-31",
      is_ongoing: false,
      project_url: "https://example.com/project",
      repository_url: "",
      description: "Original description",
    };
    const changed = { ...original, role: "", is_ongoing: true };

    expect(buildCareerPayload("project", changed, original)).toEqual({
      role: null,
      is_ongoing: true,
      end_date: null,
    });
  });

  it("rehydrates backend records and validates required fields", () => {
    const draft = careerRecordToDraft("portfolio", {
      candidateId: "candidate-id",
      claimType: "portfolio",
      recordId: "record-id",
      verificationStatus: "draft",
      payload: { title: "Work", tags: ["one", "two"], description: null },
    });

    expect(draft.tags).toBe("one, two");
    expect(validateCareerDraft("portfolio", draft)).toBeNull();
    expect(validateCareerDraft("skill", createCareerDraft("skill"))).toBe(
      "Skill name is required.",
    );
  });
});
