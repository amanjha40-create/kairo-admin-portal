import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { resolveAppEnvConfig } from "@/config/env";
import { AUTH_TOKEN_KEY, type SessionStorageBag } from "@/features/admin/auth/session-storage";
import { ApiError } from "@/lib/api/errors";
import {
  adminOperationsKeys,
  adminVerificationReportQueryOptions,
  courtReceiptQueryOptions,
  courtReceiptsQueryOptions,
  createAdminOperationsAdapter,
  inPersonReceiptQueryOptions,
  inPersonReceiptsQueryOptions,
  organizationProvisioningQueryOptions,
} from "./admin-operations";

const ORGANIZATION_ID = "22222222-2222-4222-8222-222222222222";
const PERSON_ID = "33333333-3333-4333-8333-333333333333";
const COURT_ID = "44444444-4444-4444-8444-444444444444";
const IN_PERSON_ID = "55555555-5555-4555-8555-555555555555";

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

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function options(fetchImpl: typeof fetch) {
  return { storage: storage(), fetchImpl, now: () => new Date("2026-10-18T00:00:00.000Z") };
}

function courtBody() {
  return {
    public_id: COURT_ID,
    organization_public_id: ORGANIZATION_ID,
    person_public_id: PERSON_ID,
    status: "no_match_found",
    searched_at: "2026-10-18T08:00:00Z",
    jurisdiction: "Bengaluru District Courts",
    coverage: "Named public court indexes",
    search_period: "2016-2026",
    source: "Named court index",
    finding: null,
    remarks: "No matching record in stated scope.",
    limitations: "Sealed and unavailable records are excluded.",
    reviewer_user_id: "66666666-6666-4666-8666-666666666666",
    evidence_document_ids: ["77777777-7777-4777-8777-777777777777"],
    finalized_at: "2026-10-18T08:05:00Z",
    created_at: "2026-10-18T08:00:00Z",
    updated_at: "2026-10-18T08:05:00Z",
    semantic_notice: "A no-match result is scoped and is not criminal clearance.",
  };
}

function inPersonBody() {
  return {
    public_id: IN_PERSON_ID,
    organization_public_id: ORGANIZATION_ID,
    person_public_id: PERSON_ID,
    verification_type: "identity_observation",
    method: "in_person",
    performed_at: "2026-10-18T09:00:00Z",
    performed_by_user_id: "88888888-8888-4888-8888-888888888888",
    person_met: "Candidate",
    relationship: "Self",
    result: "observed_consistent",
    notes: "Identity document observed only.",
    evidence_document_ids: ["99999999-9999-4999-8999-999999999999"],
    changes_canonical_verification_status: false,
    permanent_address_check_credit: 0,
    created_at: "2026-10-18T09:00:00Z",
  };
}

function reportBody() {
  return {
    schema_version: "hr_verification_report_v1",
    header: {
      person_name: "Synthetic Candidate",
      role: "Analyst",
      person_id: PERSON_ID,
      initiated_at: "2026-10-17T00:00:00Z",
      requested_by_organization: "Synthetic Employer",
      masked_email: "sy*******@example.com",
      masked_phone: "+91 ******3210",
      consent_at: "2026-10-17T00:00:00Z",
      trust_score: 81,
      report_updated_at: "2026-10-18T09:00:00Z",
      report_status: "INTERIM",
    },
    check_summaries: [
      {
        check: "court_record_search",
        status: "DETAILS_MATCHED",
        updated_at: "2026-10-18T08:05:00Z",
        display_text: "No matching record in the stated scope.",
      },
    ],
    identity: [],
    employment: [],
    education: [],
    references: [
      {
        name: "Masked Reference",
        title_or_relationship: "Former manager",
        organization: "Synthetic Employer",
        known_for: null,
        request_date: null,
        follow_up_dates: [],
        response_date: "2026-10-18T07:00:00Z",
        status: "CONFIRMED",
        strengths: "Structured delivery",
        development_areas: null,
        rehire_response: "yes",
        comments: "Authorized internal Admin context.",
        evidence_id: null,
      },
    ],
    address: [],
    court_search: [
      {
        safe_subject_display: "Synthetic Candidate",
        scope: "Bengaluru District Courts",
        search_period: "2016-2026",
        searched_at: "2026-10-18T08:00:00Z",
        source: "Named court index",
        finding: null,
        evidence_id: "77777777-7777-4777-8777-777777777777",
        reviewer: "Admin reviewer",
        remarks: "No matching record in stated scope.",
        limitations: "Sealed records excluded.",
        status: "DETAILS_MATCHED",
      },
    ],
    open_items: [],
    hr_review_required: false,
    metadata: { internal_storage_key: "must-not-cross-adapter" },
  };
}

describe("Admin V1.1 read-adapter closure", () => {
  it("refetches canonical Court list/detail and supports a fresh hard-reload adapter", async () => {
    const paths: string[] = [];
    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input));
      paths.push(`${init?.method ?? "GET"} ${url.pathname}${url.search}`);
      if (init?.method === "POST") return response(courtBody(), 201);
      if (url.pathname.endsWith(COURT_ID)) return response(courtBody());
      return response({ items: [courtBody()], total: 1, page: 1, page_size: 100, total_pages: 1 });
    });
    const mutationAdapter = createAdminOperationsAdapter(config(), options(fetchImpl));
    await mutationAdapter.createCourtCheck(ORGANIZATION_ID, PERSON_ID, {
      status: "no_match_found",
      searchedAt: "2026-10-18T08:00:00Z",
      jurisdiction: "Bengaluru District Courts",
      coverage: "Named public court indexes",
      source: "Named court index",
      limitations: "Sealed records excluded.",
      evidenceDocumentIds: [],
      idempotencyKey: crypto.randomUUID(),
    });

    const hardReloadAdapter = createAdminOperationsAdapter(config(), options(fetchImpl));
    const list = await hardReloadAdapter.listCourtChecks(ORGANIZATION_ID, PERSON_ID);
    const detail = await hardReloadAdapter.getCourtCheck(ORGANIZATION_ID, PERSON_ID, COURT_ID);

    expect(list.items).toHaveLength(1);
    expect(detail).toMatchObject({ publicId: COURT_ID, finalizedAt: expect.any(String) });
    expect(paths.slice(-2)).toEqual([
      `GET /api/v1/admin/operations/organizations/${ORGANIZATION_ID}/people/${PERSON_ID}/court-checks?page=1&page_size=100`,
      `GET /api/v1/admin/operations/organizations/${ORGANIZATION_ID}/people/${PERSON_ID}/court-checks/${COURT_ID}`,
    ]);
  });

  it("refetches canonical in-person list/detail and supports a fresh hard-reload adapter", async () => {
    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith(IN_PERSON_ID)) return response(inPersonBody());
      return response({
        items: [inPersonBody()],
        total: 1,
        page: 1,
        page_size: 100,
        total_pages: 1,
      });
    });
    const hardReloadAdapter = createAdminOperationsAdapter(config(), options(fetchImpl));

    const list = await hardReloadAdapter.listInPersonVerifications(ORGANIZATION_ID, PERSON_ID);
    const detail = await hardReloadAdapter.getInPersonVerification(
      ORGANIZATION_ID,
      PERSON_ID,
      IN_PERSON_ID,
    );

    expect(list.items).toHaveLength(1);
    expect(detail).toMatchObject({
      publicId: IN_PERSON_ID,
      changesCanonicalVerificationStatus: false,
      permanentAddressCheckCredit: 0,
    });
  });

  it("rehydrates pending, expired, revoked, and accepted first-HR truth from masked status", async () => {
    const effectiveStatuses = ["pending", "expired", "revoked", "accepted"];
    let index = 0;
    const fetchImpl = vi.fn(async () => {
      const effective = effectiveStatuses[index++];
      return response({
        organization_public_id: ORGANIZATION_ID,
        member_present: effective === "accepted",
        owner_membership_present: effective === "accepted",
        first_hr_invitation: {
          invitation_public_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          invitee_email_masked: "ow***@example.com",
          status: effective === "expired" || effective === "revoked" ? "pending" : effective,
          effective_status: effective,
          expires_at: "2026-10-19T00:00:00Z",
          last_sent_at: "2026-10-18T00:00:00Z",
          delivery_failed_at: null,
        },
      });
    });

    for (const expected of effectiveStatuses) {
      const freshAdapter = createAdminOperationsAdapter(config(), options(fetchImpl));
      const status = await freshAdapter.getOrganizationProvisioning(ORGANIZATION_ID);
      expect(status.firstHrInvitation?.effectiveStatus).toBe(expected);
      expect(JSON.stringify(status)).not.toMatch(/opaque_token|owner@example\.com/);
    }
  });

  it("reads the authorized internal report through its Admin route and allowlists safe fields", async () => {
    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      expect(new URL(String(input)).pathname).toBe(
        `/api/v1/admin/organizations/${ORGANIZATION_ID}/people/${PERSON_ID}/verification-report`,
      );
      return response(reportBody());
    });
    const adapter = createAdminOperationsAdapter(config(), options(fetchImpl));

    const report = await adapter.getVerificationReport(ORGANIZATION_ID, PERSON_ID);

    expect(report).toMatchObject({
      schemaVersion: "hr_verification_report_v1",
      header: { maskedEmail: "sy*******@example.com", reportStatus: "INTERIM" },
      references: [{ comments: "Authorized internal Admin context." }],
    });
    expect(JSON.stringify(report)).not.toContain("internal_storage_key");
    expect(JSON.stringify(report)).not.toContain("must-not-cross-adapter");
  });

  it.each([
    [403, "forbidden"],
    [404, "not_found"],
  ])("preserves backend permission/isolation denial %s", async (status, code) => {
    const fetchImpl = vi.fn(async () =>
      response({ error: { code, message: "Access is not available." } }, status),
    );
    const adapter = createAdminOperationsAdapter(config(), options(fetchImpl));

    const failure = await adapter
      .getVerificationReport(ORGANIZATION_ID, PERSON_ID)
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status, details: { error: { code } } });
  });

  it("defines stable query keys for reloadable canonical reads", () => {
    expect(organizationProvisioningQueryOptions(ORGANIZATION_ID).queryKey).toEqual(
      adminOperationsKeys.provisioning(ORGANIZATION_ID),
    );
    expect(courtReceiptsQueryOptions(ORGANIZATION_ID, PERSON_ID).queryKey).toEqual(
      adminOperationsKeys.courtList(ORGANIZATION_ID, PERSON_ID),
    );
    expect(courtReceiptQueryOptions(ORGANIZATION_ID, PERSON_ID, COURT_ID).queryKey).toEqual(
      adminOperationsKeys.courtDetail(ORGANIZATION_ID, PERSON_ID, COURT_ID),
    );
    expect(inPersonReceiptsQueryOptions(ORGANIZATION_ID, PERSON_ID).queryKey).toEqual(
      adminOperationsKeys.inPersonList(ORGANIZATION_ID, PERSON_ID),
    );
    expect(inPersonReceiptQueryOptions(ORGANIZATION_ID, PERSON_ID, IN_PERSON_ID).queryKey).toEqual(
      adminOperationsKeys.inPersonDetail(ORGANIZATION_ID, PERSON_ID, IN_PERSON_ID),
    );
    expect(adminVerificationReportQueryOptions(ORGANIZATION_ID, PERSON_ID).queryKey).toEqual(
      adminOperationsKeys.verificationReport(ORGANIZATION_ID, PERSON_ID),
    );
  });

  it("renders receipt history and report data from queries rather than local receipt state", () => {
    const operations = readFileSync(
      new URL("../components/person-verification-operations-dialog.tsx", import.meta.url),
      "utf8",
    );
    const provisioning = readFileSync(
      new URL("../components/organization-provisioning-panel.tsx", import.meta.url),
      "utf8",
    );
    const createOrganization = readFileSync(
      new URL("../components/create-organization-dialog.tsx", import.meta.url),
      "utf8",
    );

    expect(operations).toContain("courtReceiptsQueryOptions");
    expect(operations).toContain("inPersonReceiptsQueryOptions");
    expect(operations).toContain("adminVerificationReportQueryOptions");
    expect(operations).not.toContain("useState<CourtCheck | null>");
    expect(operations).not.toContain("useState<InPersonVerificationReceipt | null>");
    expect(provisioning).toContain("organizationProvisioningQueryOptions");
    expect(provisioning).not.toContain("useState<FirstHrInvitation");
    expect(provisioning).toContain(
      "Resend requires the intended HR name and full work email again",
    );
    expect(createOrganization).toContain("organizationProvisioningQueryOptions");
    expect(createOrganization).not.toContain("useState<FirstHrInvitation");
    expect(createOrganization).toMatch(
      /Resend still requires the\s+intended HR name and full work email/,
    );
    expect(createOrganization).toContain('invitation?.effectiveStatus === "accepted"');
    expect(createOrganization).toContain("First HR claimed");
  });
});
