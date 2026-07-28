import { describe, expect, it, vi } from "vitest";
import { resolveAppEnvConfig } from "@/config/env";
import { AUTH_TOKEN_KEY, type SessionStorageBag } from "@/features/admin/auth/session-storage";
import { createVerificationReviewAdapter } from "./verification-review";

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

function queuePayload() {
  return {
    items: [
      {
        public_id: "11111111-1111-1111-1111-111111111111",
        organization_public_id: "22222222-2222-2222-2222-222222222222",
        subject_name: "Aman Jha",
        subject_email: "aman@example.com",
        target_organization_name: "Kairo",
        request_type: "employment",
        status: "pending_admin_review",
        priority: "high",
        created_at: "2026-07-28T08:00:00.000Z",
        updated_at: "2026-07-28T09:00:00.000Z",
        accepted_at: "2026-07-28T08:30:00.000Z",
        employment_claim: {
          employer_name: "Kairo",
          role: "Senior Product Engineer",
        },
        evidence_summary: {
          total_items: 2,
        },
        assigned_reviewer: {
          user_id: "33333333-3333-3333-3333-333333333333",
          full_name: "Ops Reviewer",
          email: "ops@example.com",
          role: "moderator",
        },
      },
    ],
    total: 1,
    page: 1,
    page_size: 1,
    total_pages: 1,
    offset: 0,
    limit: 1,
  };
}

function detailPayload() {
  return {
    request: queuePayload().items[0],
    evidence: [
      {
        public_id: "44444444-4444-4444-4444-444444444444",
        evidence_type: "employment_letter",
        field_key: "role",
        value: {
          role: "Senior Product Engineer",
        },
        status: "approved",
        created_at: "2026-07-28T08:00:00.000Z",
        updated_at: "2026-07-28T08:30:00.000Z",
        original_filename: "employment-letter.pdf",
        file_size: 2048,
        upload_status: "processed",
      },
    ],
    reviews: [],
    open_corrections: [],
    internal_notes: [],
    verification_contact: {
      public_id: "55555555-5555-5555-5555-555555555555",
      contact_name: "HR Team",
      contact_email: "hr@kairo.example",
      contact_role: "HR",
      contact_type: "hr",
      candidate_note: null,
      review_status: "approved",
      review_notes: null,
      created_at: "2026-07-28T08:00:00.000Z",
      updated_at: "2026-07-28T08:30:00.000Z",
    },
    organization_resolution: {
      status: "resolved",
      organization_public_id: "22222222-2222-2222-2222-222222222222",
      organization_name: "Kairo",
    },
  };
}

function timelinePayload() {
  return {
    timeline: {
      items: [
        {
          public_id: "66666666-6666-6666-6666-666666666666",
          event_type: "admin_assigned",
          event_source: "admin",
          actor_display_name: "Ops Reviewer",
          previous_status: "pending_admin_review",
          new_status: "pending_admin_review",
          created_at: "2026-07-28T09:00:00.000Z",
        },
      ],
      total: 1,
      page: 1,
      page_size: 1,
      total_pages: 1,
    },
  };
}

describe("verification review adapter", () => {
  it("loads the backend verification queue successfully", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/api/v1/admin/verification-requests/queue")) {
        return jsonResponse(queuePayload());
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createVerificationReviewAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    const cases = await adapter.listCases();

    expect(cases).toHaveLength(1);
    expect(cases[0]).toMatchObject({
      candidateName: "Aman Jha",
      organizationName: "Kairo",
      status: "pending_review",
      priority: "high",
    });
  });

  it("maps an empty backend queue without falling back to mock data", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/api/v1/admin/verification-requests/queue")) {
        return jsonResponse({
          items: [],
          total: 0,
          page: 1,
          page_size: 50,
          total_pages: 0,
          offset: 0,
          limit: 50,
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createVerificationReviewAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    await expect(adapter.listCases()).resolves.toEqual([]);
  });

  it("loads verification detail and timeline successfully", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/timeline")) {
        return jsonResponse(timelinePayload());
      }
      if (
        url.includes("/api/v1/admin/verification-requests/11111111-1111-1111-1111-111111111111")
      ) {
        return jsonResponse(detailPayload());
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createVerificationReviewAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    const detail = await adapter.getCaseDetail("11111111-1111-1111-1111-111111111111");

    expect(detail?.summary.reference).toContain("KVR-");
    expect(detail?.evidence[0]).toMatchObject({
      filename: "employment-letter.pdf",
      reviewStatus: "reviewed",
    });
    expect(detail?.timeline).toHaveLength(1);
  });

  it("sends backend workflow mutations for supported production actions", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const requests: Array<{ url: string; body: unknown }> = [];
    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = String(input);
      requests.push({
        url,
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      return jsonResponse({});
    });

    const adapter = createVerificationReviewAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    await adapter.changePriority("case-1", "urgent");
    await adapter.requestCorrections("case-1", {
      corrections: [{ field_key: "role", request_text: "Please clarify the role." }],
    });
    await adapter.approveCase("case-1", "Approved.");
    await adapter.rejectCase("case-1", "Rejected.");
    await adapter.markUnableToVerify("case-1", "Unable.");
    await adapter.recordClarificationResponse("case-1", "Updated role attached.");

    expect(requests.map((request) => request.url)).toEqual([
      "https://api.kairoid.com/api/v1/admin/verification-requests/case-1/priority",
      "https://api.kairoid.com/api/v1/admin/verification-requests/case-1/request-corrections",
      "https://api.kairoid.com/api/v1/admin/verification-requests/case-1/approve",
      "https://api.kairoid.com/api/v1/admin/verification-requests/case-1/reject",
      "https://api.kairoid.com/api/v1/admin/verification-requests/case-1/unable-to-verify",
      "https://api.kairoid.com/api/v1/admin/verification-requests/case-1/record-clarification-response",
    ]);
  });

  it("treats a 401 queue response as unauthorized and clears stored tokens", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/queue")) {
        return jsonResponse({ detail: "Unauthorized" }, { status: 401 });
      }
      if (url.includes("/api/v1/auth/refresh")) {
        return jsonResponse({ detail: "Unauthorized" }, { status: 401 });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createVerificationReviewAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    await expect(adapter.listCases()).rejects.toMatchObject({
      code: "unauthorized",
      status: 401,
    });
    expect(storage.local.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it("surfaces backend errors without falling back to mock verification data", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/queue")) {
        return jsonResponse({ detail: "Server error" }, { status: 500 });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createVerificationReviewAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    await expect(adapter.listCases()).rejects.toMatchObject({
      code: "server",
      status: 500,
    });
  });

  it("preserves Demo Mode through the adapter boundary", async () => {
    const adapter = createVerificationReviewAdapter(createDemoConfig());

    const cases = await adapter.listCases();
    const detail = await adapter.getCaseDetail(cases[0].id);

    expect(adapter.mode).toBe("demo");
    expect(cases.length).toBeGreaterThan(0);
    expect(detail?.summary.id).toBe(cases[0].id);
  });
});
