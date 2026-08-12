import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  vi.mock("virtual:kairo-admin-auth-runtime", () => ({
    createAdminAuthAdapter: () => ({
      mode: "production",
      isConfigured: true,
      notice: null,
      restoreSession: async () => ({ status: "unauthenticated" }),
      login: async () => ({ ok: false, error: "not implemented" }),
      logout: async () => {},
      forgotPassword: async () => ({ ok: true }),
    }),
  }));
});

describe("admin registry detail route", () => {
  it("does not define an SSR loader for protected registry detail data", () => {
    return import("./admin.registry.$organizationId").then(({ Route }) => {
      expect((Route as { options?: { loader?: unknown } }).options?.loader).toBeUndefined();
    });
  });
});
