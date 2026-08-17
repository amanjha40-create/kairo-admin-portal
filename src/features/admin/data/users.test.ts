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
      expect(url.searchParams.get("status")).toBe("suspended");
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
      status: "suspended",
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
        profile_slug: null,
        candidate_type: "candidate",
        email: "deleted+candidate@example.com",
        masked_email: "de******@example.com",
        phone: null,
        masked_phone: null,
        created_at: "2026-08-11T08:00:00.000Z",
        updated_at: "2026-08-11T09:00:00.000Z",
        last_login_at: null,
        last_active_at: null,
        deleted_at: "2026-08-11T10:00:00.000Z",
        suspended_at: null,
        suspension_reason: null,
        suspended_by_display_name: null,
        email_verified: true,
        phone_verified: false,
        onboarding_completed: false,
        onboarding_state: "incomplete",
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
        sessions: [
          {
            public_id: "55555555-5555-5555-5555-555555555555",
            created_at: "2026-08-11T08:15:00.000Z",
            expires_at: "2026-08-18T08:15:00.000Z",
            last_active_at: "2026-08-11T09:15:00.000Z",
            revoked_at: null,
            status: "active",
          },
        ],
        notes: [
          {
            public_id: "66666666-6666-6666-6666-666666666666",
            created_at: "2026-08-11T09:10:00.000Z",
            author_display_name: "Admin Operator",
            author_role: "admin",
            body: "Internal note",
          },
        ],
        capabilities: {
          view_notes: true,
          add_note: false,
          suspend: false,
          restore: false,
          revoke_sessions: false,
          send_password_reset: false,
        },
        activity: [
          {
            public_id: "33333333-3333-3333-3333-333333333333",
            occurred_at: "2026-08-11T09:00:00.000Z",
            kind: "account_created",
            title: "Account created",
            detail: null,
            actor_display_name: "System",
            actor_role: "system",
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
      onboardingState: "incomplete",
      sessions: [expect.objectContaining({ id: "55555555-5555-5555-5555-555555555555" })],
      notes: [expect.objectContaining({ body: "Internal note" })],
      verifications: [
        expect.objectContaining({
          id: "22222222-2222-2222-2222-222222222222",
          employmentId: "44444444-4444-4444-4444-444444444444",
          submittedAt: "2026-08-11T08:35:00.000Z",
        }),
      ],
    });
  });

  it("creates an internal admin note through the backend", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/admin/users/11111111-1111-1111-1111-111111111111/notes");
      expect(init?.method).toBe("POST");
      expect(init?.body).toContain("Needs review");
      return jsonResponse({
        public_id: "77777777-7777-7777-7777-777777777777",
        created_at: "2026-08-11T10:00:00.000Z",
        author_display_name: "Admin Operator",
        author_role: "admin",
        body: "Needs review",
      });
    });

    const adapter = createAdminUsersAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-11T12:00:00.000Z"),
      },
    });

    await expect(
      adapter.addNote("11111111-1111-1111-1111-111111111111", "Needs review"),
    ).resolves.toMatchObject({
      id: "77777777-7777-7777-7777-777777777777",
      body: "Needs review",
    });
  });

  it("suspends a candidate through the backend detail contract", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/admin/users/11111111-1111-1111-1111-111111111111/suspend");
      expect(init?.method).toBe("POST");
      return jsonResponse({
        public_id: "11111111-1111-1111-1111-111111111111",
        display_name: "Candidate One",
        account_status: "suspended",
        profile_slug: "candidate-one",
        candidate_type: "candidate",
        email: "candidate.one@example.com",
        masked_email: "ca******@example.com",
        phone: "+15551234567",
        masked_phone: "+15 •••••••67",
        created_at: "2026-08-11T08:00:00.000Z",
        updated_at: "2026-08-11T09:00:00.000Z",
        suspended_at: "2026-08-11T10:00:00.000Z",
        suspension_reason: "Risk review",
        suspended_by_display_name: "Admin Operator",
        email_verified: true,
        phone_verified: true,
        onboarding_completed: true,
        onboarding_state: "completed",
        profile_completion_percentage: 78,
        trust: {},
        career_summary: { total_items: 0 },
        verification_summary: {
          overall: { total: 0, statuses: {} },
          employments: { total: 0, statuses: {} },
          educations: { total: 0, statuses: {} },
          certifications: { total: 0, statuses: {} },
        },
        verifications: [],
        passport: { ready: false },
        sessions: [],
        notes: [],
        capabilities: {
          view_notes: true,
          add_note: true,
          suspend: false,
          restore: true,
          revoke_sessions: true,
          send_password_reset: false,
        },
        activity: [],
      });
    });

    const adapter = createAdminUsersAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-11T12:00:00.000Z"),
      },
    });

    await expect(
      adapter.suspendUser("11111111-1111-1111-1111-111111111111", "Risk review"),
    ).resolves.toMatchObject({
      accountStatus: "suspended",
      suspensionReason: "Risk review",
      capabilities: expect.objectContaining({ restore: true }),
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
      profileSlug: null,
      candidateType: "candidate",
      email: "demo@example.com",
      maskedEmail: demoList.items[0]!.maskedEmail,
      phone: null,
      maskedPhone: null,
      headline: null,
      currentRole: null,
      location: null,
      createdAt: demoList.items[0]!.createdAt,
      updatedAt: "2026-08-11T13:00:00.000Z",
      lastLoginAt: "2026-08-11T13:00:00.000Z",
      lastActiveAt: "2026-08-11T13:00:00.000Z",
      deletedAt: null,
      suspendedAt: null,
      suspensionReason: null,
      suspendedByDisplayName: null,
      emailVerified: true,
      phoneVerified: false,
      onboardingCompleted: true,
      onboardingState: "completed",
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
      sessions: [],
      notes: [],
      capabilities: {
        viewNotes: false,
        addNote: false,
        suspend: false,
        restore: false,
        revokeSessions: false,
        sendPasswordReset: false,
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
