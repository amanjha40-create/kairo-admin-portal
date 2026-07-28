import { describe, expect, it } from "vitest";
import { resolveAppEnvConfig } from "@/config/env";
import { getCase } from "./cases";
import { listCommunications } from "./communications";
import { listUsers } from "./users";
import { createOverviewDataAdapter } from "./overview";
import { getCaseByReference, listCases } from "./verifications";

describe("admin data adapters", () => {
  it("returns overview metrics through the demo adapter boundary", async () => {
    const config = resolveAppEnvConfig(
      {
        VITE_APP_ENV: "development",
        VITE_ADMIN_DEMO_MODE: "true",
      },
      { dev: true },
    );

    const overview = await createOverviewDataAdapter(config).loadDashboard();
    expect(overview.metrics.length).toBeGreaterThan(0);
  });

  it("returns verification collections and details", () => {
    const cases = listCases();
    expect(cases.length).toBeGreaterThan(0);
    expect(getCaseByReference(cases[0].reference)?.id).toBe(cases[0].id);
    expect(getCase(cases[0].id)?.summary.id).toBe(cases[0].id);
  });

  it("returns user and communication datasets", () => {
    expect(listUsers().length).toBeGreaterThan(0);
    expect(listCommunications().length).toBeGreaterThan(0);
  });
});
