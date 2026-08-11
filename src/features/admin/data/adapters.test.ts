import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAppEnvConfig } from "@/config/env";
import { getCase } from "./cases";
import { createOverviewDataAdapter } from "./overview";

describe("admin data adapters", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

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

  it("returns verification collections and details in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_DEMO_MODE", "true");
    const { getCaseByReference, listCases } = await import("./verifications");
    const cases = listCases();
    expect(cases.length).toBeGreaterThan(0);
    expect(getCaseByReference(cases[0].reference)?.id).toBe(cases[0].id);
    expect(getCase(cases[0].id)?.summary.id).toBe(cases[0].id);
  });

  it("keeps unfinished domain datasets unavailable in production mode", async () => {
    vi.stubEnv("VITE_ADMIN_DEMO_MODE", "false");
    const [{ listInvestigations }, { listServices }] = await Promise.all([
      import("@/features/admin/runtime/risk.production"),
      import("@/features/admin/runtime/system.production"),
    ]);

    expect(listInvestigations()).toEqual([]);
    expect(listServices()).toEqual([]);
  });

  it("restores unfinished domain datasets in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_DEMO_MODE", "true");
    const [{ listInvestigations }, { listServices }] = await Promise.all([
      import("@/features/admin/runtime/risk.demo"),
      import("@/features/admin/runtime/system.demo"),
    ]);

    expect(listInvestigations().length).toBeGreaterThan(0);
    expect(listServices().length).toBeGreaterThan(0);
  });
});
