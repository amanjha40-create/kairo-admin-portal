import { describe, expect, it, vi } from "vitest";
import { resolveAppEnvConfig } from "@/config/env";
import { AUTH_TOKEN_KEY, type SessionStorageBag } from "@/features/admin/auth/session-storage";
import { ApiError } from "@/lib/api/errors";
import { createOverviewDataAdapter } from "./overview";

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

function createDemoConfig() {
  return resolveAppEnvConfig(
    {
      VITE_APP_ENV: "development",
      VITE_ADMIN_DEMO_MODE: "true",
    },
    { dev: true },
  );
}

function seedTokens(storage: SessionStorageBag) {
  storage.local.setItem(
    AUTH_TOKEN_KEY,
    JSON.stringify({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      tokenType: "bearer",
      expiresAt: "2026-07-28T13:00:00.000Z",
      signedInAt: "2026-07-28T10:00:00.000Z",
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

describe("overview data adapter", () => {
  it("loads overview data from the backend successfully", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/api/v1/admin/overview")) {
        return jsonResponse({
          generated_at: "2026-07-28T12:00:00.000Z",
          recent_window_days: 30,
          total_verification_requests: 12,
          requests_by_status: {
            pending_admin_review: 3,
            pending_admin_re_review: 2,
            awaiting_subject_corrections: 1,
            pending_organization_resolution: 1,
            in_progress: 2,
            verified: 2,
            rejected: 1,
          },
          pending_review_count: 5,
          priority_case_count: 2,
          recent_cases: [
            {
              public_id: "11111111-1111-1111-1111-111111111111",
              subject_name: "Aman Jha",
              organization_name: "Kairo",
              status: "pending_admin_review",
              priority: "high",
              created_at: "2026-07-28T08:00:00.000Z",
            },
          ],
          recent_admin_activity: [
            {
              public_id: "22222222-2222-2222-2222-222222222222",
              verification_request_public_id: "33333333-3333-3333-3333-333333333333",
              event_type: "admin_approved",
              event_source: "admin",
              actor_user_id: null,
              created_at: "2026-07-28T09:00:00.000Z",
            },
          ],
          organization_total: 4,
          registry_total: 6,
          user_total: 18,
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createOverviewDataAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    const result = await adapter.loadDashboard();

    expect(result.isEmpty).toBe(false);
    expect(result.metrics.map((item) => [item.id, item.value])).toEqual([
      ["verification_requests", 12],
      ["pending_review", 5],
      ["priority_cases", 2],
      ["organizations", 4],
      ["registry_records", 6],
      ["registered_users", 18],
    ]);
    expect(result.statuses.find((item) => item.status === "pending_admin_re_review")?.count).toBe(
      2,
    );
    expect(result.activity[0]).toMatchObject({
      kind: "verification_approved",
      actor: "Admin",
      subject: "Case 33333333",
    });
  });

  it("marks an empty backend overview response as empty", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/api/v1/admin/overview")) {
        return jsonResponse({
          generated_at: "2026-07-28T12:00:00.000Z",
          recent_window_days: 30,
          total_verification_requests: 0,
          requests_by_status: {},
          pending_review_count: 0,
          priority_case_count: 0,
          recent_cases: [],
          recent_admin_activity: [],
          organization_total: 0,
          registry_total: 0,
          user_total: 0,
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createOverviewDataAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    const result = await adapter.loadDashboard();

    expect(result.isEmpty).toBe(true);
    expect(result.activity).toEqual([]);
    expect(result.metrics[0]?.value).toBe(0);
  });

  it("treats a 401 overview response as unauthorized", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/api/v1/admin/overview")) {
        return jsonResponse({ detail: "Unauthorized" }, { status: 401 });
      }
      if (url.includes("/api/v1/auth/refresh")) {
        return jsonResponse({ detail: "Unauthorized" }, { status: 401 });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createOverviewDataAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    await expect(adapter.loadDashboard()).rejects.toMatchObject({
      code: "unauthorized",
      status: 401,
    });
    expect(storage.local.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it("treats a 403 overview response as forbidden", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/api/v1/admin/overview")) {
        return jsonResponse({ detail: "Forbidden" }, { status: 403 });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createOverviewDataAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    await expect(adapter.loadDashboard()).rejects.toMatchObject({
      code: "forbidden",
      status: 403,
    });
  });

  it("surfaces backend errors without falling back to mock overview data", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/api/v1/admin/overview")) {
        return jsonResponse({ detail: "Server error" }, { status: 500 });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createOverviewDataAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    await expect(adapter.loadDashboard()).rejects.toMatchObject({
      code: "server",
      status: 500,
    });
  });

  it("keeps Demo Mode overview data unchanged", async () => {
    const adapter = createOverviewDataAdapter(createDemoConfig());
    const result = await adapter.loadDashboard();

    expect(result.metrics[0]?.label).toBe("Total registered users");
    expect(result.activity.length).toBeGreaterThan(0);
    expect(result.isEmpty).toBe(false);
  });

  it("never reads demo overview data when production mode is enabled", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const demoLoader = vi.fn(async () => {
      throw new Error("demo loader should not run");
    });
    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/api/v1/admin/overview")) {
        return jsonResponse({
          generated_at: "2026-07-28T12:00:00.000Z",
          recent_window_days: 30,
          total_verification_requests: 1,
          requests_by_status: {
            pending_admin_review: 1,
          },
          pending_review_count: 1,
          priority_case_count: 0,
          recent_cases: [],
          recent_admin_activity: [],
          organization_total: 0,
          registry_total: 0,
          user_total: 0,
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createOverviewDataAdapter(createProductionConfig(), {
      demoLoader,
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    await expect(adapter.loadDashboard()).resolves.toMatchObject({
      metrics: expect.arrayContaining([
        expect.objectContaining({ id: "verification_requests", value: 1 }),
      ]),
    });
    expect(demoLoader).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
