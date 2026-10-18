# KairoID Admin V1.1 Release Handoff

## Immutable release floor

- Admin frontend base: `bb46887c820470613ce7c31c4659aa23e16b529e`
- Admin frontend branch: `codex/admin-v1-1-assisted-operations-batch2`
- Admin frontend release commit: the immutable commit containing this handoff; the final SHA is reported in the Git closeout.
- Minimum Admin backend SHA: `aec4a41d255b9659168e2630442a89c932d043c2`
- Minimum schema: Alembic `093`
- Certified backend ARM64 digest: `sha256:39d2cb724c3e5eb4d5c8f664f5190ef482f2ffffc41a61b15f483112b81970`

Do not deploy this Admin frontend against an older backend or schema.

## Required integration boundary

Before deployment, integrate the certified Admin backend contract SHA with any separately approved backend hardening work. Preserve one Alembic head and rerun the backend integration suite. Do not reconstruct or approximate the certified routes, permissions, lifecycle values, or response fields.

The frontend depends on the exact Candidate, activation, CV review/import, profile/Career, organization, first-HR, private-evidence, Court, and in-person contracts documented by the backend handoff.

## Deployment order

The controlled release order is:

1. Integrate and certify the compatible backend source.
2. Apply DB migration `092`.
3. Apply DB migration `093`.
4. Deploy the compatible API and worker from one immutable backend artifact.
5. Complete backend health, queue/worker, auth, and contract smoke checks.
6. Deploy the compatible HR V2 frontend.
7. Deploy this Admin V1.1 frontend release commit.
8. Complete authenticated Admin deep-link and hard-refresh smoke checks.
9. Send one controlled real Candidate activation email.
10. Send one controlled real first-HR invitation.
11. Complete controlled Court and in-person operational smoke checks.

Do not invert the schema/backend/frontend order. Do not expose the Admin UI before its minimum backend and schema are healthy.

## Predeployment gates

- Confirm frontend local/origin parity is `0/0` at the reported release SHA.
- Confirm tracked and untracked working-tree state is clean for the release checkout.
- Confirm backend integration uses at least SHA `aec4a41d255b9659168e2630442a89c932d043c2` and one Alembic head at `093` or later.
- Confirm API and worker use the same immutable backend image.
- Confirm production Admin environment is `production`, demo mode is false, and API base URL is exactly `https://api.kairoid.com`.
- Confirm no staging URL, localhost application fallback, development credential, QA fixture, or controlled-testing configuration is present.
- Confirm provider sends require explicit controlled approval.

## Postdeployment smoke

- Manual Create Person returns a backend-issued public ID and truthful unclaimed account state.
- Candidate activation send/resend returns safe pending lifecycle data without a token or password.
- CV parsing requires review before selected-data commit and preserves provenance.
- Source-verified data remains protected from Admin overwrite.
- Organization creation shows its canonical lifecycle.
- First-HR invitation uses the certified owner role and accepted membership appears in Company360 after claim.
- Court evidence remains private, finalization refreshes canonical projection state, and no raw storage path is exposed.
- In-person operations allow only `identity_observation` and `document_observation`, use canonical performed-by identity, and do not mark unrelated claims verified.
- Permanent Address document and three-check semantics remain unchanged.
- Key Admin routes, direct deep links, hard refresh, browser Back, authentication, and permission boundaries remain healthy.

## Known contract gaps

- No Admin list/read endpoint exists for Court or in-person receipts.
- No Admin read/status endpoint exists for a pending first-HR invitation after refresh.
- HR verification-report read remains organization-member scoped rather than Admin scoped.
- Candidate confirmation remains Candidate-only.

These gaps are disclosed UI boundaries. They must not be hidden with frontend-derived canonical state or invented endpoints.

## Rollback and safety

- A frontend rollback must use the prior immutable Admin artifact and must not imply a backend or schema rollback.
- Backend/schema rollback requires its own reviewed migration and compatibility plan.
- Do not downgrade schema `093` while Candidate/organization/Court/in-person records created by the new contracts may exist.
- If email delivery, queue processing, or projection refresh fails during controlled smoke, stop additional sends and preserve audit evidence.

## Current deployment status

- Admin staging deployed: no
- Admin production deployed: no
- Backend changed by this frontend task: no
- Production database changed: no
- AWS changed: no
- Real email/provider call made: no

The next authorized action is backend integration and schema `093` certification. Deployment requires separate explicit approval.
