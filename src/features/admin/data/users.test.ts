import { describe, expect, it, vi } from "vitest";
import { resolveAppEnvConfig } from "@/config/env";
import { AUTH_TOKEN_KEY, type SessionStorageBag } from "@/features/admin/auth/session-storage";
import { ApiError } from "@/lib/api/errors";
import { createAdminUsersAdapter } from "./users";

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

describe("admin users data adapter", () => {
  it("loads the backend users directory successfully", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/admin/users");
      expect(url.searchParams.get("paginate")).toBe("true");
      expect(url.searchParams.get("page")).toBe("1");
      expect(url.searchParams.get("page_size")).toBe("10");
      expect(url.searchParams.get("sort_by")).toBe("created_at");
      return jsonResponse({
        items: [
          {
            public_id: "11111111-1111-1111-1111-111111111111",
            display_name: "Candidate One",
            masked_email: "ca******@example.com",
            account_status: "active",
            created_at: "2026-08-11T08:00:00.000Z",
            last_relevant_activity_at: "2026-08-11T09:00:00.000Z",
            profile_completion_percentage: 78,
            trust_score_overall: 82,
            trust_score_status: "ready",
            active_verification_count: 1,
            completed_verification_count: 2,
            career_record_count: 4,
            active_passport_share_count: 1,
          },
        ],
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
      });
    });

    const adapter = createAdminUsersAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-11T12:00:00.000Z"),
      },
      demoListLoader: async () => {
        throw new Error("demo should not run");
      },
    });

    const result = await adapter.listUsers();

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: "11111111-1111-1111-1111-111111111111",
      displayName: "Candidate One",
      accountStatus: "active",
      trustScoreOverall: 82,
    });
  });

  it("supports backend search, filters, and pagination", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/admin/users");
      expect(url.searchParams.get("search")).toBe("candidate");
      expect(url.searchParams.get("status")).toBe("inactive");
      expect(url.searchParams.get("page")).toBe("2");
      expect(url.searchParams.get("page_size")).toBe("1");
      expect(url.searchParams.get("sort_by")).toBe("full_name");
      expect(url.searchParams.get("sort_order")).toBe("asc");
      return jsonResponse({
        items: [],
        total: 0,
        page: 2,
        page_size: 1,
        total_pages: 0,
      });
    });

    const adapter = createAdminUsersAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-11T12:00:00.000Z"),
      },
    });

    const result = await adapter.listUsers({
      query: "candidate",
      status: "inactive",
      page: 2,
      pageSize: 1,
      sortBy: "full_name",
      sortOrder: "asc",
    });

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(1);
  });

  it("maps an empty backend users list without falling back to demo data", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        items: [],
        total: 0,
        page: 1,
        page_size: 10,
        total_pages: 0,
      }),
    );

    const adapter = createAdminUsersAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-11T12:00:00.000Z"),
      },
      demoListLoader: async () => {
        throw new Error("demo should not run");
      },
    });

    await expect(adapter.listUsers()).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    });
  });

  it("loads backend user detail, verification link data, and deleted state mapping", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/admin/users/11111111-1111-1111-1111-111111111111");
      return jsonResponse({
        public_id: "11111111-1111-1111-1111-111111111111",
        display_name: "Deleted Candidate",
        account_status: "deleted",
        email: "deleted+candidate@example.com",
        masked_email: "de******@example.com",
        phone: null,
        masked_phone: null,
        created_at: "2026-08-11T08:00:00.000Z",
        updated_at: "2026-08-11T09:00:00.000Z",
        deleted_at: "2026-08-11T10:00:00.000Z",
        email_verified: true,
        phone_verified: false,
        onboarding_completed: false,
        profile_completion_percentage: 34,
        trust: {
          overall: 40,
          status: "manual_review",
          verification_completeness_percentage: 20,
          last_calculated_at: "2026-08-11T09:30:00.000Z",
        },
        career_summary: {
          total_items: 2,
          employments: 1,
          educations: 1,
          internships: 0,
          freelance: 0,
          gig_platforms: 0,
          portfolio: 0,
          certifications: 0,
          skills: 0,
          projects: 0,
          user_documents: 0,
        },
        verification_summary: {
          overall: { total: 1, statuses: { verified: 1 } },
          employments: { total: 1, statuses: { verified: 1 } },
          educations: { total: 0, statuses: {} },
          certifications: { total: 0, statuses: {} },
        },
        verifications: [
          {
            public_id: "22222222-2222-2222-2222-222222222222",
            request_type: "employment",
            status: "verified",
            employment_public_id: "44444444-4444-4444-4444-444444444444",
            education_public_id: null,
            organization_name: "Acme Corp",
            linked_record_label: "Operator at Acme Corp",
            created_at: "2026-08-11T08:30:00.000Z",
            submitted_at: "2026-08-11T08:35:00.000Z",
            updated_at: "2026-08-11T08:45:00.000Z",
          },
        ],
        passport: {
          ready: false,
          active_links: 0,
          revoked_links: 1,
          expired_links: 0,
          total_views: 3,
          unique_views: 2,
          latest_share_created_at: "2026-08-11T08:40:00.000Z",
          last_viewed_at: "2026-08-11T08:50:00.000Z",
        },
        activity: [
          {
            public_id: "33333333-3333-3333-3333-333333333333",
            occurred_at: "2026-08-11T09:00:00.000Z",
            kind: "account_created",
            title: "Account created",
            detail: null,
          },
        ],
      });
    });

    const adapter = createAdminUsersAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-11T12:00:00.000Z"),
      },
    });

    const result = await adapter.getUser("11111111-1111-1111-1111-111111111111");

    expect(result).toMatchObject({
      id: "11111111-1111-1111-1111-111111111111",
      accountStatus: "deleted",
      verifications: [
        expect.objectContaining({
          id: "22222222-2222-2222-2222-222222222222",
          employmentId: "44444444-4444-4444-4444-444444444444",
          submittedAt: "2026-08-11T08:35:00.000Z",
        }),
      ],
    });
  });

  it("treats a 401 users response as unauthorized", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async () => jsonResponse({ detail: "unauthorized" }, { status: 401 }));

    const adapter = createAdminUsersAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-11T12:00:00.000Z"),
      },
    });

    await expect(adapter.listUsers()).rejects.toMatchObject({
      status: 401,
      code: "unauthorized",
    });
  });

  it("treats a 403 users response as forbidden", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async () => jsonResponse({ detail: "forbidden" }, { status: 403 }));

    const adapter = createAdminUsersAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-11T12:00:00.000Z"),
      },
    });

    await expect(adapter.getUser("11111111-1111-1111-1111-111111111111")).rejects.toMatchObject({
      status: 403,
      code: "forbidden",
    });
  });

  it("keeps Demo Mode users data available", async () => {
    const demoList = {
      items: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          displayName: "Demo Candidate",
          maskedEmail: "de**@example.com",
          accountStatus: "active" as const,
          createdAt: "2026-08-11T12:00:00.000Z",
          lastRelevantActivityAt: "2026-08-11T13:00:00.000Z",
          profileCompletionPercentage: 80,
          trustScoreOverall: 72,
          trustScoreStatus: "ready",
          activeVerificationCount: 1,
          completedVerificationCount: 2,
          careerRecordCount: 3,
          activePassportShareCount: 1,
          deletedAt: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    };
    const demoDetail = {
      id: demoList.items[0]!.id,
      displayName: demoList.items[0]!.displayName,
      accountStatus: demoList.items[0]!.accountStatus,
      email: "demo@example.com",
      maskedEmail: demoList.items[0]!.maskedEmail,
      phone: null,
      maskedPhone: null,
      headline: null,
      currentRole: null,
      location: null,
      createdAt: demoList.items[0]!.createdAt,
      updatedAt: "2026-08-11T13:00:00.000Z",
      deletedAt: null,
      emailVerified: true,
      phoneVerified: false,
      onboardingCompleted: true,
      profileCompletionPercentage: 80,
      trust: {
        overall: 72,
        status: "ready",
        verificationCompletenessPercentage: 75,
        lastCalculatedAt: "2026-08-11T13:00:00.000Z",
      },
      careerSummary: {
        totalItems: 3,
        employments: 1,
        educations: 1,
        internships: 0,
        freelance: 0,
        gigPlatforms: 0,
        portfolio: 0,
        certifications: 1,
        skills: 0,
        projects: 0,
        userDocuments: 0,
      },
      verificationSummary: {
        overall: { total: 3, statuses: { verified: 2, pending_admin_review: 1 } },
        employments: { total: 1, statuses: { verified: 1 } },
        educations: { total: 1, statuses: { pending_admin_review: 1 } },
        certifications: { total: 1, statuses: { verified: 1 } },
      },
      verifications: [],
      passport: {
        ready: true,
        activeLinks: 1,
        revokedLinks: 0,
        expiredLinks: 0,
        totalViews: 2,
        uniqueViews: 2,
        latestShareCreatedAt: "2026-08-11T13:00:00.000Z",
        lastViewedAt: "2026-08-11T13:30:00.000Z",
      },
      activity: [],
    };
    const adapter = createAdminUsersAdapter(createDemoConfig(), {
      demoListLoader: async () => demoList,
      demoDetailLoader: async () => demoDetail,
    });

    const list = await adapter.listUsers();
    const detail = await adapter.getUser(list.items[0]!.id);

    expect(list.items.length).toBeGreaterThan(0);
    expect(detail?.displayName).toBeTruthy();
  });

  it("never reads demo users data when production mode is enabled", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        items: [],
        total: 0,
        page: 1,
        page_size: 10,
        total_pages: 0,
      }),
    );

    const adapter = createAdminUsersAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-11T12:00:00.000Z"),
      },
      demoListLoader: async () => {
        throw new Error("production should not read demo users");
      },
      demoDetailLoader: async () => {
        throw new Error("production should not read demo users");
      },
    });

    await expect(adapter.listUsers()).resolves.toMatchObject({ items: [] });
  });
});
