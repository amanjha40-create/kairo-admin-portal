import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("Admin Operations Hub client workflows", () => {
  it("keeps Clients distinct from Organization Directory company records", () => {
    const createPerson = source("./create-person-dialog.tsx");
    const connectRecord = source("./connect-company-record-dialog.tsx");
    const directory = source("../../../routes/admin.registry.index.tsx");
    const clients = source("../../../routes/admin.registry.organizations.index.tsx");

    expect(createPerson).toContain("companyDirectoryQueryOptions");
    expect(createPerson).not.toContain("registryListQueryOptions");
    expect(createPerson).toContain('status: "active"');
    expect(createPerson).toContain("Options include only active Clients with workspace access");
    expect(createPerson).toContain("setup-incomplete Clients are intentionally not selectable");
    expect(directory).toContain("Organization Directory");
    expect(directory).toContain("Real-world company and institution records");
    expect(clients).toContain("Clients hold customer operations");
    expect(clients).toContain("Connections are explicit");
    expect(connectRecord).toContain("Create company record");
    expect(connectRecord).toContain("not merge workspaces or change People");
    expect(connectRecord).toContain("Draft company record created and connected");
  });

  it("imports People before Candidate activation and links Permanent Address review", () => {
    const panels = source("./client-operations-panels.tsx");
    const company = source("../../../routes/admin.registry.organizations.$organizationId.tsx");

    expect(panels).toContain("CSV import never creates Candidate accounts");
    expect(panels).toContain("Invite as Candidate");
    expect(panels).toContain("Employment assignment");
    expect(panels).toContain("does not overwrite their global Candidate profile");
    expect(panels).toContain("Client job role updated");
    expect(company).toContain("/admin/verifications/permanent-address/$candidateId");
    expect(company).toContain("Client People records");
  });

  it("uses only canonical Admin client-operation endpoints", () => {
    const adapter = source("../data/admin-client-operations.ts");

    expect(adapter).toContain("/api/v1/admin/organizations/${organizationId}/job-roles");
    expect(adapter).toContain("/api/v1/admin/organizations/${organizationId}/team-invitations");
    expect(adapter).toContain("/api/v1/admin/organizations/${organizationId}/people-imports");
    expect(adapter).toContain("candidate-activation");
    expect(adapter).toContain("employment-profile");
    expect(adapter).toContain('method: "PATCH"');
    expect(adapter).not.toContain("localStorage.setItem");
  });
});
