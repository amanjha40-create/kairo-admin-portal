import { afterEach, describe, expect, it, vi } from "vitest";

describe("admin environment notice", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("never loads demo credentials in production mode", async () => {
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
    const { shouldLoadDemoCredentials } = await import("./admin-environment-notice");

    expect(shouldLoadDemoCredentials(true, "demo")).toBe(false);
    expect(shouldLoadDemoCredentials(true, "production")).toBe(false);
  });

  it("keeps demo credentials available in demo mode only", async () => {
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
    const { shouldLoadDemoCredentials } = await import("./admin-environment-notice");

    expect(shouldLoadDemoCredentials(true, "demo")).toBe(true);
    expect(shouldLoadDemoCredentials(false, "demo")).toBe(false);
  });
});
