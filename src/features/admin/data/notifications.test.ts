import { describe, expect, it, vi } from "vitest";
import { resolveAppEnvConfig } from "@/config/env";
import { AUTH_TOKEN_KEY, type SessionStorageBag } from "@/features/admin/auth/session-storage";
import { createAdminNotificationsAdapter } from "./notifications";

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
      expiresAt: "2026-08-11T13:00:00.000Z",
      signedInAt: "2026-08-11T10:00:00.000Z",
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

describe("admin notifications adapter", () => {
  it("loads the admin inbox and unread count from backend endpoints", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      if (url.pathname === "/api/v1/admin/notifications/inbox") {
        expect(url.searchParams.get("page")).toBe("2");
        expect(url.searchParams.get("page_size")).toBe("5");
        return jsonResponse({
          items: [
            {
              public_id: "11111111-1111-1111-1111-111111111111",
              category: "verification",
              event_type: "admin_verification_review_required",
              title: "Verification needs admin review",
              body: "A verification request is waiting for pre-dispatch admin review.",
              metadata: {
                verification_request_public_id: "22222222-2222-2222-2222-222222222222",
              },
              read_at: null,
              created_at: "2026-08-11T09:00:00.000Z",
              updated_at: "2026-08-11T09:05:00.000Z",
              status: "sent",
              channel: "in_app",
            },
          ],
          total: 1,
          page: 2,
          page_size: 5,
          total_pages: 1,
        });
      }
      if (url.pathname === "/api/v1/admin/notifications/unread-count") {
        return jsonResponse({ unread_count: 3 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createAdminNotificationsAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-11T12:00:00.000Z"),
      },
    });

    await expect(adapter.listInbox({ page: 2, pageSize: 5 })).resolves.toEqual({
      items: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          category: "verification",
          eventType: "admin_verification_review_required",
          title: "Verification needs admin review",
          body: "A verification request is waiting for pre-dispatch admin review.",
          metadata: {
            verification_request_public_id: "22222222-2222-2222-2222-222222222222",
          },
          readAt: null,
          createdAt: "2026-08-11T09:00:00.000Z",
          updatedAt: "2026-08-11T09:05:00.000Z",
          status: "sent",
          channel: "in_app",
        },
      ],
      total: 1,
      page: 2,
      pageSize: 5,
      totalPages: 1,
    });
    await expect(adapter.unreadCount()).resolves.toEqual({ unreadCount: 3 });
  });

  it("marks notifications read through backend endpoints", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input));
      if (
        url.pathname === "/api/v1/admin/notifications/11111111-1111-1111-1111-111111111111/read"
      ) {
        expect(init?.method).toBe("POST");
        return new Response(null, { status: 204 });
      }
      if (url.pathname === "/api/v1/admin/notifications/read-all") {
        expect(init?.method).toBe("POST");
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createAdminNotificationsAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-11T12:00:00.000Z"),
      },
    });

    await expect(adapter.markRead("11111111-1111-1111-1111-111111111111")).resolves.toBeUndefined();
    await expect(adapter.markAllRead()).resolves.toBeUndefined();
  });

  it("loads notification detail without any mock fallback", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/admin/notifications/11111111-1111-1111-1111-111111111111");
      return jsonResponse({
        public_id: "11111111-1111-1111-1111-111111111111",
        notification_type: "transactional",
        event_type: "admin_verification_quality_review_required",
        category: "verification",
        title: "Verification needs final quality review",
        body: "A verifier response is waiting for final admin quality review.",
        priority: "normal",
        status: "sent",
        recipient_email: "admin@example.com",
        channel: "in_app",
        template_key: "admin_in_app",
        template_version: "v1",
        payload: {},
        metadata: {
          verification_request_public_id: "22222222-2222-2222-2222-222222222222",
        },
        sent_at: "2026-08-11T10:00:00.000Z",
        failed_at: null,
        read_at: null,
        created_at: "2026-08-11T09:00:00.000Z",
        updated_at: "2026-08-11T09:05:00.000Z",
        deliveries: [],
        history: [],
      });
    });

    const adapter = createAdminNotificationsAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-11T12:00:00.000Z"),
      },
    });

    await expect(adapter.detail("11111111-1111-1111-1111-111111111111")).resolves.toMatchObject({
      id: "11111111-1111-1111-1111-111111111111",
      eventType: "admin_verification_quality_review_required",
      channel: "in_app",
      metadata: {
        verification_request_public_id: "22222222-2222-2222-2222-222222222222",
      },
    });
  });
});
