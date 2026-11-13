import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Candidate detail client boundary", () => {
  it("offers verification operations only for canonical client workspaces", () => {
    const source = readFileSync(new URL("./admin.users.$userId.tsx", import.meta.url), "utf8");

    expect(source).toContain("companyDetailQueryOptions");
    expect(source).toContain("isWorkspaceCustomer === true");
    expect(source).toContain("organizationsLoading={organizationQueries.some");
  });

  it("labels incomplete account truth explicitly instead of showing positive copy", () => {
    const source = readFileSync(new URL("./admin.users.$userId.tsx", import.meta.url), "utf8");

    expect(source).toContain('falseLabel="Email not verified"');
    expect(source).toContain('falseLabel="Phone not verified"');
    expect(source).toContain('falseLabel="Onboarding incomplete"');
    expect(source).toContain("{ok ? trueLabel : falseLabel}");
  });

  it("keeps authentication identity read-only while exposing safe Candidate details", () => {
    const source = readFileSync(new URL("./admin.users.$userId.tsx", import.meta.url), "utf8");

    expect(source).toContain(
      "Email and phone are security-sensitive identities and remain read-only",
    );
    expect(source).toContain("Save User Details");
    expect(source).toContain("yearsOfExperience");
    expect(source).toContain("locationCountry");
    expect(source).toContain("uploadVerificationEvidence");
    expect(source).toContain("Admin-supplied evidence is recorded with Admin attribution");
    expect(source).toContain("verified, shared with a verifier");
  });
});
