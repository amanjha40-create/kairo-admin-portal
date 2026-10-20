import { describe, expect, it, vi } from "vitest";
import { resolveAppEnvConfig } from "@/config/env";
import { AUTH_TOKEN_KEY, type SessionStorageBag } from "@/features/admin/auth/session-storage";
import { ApiError } from "@/lib/api/errors";
import { createAdminOperationsAdapter, validateEvidenceFile } from "./admin-operations";

const CANDIDATE_ID = "11111111-1111-4111-8111-111111111111";
const ORGANIZATION_ID = "22222222-2222-4222-8222-222222222222";
const PERSON_ID = "33333333-3333-4333-8333-333333333333";

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

function candidateBody(claimStatus = "admin_created_unclaimed") {
  return {
    candidate_id: CANDIDATE_ID,
    full_name: "Assisted Candidate",
    email_masked: "a***@example.com",
    phone_masked: "+91******3210",
    claim_status: claimStatus,
    password_configured: false,
    email_verified: false,
    phone_verified: false,
    activation_expires_at: null,
    activation_last_sent_at: null,
    created_at: "2026-10-18T00:00:00Z",
  };
}

describe("Admin Operations V1.1 adapter", () => {
  it("creates an unclaimed Candidate without password or token fields", async () => {
    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      expect(new URL(String(input)).pathname).toBe("/api/v1/admin/operations/candidates");
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({
        full_name: "Assisted Candidate",
        email: "candidate@example.com",
        phone: "+919876543210",
      });
      expect(body).not.toHaveProperty("password");
      expect(body).not.toHaveProperty("token");
      return response(candidateBody(), 201);
    });
    const adapter = createAdminOperationsAdapter(config(), options(fetchImpl));

    const created = await adapter.createCandidate({
      fullName: "Assisted Candidate",
      email: "candidate@example.com",
      phone: "+919876543210",
      idempotencyKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });

    expect(created).toMatchObject({
      candidateId: CANDIDATE_ID,
      claimStatus: "admin_created_unclaimed",
      passwordConfigured: false,
    });
    expect(JSON.stringify(created)).not.toMatch(/password_hash|activation_token|opaque_token/i);
  });

  it.each([
    [409, "candidate_email_exists"],
    [409, "candidate_phone_exists"],
    [409, "candidate_unclaimed_exists"],
    [422, "validation"],
    [403, "forbidden"],
  ])("preserves safe Candidate create failure %s/%s", async (status, backendCode) => {
    const fetchImpl = vi.fn(async () =>
      response({ error: { code: backendCode, message: `Safe ${backendCode} message` } }, status),
    );
    const adapter = createAdminOperationsAdapter(config(), options(fetchImpl));

    const failure = await adapter
      .createCandidate({
        fullName: "Assisted Candidate",
        email: "candidate@example.com",
        idempotencyKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status, details: { error: { code: backendCode } } });
    expect(JSON.stringify(failure)).not.toMatch(/password|token/i);
  });

  it("uses the certified send/resend activation routes and exposes only safe lifecycle fields", async () => {
    const paths: string[] = [];
    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const path = new URL(String(input)).pathname;
      paths.push(path);
      return response(
        {
          candidate_id: CANDIDATE_ID,
          claim_status: "activation_pending",
          email_masked: "a***@example.com",
          expires_at: "2026-10-19T00:00:00Z",
          last_sent_at: "2026-10-18T00:00:00Z",
          resend_available_at: "2026-10-18T00:01:00Z",
          delivery_state: "queued",
        },
        path.endsWith("/activation") ? 201 : 200,
      );
    });
    const adapter = createAdminOperationsAdapter(config(), options(fetchImpl));

    const sent = await adapter.sendActivation(CANDIDATE_ID);
    const resent = await adapter.resendActivation(CANDIDATE_ID);

    expect(paths).toEqual([
      `/api/v1/admin/operations/candidates/${CANDIDATE_ID}/activation`,
      `/api/v1/admin/operations/candidates/${CANDIDATE_ID}/activation/resend`,
    ]);
    expect(sent.claimStatus).toBe("activation_pending");
    expect(resent.deliveryState).toBe("queued");
    expect(JSON.stringify([sent, resent])).not.toMatch(/token|password/i);
  });

  it("renders backend claim truth for expired-pending and claimed managed accounts", async () => {
    let claimed = false;
    const fetchImpl = vi.fn(async () =>
      response({
        ...candidateBody(claimed ? "claimed" : "activation_pending"),
        password_configured: claimed,
        email_verified: claimed,
        activation_expires_at: claimed ? null : "2026-10-17T00:00:00Z",
        activation_last_sent_at: claimed ? null : "2026-10-16T00:00:00Z",
      }),
    );
    const adapter = createAdminOperationsAdapter(config(), options(fetchImpl));

    const expiredPending = await adapter.getCandidate(CANDIDATE_ID);
    claimed = true;
    const claimedAccount = await adapter.getCandidate(CANDIDATE_ID);

    expect(expiredPending).toMatchObject({
      claimStatus: "activation_pending",
      activationExpiresAt: "2026-10-17T00:00:00Z",
      passwordConfigured: false,
    });
    expect(claimedAccount).toMatchObject({
      claimStatus: "claimed",
      passwordConfigured: true,
      emailVerified: true,
    });
  });

  it("preserves profile/Career provenance and never submits a verified state", async () => {
    const bodies: unknown[] = [];
    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const path = new URL(String(input)).pathname;
      bodies.push(JSON.parse(String(init?.body)));
      if (path.endsWith("/profile")) {
        return response({
          candidate_id: CANDIDATE_ID,
          claim_status: "admin_created_unclaimed",
          updated_fields: ["headline"],
          provenance_source: "admin_entered",
          candidate_confirmation_required: true,
        });
      }
      return response(
        {
          candidate_id: CANDIDATE_ID,
          claim_type: "employment",
          record_id: "44444444-4444-4444-8444-444444444444",
          updated_fields: ["company_name", "role_title"],
          provenance_source: "cv_extracted",
          verification_status: "draft",
        },
        201,
      );
    });
    const adapter = createAdminOperationsAdapter(config(), options(fetchImpl));

    const profile = await adapter.updateProfile(CANDIDATE_ID, {
      headline: "Operator-entered headline",
      source: "admin_entered",
    });
    const career = await adapter.mutateCareer(CANDIDATE_ID, {
      claimType: "employment",
      payload: { company_name: "Example Co", role_title: "Engineer" },
      source: "cv_extracted",
    });

    expect(profile.candidateConfirmationRequired).toBe(true);
    expect(career).toMatchObject({ provenanceSource: "cv_extracted", verificationStatus: "draft" });
    expect(JSON.stringify(bodies)).not.toContain('"verification_status"');
    expect(JSON.stringify(bodies)).not.toContain('"source_verified"');
  });

  it("preserves omitted profile fields and sends explicit null only for an intentional clear", async () => {
    const fetchImpl = vi.fn(async (_input: URL | RequestInfo, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({
        phone: null,
        headline: "Updated headline",
        source: "admin_entered",
      });
      return response({
        candidate_id: CANDIDATE_ID,
        claim_status: "admin_created_unclaimed",
        updated_fields: ["headline", "phone"],
        provenance_source: "admin_entered",
        candidate_confirmation_required: true,
      });
    });
    const adapter = createAdminOperationsAdapter(config(), options(fetchImpl));

    await adapter.updateProfile(CANDIDATE_ID, {
      phone: null,
      headline: "Updated headline",
      source: "admin_entered",
    });
  });

  it("reads, updates, and soft-deletes extended Career records through API42", async () => {
    const recordId = "44444444-4444-4444-8444-444444444444";
    const requests: Array<{ method: string; path: string; search: string; body?: unknown }> = [];
    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? "GET";
      requests.push({
        method,
        path: url.pathname,
        search: url.search,
        ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}),
      });
      if (method === "DELETE") {
        return response({
          candidate_id: CANDIDATE_ID,
          claim_type: "project",
          record_id: recordId,
          deleted: true,
        });
      }
      if (method === "PATCH") {
        return response({
          candidate_id: CANDIDATE_ID,
          claim_type: "project",
          record_id: recordId,
          updated_fields: ["role"],
          provenance_source: "admin_entered",
          verification_status: "draft",
        });
      }
      const item = {
        candidate_id: CANDIDATE_ID,
        claim_type: "project",
        record: {
          id: recordId,
          user_id: CANDIDATE_ID,
          title: "Canonical project",
          role: "Lead",
          description: null,
          start_date: "2025-01-01",
          end_date: null,
          is_ongoing: true,
          project_url: null,
          repository_url: null,
          organization_name: "Example",
          verification_status: "draft",
        },
      };
      if (url.pathname.endsWith("/career")) {
        return response({ items: [item], total: 1, page: 1, page_size: 100, total_pages: 1 });
      }
      return response(item);
    });
    const adapter = createAdminOperationsAdapter(config(), options(fetchImpl));

    const list = await adapter.listCareerRecords(CANDIDATE_ID, "project");
    const detail = await adapter.getCareerRecord(CANDIDATE_ID, "project", recordId);
    const updated = await adapter.mutateCareer(
      CANDIDATE_ID,
      { claimType: "project", payload: { role: null }, source: "admin_entered" },
      recordId,
    );
    const removed = await adapter.deleteCareerRecord(CANDIDATE_ID, "project", recordId);

    expect(list.items[0]).toMatchObject({
      candidateId: CANDIDATE_ID,
      claimType: "project",
      recordId,
      verificationStatus: "draft",
      payload: { title: "Canonical project", role: "Lead" },
    });
    expect(list.items[0]?.payload).not.toHaveProperty("user_id");
    expect(detail.recordId).toBe(recordId);
    expect(updated.updatedFields).toEqual(["role"]);
    expect(removed).toEqual({
      candidateId: CANDIDATE_ID,
      claimType: "project",
      recordId,
      deleted: true,
    });
    expect(requests).toEqual([
      {
        method: "GET",
        path: `/api/v1/admin/operations/candidates/${CANDIDATE_ID}/career`,
        search: "?claim_type=project&page=1&page_size=100",
      },
      {
        method: "GET",
        path: `/api/v1/admin/operations/candidates/${CANDIDATE_ID}/career/${recordId}`,
        search: "?claim_type=project",
      },
      {
        method: "PATCH",
        path: `/api/v1/admin/operations/candidates/${CANDIDATE_ID}/career/${recordId}`,
        search: "",
        body: { claim_type: "project", payload: { role: null }, source: "admin_entered" },
      },
      {
        method: "DELETE",
        path: `/api/v1/admin/operations/candidates/${CANDIDATE_ID}/career/${recordId}`,
        search: "?claim_type=project",
      },
    ]);
  });

  it("runs the existing CV parser/review/import contract without auto-import", async () => {
    const apiPaths: string[] = [];
    const requestBodies: Array<Record<string, unknown>> = [];
    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.hostname === "uploads.example.test") return new Response(null, { status: 200 });
      apiPaths.push(url.pathname);
      if (init?.body) requestBodies.push(JSON.parse(String(init.body)));
      if (url.pathname.endsWith("/upload-intent")) {
        return response(
          {
            resume_id: "55555555-5555-4555-8555-555555555555",
            upload_url: "https://uploads.example.test/cv",
            expires_in: 300,
            object_key: "private/redacted",
          },
          201,
        );
      }
      if (url.pathname.endsWith("/complete-upload")) {
        return response({ id: "55555555-5555-4555-8555-555555555555" });
      }
      if (url.pathname.endsWith("/process")) {
        return response({
          resume_id: "55555555-5555-4555-8555-555555555555",
          job_id: "66666666-6666-4666-8666-666666666666",
          status: "queued",
        });
      }
      if (url.pathname.endsWith("/parsed-result")) {
        return response({
          resume_id: "55555555-5555-4555-8555-555555555555",
          job_id: "66666666-6666-4666-8666-666666666666",
          schema_version: "resume_v1",
          status: "completed",
          structured_result: { employment: [] },
          warnings: [],
        });
      }
      if (url.pathname.endsWith("/review-session")) {
        return response(
          {
            id: "77777777-7777-4777-8777-777777777777",
            resume_id: "55555555-5555-4555-8555-555555555555",
            parsed_result_id: "88888888-8888-4888-8888-888888888888",
            status: "draft",
            schema_version: "resume_v1",
            version: 1,
            items: [],
            created_at: "2026-10-18T00:00:00Z",
            updated_at: "2026-10-18T00:00:00Z",
          },
          201,
        );
      }
      if (url.pathname.endsWith("/validate")) {
        return response({
          session_id: "77777777-7777-4777-8777-777777777777",
          ready: true,
          version: 2,
          items: [],
        });
      }
      return response(
        {
          id: "99999999-9999-4999-8999-999999999999",
          review_session_id: "77777777-7777-4777-8777-777777777777",
          status: "completed",
          total_count: 1,
          imported_count: 1,
          linked_count: 0,
          skipped_count: 0,
          failed_count: 0,
          blocked_count: 0,
          incomplete_count: 0,
          results: [],
        },
        201,
      );
    });
    const adapter = createAdminOperationsAdapter(config(), options(fetchImpl));
    const cv = new File([new TextEncoder().encode("%PDF-safe")], "candidate.pdf", {
      type: "application/pdf",
    });

    const processReceipt = await adapter.uploadResume(CANDIDATE_ID, cv);
    const parsed = await adapter.getParsedResume(CANDIDATE_ID, processReceipt.resumeId);
    const review = await adapter.createResumeReview(CANDIDATE_ID, processReceipt.resumeId);
    const plan = await adapter.validateReview(CANDIDATE_ID, review.id, review.version);
    const batch = await adapter.importReview(
      CANDIDATE_ID,
      review.id,
      plan.version,
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );

    expect(parsed.status).toBe("completed");
    expect(plan.ready).toBe(true);
    expect(batch.importedCount).toBe(1);
    expect(apiPaths.findIndex((path) => path.endsWith("/import"))).toBeGreaterThan(
      apiPaths.findIndex((path) => path.endsWith("/validate")),
    );
    expect(requestBodies.at(-1)).toMatchObject({ confirmed: true, expected_version: 2 });
  });

  it("sends the complete CV duplicate decision through the certified review-item route", async () => {
    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      expect(new URL(String(input)).pathname).toBe(
        `/api/v1/admin/operations/candidates/${CANDIDATE_ID}/resume-reviews/77777777-7777-4777-8777-777777777777/items/88888888-8888-4888-8888-888888888888`,
      );
      expect(JSON.parse(String(init?.body))).toEqual({
        expected_version: 3,
        selected: true,
        edited_payload: { claim_type: "employment", company_name: "Example Co" },
        import_action: "create_new",
        target_record_id: "99999999-9999-4999-8999-999999999999",
        confirm_distinct_role: true,
      });
      return response({
        id: "88888888-8888-4888-8888-888888888888",
        claim_type: "employment",
        source_claim_id: "employment-1",
        original_payload: { claim_type: "employment" },
        edited_payload: { claim_type: "employment", company_name: "Example Co" },
        selected: true,
        review_status: "edited",
        duplicate_status: "possible_match",
        duplicate_candidates: [],
        conflict_warnings: [],
        import_action: "create_new",
        target_record_id: "99999999-9999-4999-8999-999999999999",
        imported_record_type: null,
        imported_record_id: null,
        source_reference: null,
        confidence: 0.91,
        version: 4,
      });
    });
    const adapter = createAdminOperationsAdapter(config(), options(fetchImpl));

    const item = await adapter.updateReviewItem(
      CANDIDATE_ID,
      "77777777-7777-4777-8777-777777777777",
      "88888888-8888-4888-8888-888888888888",
      {
        expectedVersion: 3,
        selected: true,
        editedPayload: { claim_type: "employment", company_name: "Example Co" },
        importAction: "create_new",
        targetRecordId: "99999999-9999-4999-8999-999999999999",
        confirmDistinctRole: true,
      },
    );

    expect(item).toMatchObject({
      importAction: "create_new",
      duplicateStatus: "possible_match",
      version: 4,
    });
  });

  it("provisions an ownerless organization and rotates only the first-owner invitation", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const paths: string[] = [];
    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const path = new URL(String(input)).pathname;
      paths.push(path);
      bodies.push(JSON.parse(String(init?.body)));
      if (path.endsWith("/organizations")) {
        return response(
          {
            organization_public_id: ORGANIZATION_ID,
            name: "Example Employer",
            organization_type: "employer",
            lifecycle_state: "awaiting_first_hr_claim",
            verification_state: "setup_incomplete",
            setup_completed: false,
            owner_membership_present: false,
            created_at: "2026-10-18T00:00:00Z",
          },
          201,
        );
      }
      return response(
        {
          invitation_public_id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
          organization_public_id: ORGANIZATION_ID,
          invitee_email_masked: "h***@example.com",
          role: "owner",
          status: "pending",
          expires_at: "2026-10-19T00:00:00Z",
          last_sent_at: "2026-10-18T00:00:00Z",
          acceptance_path: "/team-invitations/accept?token={opaque_token}",
        },
        path.endsWith("/resend") ? 200 : 201,
      );
    });
    const adapter = createAdminOperationsAdapter(config(), options(fetchImpl));
    const organization = await adapter.createOrganization({
      name: "Example Employer",
      organizationType: "employer",
      idempotencyKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    const invitation = await adapter.inviteFirstHr(ORGANIZATION_ID, {
      fullName: "First Owner",
      email: "hr@example.com",
    });
    await adapter.resendFirstHr(ORGANIZATION_ID, invitation.invitationPublicId, {
      fullName: "First Owner",
      email: "hr@example.com",
    });

    expect(organization).toMatchObject({ ownerMembershipPresent: false, setupCompleted: false });
    expect(paths.at(-1)).toContain("/first-hr-invitations/");
    expect(bodies.slice(1)).toEqual([
      { full_name: "First Owner", email: "hr@example.com", role: "owner" },
      { full_name: "First Owner", email: "hr@example.com", role: "owner" },
    ]);
    expect(invitation.acceptancePath).toBe("/team-invitations/accept?token={opaque_token}");
    expect(JSON.stringify([organization, invitation])).not.toMatch(
      /password|token=[A-Za-z0-9_-]{20,}/i,
    );
  });

  it("records all Court states and finalizes through the canonical scoped route", async () => {
    const statuses = [
      "pending",
      "no_match_found",
      "match_found",
      "review_required",
      "unable_to_complete",
    ] as const;
    let index = 0;
    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const path = new URL(String(input)).pathname;
      const inputBody = init?.body ? JSON.parse(String(init.body)) : {};
      const status = path.endsWith("/finalize") ? "no_match_found" : inputBody.status;
      if (!path.endsWith("/finalize")) expect(status).toBe(statuses[index++]);
      return response(
        {
          public_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          organization_public_id: ORGANIZATION_ID,
          person_public_id: PERSON_ID,
          status,
          searched_at: status === "pending" ? null : "2026-10-18T00:00:00Z",
          jurisdiction: "Delhi District Courts",
          coverage: "Publicly accessible indexed records",
          search_period: "2016-2026",
          source: "Named court index",
          finding:
            status === "match_found" || status === "review_required" ? "Scoped finding" : null,
          remarks: null,
          limitations: "Sealed and unavailable records are excluded.",
          reviewer_user_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          evidence_document_ids: [],
          finalized_at: path.endsWith("/finalize") ? "2026-10-18T00:05:00Z" : null,
          created_at: "2026-10-18T00:00:00Z",
          updated_at: "2026-10-18T00:00:00Z",
          semantic_notice:
            "A no-match result is scoped and is not police verification or criminal clearance.",
        },
        path.endsWith("/court-checks") ? 201 : 200,
      );
    });
    const adapter = createAdminOperationsAdapter(config(), options(fetchImpl));

    for (const status of statuses) {
      await adapter.createCourtCheck(ORGANIZATION_ID, PERSON_ID, {
        status,
        ...(status === "pending" ? {} : { searchedAt: "2026-10-18T00:00:00Z" }),
        jurisdiction: "Delhi District Courts",
        coverage: "Publicly accessible indexed records",
        searchPeriod: "2016-2026",
        source: "Named court index",
        ...(status === "match_found" || status === "review_required"
          ? { finding: "Scoped finding" }
          : {}),
        limitations: "Sealed and unavailable records are excluded.",
        evidenceDocumentIds: [],
        idempotencyKey: crypto.randomUUID(),
      });
    }
    const finalized = await adapter.finalizeCourtCheck(
      ORGANIZATION_ID,
      PERSON_ID,
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    );
    expect(finalized.finalizedAt).toBeTruthy();
    expect(finalized.semanticNotice).toContain("not police verification");
  });

  it("never sends a create-only idempotency key in a Court update", async () => {
    const fetchImpl = vi.fn(async (_input: URL | RequestInfo, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({
        status: "review_required",
        finding: "Manual review required",
      });
      expect(body).not.toHaveProperty("idempotency_key");
      return response({
        public_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        organization_public_id: ORGANIZATION_ID,
        person_public_id: PERSON_ID,
        status: "review_required",
        searched_at: "2026-10-18T00:00:00Z",
        jurisdiction: "Delhi District Courts",
        coverage: "Publicly accessible indexed records",
        search_period: "2016-2026",
        source: "Named court index",
        finding: "Manual review required",
        remarks: null,
        limitations: "Sealed records excluded.",
        reviewer_user_id: null,
        evidence_document_ids: [],
        finalized_at: null,
        created_at: "2026-10-18T00:00:00Z",
        updated_at: "2026-10-18T00:05:00Z",
        semantic_notice: "A no-match result is scoped and is not police verification.",
      });
    });
    const adapter = createAdminOperationsAdapter(config(), options(fetchImpl));

    await adapter.updateCourtCheck(
      ORGANIZATION_ID,
      PERSON_ID,
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      {
        status: "review_required",
        searchedAt: "2026-10-18T00:00:00Z",
        jurisdiction: "Delhi District Courts",
        coverage: "Publicly accessible indexed records",
        searchPeriod: "2016-2026",
        source: "Named court index",
        finding: "Manual review required",
        limitations: "Sealed records excluded.",
        evidenceDocumentIds: [],
      },
    );
  });

  it("records only policy-supported in-person observations with zero canonical and PA effects", async () => {
    const fetchImpl = vi.fn(async (_input: URL | RequestInfo, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(["identity_observation", "document_observation"]).toContain(body.verification_type);
      expect(body).not.toHaveProperty("verification_status");
      expect(body).not.toHaveProperty("permanent_address_check");
      return response(
        {
          public_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          organization_public_id: ORGANIZATION_ID,
          person_public_id: PERSON_ID,
          verification_type: body.verification_type,
          method: "in_person",
          performed_at: body.performed_at,
          performed_by_user_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          person_met: "Candidate",
          relationship: "Self",
          result: "observed_consistent",
          notes: "Observed document only.",
          evidence_document_ids: [],
          changes_canonical_verification_status: false,
          permanent_address_check_credit: 0,
          created_at: "2026-10-18T00:00:00Z",
        },
        201,
      );
    });
    const adapter = createAdminOperationsAdapter(config(), options(fetchImpl));

    const receipt = await adapter.recordInPerson(ORGANIZATION_ID, PERSON_ID, {
      verificationType: "identity_observation",
      performedAt: "2026-10-18T00:00:00Z",
      personMet: "Candidate",
      relationship: "Self",
      result: "observed_consistent",
      notes: "Observed document only.",
      evidenceDocumentIds: [],
      idempotencyKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });

    expect(receipt.changesCanonicalVerificationStatus).toBe(false);
    expect(receipt.permanentAddressCheckCredit).toBe(0);
  });

  it("validates private evidence before upload without weakening backend enforcement", () => {
    expect(
      validateEvidenceFile(new File(["pdf"], "record.pdf", { type: "application/pdf" })),
    ).toBeNull();
    expect(validateEvidenceFile(new File(["text"], "record.txt", { type: "text/plain" }))).toBe(
      "Evidence must be PDF, JPEG, PNG, or WebP.",
    );
    expect(validateEvidenceFile(new File([], "empty.pdf", { type: "application/pdf" }))).toBe(
      "Evidence file cannot be empty.",
    );
    const oversized = new File(["x"], "large.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(oversized, "size", { value: 50 * 1024 * 1024 + 1 });
    expect(validateEvidenceFile(oversized)).toBe("Evidence cannot exceed 50 MiB.");
  });
});
