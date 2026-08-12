import { describe, expect, it, vi } from "vitest";
import { resolveAppEnvConfig } from "@/config/env";
import { AUTH_TOKEN_KEY, type SessionStorageBag } from "@/features/admin/auth/session-storage";
import { createRegistryDataAdapter } from "./registry";

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

function registryRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    public_id: "11111111-1111-1111-1111-111111111111",
    registry_code: "KR-ORG-TEST1234",
    legal_name: "Kairo Test University",
    display_name: "Kairo University",
    organization_type: "educational_institution",
    country: "IN",
    state_province: "Karnataka",
    website: "https://university.kairo.test",
    lifecycle_status: "active",
    trust_status: "trusted",
    registry_confidence_score: 95,
    trust_metadata: {},
    created_at: "2026-07-28T08:00:00.000Z",
    updated_at: "2026-07-28T09:00:00.000Z",
    aliases: ["Kairo Institute"],
    domain: "university.kairo.test",
    state: "verified",
    active_case_count: 3,
    total_verifications: 9,
    aliases_count: 1,
    identifiers_count: 0,
    relationship_count: 0,
    capabilities_count: 0,
    linked_organization_count: 0,
    possible_duplicate_ids: ["22222222-2222-2222-2222-222222222222"],
    registry_flags: ["possible_duplicate"],
    ...overrides,
  };
}

describe("registry data adapter", () => {
  it("loads the backend registry list successfully", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/admin/trust-registry");
      expect(url.searchParams.get("paginate")).toBe("true");
      expect(url.searchParams.get("page")).toBe("1");
      expect(url.searchParams.get("page_size")).toBe("10");
      return jsonResponse({
        items: [registryRecord()],
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
      });
    });

    const adapter = createRegistryDataAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    const result = await adapter.listOrganizations();

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      canonicalName: "Kairo University",
      country: "IN",
      domain: "university.kairo.test",
      state: "verified",
      activeCaseCount: 3,
      totalVerifications: 9,
    });
  });

  it("supports backend search, filters, and pagination", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/admin/trust-registry/search");
      expect(url.searchParams.get("search")).toBe("Kairo");
      expect(url.searchParams.get("status")).toBe("verified");
      expect(url.searchParams.get("page")).toBe("2");
      expect(url.searchParams.get("page_size")).toBe("1");
      return jsonResponse({
        items: [registryRecord({ public_id: "33333333-3333-3333-3333-333333333333" })],
        total: 2,
        page: 2,
        page_size: 1,
        total_pages: 2,
      });
    });

    const adapter = createRegistryDataAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    const result = await adapter.listOrganizations({
      query: "Kairo",
      state: "verified",
      page: 2,
      pageSize: 1,
    });

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(1);
    expect(result.totalPages).toBe(2);
    expect(result.items[0]?.id).toBe("33333333-3333-3333-3333-333333333333");
  });

  it("maps an empty backend registry list without falling back to mock data", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/api/v1/admin/trust-registry")) {
        return jsonResponse({
          items: [],
          total: 0,
          page: 1,
          page_size: 10,
          total_pages: 0,
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createRegistryDataAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    await expect(adapter.listOrganizations()).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    });
  });

  it("loads backend registry metrics", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/api/v1/admin/trust-registry/metrics")) {
        return jsonResponse({
          total: 6,
          verified: 4,
          unverified: 1,
          duplicates: 1,
          contacts_approved: 7,
          contacts_bounced: 2,
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createRegistryDataAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    await expect(adapter.getMetrics()).resolves.toEqual({
      total: 6,
      employers: 0,
      institutions: 0,
      verified: 4,
      unverified: 1,
      duplicates: 1,
      unresolvedOrganizations: 0,
      linkedOrganizations: 0,
      contactsApproved: 7,
      contactsBounced: 2,
    });
  });

  it("loads registry detail, aliases, lifecycle state, duplicates, masked contacts, and activity", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/api/v1/admin/trust-registry/11111111-1111-1111-1111-111111111111")) {
        return jsonResponse({
          ...registryRecord(),
          domains: [],
          alias_items: [],
          identifiers: [],
          capabilities: [],
          relationships: [],
          verification_requests: [],
          linked_organizations: [],
          merge_history: [],
          contacts: [
            {
              public_id: "44444444-4444-4444-4444-444444444444",
              name: "Operations Desk",
              role: "shared_inbox",
              email_masked: "o•••••••••@kairo.test",
              state: "approved",
              added_by: "system",
              added_at: "2026-07-27T10:00:00.000Z",
              last_successful_use: "2026-07-28T07:00:00.000Z",
            },
          ],
          activity: [
            {
              public_id: "55555555-5555-5555-5555-555555555555",
              at: "2026-07-28T08:30:00.000Z",
              kind: "admin_reviewed",
              actor: "system",
              description: "Admin reviewed duplicate indicators.",
            },
          ],
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createRegistryDataAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    const detail = await adapter.getOrganization("11111111-1111-1111-1111-111111111111");

    expect(detail).toMatchObject({
      aliases: ["Kairo Institute"],
      lifecycleStatus: "active",
      trustStatus: "trusted",
      possibleDuplicateIds: ["22222222-2222-2222-2222-222222222222"],
      possibleDuplicateLinks: [
        {
          id: "22222222-2222-2222-2222-222222222222",
          label: "22222222-2222-2222-2222-222222222222",
        },
      ],
    });
    expect(detail?.contacts[0]).toMatchObject({
      name: "Operations Desk",
      role: "shared_inbox",
      emailMasked: "o•••••••••@kairo.test",
      state: "approved",
    });
    expect(detail?.activity[0]).toMatchObject({
      kind: "admin_reviewed",
      actor: "system",
      description: "Admin reviewed duplicate indicators.",
    });
  });

  it("creates a registry organization and then reloads authoritative detail", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === "/api/v1/admin/trust-registry" && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toMatchObject({
          legal_name: "Platform QA Employer 0901",
          organization_type: "employer",
          country: "IN",
        });
        return jsonResponse({
          public_id: "66666666-6666-6666-6666-666666666666",
        });
      }

      if (url.pathname === "/api/v1/admin/trust-registry/66666666-6666-6666-6666-666666666666") {
        return jsonResponse({
          ...registryRecord({
            public_id: "66666666-6666-6666-6666-666666666666",
            legal_name: "Platform QA Employer 0901",
            display_name: "Platform QA Employer 0901",
            organization_type: "employer",
          }),
          domains: [],
          alias_items: [],
          identifiers: [],
          capabilities: [],
          relationships: [],
          verification_requests: [],
          linked_organizations: [],
          merge_history: [],
          contacts: [],
          activity: [],
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createRegistryDataAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    const created = await adapter.createOrganization({
      legalName: "Platform QA Employer 0901",
      organizationType: "employer",
      country: "IN",
    });

    expect(created).toMatchObject({
      id: "66666666-6666-6666-6666-666666666666",
      canonicalName: "Platform QA Employer 0901",
      orgType: "employer",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("uses the canonical merge endpoint without expecting an admin-detail payload", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input));
      if (
        url.pathname === "/api/v1/admin/trust-registry/11111111-1111-1111-1111-111111111111/merge"
      ) {
        expect(init?.method).toBe("POST");
        expect(JSON.parse(String(init?.body))).toMatchObject({
          target_registry_record_public_id: "22222222-2222-2222-2222-222222222222",
          merge_reason: "duplicate employer",
        });
        return jsonResponse({
          public_id: "77777777-7777-7777-7777-777777777777",
          source_registry_record_public_id: "11111111-1111-1111-1111-111111111111",
          target_registry_record_public_id: "22222222-2222-2222-2222-222222222222",
          merge_reason: "duplicate employer",
          metadata: {},
          created_at: "2026-07-28T08:45:00.000Z",
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createRegistryDataAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    await expect(
      adapter.mergeOrganization("11111111-1111-1111-1111-111111111111", {
        targetRegistryRecordPublicId: "22222222-2222-2222-2222-222222222222",
        mergeReason: "duplicate employer",
      }),
    ).resolves.toMatchObject({
      id: "77777777-7777-7777-7777-777777777777",
      otherOrganizationId: "22222222-2222-2222-2222-222222222222",
      mergeReason: "duplicate employer",
    });
  });

  it("treats a 401 registry response as unauthorized", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/api/v1/admin/trust-registry")) {
        return jsonResponse({ detail: "Unauthorized" }, { status: 401 });
      }
      if (url.includes("/api/v1/auth/refresh")) {
        return jsonResponse({ detail: "Unauthorized" }, { status: 401 });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createRegistryDataAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    await expect(adapter.listOrganizations()).rejects.toMatchObject({
      code: "unauthorized",
      status: 401,
    });
    expect(storage.local.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it("treats a 403 registry response as forbidden", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/api/v1/admin/trust-registry")) {
        return jsonResponse({ detail: "Forbidden" }, { status: 403 });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createRegistryDataAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    await expect(adapter.listOrganizations()).rejects.toMatchObject({
      code: "forbidden",
      status: 403,
    });
  });

  it("returns undefined for a missing registry detail record", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/api/v1/admin/trust-registry/unknown")) {
        return jsonResponse({ detail: "Not found" }, { status: 404 });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createRegistryDataAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    await expect(adapter.getOrganization("unknown")).resolves.toBeUndefined();
  });

  it("fails closed for registry detail when browser token storage is unavailable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("registry detail fetch should not run without browser storage");
    });

    const adapter = createRegistryDataAdapter(createProductionConfig(), {
      production: {
        storage: null,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    await expect(
      adapter.getOrganization("11111111-1111-1111-1111-111111111111"),
    ).rejects.toMatchObject({
      code: "unauthorized",
      status: 401,
      message: "Your session is no longer valid. Sign in again to continue.",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("surfaces backend registry errors without falling back to mock data", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/api/v1/admin/trust-registry")) {
        return jsonResponse({ detail: "Server error" }, { status: 500 });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createRegistryDataAdapter(createProductionConfig(), {
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    await expect(adapter.listOrganizations()).rejects.toMatchObject({
      code: "server",
      status: 500,
    });
  });

  it("keeps Demo Mode registry data unchanged", async () => {
    const adapter = createRegistryDataAdapter(createDemoConfig());
    const list = await adapter.listOrganizations();
    const metrics = await adapter.getMetrics();
    const detail = await adapter.getOrganization(list.items[0].id);

    expect(adapter.mode).toBe("demo");
    expect(list.items.length).toBeGreaterThan(0);
    expect(metrics.total).toBeGreaterThan(0);
    expect(detail?.aliases.length).toBeGreaterThanOrEqual(0);
  });

  it("never reads demo registry data when production mode is enabled", async () => {
    const storage = createMemoryStorage();
    seedTokens(storage);

    const demoLoader = vi.fn(async () => {
      throw new Error("demo list should not run");
    });
    const demoMetricsLoader = vi.fn(async () => {
      throw new Error("demo metrics should not run");
    });
    const demoDetailLoader = vi.fn(async () => {
      throw new Error("demo detail should not run");
    });
    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/metrics")) {
        return jsonResponse({
          total: 1,
          verified: 1,
          unverified: 0,
          duplicates: 0,
          contacts_approved: 0,
          contacts_bounced: 0,
        });
      }
      if (url.includes("/api/v1/admin/trust-registry/11111111-1111-1111-1111-111111111111")) {
        return jsonResponse({
          ...registryRecord(),
          domains: [],
          alias_items: [],
          identifiers: [],
          capabilities: [],
          relationships: [],
          verification_requests: [],
          linked_organizations: [],
          merge_history: [],
          contacts: [],
          activity: [],
        });
      }
      if (url.includes("/api/v1/admin/trust-registry")) {
        return jsonResponse({
          items: [registryRecord()],
          total: 1,
          page: 1,
          page_size: 10,
          total_pages: 1,
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const adapter = createRegistryDataAdapter(createProductionConfig(), {
      demoLoader,
      demoMetricsLoader,
      demoDetailLoader,
      production: {
        storage,
        fetchImpl,
        now: () => new Date("2026-07-28T12:00:00.000Z"),
      },
    });

    await expect(adapter.listOrganizations()).resolves.toMatchObject({
      total: 1,
    });
    await expect(adapter.getMetrics()).resolves.toMatchObject({
      total: 1,
    });
    await expect(
      adapter.getOrganization("11111111-1111-1111-1111-111111111111"),
    ).resolves.toMatchObject({
      id: "11111111-1111-1111-1111-111111111111",
    });
    expect(demoLoader).not.toHaveBeenCalled();
    expect(demoMetricsLoader).not.toHaveBeenCalled();
    expect(demoDetailLoader).not.toHaveBeenCalled();
  });
});
