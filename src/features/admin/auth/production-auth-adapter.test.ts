import { describe, expect, it, vi } from "vitest";
import { resolveAppEnvConfig } from "@/config/env";
import { createAdminAuthAdapter } from "./create-admin-auth-adapter";
import { AUTH_TOKEN_KEY, type SessionStorageBag } from "./session-storage";
import { createProductionAuthAdapter } from "./production-auth-adapter";

function createMemoryStore() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

function createMemoryStorage(): SessionStorageBag {
  return {
    local: createMemoryStore(),
    session: createMemoryStore(),
  };
}

function createConfiguredEnv() {
  return resolveAppEnvConfig(
    {
      VITE_APP_ENV: "production",
      VITE_ADMIN_DEMO_MODE: "false",
      VITE_API_BASE_URL: "https://api.kairoid.com",
    },
    { dev: false },
  );
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(body == null ? null : JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

function getHeader(init: RequestInit | undefined, name: string) {
  return new Headers(init?.headers).get(name);
}

describe("production auth adapter", () => {
  it("refuses mock fallback when demo mode is disabled", async () => {
    const config = resolveAppEnvConfig(
      {
        VITE_APP_ENV: "production",
        VITE_ADMIN_DEMO_MODE: "false",
      },
      { dev: false },
    );

    const adapter = createAdminAuthAdapter(config);

    expect(adapter.mode).toBe("production");
    expect(adapter.isConfigured).toBe(false);
    await expect(adapter.login("demo@kairo.internal", "password", true)).resolves.toEqual({
      ok: false,
      error: "Admin authentication is not configured.",
    });
  });

  it("logs in through the backend and stores tokens for admin access", async () => {
    const storage = createMemoryStorage();
    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/v1/auth/login")) {
        expect(JSON.parse(String(init?.body))).toEqual({
          email: "admin@kairoid.com",
          password: "secret-pass",
        });
        return jsonResponse({
          access_token: "access-1",
          refresh_token: "refresh-1",
          token_type: "bearer",
          expires_in: 1800,
        });
      }

      if (url.endsWith("/api/v1/admin/session")) {
        expect(getHeader(init, "authorization")).toBe("Bearer access-1");
        return jsonResponse({
          account: {
            id: "user-1",
            email: "admin@kairoid.com",
            name: "Admin User",
            initials: "AU",
            role_key: "admin",
            permissions: [
              "access_admin_portal",
              "view_all_cases",
              "assign_reviewer",
              "change_verification_priority",
              "review_verification",
              "request_more_info",
              "manage_users",
              "view_audit_log",
            ],
            is_active: true,
          },
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createProductionAuthAdapter(createConfiguredEnv(), {
      storage,
      fetchImpl,
      now: () => new Date("2026-07-27T10:00:00.000Z"),
    });

    await expect(adapter.login("Admin@Kairoid.com", "secret-pass", true)).resolves.toEqual({
      ok: true,
      account: {
        id: "user-1",
        email: "admin@kairoid.com",
        name: "Admin User",
        initials: "AU",
        roleKey: "admin",
        role: "Admin",
        permissions: expect.arrayContaining([
          "users.view",
          "verification.assign",
          "verification.change_priority",
          "verification.verify",
          "verification.reject",
          "users.account.disable",
          "system.audit.view",
        ]),
      },
      signedInAt: "2026-07-27T10:00:00.000Z",
    });

    expect(storage.local.getItem(AUTH_TOKEN_KEY)).toContain('"refreshToken":"refresh-1"');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("restores a stored session and refreshes expired access tokens", async () => {
    const storage = createMemoryStorage();
    storage.session.setItem(
      AUTH_TOKEN_KEY,
      JSON.stringify({
        accessToken: "expired-access",
        refreshToken: "refresh-2",
        tokenType: "bearer",
        expiresAt: "2026-07-27T09:00:00.000Z",
        signedInAt: "2026-07-27T08:00:00.000Z",
        remember: false,
      }),
    );

    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/v1/auth/refresh")) {
        expect(JSON.parse(String(init?.body))).toEqual({ refresh_token: "refresh-2" });
        return jsonResponse({
          access_token: "fresh-access",
          refresh_token: "fresh-refresh",
          token_type: "bearer",
          expires_in: 3600,
        });
      }

      if (url.endsWith("/api/v1/admin/session")) {
        expect(getHeader(init, "authorization")).toBe("Bearer fresh-access");
        return jsonResponse({
          account: {
            id: "user-2",
            email: "hr@kairoid.com",
            name: "HR User",
            initials: "HU",
            role_key: "hr",
            permissions: [
              "access_admin_portal",
              "view_all_cases",
              "view_audit_log",
              "add_remark",
              "review_verification",
              "request_more_info",
            ],
            is_active: true,
          },
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createProductionAuthAdapter(createConfiguredEnv(), {
      storage,
      fetchImpl,
      now: () => new Date("2026-07-27T10:00:00.000Z"),
    });

    await expect(adapter.restoreSession()).resolves.toEqual({
      status: "authenticated",
      account: {
        id: "user-2",
        email: "hr@kairoid.com",
        name: "HR User",
        initials: "HU",
        roleKey: "operations_lead",
        role: "Hr",
        permissions: expect.arrayContaining([
          "users.view",
          "verification.verify",
          "verification.reject",
          "verification.request_correction",
          "verification.record_clarification",
          "system.audit.view",
        ]),
      },
      signedInAt: "2026-07-27T08:00:00.000Z",
    });

    expect(storage.session.getItem(AUTH_TOKEN_KEY)).toContain('"accessToken":"fresh-access"');
  });

  it("refreshes after a 401 session check and then restores access", async () => {
    const storage = createMemoryStorage();
    storage.local.setItem(
      AUTH_TOKEN_KEY,
      JSON.stringify({
        accessToken: "stale-access",
        refreshToken: "refresh-3",
        tokenType: "bearer",
        expiresAt: "2026-07-27T12:00:00.000Z",
        signedInAt: "2026-07-27T08:00:00.000Z",
        remember: true,
      }),
    );

    let sessionCalls = 0;
    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/v1/admin/session")) {
        sessionCalls += 1;
        if (sessionCalls === 1) {
          return jsonResponse({ detail: "Unauthorized" }, { status: 401 });
        }

        expect(getHeader(init, "authorization")).toBe("Bearer refreshed-access");
        return jsonResponse({
          account: {
            id: "user-3",
            email: "support@kairoid.com",
            name: "Support User",
            initials: "SU",
            role_key: "support",
            permissions: ["access_admin_portal", "view_all_cases", "view_audit_log"],
            is_active: true,
          },
        });
      }

      if (url.endsWith("/api/v1/auth/refresh")) {
        expect(JSON.parse(String(init?.body))).toEqual({ refresh_token: "refresh-3" });
        return jsonResponse({
          access_token: "refreshed-access",
          refresh_token: "refreshed-refresh",
          token_type: "bearer",
          expires_in: 1200,
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createProductionAuthAdapter(createConfiguredEnv(), {
      storage,
      fetchImpl,
      now: () => new Date("2026-07-27T10:30:00.000Z"),
    });

    await expect(adapter.restoreSession()).resolves.toMatchObject({
      status: "authenticated",
      account: {
        roleKey: "read_only",
        role: "Support",
      },
      signedInAt: "2026-07-27T08:00:00.000Z",
    });
  });

  it("treats authenticated users without access_admin_portal as forbidden", async () => {
    const storage = createMemoryStorage();
    storage.local.setItem(
      AUTH_TOKEN_KEY,
      JSON.stringify({
        accessToken: "access-4",
        refreshToken: "refresh-4",
        tokenType: "bearer",
        expiresAt: "2026-07-27T12:00:00.000Z",
        signedInAt: "2026-07-27T08:00:00.000Z",
        remember: true,
      }),
    );

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.endsWith("/api/v1/admin/session")) {
        return jsonResponse({ detail: "Forbidden" }, { status: 403 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createProductionAuthAdapter(createConfiguredEnv(), {
      storage,
      fetchImpl,
      now: () => new Date("2026-07-27T10:00:00.000Z"),
    });

    await expect(adapter.restoreSession()).resolves.toEqual({ status: "forbidden" });
    expect(storage.local.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it("surfaces /admin/session backend failures as a recoverable auth error", async () => {
    const storage = createMemoryStorage();
    storage.local.setItem(
      AUTH_TOKEN_KEY,
      JSON.stringify({
        accessToken: "access-4b",
        refreshToken: "refresh-4b",
        tokenType: "bearer",
        expiresAt: "2026-07-27T12:00:00.000Z",
        signedInAt: "2026-07-27T08:00:00.000Z",
        remember: true,
      }),
    );

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.endsWith("/api/v1/admin/session")) {
        return jsonResponse({ detail: "Service unavailable" }, { status: 503 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createProductionAuthAdapter(createConfiguredEnv(), {
      storage,
      fetchImpl,
      now: () => new Date("2026-07-27T10:00:00.000Z"),
    });

    await expect(adapter.restoreSession()).resolves.toEqual({
      status: "error",
      error: "The admin service is temporarily unavailable. Try again shortly.",
    });
    expect(storage.local.getItem(AUTH_TOKEN_KEY)).not.toBeNull();
  });

  it("surfaces /admin/session network failures as a recoverable auth error", async () => {
    const storage = createMemoryStorage();
    storage.local.setItem(
      AUTH_TOKEN_KEY,
      JSON.stringify({
        accessToken: "access-4c",
        refreshToken: "refresh-4c",
        tokenType: "bearer",
        expiresAt: "2026-07-27T12:00:00.000Z",
        signedInAt: "2026-07-27T08:00:00.000Z",
        remember: true,
      }),
    );

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.endsWith("/api/v1/admin/session")) {
        throw new TypeError("fetch failed");
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createProductionAuthAdapter(createConfiguredEnv(), {
      storage,
      fetchImpl,
      now: () => new Date("2026-07-27T10:00:00.000Z"),
    });

    await expect(adapter.restoreSession()).resolves.toEqual({
      status: "error",
      error: "The admin service could not be reached. Check your connection and try again.",
    });
    expect(storage.local.getItem(AUTH_TOKEN_KEY)).not.toBeNull();
  });

  it("logs out by revoking the refresh token and clearing storage", async () => {
    const storage = createMemoryStorage();
    storage.local.setItem(
      AUTH_TOKEN_KEY,
      JSON.stringify({
        accessToken: "access-5",
        refreshToken: "refresh-5",
        tokenType: "bearer",
        expiresAt: "2026-07-27T12:00:00.000Z",
        signedInAt: "2026-07-27T08:00:00.000Z",
        remember: true,
      }),
    );

    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/v1/auth/logout")) {
        expect(JSON.parse(String(init?.body))).toEqual({ refresh_token: "refresh-5" });
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createProductionAuthAdapter(createConfiguredEnv(), {
      storage,
      fetchImpl,
      now: () => new Date("2026-07-27T10:00:00.000Z"),
    });

    await adapter.logout();

    expect(storage.local.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("submits forgot-password through the backend contract", async () => {
    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/v1/auth/forgot-password")) {
        expect(JSON.parse(String(init?.body))).toEqual({ email: "admin@kairoid.com" });
        return jsonResponse({
          message:
            "If an authorised Admin account exists for this email, password reset instructions will be sent.",
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createProductionAuthAdapter(createConfiguredEnv(), {
      storage: createMemoryStorage(),
      fetchImpl,
      now: () => new Date("2026-07-27T10:00:00.000Z"),
    });

    await expect(adapter.forgotPassword("Admin@Kairoid.com")).resolves.toEqual({
      ok: true,
      message:
        "If an authorised Admin account exists for this email, password reset instructions will be sent.",
    });
  });

  it("accepts an Admin invitation and establishes the backend session", async () => {
    const storage = createMemoryStorage();
    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/v1/auth/admin-invitations/accept")) {
        expect(JSON.parse(String(init?.body))).toEqual({
          token: "single-use-admin-invitation-token-1234567890",
          full_name: "Invited Admin",
          password: "StrongPassword123!",
        });
        return jsonResponse({
          access_token: "invitation-access",
          refresh_token: "invitation-refresh",
          token_type: "bearer",
          expires_in: 1800,
        });
      }

      if (url.endsWith("/api/v1/admin/session")) {
        expect(getHeader(init, "authorization")).toBe("Bearer invitation-access");
        return jsonResponse({
          account: {
            id: "invited-user",
            email: "invited-admin@example.com",
            name: "Invited Admin",
            initials: "IA",
            role_key: "support",
            permissions: ["access_admin_portal", "view_all_cases", "view_audit_log"],
            is_active: true,
          },
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });
    const adapter = createProductionAuthAdapter(createConfiguredEnv(), {
      storage,
      fetchImpl,
      now: () => new Date("2026-08-23T12:00:00.000Z"),
    });

    await expect(
      adapter.acceptInvitation({
        token: "single-use-admin-invitation-token-1234567890",
        fullName: "Invited Admin",
        password: "StrongPassword123!",
      }),
    ).resolves.toMatchObject({
      ok: true,
      account: { id: "invited-user", role: "Support" },
      signedInAt: "2026-08-23T12:00:00.000Z",
    });
    expect(storage.session.getItem(AUTH_TOKEN_KEY)).toContain(
      '"refreshToken":"invitation-refresh"',
    );
    expect(storage.local.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it.each([
    [404, { detail: "Admin invitation not found" }, "This Admin invitation link is invalid."],
    [
      409,
      { detail: "Admin invitation is no longer actionable" },
      "This Admin invitation has expired, been revoked, or already been used.",
    ],
    [
      409,
      { detail: "Full name and password are required to accept this invitation" },
      "Full name and password are required to accept this invitation",
    ],
  ])(
    "maps invitation failure status %s without exposing its token",
    async (status, body, error) => {
      const fetchImpl = vi.fn(async () => jsonResponse(body, { status }));
      const adapter = createProductionAuthAdapter(createConfiguredEnv(), {
        storage: createMemoryStorage(),
        fetchImpl,
      });

      await expect(
        adapter.acceptInvitation({ token: "single-use-admin-invitation-token-1234567890" }),
      ).resolves.toEqual({ ok: false, error });
      expect(error).not.toContain("single-use-admin-invitation-token");
    },
  );

  it("never calls mock auth when production mode is enabled", async () => {
    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.endsWith("/api/v1/auth/login")) {
        return jsonResponse({ detail: "Unauthorized" }, { status: 401 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createAdminAuthAdapter(createConfiguredEnv(), {
      production: {
        storage: createMemoryStorage(),
        fetchImpl,
        now: () => new Date("2026-07-27T10:00:00.000Z"),
      },
    });

    expect(adapter.mode).toBe("production");
    await expect(adapter.login("aman.jha@kairo.internal", "kairo-ops-2026", true)).resolves.toEqual(
      {
        ok: false,
        error: "Invalid email or password. Check your credentials and try again.",
      },
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        href: "https://api.kairoid.com/api/v1/auth/login",
      }),
      expect.any(Object),
    );
  });
});
