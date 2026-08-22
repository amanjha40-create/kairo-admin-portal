import { describe, expect, it, vi } from "vitest";
import { resolveAppEnvConfig } from "@/config/env";
import { AUTH_TOKEN_KEY, type SessionStorageBag } from "@/features/admin/auth/session-storage";
import { createAdminRiskAdapter } from "./risk.production";

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

function investigationListItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    public_id: "11111111-1111-1111-1111-111111111111",
    title: "Repeated correction cycles",
    summary: "Three correction loops in the last seven days.",
    status: "open",
    severity: "high",
    subject_type: "verification_request",
    subject_public_id: "22222222-2222-2222-2222-222222222222",
    subject_label: "Verification 22222222",
    primary_signal_summary: "Repeated correction loops exceeded the threshold.",
    assignee: {
      user_id: "33333333-3333-3333-3333-333333333333",
      full_name: "Aman Jha",
      email: "aman@example.com",
      role: "admin",
    },
    created_at: "2026-08-22T08:00:00.000Z",
    updated_at: "2026-08-22T09:00:00.000Z",
    ...overrides,
  };
}

describe("trust safety production adapter", () => {
  it("loads the investigation list from the backend and maps filters correctly", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/admin/trust-safety/investigations");
      expect(url.searchParams.get("q")).toBe("duplicate");
      expect(url.searchParams.get("status")).toBe("open");
      expect(url.searchParams.get("severity")).toBe("high");
      expect(url.searchParams.get("subject_type")).toBe("verification_request");
      expect(url.searchParams.get("assignee_user_id")).toBe("33333333-3333-3333-3333-333333333333");
      expect(url.searchParams.get("page")).toBe("2");
      expect(url.searchParams.get("page_size")).toBe("25");
      expect(url.searchParams.get("sort_by")).toBe("updated_at");
      expect(url.searchParams.get("sort_dir")).toBe("desc");
      return jsonResponse({
        items: [investigationListItem()],
        total: 1,
        page: 2,
        page_size: 25,
        total_pages: 1,
      });
    });

    const adapter = createAdminRiskAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-22T12:00:00.000Z"),
      },
    });

    const result = await adapter.list({
      query: "duplicate",
      status: "open",
      severity: "high",
      subjectType: "verification_request",
      assigneeUserId: "33333333-3333-3333-3333-333333333333",
      page: 2,
      pageSize: 25,
    });

    expect(result.total).toBe(1);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(25);
    expect(result.items[0]).toMatchObject({
      id: "11111111-1111-1111-1111-111111111111",
      subjectType: "verification_request",
      subjectPublicId: "22222222-2222-2222-2222-222222222222",
      subjectLabel: "Verification 22222222",
      severity: "high",
      status: "open",
    });
  });

  it("loads investigation detail and maps backend subject context", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe(
        "/api/v1/admin/trust-safety/investigations/11111111-1111-1111-1111-111111111111",
      );
      return jsonResponse({
        ...investigationListItem(),
        signals: [
          {
            public_id: "44444444-4444-4444-4444-444444444444",
            signal_type: "repeated_correction_cycles",
            subject_type: "verification_request",
            subject_public_id: "22222222-2222-2222-2222-222222222222",
            severity: "high",
            source: "verification_workflow",
            summary: "Repeated correction loops exceeded the threshold.",
            metadata: { correction_cycles: 3 },
            status: "active",
            detected_at: "2026-08-22T08:10:00.000Z",
            resolved_at: null,
            investigation_public_id: "11111111-1111-1111-1111-111111111111",
          },
        ],
        notes: [
          {
            public_id: "55555555-5555-5555-5555-555555555555",
            author_user_id: "33333333-3333-3333-3333-333333333333",
            author_display_name: "Aman Jha",
            body: "Initial triage complete.",
            metadata: {},
            created_at: "2026-08-22T09:15:00.000Z",
          },
        ],
        timeline: [
          {
            public_id: "66666666-6666-6666-6666-666666666666",
            actor_user_id: "33333333-3333-3333-3333-333333333333",
            actor_display_name: "Aman Jha",
            event_type: "investigation_created",
            detail: "Manual review opened.",
            metadata: {},
            created_at: "2026-08-22T09:00:00.000Z",
          },
        ],
        subject_context: {
          verification: {
            request: {
              public_id: "22222222-2222-2222-2222-222222222222",
              status: "pending_admin_quality_review",
              subject_name: "Aman Jha",
              request_type: "employment",
              subject_user_id: "77777777-7777-7777-7777-777777777777",
            },
            evidence: [{ id: "doc-1" }, { id: "doc-2" }],
            organization_resolution: {
              organization_public_id: "88888888-8888-8888-8888-888888888888",
              organization_name: "Kairo Labs",
            },
            registry_resolution: {
              registry_record_public_id: "99999999-9999-9999-9999-999999999999",
              registry_name: "Kairo Labs Registry",
            },
          },
          verification_timeline: {
            timeline: {
              items: [{ id: "evt-1" }, { id: "evt-2" }, { id: "evt-3" }],
            },
          },
        },
      });
    });

    const adapter = createAdminRiskAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-22T12:00:00.000Z"),
      },
    });

    const result = await adapter.detail("11111111-1111-1111-1111-111111111111");

    expect(result.signals[0]).toMatchObject({
      signalType: "repeated_correction_cycles",
      source: "verification_workflow",
      severity: "high",
    });
    expect(result.notes[0]?.body).toBe("Initial triage complete.");
    expect(result.timeline[0]?.eventType).toBe("investigation_created");
    expect(result.subjectContext.verification).toMatchObject({
      id: "22222222-2222-2222-2222-222222222222",
      candidateUserId: "77777777-7777-7777-7777-777777777777",
      organizationPublicId: "88888888-8888-8888-8888-888888888888",
      registryRecordPublicId: "99999999-9999-9999-9999-999999999999",
      evidenceCount: 2,
      timelineCount: 3,
    });
  });

  it("creates investigations through the backend contract", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/admin/trust-safety/investigations");
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toEqual({
        subject_type: "user",
        subject_public_id: "77777777-7777-7777-7777-777777777777",
        summary: "Candidate requires manual review.",
        severity: "medium",
        signal_type: "manual_review",
      });
      return jsonResponse(
        {
          ...investigationListItem({
            subject_type: "user",
            subject_public_id: "77777777-7777-7777-7777-777777777777",
            subject_label: "Candidate Aman Jha",
            severity: "medium",
          }),
          signals: [],
          notes: [],
          timeline: [],
          subject_context: {
            user: {
              id: "77777777-7777-7777-7777-777777777777",
              display_name: "Aman Jha",
              account_status: "active",
              trust_summary: { status: "manual_review", overall_score: 42 },
              verification_summary: { total: 5 },
            },
          },
        },
        { status: 201 },
      );
    });

    const adapter = createAdminRiskAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-22T12:00:00.000Z"),
      },
    });

    const result = await adapter.create({
      subjectType: "user",
      subjectPublicId: "77777777-7777-7777-7777-777777777777",
      summary: "Candidate requires manual review.",
      severity: "medium",
    });

    expect(result.subjectType).toBe("user");
    expect(result.subjectContext.user?.displayName).toBe("Aman Jha");
  });

  it("loads trust safety overview summary from backend truth", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/admin/trust-safety/summary");
      return jsonResponse({
        open_investigations: 4,
        high_or_critical_investigations: 2,
        unassigned_investigations: 1,
        active_signals: 7,
      });
    });

    const adapter = createAdminRiskAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-22T12:00:00.000Z"),
      },
    });

    await expect(adapter.summary()).resolves.toEqual({
      openInvestigations: 4,
      highOrCriticalInvestigations: 2,
      unassignedInvestigations: 1,
      activeSignals: 7,
    });
  });

  it("loads trust safety assignees from the dedicated backend endpoint", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/admin/trust-safety/assignees");
      expect(url.searchParams.get("page")).toBe("1");
      expect(url.searchParams.get("page_size")).toBe("100");
      return jsonResponse({
        items: [
          {
            user_id: "33333333-3333-3333-3333-333333333333",
            full_name: "Aman Jha",
            email: "aman@example.com",
            role: "admin",
          },
        ],
        total: 1,
        page: 1,
        page_size: 100,
        total_pages: 1,
      });
    });

    const adapter = createAdminRiskAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-08-22T12:00:00.000Z"),
      },
    });

    await expect(adapter.listAssignees()).resolves.toEqual([
      {
        userId: "33333333-3333-3333-3333-333333333333",
        fullName: "Aman Jha",
        email: "aman@example.com",
        role: "admin",
      },
    ]);
  });
});
