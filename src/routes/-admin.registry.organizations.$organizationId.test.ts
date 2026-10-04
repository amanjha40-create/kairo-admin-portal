import { beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

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

describe("Company 360 route", () => {
  it("is deep-linkable and does not depend on an SSR session loader", () => {
    return import("./admin.registry.organizations.$organizationId").then(({ Route }) => {
      const generatedTree = readFileSync(new URL("../routeTree.gen.ts", import.meta.url), "utf8");
      expect(generatedTree).toContain("fullPath: '/admin/registry/organizations/$organizationId'");
      expect((Route as { options?: { loader?: unknown } }).options?.loader).toBeUndefined();
    });
  });
});
