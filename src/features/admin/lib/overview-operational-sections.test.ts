import { describe, expect, it } from "vitest";
import { resolveAppEnvConfig } from "@/config/env";
import {
  getOverviewRecentDeployment,
  shouldShowOverviewDemoOperationalSections,
} from "./overview-operational-sections";

describe("admin overview helpers", () => {
  it("disables unfinished overview operational summaries in production", () => {
    const productionConfig = resolveAppEnvConfig(
      {
        VITE_APP_ENV: "production",
        VITE_ADMIN_DEMO_MODE: "false",
        VITE_API_BASE_URL: "https://api.kairoid.com",
      },
      { dev: false },
    );

    expect(shouldShowOverviewDemoOperationalSections(productionConfig)).toBe(false);
  });

  it("keeps unfinished overview operational summaries available in demo mode", () => {
    const demoConfig = resolveAppEnvConfig(
      {
        VITE_APP_ENV: "development",
        VITE_ADMIN_DEMO_MODE: "true",
      },
      { dev: true },
    );

    expect(shouldShowOverviewDemoOperationalSections(demoConfig)).toBe(true);
  });

  it("returns null when recent deployment data is unavailable", () => {
    expect(getOverviewRecentDeployment([])).toBeNull();
  });

  it("returns the first recent deployment when available", () => {
    expect(
      getOverviewRecentDeployment([
        {
          id: "dep-001",
          version: "2026.07.29-a1",
          environment: "production",
          deployedAt: "2026-07-29T10:00:00.000Z",
          deployedBy: "release-bot",
          summary: "Overview production hardening.",
        },
      ]),
    ).toMatchObject({
      id: "dep-001",
      version: "2026.07.29-a1",
    });
  });
});
