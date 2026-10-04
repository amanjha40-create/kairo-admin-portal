import { describe, expect, it, vi } from "vitest";
import { resolveAppEnvConfig } from "@/config/env";
import { AUTH_TOKEN_KEY, type SessionStorageBag } from "@/features/admin/auth/session-storage";
import { ApiError } from "@/lib/api/errors";
import { buildCompanySearchPath, createCompany360DataAdapter } from "./organizations";

function createStore() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

function createStorage(): SessionStorageBag {
  return { local: createStore(), session: createStore() };
}

function productionConfig() {
  return resolveAppEnvConfig(
    {
      VITE_APP_ENV: "production",
      VITE_ADMIN_DEMO_MODE: "false",
      VITE_API_BASE_URL: "https://api.kairoid.com",
    },
    { dev: false },
  );
}

function demoConfig() {
  return resolveAppEnvConfig(
    { VITE_APP_ENV: "development", VITE_ADMIN_DEMO_MODE: "true" },
    { dev: true },
  );
}

function seedTokens(storage: SessionStorageBag) {
  storage.local.setItem(
    AUTH_TOKEN_KEY,
    JSON.stringify({
      accessToken: "access",
      refreshToken: "refresh",
      tokenType: "bearer",
      expiresAt: "2026-10-04T12:00:00.000Z",
      signedInAt: "2026-10-04T08:00:00.000Z",
      remember: true,
    }),
  );
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function backendPage<T>(items: T[]) {
  return { items, total: items.length, page: 1, page_size: 20, total_pages: items.length ? 1 : 0 };
}

function options(fetchImpl: typeof fetch) {
  const storage = createStorage();
  seedTokens(storage);
  return {
    storage,
    fetchImpl,
    now: () => new Date("2026-10-04T09:00:00.000Z"),
  };
}

describe("Company 360 data adapter", () => {
  it("uses backend-driven partial search, filters, and pagination", async () => {
    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/admin/organizations");
      expect(url.searchParams.get("search")).toBe("XYZ Pharma");
      expect(url.searchParams.get("organization_type")).toBe("employer");
      expect(url.searchParams.get("status")).toBe("active");
      expect(url.searchParams.get("page")).toBe("2");
      expect(url.searchParams.get("page_size")).toBe("25");
      return jsonResponse(
        backendPage([
          {
            public_id: "11111111-1111-1111-1111-111111111111",
            name: "XYZ Pharma",
            domain: "xyzpharma.test",
            organization_type: "employer",
            account_status: "active",
            verification_state: "verified",
            is_workspace_customer: true,
            people_count: 126,
            request_count: 284,
            verified_count: 241,
            pending_count: 31,
            in_progress_count: 8,
            needs_attention_count: 4,
            team_size: 6,
            updated_at: "2026-10-04T08:00:00Z",
          },
        ]),
      );
    });
    const adapter = createCompany360DataAdapter(productionConfig(), options(fetchImpl));

    const result = await adapter.searchCompanies({
      search: "XYZ Pharma",
      organizationType: "employer",
      status: "active",
      page: 2,
      pageSize: 25,
    });

    expect(result.items[0]).toMatchObject({
      name: "XYZ Pharma",
      peopleCount: 126,
      requestCount: 284,
      verifiedCount: 241,
      pendingCount: 31,
      isWorkspaceCustomer: true,
    });
  });

  it("maps Company 360 overview without inventing unsupported metrics", async () => {
    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.pathname).toContain("/overview");
      return jsonResponse({
        people_count: 5,
        verification_total: 8,
        verified_count: 4,
        pending_count: 2,
        in_progress_count: 1,
        needs_attention_count: 1,
        cancelled_count: 0,
        withdrawn_count: 0,
        completion_rate: 57.1,
        completion_rate_numerator: 4,
        completion_rate_denominator: 7,
        status_counts: { verified: 4, pending_admin_review: 2, in_progress: 1, rejected: 1 },
        type_counts: { employment: 6, education: 2 },
      });
    });
    const adapter = createCompany360DataAdapter(productionConfig(), options(fetchImpl));

    const overview = await adapter.getOverview("11111111-1111-1111-1111-111111111111");

    expect(overview.completionRate).toBe(57.1);
    expect(overview.statusCounts).toEqual({
      verified: 4,
      pending_admin_review: 2,
      in_progress: 1,
      rejected: 1,
    });
    expect(overview.typeCounts).toEqual({ employment: 6, education: 2 });
    expect(overview).not.toHaveProperty("averageCompletionTime");
  });

  it("keeps people and verification requests scoped to the selected organization", async () => {
    const organizationId = "11111111-1111-1111-1111-111111111111";
    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.pathname.startsWith(`/api/v1/admin/organizations/${organizationId}/`)).toBe(true);
      if (url.pathname.endsWith("/people")) {
        expect(url.searchParams.get("search")).toBe("Candidate");
        return jsonResponse(
          backendPage([
            {
              public_id: "22222222-2222-2222-2222-222222222222",
              linked_user_public_id: "33333333-3333-3333-3333-333333333333",
              display_name: "Candidate One",
              email_masked: "ca*******@example.test",
              relationship: "candidate",
              lifecycle_status: "active",
              verification_request_count: 3,
              verified_count: 2,
              pending_count: 1,
              last_activity_at: "2026-10-04T08:00:00Z",
            },
          ]),
        );
      }
      expect(url.pathname.endsWith("/verifications")).toBe(true);
      expect(url.searchParams.get("verification_type")).toBe("employment");
      return jsonResponse(
        backendPage([
          {
            public_id: "44444444-4444-4444-4444-444444444444",
            organization_person_public_id: "22222222-2222-2222-2222-222222222222",
            candidate_name: "Candidate One",
            candidate_email_masked: "ca*******@example.test",
            request_type: "employment",
            requested_by: "Workspace Owner",
            created_at: "2026-10-01T08:00:00Z",
            status: "verified",
            completed_at: "2026-10-03T08:00:00Z",
            updated_at: "2026-10-03T08:00:00Z",
          },
        ]),
      );
    });
    const adapter = createCompany360DataAdapter(productionConfig(), options(fetchImpl));

    const people = await adapter.listPeople(organizationId, { search: "Candidate" });
    const requests = await adapter.listVerifications(organizationId, {
      verificationType: "employment",
    });

    expect(people.items[0]?.linkedUserId).toBe("33333333-3333-3333-3333-333333333333");
    expect(requests.items[0]?.id).toBe("44444444-4444-4444-4444-444444444444");
  });

  it("returns empty backend pages without mock fallback", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(backendPage([])));
    const adapter = createCompany360DataAdapter(productionConfig(), options(fetchImpl));
    await expect(adapter.searchCompanies()).resolves.toMatchObject({ items: [], total: 0 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("surfaces authorization and backend failures", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: { code: "forbidden", message: "Insufficient permissions" } }, 403),
    );
    const adapter = createCompany360DataAdapter(productionConfig(), options(fetchImpl));

    await expect(adapter.searchCompanies()).rejects.toMatchObject({
      code: "forbidden",
      status: 403,
    });
  });

  it("does not provide mock company metrics in Demo Mode", async () => {
    const fetchImpl = vi.fn();
    const adapter = createCompany360DataAdapter(demoConfig(), { fetchImpl });

    await expect(adapter.searchCompanies()).rejects.toBeInstanceOf(ApiError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("builds a stable backend search URL", () => {
    expect(
      buildCompanySearchPath({
        search: "Acme",
        status: "all",
        organizationType: "all",
        page: 1,
        pageSize: 20,
      }),
    ).toBe("/api/v1/admin/organizations?page=1&page_size=20&search=Acme");
  });
});
