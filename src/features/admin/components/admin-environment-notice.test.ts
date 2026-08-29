import { afterEach, describe, expect, it, vi } from "vitest";

describe("admin environment notice", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("never loads demo credentials in production mode", async () => {
    vi.stubEnv("VITE_APP_ENV", "production");
    vi.stubEnv("VITE_ADMIN_DEMO_MODE", "false");
    vi.doMock("@/features/admin/runtime/demo-credentials", () => ({
      loadDemoCredentials: vi.fn(async () => []),
    }));
    vi.doMock("../auth/admin-auth", () => ({
      useAdminAuth: vi.fn(() => ({
        mode: "production",
        notice: null,
      })),
    }));
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { AdminEnvironmentNotice, shouldLoadDemoCredentials } =
      await import("./admin-environment-notice");

    expect(renderToStaticMarkup(createElement(AdminEnvironmentNotice))).toBe("");
    expect(shouldLoadDemoCredentials(true, "demo")).toBe(false);
    expect(shouldLoadDemoCredentials(true, "production")).toBe(false);
  });

  it("keeps demo credentials available in demo mode only", async () => {
    vi.stubEnv("VITE_APP_ENV", "development");
    vi.stubEnv("VITE_ADMIN_DEMO_MODE", "true");
    vi.doMock("@/features/admin/runtime/demo-credentials", () => ({
      loadDemoCredentials: vi.fn(async () => []),
    }));
    vi.doMock("../auth/admin-auth", () => ({
      useAdminAuth: vi.fn(() => ({
        mode: "demo",
        notice: null,
      })),
    }));
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { AdminEnvironmentNotice, shouldLoadDemoCredentials } =
      await import("./admin-environment-notice");

    expect(renderToStaticMarkup(createElement(AdminEnvironmentNotice))).toContain(
      "Demo mode on development",
    );
    expect(shouldLoadDemoCredentials(true, "demo")).toBe(true);
    expect(shouldLoadDemoCredentials(false, "demo")).toBe(false);
  });

  it("preserves the environment notice in staging", async () => {
    vi.stubEnv("VITE_APP_ENV", "staging");
    vi.stubEnv("VITE_ADMIN_DEMO_MODE", "false");
    vi.stubEnv("VITE_API_BASE_URL", "https://staging-api.kairoid.com");
    vi.doMock("@/features/admin/runtime/demo-credentials", () => ({
      loadDemoCredentials: vi.fn(async () => []),
    }));
    vi.doMock("../auth/admin-auth", () => ({
      useAdminAuth: vi.fn(() => ({
        mode: "production",
        notice: "Staging backend authentication is enabled.",
      })),
    }));
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { AdminEnvironmentNotice } = await import("./admin-environment-notice");

    expect(renderToStaticMarkup(createElement(AdminEnvironmentNotice))).toContain(
      "Production mode on staging",
    );
  });
});
