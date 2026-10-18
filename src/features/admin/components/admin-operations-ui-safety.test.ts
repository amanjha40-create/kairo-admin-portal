import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(name: string) {
  return readFileSync(new URL(name, import.meta.url), "utf8");
}

describe("Admin Operations V1.1 UI safety", () => {
  it("keeps Candidate and first-HR provisioning passwordless", () => {
    const createPerson = source("./create-person-dialog.tsx");
    const createOrganization = source("./create-organization-dialog.tsx");

    expect(createPerson).not.toMatch(/type=["']password["']/);
    expect(createOrganization).not.toMatch(/type=["']password["']/);
    expect(createPerson).toContain("Create manually");
    expect(createPerson).toContain("Import CV");
    expect(createOrganization).toContain("Invite first HR owner");
  });

  it("offers only certified in-person observations and no universal verify action", () => {
    const operations = source("./person-verification-operations-dialog.tsx");

    expect(operations).toContain('value="identity_observation"');
    expect(operations).toContain('value="document_observation"');
    expect(operations).not.toContain("Mark person verified");
    expect(operations).toContain("Permanent Address check credit: 0");
    expect(operations).toContain("not police verification, criminal clearance");
  });

  it("does not couple generalized observations to Permanent Address APIs", () => {
    const operations = source("./person-verification-operations-dialog.tsx");

    expect(operations).not.toContain("/permanent-address/");
    expect(operations).not.toContain("permanentAddress");
    expect(operations).not.toContain("check1");
    expect(operations).not.toContain("check2");
    expect(operations).not.toContain("check3");
  });
});
