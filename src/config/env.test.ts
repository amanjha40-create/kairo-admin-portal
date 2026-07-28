import { describe, expect, it } from "vitest";
import { PRODUCTION_ADMIN_API_BASE_URL, resolveAppEnvConfig } from "./env";

describe("resolveAppEnvConfig", () => {
  it("defaults demo mode to true in development", () => {
    const config = resolveAppEnvConfig({}, { dev: true });

    expect(config.appEnv).toBe("development");
    expect(config.adminDemoMode).toBe(true);
    expect(config.issues).toEqual([]);
  });

  it("defaults demo mode to false in production", () => {
    const config = resolveAppEnvConfig({}, { dev: false });

    expect(config.appEnv).toBe("production");
    expect(config.adminDemoMode).toBe(false);
    expect(config.issues).toHaveLength(1);
  });

  it("fails closed when production enables demo mode or uses a non-canonical API URL", () => {
    const config = resolveAppEnvConfig(
      {
        VITE_APP_ENV: "production",
        VITE_ADMIN_DEMO_MODE: "true",
        VITE_API_BASE_URL: "http://localhost:8000",
      },
      { dev: false },
    );

    expect(config.adminDemoMode).toBe(false);
    expect(config.apiBaseUrl).toBeNull();
    expect(config.issues).toEqual(
      expect.arrayContaining([
        "VITE_ADMIN_DEMO_MODE must be false when VITE_APP_ENV is production.",
        "VITE_API_BASE_URL must use HTTPS when VITE_APP_ENV is production.",
        `VITE_API_BASE_URL must be ${PRODUCTION_ADMIN_API_BASE_URL} when VITE_APP_ENV is production.`,
      ]),
    );
  });

  it("accepts the canonical production API base URL", () => {
    const config = resolveAppEnvConfig(
      {
        VITE_APP_ENV: "production",
        VITE_ADMIN_DEMO_MODE: "false",
        VITE_API_BASE_URL: PRODUCTION_ADMIN_API_BASE_URL,
      },
      { dev: false },
    );

    expect(config.adminDemoMode).toBe(false);
    expect(config.apiBaseUrl).toBe(PRODUCTION_ADMIN_API_BASE_URL);
    expect(config.issues).toEqual([]);
  });
});
