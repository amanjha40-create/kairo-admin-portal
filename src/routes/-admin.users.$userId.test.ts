import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Candidate detail client boundary", () => {
  it("offers verification operations only for canonical client workspaces", () => {
    const source = readFileSync(new URL("./admin.users.$userId.tsx", import.meta.url), "utf8");

    expect(source).toContain("companyDetailQueryOptions");
    expect(source).toContain("isWorkspaceCustomer === true");
    expect(source).toContain("organizationsLoading={organizationQueries.some");
  });
});
