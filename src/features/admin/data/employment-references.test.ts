import { describe, expect, it, vi } from "vitest";
import { resolveAppEnvConfig } from "@/config/env";
import { AUTH_TOKEN_KEY, type SessionStorageBag } from "../auth/session-storage";
import { createAdminEmploymentReferencesAdapter } from "./employment-references";

function memoryStore() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

function storage(): SessionStorageBag {
  const bag = { local: memoryStore(), session: memoryStore() };
  bag.local.setItem(
    AUTH_TOKEN_KEY,
    JSON.stringify({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      tokenType: "bearer",
      expiresAt: "2027-01-01T00:00:00.000Z",
      signedInAt: "2026-10-12T00:00:00.000Z",
      remember: true,
    }),
  );
  return bag;
}

function config() {
  return resolveAppEnvConfig(
    {
      VITE_APP_ENV: "production",
      VITE_ADMIN_DEMO_MODE: "false",
      VITE_API_BASE_URL: "https://api.kairoid.com",
    },
    { dev: false },
  );
}

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("Admin employment references transport", () => {
  it("maps backend-authoritative invitation readiness without exposing contact details", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      json({
        summary: {
          employment_id: "employment-1",
          completed_count: 1,
          total_count: 2,
          hr_reference: { status: "completed", completed_at: "2026-10-11T08:00:00Z" },
          reporting_manager: {
            status: "ready_to_invite",
            completed_at: null,
            nomination_id: "nomination-1",
            relationship_confirmed_by_hr: true,
            invitation_sent_at: null,
            invitation_expires_at: null,
            invitation_blocked_reason: null,
          },
        },
        references: [
          {
            kind: "reporting_manager_reference",
            contact_provenance: "hr_confirmed",
            invitation: null,
          },
        ],
      }),
    );
    const adapter = createAdminEmploymentReferencesAdapter(config(), {
      production: {
        storage: storage(),
        fetchImpl: fetchImpl as typeof fetch,
        now: () => new Date("2026-10-12T00:00:00Z"),
      },
    });

    const result = await adapter.getOverview("employment-1");

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(String(fetchImpl.mock.calls[0][0])).toBe(
      "https://api.kairoid.com/api/v1/admin/employments/employment-1/references",
    );
    expect(result.reportingManager).toMatchObject({
      status: "ready_to_invite",
      nominationId: "nomination-1",
      relationshipConfirmedByHr: true,
    });
    expect(result.managerContactProvenance).toBe("hr_confirmed");
    expect(JSON.stringify(result)).not.toContain("work_email");
  });

  it("sends the certified payload once and maps only safe delivery metadata", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      json({
        delivery_status: "sent",
        sent_at: "2026-10-12T09:00:00Z",
        expires_at: "2026-10-13T09:00:00Z",
        idempotent: false,
      }),
    );
    const adapter = createAdminEmploymentReferencesAdapter(config(), {
      production: {
        storage: storage(),
        fetchImpl: fetchImpl as typeof fetch,
        now: () => new Date("2026-10-12T00:00:00Z"),
      },
    });

    const result = await adapter.sendManagerInvitation("employment-1", {
      nominationId: "nomination-1",
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
    });

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(String(fetchImpl.mock.calls[0][0])).toBe(
      "https://api.kairoid.com/api/v1/admin/employments/employment-1/references/reporting-manager/invite",
    );
    const request = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(request.method).toBe("POST");
    expect(JSON.parse(String(request.body))).toEqual({
      nomination_id: "nomination-1",
      idempotency_key: "11111111-1111-4111-8111-111111111111",
    });
    expect(result).toEqual({
      deliveryStatus: "sent",
      sentAt: "2026-10-12T09:00:00Z",
      expiresAt: "2026-10-13T09:00:00Z",
      idempotent: false,
    });
  });
});
