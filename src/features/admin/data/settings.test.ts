import { describe, expect, it, vi } from "vitest";
import { resolveAppEnvConfig } from "@/config/env";
import { AUTH_TOKEN_KEY, type SessionStorageBag } from "@/features/admin/auth/session-storage";
import { createAdminSettingsAdapter } from "./settings";

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

function createProductionConfig() {
  return resolveAppEnvConfig(
    {
      VITE_APP_ENV: "production",
      VITE_ADMIN_DEMO_MODE: "false",
      VITE_API_BASE_URL: "https://api.kairoid.com",
    },
    { dev: false },
  );
}

function seedTokens(storage: SessionStorageBag) {
  storage.local.setItem(
    AUTH_TOKEN_KEY,
    JSON.stringify({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      tokenType: "bearer",
      expiresAt: "2026-08-23T13:00:00.000Z",
      signedInAt: "2026-08-23T10:00:00.000Z",
      remember: true,
    }),
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

describe("admin settings adapter", () => {
  it("loads backend-owned self profile and maps snake_case fields", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/admin/settings/me");
      return jsonResponse({
        id: "11111111-1111-1111-1111-111111111111",
        full_name: "Ada Admin",
        email: "admin@kairoid.com",
        role_key: "admin",
        role_label: "Admin",
        account_status: "active",
        permissions: ["admin_settings_read", "admin_access_read"],
        email_verified: true,
        joined_at: "2026-08-23T08:00:00.000Z",
        last_sign_in_at: "2026-08-23T09:00:00.000Z",
        last_activity_at: "2026-08-23T09:30:00.000Z",
      });
    });

    const adapter = createAdminSettingsAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-23T12:00:00.000Z"),
      },
    });

    await expect(adapter.getMe()).resolves.toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      fullName: "Ada Admin",
      email: "admin@kairoid.com",
      roleKey: "admin",
      roleLabel: "Admin",
      accountStatus: "active",
      permissions: ["admin_settings_read", "admin_access_read"],
      emailVerified: true,
      joinedAt: "2026-08-23T08:00:00.000Z",
      lastSignInAt: "2026-08-23T09:00:00.000Z",
      lastActivityAt: "2026-08-23T09:30:00.000Z",
    });
  });

  it("sends confirm_password through the shared change-password contract", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/auth/change-password");
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toEqual({
        current_password: "CurrentPassword123!",
        new_password: "NewPassword123!",
        confirm_password: "NewPassword123!",
      });
      return jsonResponse({ message: "Password changed successfully." });
    });

    const adapter = createAdminSettingsAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-23T12:00:00.000Z"),
      },
    });

    await expect(adapter.changePassword("CurrentPassword123!", "NewPassword123!")).resolves.toBe(
      "Password changed successfully.",
    );
  });

  it("supports combined administrator filters and pagination from backend APIs", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/admin/administrators");
      expect(url.searchParams.get("search")).toBe("ada");
      expect(url.searchParams.get("role")).toBe("admin");
      expect(url.searchParams.get("status")).toBe("active");
      expect(url.searchParams.get("page")).toBe("2");
      expect(url.searchParams.get("page_size")).toBe("5");
      return jsonResponse({
        items: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            full_name: "Ada Admin",
            email: "ada@kairoid.com",
            role_key: "admin",
            role_label: "Admin",
            account_status: "active",
            email_verified: true,
            joined_at: "2026-08-23T08:00:00.000Z",
            last_sign_in_at: "2026-08-23T09:00:00.000Z",
            last_activity_at: "2026-08-23T09:30:00.000Z",
          },
        ],
        total: 1,
        page: 2,
        page_size: 5,
        total_pages: 1,
      });
    });

    const adapter = createAdminSettingsAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-23T12:00:00.000Z"),
      },
    });

    await expect(
      adapter.listAdministrators({
        query: "ada",
        role: "admin",
        status: "active",
        page: 2,
        pageSize: 5,
      }),
    ).resolves.toEqual({
      items: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          fullName: "Ada Admin",
          email: "ada@kairoid.com",
          roleKey: "admin",
          roleLabel: "Admin",
          accountStatus: "active",
          emailVerified: true,
          joinedAt: "2026-08-23T08:00:00.000Z",
          lastSignInAt: "2026-08-23T09:00:00.000Z",
          lastActivityAt: "2026-08-23T09:30:00.000Z",
        },
      ],
      total: 1,
      page: 2,
      pageSize: 5,
      totalPages: 1,
    });
  });

  it("updates real notification preferences without any demo fallback", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/admin/settings/notifications");
      expect(init?.method).toBe("PATCH");
      expect(JSON.parse(String(init?.body))).toEqual({
        categories: [{ key: "verification_operations", enabled: false }],
      });
      return jsonResponse({
        categories: [
          {
            key: "verification_operations",
            label: "Verification operations",
            description: "Queue notices",
            enabled: false,
            required: false,
            event_types: ["verification_queue"],
          },
        ],
      });
    });

    const adapter = createAdminSettingsAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-23T12:00:00.000Z"),
      },
    });

    await expect(
      adapter.updateNotifications([{ key: "verification_operations", enabled: false }]),
    ).resolves.toEqual([
      {
        key: "verification_operations",
        label: "Verification operations",
        description: "Queue notices",
        enabled: false,
        required: false,
        eventTypes: ["verification_queue"],
      },
    ]);
  });

  it("creates and mutates invitations without exposing any raw token fields", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === "/api/v1/admin/administrator-invitations") {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          id: "33333333-3333-3333-3333-333333333333",
          email: "invitee@kairoid.com",
          role_key: "support",
          role_label: "Support",
          status: "pending",
          invited_by_display_name: "Ada Admin",
          accepted_by_display_name: null,
          created_at: "2026-08-23T10:00:00.000Z",
          expires_at: "2026-08-30T10:00:00.000Z",
          sent_at: "2026-08-23T10:00:00.000Z",
          accepted_at: null,
          revoked_at: null,
          resend_count: 0,
        });
      }
      if (url.pathname.endsWith("/revoke") || url.pathname.endsWith("/resend")) {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          id: "33333333-3333-3333-3333-333333333333",
          email: "invitee@kairoid.com",
          role_key: "support",
          role_label: "Support",
          status: url.pathname.endsWith("/revoke") ? "revoked" : "pending",
          invited_by_display_name: "Ada Admin",
          accepted_by_display_name: null,
          created_at: "2026-08-23T10:00:00.000Z",
          expires_at: "2026-08-30T10:00:00.000Z",
          sent_at: "2026-08-23T10:00:00.000Z",
          accepted_at: null,
          revoked_at: null,
          resend_count: 1,
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createAdminSettingsAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-23T12:00:00.000Z"),
      },
    });

    const created = await adapter.createInvitation("invitee@kairoid.com", "support");
    expect(created).toMatchObject({
      id: "33333333-3333-3333-3333-333333333333",
      email: "invitee@kairoid.com",
      status: "pending",
    });
    expect(created).not.toHaveProperty("token");

    await expect(adapter.revokeInvitation(created.id)).resolves.toMatchObject({
      status: "revoked",
      resendCount: 1,
    });
    await expect(adapter.resendInvitation(created.id)).resolves.toMatchObject({
      status: "pending",
      resendCount: 1,
    });
  });
});
