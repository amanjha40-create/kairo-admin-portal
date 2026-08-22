import { describe, expect, it, vi } from "vitest";
import { resolveAppEnvConfig } from "@/config/env";
import { AUTH_TOKEN_KEY, type SessionStorageBag } from "@/features/admin/auth/session-storage";
import { createAdminSystemAdapter } from "./system.production";

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
      expiresAt: "2026-08-22T13:00:00.000Z",
      signedInAt: "2026-08-22T10:00:00.000Z",
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

describe("admin system production adapter", () => {
  it("loads backend status, runtime, workloads, and failures without mock fallback", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      if (url.pathname === "/api/v1/admin/system/status") {
        return jsonResponse({
          overall_status: "degraded",
          checked_at: "2026-08-22T10:00:00.000Z",
          dependencies: [
            {
              key: "postgresql",
              name: "PostgreSQL",
              status: "healthy",
              checked_at: "2026-08-22T10:00:00.000Z",
              critical: true,
              latency_ms: 12,
              reason: null,
            },
          ],
        });
      }
      if (url.pathname === "/api/v1/admin/system/runtime") {
        return jsonResponse({
          environment: "staging",
          application_name: "kairo-backend",
          application_version: "1.0.0",
          api_version_prefix: "/api/v1",
          runtime_started_at: "2026-08-22T08:00:00.000Z",
          checked_at: "2026-08-22T10:00:00.000Z",
          python_version: "3.14.0",
          job_backend: "sqs",
          resume_processing_enabled: true,
          email_backend: "brevo",
          email_send_enabled: true,
          phone_otp_backend: "staging_fixed",
          release: {
            git_sha: "abc123",
            build_id: "build-1",
            deployed_at: "2026-08-22T09:00:00.000Z",
          },
          migration: {
            current_revision: "069",
            expected_revision: "069",
            matches_expected: true,
            multiple_heads: false,
          },
        });
      }
      if (url.pathname === "/api/v1/admin/system/workloads") {
        return jsonResponse({
          generated_at: "2026-08-22T10:00:00.000Z",
          workloads: [
            {
              key: "email_delivery",
              name: "Email delivery",
              status: "healthy",
              pending: 1,
              processing: 0,
              succeeded_recent: 12,
              failed: 0,
              retryable: 0,
              oldest_pending_at: null,
              latest_success_at: "2026-08-22T09:55:00.000Z",
              latest_failure_at: null,
              note: "Persisted delivery attempts only.",
            },
          ],
        });
      }
      if (url.pathname === "/api/v1/admin/system/failures") {
        return jsonResponse({
          generated_at: "2026-08-22T10:00:00.000Z",
          items: [
            {
              kind: "communication",
              public_id: "11111111-1111-1111-1111-111111111111",
              category: "delivery",
              subject_reference: "password_reset",
              title: "Email delivery failed",
              status: "failed",
              first_failure_at: "2026-08-22T09:00:00.000Z",
              latest_failure_at: "2026-08-22T09:10:00.000Z",
              retry_count: 1,
              safe_error: "provider_timeout",
              retry_supported: true,
              retry_reference: "11111111-1111-1111-1111-111111111111",
            },
          ],
        });
      }
      throw new Error(`Unexpected path ${url.pathname}`);
    });

    const adapter = createAdminSystemAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-22T12:00:00.000Z"),
      },
    });

    await expect(adapter.status()).resolves.toMatchObject({
      overallStatus: "degraded",
      dependencies: [{ key: "postgresql", latencyMs: 12 }],
    });
    await expect(adapter.runtime()).resolves.toMatchObject({
      applicationName: "kairo-backend",
      migration: { matchesExpected: true },
      release: { gitSha: "abc123" },
    });
    await expect(adapter.workloads()).resolves.toEqual([
      expect.objectContaining({
        key: "email_delivery",
        succeededRecent: 12,
      }),
    ]);
    await expect(adapter.failures()).resolves.toEqual([
      expect.objectContaining({
        publicId: "11111111-1111-1111-1111-111111111111",
        retrySupported: true,
      }),
    ]);
  });

  it("maps incident list, detail, activity, and retry mutations", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === "/api/v1/admin/system/activity") {
        expect(url.searchParams.get("page_size")).toBe("10");
        return jsonResponse({
          items: [
            {
              kind: "incident",
              public_id: "44444444-4444-4444-4444-444444444444",
              occurred_at: "2026-08-22T10:00:00.000Z",
              title: "incident_created",
              detail: "Opened manually.",
              status: null,
              actor_user_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
              subject_type: "system_incident",
              subject_public_id: "22222222-2222-2222-2222-222222222222",
            },
          ],
          total: 1,
          page: 1,
          page_size: 10,
          total_pages: 1,
        });
      }
      if (url.pathname === "/api/v1/admin/system/incidents" && init?.method == null) {
        expect(url.searchParams.get("status")).toBe("open");
        expect(url.searchParams.get("severity")).toBe("high");
        return jsonResponse({
          items: [
            {
              public_id: "22222222-2222-2222-2222-222222222222",
              title: "Email provider degraded",
              summary: "Repeated failures exceeded threshold.",
              category: "delivery",
              severity: "high",
              status: "open",
              source: "manual",
              opened_at: "2026-08-22T09:00:00.000Z",
              resolved_at: null,
              created_by_user_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
              resolved_by_user_id: null,
              reference_type: "communication",
              reference_public_id: "11111111-1111-1111-1111-111111111111",
              updated_at: "2026-08-22T09:10:00.000Z",
            },
          ],
          total: 1,
          page: 1,
          page_size: 10,
          total_pages: 1,
        });
      }
      if (url.pathname === "/api/v1/admin/system/incidents/22222222-2222-2222-2222-222222222222") {
        if (init?.method === "PATCH") {
          return jsonResponse({
            public_id: "22222222-2222-2222-2222-222222222222",
            title: "Email provider degraded",
            summary: "Repeated failures exceeded threshold.",
            category: "delivery",
            severity: "critical",
            status: "monitoring",
            source: "manual",
            opened_at: "2026-08-22T09:00:00.000Z",
            resolved_at: null,
            created_by_user_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            resolved_by_user_id: null,
            reference_type: "communication",
            reference_public_id: "11111111-1111-1111-1111-111111111111",
            updated_at: "2026-08-22T09:20:00.000Z",
            history: [],
          });
        }
        return jsonResponse({
          public_id: "22222222-2222-2222-2222-222222222222",
          title: "Email provider degraded",
          summary: "Repeated failures exceeded threshold.",
          category: "delivery",
          severity: "high",
          status: "open",
          source: "manual",
          opened_at: "2026-08-22T09:00:00.000Z",
          resolved_at: null,
          created_by_user_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          resolved_by_user_id: null,
          reference_type: "communication",
          reference_public_id: "11111111-1111-1111-1111-111111111111",
          updated_at: "2026-08-22T09:10:00.000Z",
          history: [
            {
              public_id: "33333333-3333-3333-3333-333333333333",
              actor_user_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
              event_type: "incident_created",
              detail: "Opened manually.",
              metadata: {},
              created_at: "2026-08-22T09:00:00.000Z",
            },
          ],
        });
      }
      if (url.pathname === "/api/v1/admin/system/incidents" && init?.method === "POST") {
        return jsonResponse(
          {
            public_id: "22222222-2222-2222-2222-222222222222",
            title: "Email provider degraded",
            summary: "Repeated failures exceeded threshold.",
            category: "delivery",
            severity: "high",
            status: "open",
            source: "manual",
            opened_at: "2026-08-22T09:00:00.000Z",
            resolved_at: null,
            created_by_user_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            resolved_by_user_id: null,
            reference_type: null,
            reference_public_id: null,
            updated_at: "2026-08-22T09:00:00.000Z",
            history: [],
          },
          { status: 201 },
        );
      }
      if (
        url.pathname ===
        "/api/v1/admin/system/incidents/22222222-2222-2222-2222-222222222222/resolve"
      ) {
        return jsonResponse({
          public_id: "22222222-2222-2222-2222-222222222222",
          title: "Email provider degraded",
          summary: "Repeated failures exceeded threshold.",
          category: "delivery",
          severity: "high",
          status: "resolved",
          source: "manual",
          opened_at: "2026-08-22T09:00:00.000Z",
          resolved_at: "2026-08-22T09:30:00.000Z",
          created_by_user_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          resolved_by_user_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          reference_type: null,
          reference_public_id: null,
          updated_at: "2026-08-22T09:30:00.000Z",
          history: [],
        });
      }
      if (
        url.pathname ===
        "/api/v1/admin/system/retries/communications/11111111-1111-1111-1111-111111111111"
      ) {
        return jsonResponse({
          operation: "retry_failed_communication",
          reference_public_id: "11111111-1111-1111-1111-111111111111",
          subject_public_id: "99999999-9999-9999-9999-999999999999",
          message: "Communication retry requested successfully.",
        });
      }
      throw new Error(`Unexpected path ${url.pathname}`);
    });

    const adapter = createAdminSystemAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-22T12:00:00.000Z"),
      },
    });

    await expect(
      adapter.incidents({ status: "open", severity: "high", page: 1, pageSize: 10 }),
    ).resolves.toMatchObject({
      items: [{ publicId: "22222222-2222-2222-2222-222222222222", severity: "high" }],
      total: 1,
    });
    await expect(adapter.incident("22222222-2222-2222-2222-222222222222")).resolves.toMatchObject({
      history: [{ eventType: "incident_created" }],
    });
    await expect(adapter.activity({ page: 1, pageSize: 10 })).resolves.toMatchObject({
      items: [{ publicId: "44444444-4444-4444-4444-444444444444" }],
      total: 1,
    });
    await expect(
      adapter.createIncident({
        title: "Email provider degraded",
        summary: "Repeated failures exceeded threshold.",
        category: "delivery",
        severity: "high",
      }),
    ).resolves.toMatchObject({ publicId: "22222222-2222-2222-2222-222222222222" });
    await expect(
      adapter.updateIncident("22222222-2222-2222-2222-222222222222", {
        status: "monitoring",
        severity: "critical",
      }),
    ).resolves.toMatchObject({ status: "monitoring", severity: "critical" });
    await expect(
      adapter.resolveIncident("22222222-2222-2222-2222-222222222222", {
        reason: "Provider recovered.",
      }),
    ).resolves.toMatchObject({ status: "resolved" });
    await expect(
      adapter.retryCommunicationFailure("11111111-1111-1111-1111-111111111111"),
    ).resolves.toMatchObject({
      operation: "retry_failed_communication",
      referencePublicId: "11111111-1111-1111-1111-111111111111",
    });
  });

  it("returns empty backend collections without demo fallback", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      if (url.pathname === "/api/v1/admin/system/failures") {
        return jsonResponse({ generated_at: "2026-08-22T10:00:00.000Z", items: [] });
      }
      if (url.pathname === "/api/v1/admin/system/incidents") {
        return jsonResponse({
          items: [],
          total: 0,
          page: 1,
          page_size: 10,
          total_pages: 0,
        });
      }
      throw new Error(`Unexpected path ${url.pathname}`);
    });

    const adapter = createAdminSystemAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-22T12:00:00.000Z"),
      },
    });

    await expect(adapter.failures()).resolves.toEqual([]);
    await expect(adapter.incidents()).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    });
  });
});
