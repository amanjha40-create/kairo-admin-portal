import { describe, expect, it } from "vitest";
import { visibleAdminNavItems } from "./admin-navigation";

describe("visibleAdminNavItems", () => {
  it("keeps support navigation aligned with backend-derived permissions", () => {
    const labels = visibleAdminNavItems([
      "communications.view",
      "communications.view_failures",
      "system.view",
      "system.jobs.view",
      "system.messaging.view",
      "system.audit.view",
      "system.configuration.view",
    ]).map((item) => item.label);

    expect(labels).toEqual(["Overview", "Verifications", "Communications", "System"]);
  });

  it("shows privileged directories only when their canonical permissions exist", () => {
    const labels = visibleAdminNavItems([
      "users.view",
      "registry.manage",
      "communications.view",
      "risk.view",
      "system.view",
    ]).map((item) => item.label);

    expect(labels).toContain("Users");
    expect(labels).toContain("Clients");
    expect(labels).toContain("Organization Directory");
    expect(labels).toContain("Risk");
  });
});
