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
    const [{ listUsers }, { listCommunications }, { listInvestigations }, { listServices }] =
      await Promise.all([
        import("./users"),
        import("./communications"),
        import("./risk"),
        import("./system"),
      ]);

    expect(listUsers()).toEqual([]);
    expect(listCommunications()).toEqual([]);
    expect(listInvestigations()).toEqual([]);
    expect(listServices()).toEqual([]);
  });

  it("restores unfinished domain datasets in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_DEMO_MODE", "true");
    const [{ listUsers }, { listCommunications }, { listInvestigations }, { listServices }] =
      await Promise.all([
        import("./users"),
        import("./communications"),
        import("./risk"),
        import("./system"),
      ]);

    expect(listUsers().length).toBeGreaterThan(0);
    expect(listCommunications().length).toBeGreaterThan(0);
    expect(listInvestigations().length).toBeGreaterThan(0);
    expect(listServices().length).toBeGreaterThan(0);
  });
});
