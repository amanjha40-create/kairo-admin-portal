import { describe, expect, it, vi } from "vitest";
import { resolveAppEnvConfig } from "@/config/env";
import { AUTH_TOKEN_KEY, type SessionStorageBag } from "@/features/admin/auth/session-storage";
import { createAdminCommunicationsAdapter } from "./communications.production";

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

describe("admin communications adapter", () => {
  it("loads backend communications with filters and masked delivery data", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/admin/communications");
      expect(url.searchParams.get("search")).toBe("reset");
      expect(url.searchParams.get("status")).toBe("failed");
      expect(url.searchParams.get("template_key")).toBe("password_reset");
      expect(url.searchParams.get("page_size")).toBe("20");
      return jsonResponse({
        items: [
          {
            public_id: "11111111-1111-1111-1111-111111111111",
            channel: "email",
            event_type: "password_reset_requested",
            template_key: "password_reset",
            template_version: "v1",
            status: "failed",
            recipient_masked: "am***n@example.com",
            provider: "brevo",
            provider_message_id: "brevo-message-123456",
            provider_message_id_display: "brevo-me...123456",
            subject: "Reset your password",
            failure_reason: "provider_timeout",
            queued_at: "2026-08-11T08:00:00.000Z",
            sent_at: null,
            failed_at: "2026-08-11T08:01:00.000Z",
            created_at: "2026-08-11T08:00:00.000Z",
            updated_at: "2026-08-11T08:01:00.000Z",
            retryable: false,
            retry_policy: "requires_new_workflow_action",
            related_object: {
              kind: "verification_request",
              public_id: "22222222-2222-2222-2222-222222222222",
              label: "Verification request",
            },
            notification: {
              public_id: "33333333-3333-3333-3333-333333333333",
              event_type: "password_reset_requested",
              category: "security",
              title: "Password reset requested",
              status: "failed",
              read_at: null,
              created_at: "2026-08-11T08:00:00.000Z",
            },
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
        total_pages: 1,
      });
    });

    const adapter = createAdminCommunicationsAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-11T12:00:00.000Z"),
      },
    });

    await expect(
      adapter.list({
        query: "reset",
        status: "failed",
        templateKey: "password_reset",
      }),
    ).resolves.toMatchObject({
      total: 1,
      items: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          recipientMasked: "am***n@example.com",
          provider: "brevo",
          retryable: false,
          relatedObject: {
            kind: "verification_request",
            publicId: "22222222-2222-2222-2222-222222222222",
          },
        },
      ],
    });
  });

  it("maps empty backend communications without falling back to mock rows", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        items: [],
        total: 0,
        page: 1,
        page_size: 20,
        total_pages: 0,
      }),
    );

    const adapter = createAdminCommunicationsAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-11T12:00:00.000Z"),
      },
    });

    await expect(adapter.list()).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });
  });

  it("loads backend communication detail with safe payload summary", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe(
        "/api/v1/admin/communications/11111111-1111-1111-1111-111111111111",
      );
      return jsonResponse({
        public_id: "11111111-1111-1111-1111-111111111111",
        channel: "email",
        event_type: "employer_verification",
        template_key: "employer_verification",
        template_version: "v1",
        status: "sent",
        recipient_masked: "hr***r@example.com",
        provider: "brevo",
        provider_message_id: "brevo-message-abcdef",
        provider_message_id_display: "brevo-me...abcdef",
        subject: "Verify candidate employment",
        failure_reason: null,
        queued_at: "2026-08-11T08:00:00.000Z",
        sent_at: "2026-08-11T08:01:00.000Z",
        failed_at: null,
        created_at: "2026-08-11T08:00:00.000Z",
        updated_at: "2026-08-11T08:01:00.000Z",
        retryable: false,
        retry_policy: "requires_new_workflow_action",
        related_object: {
          kind: "verification_request",
          public_id: "22222222-2222-2222-2222-222222222222",
          label: "Verification request",
        },
        notification: null,
        payload_summary: {
          verification_request_public_id: "22222222-2222-2222-2222-222222222222",
          subject_name: "Aman Jha",
          employer_name: "Kairo",
        },
        delivery_timeline: [
          {
            kind: "queued",
            occurred_at: "2026-08-11T08:00:00.000Z",
            detail: "Communication queued for provider dispatch.",
            status: "queued",
          },
        ],
      });
    });

    const adapter = createAdminCommunicationsAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-11T12:00:00.000Z"),
      },
    });

    await expect(adapter.detail("11111111-1111-1111-1111-111111111111")).resolves.toMatchObject({
      id: "11111111-1111-1111-1111-111111111111",
      payloadSummary: {
        verification_request_public_id: "22222222-2222-2222-2222-222222222222",
        subject_name: "Aman Jha",
      },
      deliveryTimeline: [{ kind: "queued", status: "queued" }],
    });
  });
});
