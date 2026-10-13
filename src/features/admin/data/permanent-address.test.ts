import { describe, expect, it, vi } from "vitest";
import { resolveAppEnvConfig } from "@/config/env";
import { AUTH_TOKEN_KEY, type SessionStorageBag } from "@/features/admin/auth/session-storage";
import { createPermanentAddressAdapter, isPermanentAddressContentPath } from "./permanent-address";

const CANDIDATE_ID = "11111111-1111-4111-8111-111111111111";
const VERSION_ID = "22222222-2222-4222-8222-222222222222";
const DOCUMENT_ID = "33333333-3333-4333-8333-333333333333";
const SESSION_ID = "44444444-4444-4444-8444-444444444444";
const IDEMPOTENCY_ID = "55555555-5555-4555-8555-555555555555";

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

function options(fetchImpl: typeof fetch) {
  const storage = createStorage();
  storage.local.setItem(
    AUTH_TOKEN_KEY,
    JSON.stringify({
      accessToken: "access",
      refreshToken: "refresh",
      tokenType: "bearer",
      expiresAt: "2027-10-14T12:00:00.000Z",
      signedInAt: "2026-10-14T08:00:00.000Z",
      remember: true,
    }),
  );
  return {
    storage,
    fetchImpl,
    now: () => new Date("2026-10-14T09:00:00.000Z"),
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function summary(overrides: Record<string, unknown> = {}) {
  return {
    candidate_id: CANDIDATE_ID,
    address_version_id: VERSION_ID,
    address_version: 1,
    overall_status: "DOCUMENT_REQUIRED",
    document_status: "REQUIRED",
    successful_location_checks: 0,
    required_location_checks: 3,
    today_complete: false,
    separate_days_required: true,
    cycle_expires_at: null,
    manual_review_status: null,
    pending_manual_review_target_available: false,
    manual_location_approval_eligible: false,
    active_target_source: null,
    current_attempt_state: null,
    ...overrides,
  };
}

describe("Permanent Address Admin adapter", () => {
  it("discovers required cases even when no document row exists", async () => {
    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/permanent-address/admin/reviews");
      expect(url.searchParams.get("limit")).toBe("20");
      expect(url.searchParams.get("offset")).toBe("0");
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer access");
      return jsonResponse({ items: [summary()], next_offset: null });
    });
    const adapter = createPermanentAddressAdapter(productionConfig(), options(fetchImpl));

    await expect(adapter.listReviews()).resolves.toMatchObject({
      items: [
        {
          candidateId: CANDIDATE_ID,
          documentStatus: "REQUIRED",
          successfulLocationChecks: 0,
          overallStatus: "DOCUMENT_REQUIRED",
        },
      ],
      nextOffset: null,
    });
  });

  it("maps safe detail fields and drops forbidden backend extras", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        permanent_address: summary({
          overall_status: "NEEDS_REVIEW",
          manual_review_status: "waiting_for_address_document",
        }),
        claimed_address: {
          address_line_1: "123 Review Street",
          address_line_2: null,
          locality: "Test Locality",
          city: "Bengaluru",
          state: "Karnataka",
          postal_code: "560001",
          country: "IN",
        },
        document: {
          present: false,
          document_id: null,
          document_type: null,
          upload_state: null,
          review_state: "REQUIRED",
          uploaded_at: null,
          issued_on: null,
          reviewed_at: null,
          preview_available: false,
          content_path: null,
          object_key: "must-not-map",
        },
        latest_attempt: null,
        versions: [
          {
            address_version_id: VERSION_ID,
            address_version: 1,
            current: true,
            created_at: "2026-10-14T08:00:00Z",
            invalidated_at: null,
          },
        ],
        audit: [{ action: "submitted", at: "2026-10-14T08:01:00Z" }],
        latitude: 12.34,
        longitude: 56.78,
        pending_target_encrypted: "secret",
        raw_provider_json: { unsafe: true },
      }),
    );
    const adapter = createPermanentAddressAdapter(productionConfig(), options(fetchImpl));
    const result = await adapter.getCandidate(CANDIDATE_ID);
    const serialized = JSON.stringify(result);

    expect(result.document).toMatchObject({ present: false, reviewState: "REQUIRED" });
    expect(result.claimedAddress?.postalCode).toBe("560001");
    expect(serialized).not.toContain("latitude");
    expect(serialized).not.toContain("longitude");
    expect(serialized).not.toContain("encrypted");
    expect(serialized).not.toContain("object_key");
    expect(serialized).not.toContain("raw_provider_json");
  });

  it("sends the exact explicit document decision contract", async () => {
    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      expect(new URL(String(input)).pathname).toBe(
        `/api/v1/permanent-address/document-reviews/${VERSION_ID}/decision`,
      );
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toEqual({
        document_id: DOCUMENT_ID,
        idempotency_key: IDEMPOTENCY_ID,
        outcome: "APPROVE_MATCHING",
        inspected_document: true,
        candidate_identity_matches: true,
        document_acceptable: true,
        address_matches: true,
      });
      return jsonResponse({
        document_status: "MATCH",
        reviewed_at: "2026-10-14T09:10:00Z",
      });
    });
    const adapter = createPermanentAddressAdapter(productionConfig(), options(fetchImpl));

    await expect(
      adapter.decideDocument(VERSION_ID, {
        documentId: DOCUMENT_ID,
        idempotencyKey: IDEMPOTENCY_ID,
        outcome: "APPROVE_MATCHING",
        inspectedDocument: true,
        candidateIdentityMatches: true,
        documentAcceptable: true,
        addressMatches: true,
      }),
    ).resolves.toEqual({ documentStatus: "MATCH", reviewedAt: "2026-10-14T09:10:00Z" });
  });

  it("sends only the canonical manual-location resolution fields", async () => {
    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      expect(new URL(String(input)).pathname).toBe(
        `/api/v1/permanent-address/location-reviews/${VERSION_ID}/sessions/${SESSION_ID}/resolution`,
      );
      expect(JSON.parse(String(init?.body))).toEqual({
        candidate_id: CANDIDATE_ID,
        idempotency_key: IDEMPOTENCY_ID,
        outcome: "APPROVE_ONSITE_LOCATION",
      });
      return jsonResponse({
        outcome: "APPROVE_ONSITE_LOCATION",
        reviewed_at: "2026-10-14T09:20:00Z",
        reviewer_id: "66666666-6666-4666-8666-666666666666",
        audit_event_id: "77777777-7777-4777-8777-777777777777",
        idempotency_key: IDEMPOTENCY_ID,
      });
    });
    const adapter = createPermanentAddressAdapter(productionConfig(), options(fetchImpl));

    await expect(
      adapter.resolveManualLocation(VERSION_ID, SESSION_ID, {
        candidateId: CANDIDATE_ID,
        idempotencyKey: IDEMPOTENCY_ID,
        outcome: "APPROVE_ONSITE_LOCATION",
      }),
    ).resolves.toMatchObject({ outcome: "APPROVE_ONSITE_LOCATION" });
  });

  it("loads protected document bytes through bearer auth without exposing a storage URL", async () => {
    const path = `/api/v1/permanent-address/reviews/${VERSION_ID}/content`;
    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      expect(new URL(String(input)).pathname).toBe(path);
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer access");
      expect(new Headers(init?.headers).get("accept")).toBe("*/*");
      return new Response("document bytes", {
        headers: { "content-type": "application/pdf" },
      });
    });
    const adapter = createPermanentAddressAdapter(productionConfig(), options(fetchImpl));

    const blob = await adapter.getDocumentContent(path);
    expect(blob.type).toBe("application/pdf");
    await expect(blob.text()).resolves.toBe("document bytes");
  });

  it("rejects arbitrary content paths before making a request", async () => {
    const fetchImpl = vi.fn();
    const adapter = createPermanentAddressAdapter(productionConfig(), options(fetchImpl));

    await expect(adapter.getDocumentContent("https://storage.example/private.pdf")).rejects.toThrow(
      "protected document preview path is invalid",
    );
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(
      isPermanentAddressContentPath(`/api/v1/permanent-address/reviews/${VERSION_ID}/content`),
    ).toBe(true);
  });
});
