import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("Admin Operations Hub client workflows", () => {
  it("keeps Clients distinct from the Trust Registry", () => {
    const createPerson = source("./create-person-dialog.tsx");
    const directory = source("../../../routes/admin.registry.index.tsx");
    const clients = source("../../../routes/admin.registry.organizations.index.tsx");

    expect(createPerson).toContain("companyDirectoryQueryOptions");
    expect(createPerson).not.toContain("registryListQueryOptions");
    expect(createPerson).toContain("Options come only from Clients");
    expect(directory).toContain("Organization Directory");
    expect(directory).toContain("not necessarily a KairoID Client");
    expect(clients).toContain("This list is distinct from the broader Organization Directory");
  });

  it("imports People before Candidate activation and links Permanent Address review", () => {
    const panels = source("./client-operations-panels.tsx");
    const company = source("../../../routes/admin.registry.organizations.$organizationId.tsx");

    expect(panels).toContain("CSV import never creates Candidate accounts");
    expect(panels).toContain("Invite as Candidate");
    expect(company).toContain("/admin/verifications/permanent-address/$candidateId");
    expect(company).toContain("Client People records");
  });

  it("uses only canonical Admin client-operation endpoints", () => {
    const adapter = source("../data/admin-client-operations.ts");

    expect(adapter).toContain("/api/v1/admin/organizations/${organizationId}/job-roles");
    expect(adapter).toContain("/api/v1/admin/organizations/${organizationId}/team-invitations");
    expect(adapter).toContain("/api/v1/admin/organizations/${organizationId}/people-imports");
    expect(adapter).toContain("candidate-activation");
    expect(adapter).not.toContain("localStorage.setItem");
  });
});
