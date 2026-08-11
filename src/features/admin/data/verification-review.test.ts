import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { resolveAppEnvConfig } from "@/config/env";
import { AUTH_TOKEN_KEY, type SessionStorageBag } from "@/features/admin/auth/session-storage";
import {
  createVerificationReviewAdapter,
  verificationQueuePageQueryOptions,
} from "./verification-review";

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
        employment_id: "aaaaaaa1-1111-1111-1111-111111111111",
        organization_public_id: "22222222-2222-2222-2222-222222222222",
        subject_name: "Aman Jha",
        subject_email: "aman@example.com",
        target_organization_name: "Kairo",
        target_organization_email: "hr@kairo.example",
        request_type: "employment",
        status: "pending_admin_review",
        priority: "high",
        created_at: "2026-07-28T08:00:00.000Z",
        updated_at: "2026-07-28T09:00:00.000Z",
        accepted_at: "2026-07-28T08:30:00.000Z",
        consented_fields: ["role", "employment_dates"],
        consented_evidence_scope: ["offer_letter", "payslip"],
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

function terminalQueuePayload() {
  return {
    items: [
      {
        ...queuePayload().items[0],
        public_id: "db950c5b-397a-4415-b1e9-55a7dc8f0dd2",
        request_type: "employment",
        status: "verified",
        employment_id: "aaaaaaa1-1111-1111-1111-111111111111",
        education_id: null,
        target_organization_name: "Disposable QA Employer",
        employment_claim: {
          employer_name: "Disposable QA Employer",
          role: "Analyst",
        },
        education_claim: null,
      },
      {
        ...queuePayload().items[0],
        public_id: "792989eb-d291-4f31-bb52-46ec27942158",
        request_type: "education",
        status: "verified",
        employment_id: null,
        education_id: "0a9a10e2-51fd-4f45-9346-7e90c615eb0d",
        target_organization_name: "Kairo Durability Test University",
        employment_claim: null,
        education_claim: {
          institution_name: "Kairo Durability Test University",
          degree: "Bachelor of Business Administration",
        },
      },
      {
        ...queuePayload().items[0],
        public_id: "55555555-5555-5555-5555-555555555555",
        request_type: "employment",
        status: "rejected",
        employment_id: "bbbbbbb1-1111-1111-1111-111111111111",
        education_id: null,
        target_organization_name: "Rejected Employer",
        employment_claim: {
          employer_name: "Rejected Employer",
          role: "Associate",
        },
        education_claim: null,
      },
    ],
    total: 3,
    page: 1,
    page_size: 100,
    total_pages: 1,
    offset: 0,
    limit: 100,
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
    reviews: [
      {
        public_id: "77777777-7777-7777-7777-777777777777",
        review_round: 1,
        review_status: "approved_for_dispatch",
        assigned_reviewer_user_id: "33333333-3333-3333-3333-333333333333",
        assigned_at: "2026-07-28T08:45:00.000Z",
        decision_at: "2026-07-28T09:15:00.000Z",
        decision_summary: "Evidence and contact reviewed for dispatch.",
        created_at: "2026-07-28T08:40:00.000Z",
        updated_at: "2026-07-28T09:15:00.000Z",
      },
    ],
    organization_resolution: {
      status: "resolved",
      organization_public_id: "22222222-2222-2222-2222-222222222222",
      organization_name: "Kairo",
    },
    registry_resolution: {
      status: "resolved",
      registry_record_public_id: "88888888-8888-8888-8888-888888888888",
      registry_name: "Kairo Canonical",
      resolution_confidence: 97,
      resolution_metadata: {
        routing_confidence: 97,
      },
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
    const requests: string[] = [];

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      requests.push(url);
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
      status: "pending_admin_review",
      priority: "high",
      linkedRecordLabel: "Employment · aaaaaaa1",
      verifierContactLabel: "hr•••@kairo.example",
      workflowOwner: "Admin review",
    });
    expect(requests).toContain(
      "https://api.kairoid.com/api/v1/admin/verification-requests/queue?page=1&page_size=100",
    );
    expect(requests.some((url) => url.includes("status="))).toBe(false);
  });

  it("requests terminal statuses explicitly for the completed queue", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);
    const requests: string[] = [];

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      requests.push(url);
      if (url.includes("/api/v1/admin/verification-requests/queue")) {
        return jsonResponse(terminalQueuePayload());
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const query = verificationQueuePageQueryOptions(
      {
        statuses: ["verified", "rejected", "unable_to_verify", "cancelled", "expired"],
        page: 1,
        pageSize: 100,
      },
      createProductionConfig(),
      {
        production: {
          storage,
          fetchImpl,
          now: () => new Date("2026-07-28T12:00:00.000Z"),
        },
      },
    );

    const page = await new QueryClient().fetchQuery(query);

    expect(requests).toContain(
      "https://api.kairoid.com/api/v1/admin/verification-requests/queue?page=1&page_size=100&status=verified%2Crejected%2Cunable_to_verify%2Ccancelled%2Cexpired",
    );
    expect(page.total).toBe(3);
    expect(page.items).toHaveLength(3);
    expect(page.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "db950c5b-397a-4415-b1e9-55a7dc8f0dd2",
          verificationType: "employment",
          status: "verified",
        }),
        expect.objectContaining({
          id: "792989eb-d291-4f31-bb52-46ec27942158",
          verificationType: "education",
          status: "verified",
        }),
        expect.objectContaining({
          id: "55555555-5555-5555-5555-555555555555",
          verificationType: "employment",
          status: "rejected",
        }),
      ]),
    );
    expect(page.items.some((item) => item.status === "pending_admin_review")).toBe(false);
  });

  it("preserves search and pagination when requesting completed queue pages", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);
    const requests: string[] = [];

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      requests.push(url);
      if (url.includes("/api/v1/admin/verification-requests/queue")) {
        return jsonResponse({
          ...terminalQueuePayload(),
          items: [terminalQueuePayload().items[1]],
          total: 3,
          page: 2,
          page_size: 25,
          total_pages: 1,
          offset: 25,
          limit: 25,
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const query = verificationQueuePageQueryOptions(
      {
        statuses: ["verified", "rejected", "unable_to_verify", "cancelled", "expired"],
        search: "792989eb",
        page: 2,
        pageSize: 25,
      },
      createProductionConfig(),
      {
        production: {
          storage,
          fetchImpl,
          now: () => new Date("2026-07-28T12:00:00.000Z"),
        },
      },
    );

    const page = await new QueryClient().fetchQuery(query);

    expect(requests).toContain(
      "https://api.kairoid.com/api/v1/admin/verification-requests/queue?page=2&page_size=25&search=792989eb&status=verified%2Crejected%2Cunable_to_verify%2Ccancelled%2Cexpired",
    );
    expect(page.total).toBe(3);
    expect(page.page).toBe(2);
    expect(page.pageSize).toBe(25);
    expect(page.items).toEqual([
      expect.objectContaining({
        id: "792989eb-d291-4f31-bb52-46ec27942158",
        verificationType: "education",
        status: "verified",
      }),
    ]);
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
    const requests: string[] = [];

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      requests.push(url);
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
    expect(detail?.linkedRecord).toMatchObject({
      type: "employment",
      publicId: "aaaaaaa1-1111-1111-1111-111111111111",
    });
    expect(detail?.consent.fields).toEqual(["role", "employment_dates"]);
    expect(detail?.reviewCycles).toHaveLength(1);
    expect(detail?.routingContext).toMatchObject({
      workflowOwner: "Admin review",
      registryResolutionStatus: "resolved",
      routingConfidence: 97,
    });
    expect(detail?.timeline).toHaveLength(1);
    expect(detail?.timeline[0]).toMatchObject({
      id: "66666666-6666-6666-6666-666666666666",
      kind: "assignment_changed",
      actorSource: "admin",
    });
    expect(requests).toContain(
      "https://api.kairoid.com/api/v1/admin/verification-requests/11111111-1111-1111-1111-111111111111/timeline?page=1&page_size=100",
    );
    expect(requests.some((url) => url.includes("/timeline?page=1&page_size=250"))).toBe(false);
  });

  it("uses authoritative detail state for organization resolution and reviewer assignment", async () => {
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
        const request = {
          ...queuePayload().items[0],
          assigned_reviewer: null,
          organization_public_id: null,
          organization_summary: null,
        };
        return jsonResponse({
          ...detailPayload(),
          request,
          organization_resolution: {
            status: "unresolved",
            organization_public_id: null,
            organization_name: "Kairo",
          },
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

    const detail = await adapter.getCaseDetail("11111111-1111-1111-1111-111111111111");

    expect(detail?.summary.assignedReviewer).toBe("Unassigned");
    expect(detail?.summary.assignedReviewerId).toBe("33333333-3333-3333-3333-333333333333");
    expect(detail?.reviewCycles[0]).toMatchObject({
      assignedReviewer: "33333333-3333-3333-3333-333333333333",
      assignedReviewerId: "33333333-3333-3333-3333-333333333333",
    });
    expect(detail?.summary.organizationStatus).toBe("unresolved");
    expect(detail?.organization.state).toBe("unresolved");
    expect(detail?.organization.matched).toBeUndefined();
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
    await adapter.addNote("case-1", "Captured for audit.", "organization");
    await adapter.requestCorrections("case-1", {
      corrections: [{ field_key: "role", request_text: "Please clarify the role." }],
    });
    await adapter.approveCase("case-1", "Approved.");
    await adapter.rejectCase("case-1", "Rejected.");
    await adapter.markUnableToVerify("case-1", "Unable.");
    await adapter.recordClarificationResponse("case-1", "Updated role attached.");
    await adapter.createRegistryRecord("case-1", {
      legalName: "Kairo Labs Private Limited",
      organizationType: "employer",
      country: "IN",
    });

    expect(requests.map((request) => request.url)).toEqual([
      "https://api.kairoid.com/api/v1/admin/verification-requests/case-1/priority",
      "https://api.kairoid.com/api/v1/admin/verification-requests/case-1/notes",
      "https://api.kairoid.com/api/v1/admin/verification-requests/case-1/request-corrections",
      "https://api.kairoid.com/api/v1/admin/verification-requests/case-1/approve",
      "https://api.kairoid.com/api/v1/admin/verification-requests/case-1/reject",
      "https://api.kairoid.com/api/v1/admin/verification-requests/case-1/unable-to-verify",
      "https://api.kairoid.com/api/v1/admin/verification-requests/case-1/record-clarification-response",
      "https://api.kairoid.com/api/v1/admin/verification-requests/case-1/create-registry-record",
    ]);
    expect(requests[1]).toMatchObject({
      body: {
        body: "Captured for audit.",
        note_type: "review_note",
        visibility: "internal",
        metadata: { category: "organization" },
      },
    });
  });

  it("maps persisted backend internal notes without falling back to session-only state", async () => {
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
        return jsonResponse({
          ...detailPayload(),
          internal_notes: [
            {
              public_id: "99999999-9999-9999-9999-999999999999",
              review_public_id: "77777777-7777-7777-7777-777777777777",
              author_user_id: "33333333-3333-3333-3333-333333333333",
              body: "Canonical organization confirmed.",
              note_type: "review_note",
              visibility: "internal",
              metadata: { category: "organization" },
              created_at: "2026-07-28T09:05:00.000Z",
              updated_at: "2026-07-28T09:05:00.000Z",
            },
          ],
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

    const detail = await adapter.getCaseDetail("11111111-1111-1111-1111-111111111111");

    expect(detail?.notes).toEqual([
      expect.objectContaining({
        id: "99999999-9999-9999-9999-999999999999",
        body: "Canonical organization confirmed.",
        category: "organization",
      }),
    ]);
    expect(detail?.notes[0]?.sessionOnly).toBeUndefined();
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
