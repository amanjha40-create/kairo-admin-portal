import { readFileSync } from "node:fs";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { resolveAppEnvConfig } from "@/config/env";
import { AUTH_TOKEN_KEY, type SessionStorageBag } from "@/features/admin/auth/session-storage";
import {
  adminOperationsKeys,
  courtReceiptQueryOptions,
  getFirstHrInvitationAction,
  refreshCourtReceiptCache,
  rehydrateOrganizationProvisioning,
  type OrganizationProvisioningStatus,
} from "./admin-operations";

const ORGANIZATION_ID = "22222222-2222-4222-8222-222222222222";
const PERSON_ID = "33333333-3333-4333-8333-333333333333";
const COURT_ID = "44444444-4444-4444-8444-444444444444";
const INVITATION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function store() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

function storage(): SessionStorageBag {
  const bag = { local: store(), session: store() };
  bag.local.setItem(
    AUTH_TOKEN_KEY,
    JSON.stringify({
      accessToken: "safe-access-token",
      refreshToken: "safe-refresh-token",
      tokenType: "bearer",
      expiresAt: "2099-01-01T00:00:00.000Z",
      signedInAt: "2026-10-18T00:00:00.000Z",
      remember: true,
    }),
  );
  return bag;
}

function config() {
  return resolveAppEnvConfig(
    {
      VITE_APP_ENV: "staging",
      VITE_ADMIN_DEMO_MODE: "false",
      VITE_API_BASE_URL: "https://staging-api.kairoid.com",
    },
    { dev: false },
  );
}

function options(fetchImpl: typeof fetch) {
  return { storage: storage(), fetchImpl, now: () => new Date("2026-10-18T00:00:00.000Z") };
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function courtBody(overrides: Record<string, unknown> = {}) {
  return {
    public_id: COURT_ID,
    organization_public_id: ORGANIZATION_ID,
    person_public_id: PERSON_ID,
    status: "pending",
    searched_at: null,
    jurisdiction: "Bengaluru District Courts",
    coverage: "Named public court indexes",
    search_period: "2016-2026",
    source: "Named court index",
    finding: null,
    remarks: null,
    limitations: "Sealed and unavailable records are excluded.",
    reviewer_user_id: null,
    evidence_document_ids: [],
    finalized_at: null,
    created_at: "2026-10-18T08:00:00Z",
    updated_at: "2026-10-18T08:00:00Z",
    semantic_notice: "A no-match result is scoped and is not criminal clearance.",
    ...overrides,
  };
}

function provisioning({
  memberPresent = false,
  ownerMembershipPresent = false,
  status,
  effectiveStatus = status,
}: {
  memberPresent?: boolean;
  ownerMembershipPresent?: boolean;
  status?: string;
  effectiveStatus?: string;
} = {}): OrganizationProvisioningStatus {
  return {
    organizationPublicId: ORGANIZATION_ID,
    memberPresent,
    ownerMembershipPresent,
    firstHrInvitation: status
      ? {
          invitationPublicId: INVITATION_ID,
          inviteeEmailMasked: "ow***@example.com",
          status,
          effectiveStatus: effectiveStatus ?? status,
        }
      : undefined,
  };
}

describe("Admin V1.1 final compatibility closure", () => {
  it("invalidates Court list and exact detail before bypassing a fresh 60-second cache", async () => {
    let canonical = courtBody();
    const fetchImpl = vi.fn(async () => response(canonical));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
    });
    const apiOptions = options(fetchImpl);
    const detailOptions = courtReceiptQueryOptions(
      ORGANIZATION_ID,
      PERSON_ID,
      COURT_ID,
      config(),
      apiOptions,
    );
    const pending = await queryClient.fetchQuery(detailOptions);
    queryClient.setQueryData(adminOperationsKeys.courtList(ORGANIZATION_ID, PERSON_ID), {
      items: [pending],
      total: 1,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    });
    const invalidations = vi.spyOn(queryClient, "invalidateQueries");

    canonical = courtBody({
      status: "no_match_found",
      searched_at: "2026-10-18T08:05:00Z",
      finalized_at: "2026-10-18T08:06:00Z",
      updated_at: "2026-10-18T08:06:00Z",
    });
    const refreshed = await refreshCourtReceiptCache(
      queryClient,
      ORGANIZATION_ID,
      PERSON_ID,
      COURT_ID,
      config(),
      apiOptions,
    );

    expect(refreshed).toMatchObject({ status: "no_match_found", finalizedAt: expect.any(String) });
    expect(queryClient.getQueryData(detailOptions.queryKey)).toEqual(refreshed);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(invalidations).toHaveBeenCalledWith({
      queryKey: adminOperationsKeys.courtList(ORGANIZATION_ID, PERSON_ID),
    });
    expect(invalidations).toHaveBeenCalledWith({
      queryKey: adminOperationsKeys.courtDetail(ORGANIZATION_ID, PERSON_ID, COURT_ID),
      refetchType: "none",
    });
  });

  it.each(["expired", "declined", "cancelled", "revoked"])(
    "uses a new invitation instead of invalid resend for stored terminal status %s",
    (status) => {
      expect(getFirstHrInvitationAction(provisioning({ status }))).toBe("invite");
    },
  );

  it.each(["pending", "expired", "revoked", "delivery_failed"])(
    "preserves backend-supported recovery for stored pending / effective %s",
    (effectiveStatus) => {
      expect(getFirstHrInvitationAction(provisioning({ status: "pending", effectiveStatus }))).toBe(
        "resend",
      );
    },
  );

  it("blocks invitation actions for any existing membership and presents accepted owner truth", () => {
    expect(getFirstHrInvitationAction(provisioning())).toBe("invite");
    expect(
      getFirstHrInvitationAction(provisioning({ memberPresent: true, status: "pending" })),
    ).toBe("none");
    expect(
      getFirstHrInvitationAction(
        provisioning({
          memberPresent: true,
          ownerMembershipPresent: true,
          status: "accepted",
        }),
      ),
    ).toBe("none");
  });

  it("rehydrates persisted delivery failure with a GET and selects recovery without duplicate create", async () => {
    const fetchImpl = vi.fn(async (_input: URL | RequestInfo, init?: RequestInit) => {
      expect(init?.method).toBeUndefined();
      return response({
        organization_public_id: ORGANIZATION_ID,
        member_present: false,
        owner_membership_present: false,
        first_hr_invitation: {
          invitation_public_id: INVITATION_ID,
          invitee_email_masked: "ow***@example.com",
          status: "pending",
          effective_status: "delivery_failed",
          expires_at: "2026-10-19T00:00:00Z",
          last_sent_at: "2026-10-18T00:00:00Z",
          delivery_failed_at: "2026-10-18T00:00:01Z",
        },
      });
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const state = await rehydrateOrganizationProvisioning(
      queryClient,
      ORGANIZATION_ID,
      config(),
      options(fetchImpl),
    );

    expect(state.firstHrInvitation).toMatchObject({
      status: "pending",
      effectiveStatus: "delivery_failed",
      deliveryFailedAt: expect.any(String),
    });
    expect(getFirstHrInvitationAction(state)).toBe("resend");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("keeps unlinked receipt reads visible while guarding every linked-Candidate write path", () => {
    const operations = readFileSync(
      new URL("../components/person-verification-operations-dialog.tsx", import.meta.url),
      "utf8",
    );

    expect(operations).not.toContain(") : !person.linkedUserId ? (");
    expect(operations.match(/Existing scoped receipts remain readable/g)).toHaveLength(2);
    expect(operations).toContain("courtReceiptsQueryOptions(organizationId, person.id)");
    expect(operations).toContain("inPersonReceiptsQueryOptions(organizationId, person.id)");
    expect(operations).toContain("Link a canonical Candidate before writing Court data.");
    expect(operations).toContain("Link a canonical Candidate before finalizing Court data.");
    expect(operations).toContain(
      "Link a canonical Candidate before recording an in-person observation.",
    );
    expect(operations).toContain("{candidateId ? (");
  });

  it("wires delivery errors and canonical membership truth into both first-HR surfaces", () => {
    const panel = readFileSync(
      new URL("../components/organization-provisioning-panel.tsx", import.meta.url),
      "utf8",
    );
    const dialog = readFileSync(
      new URL("../components/create-organization-dialog.tsx", import.meta.url),
      "utf8",
    );

    for (const source of [panel, dialog]) {
      expect(source.match(/rehydrateOrganizationProvisioning/g)?.length).toBeGreaterThanOrEqual(3);
      expect(source).toContain('invitationAction !== "none"');
      expect(source).toContain("Send new first HR invitation");
      expect(source).toContain("Recover first HR invitation");
      expect(source).toContain("ownerMembershipPresent");
      expect(source).toContain("memberPresent");
    }
    expect(panel).toContain(
      "The backend rejects first-HR invitations while any organization membership exists.",
    );
    expect(dialog).not.toContain("Lifecycle: Awaiting first HR claim");
    expect(dialog).not.toContain("Owner membership present: No");
  });
});
