# Admin V1.1 Backend Dependencies

## Scope and source truth

This dependency ledger covers the four frozen Admin V1.1 assisted-operations requirements. It was audited against:

- Admin source `0962f515c619e0cbc6d94141442ff63b3f32a06c`.
- Backend V1.1 hardening source `43c4683795a7ee961a84a7c545da68e90d8f58e1`.
- HR Backend V2 source `5b6edb13c4b09c64a146d9759046fc182afeff3b`.

The two backend branches diverge after `473811f410b3918a4febd7dbc4fdaf20a8584893`. Contracts present on only one branch are not considered integrated or deployable until backend consolidation is complete.

## Dependency summary

| Dependency                          | Classification                                                        | Frontend blocker                                                                                                                               |
| ----------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Candidate assisted-account creation | `BACKEND_EXTENSION_REQUIRED`                                          | There is no Admin `POST /admin/users`; current Admin user APIs are list/detail/account operations only.                                        |
| Candidate secure activation         | `PRODUCT/SECURITY_DECISION_REQUIRED`                                  | There is no Candidate claim invitation for an Admin-created unclaimed account.                                                                 |
| Admin-assisted profile mutation     | `BACKEND_EXTENSION_REQUIRED`                                          | Profile and Career write APIs are authenticated Candidate-owner operations.                                                                    |
| Generalized in-person verification  | `PARTIAL_BACKEND_CONTRACT`                                            | `in_person` exists only inside final-quality Direct Confirmation for an existing supported verification request.                               |
| Court-record structured result      | `BACKEND_EXTENSION_REQUIRED`                                          | HR V2 has a read-only `NOT_ORDERED` report item, but no persisted Admin write/evidence contract.                                               |
| Admin organization provisioning     | `BACKEND_EXTENSION_REQUIRED`                                          | Current organization creation makes the authenticated caller the owner; it is not an Admin provisioning operation.                             |
| First HR secure activation          | `BACKEND_EXTENSION_REQUIRED` and `PRODUCT/SECURITY_DECISION_REQUIRED` | Team invitations require an organization manager, require the invitee to authenticate before acceptance, and forbid invitation-created owners. |

## Candidate assisted-account creation

**Current contracts:** Candidate-owned resume APIs exist at `POST /api/v1/resumes/upload-intent`, `POST /api/v1/resumes/{resume_id}/process`, `GET /api/v1/resumes/{resume_id}/parsed-result`, `POST /api/v1/resumes/{resume_id}/review-session`, `PATCH /api/v1/resume-reviews/{review_id}/items/{item_id}`, `POST /api/v1/resume-reviews/{review_id}/validate`, and `POST /api/v1/resume-reviews/{review_id}/import`. Every route uses the authenticated Candidate's `current.id`. The import contract imports only Candidate-confirmed claims and keeps records unverified.

**Required endpoint:** an integrated backend contract such as `POST /api/v1/admin/users/assisted-candidates`, plus Admin-scoped resume upload/review/import routes tied to the new subject public ID.

**Required fields:** idempotency key, normalized email, optional normalized phone, display name, reviewed resume/import-plan ID, selected claims, and per-field provenance. The response must expose only public IDs, account/claim state, duplicate resolution, and safe activation status.

**Permission:** a new backend-enforced permission such as `users.assisted.create`; resume review/import should require a separate least-privilege assisted-profile permission.

**Security constraint:** no password, password hash, OTP, activation token, or raw storage key may be accepted or returned. Duplicate detection must cover active, suspended, deleted-retained, invited/unclaimed, and existing Candidate identities by canonical normalized email and phone.

**Persistence:** account/person creation, reviewed resume plan, provenance, and idempotency must commit atomically or expose a resumable operation status. Parsed fields must not persist to Career records before human review.

**Frontend blocker:** the Admin frontend cannot safely call Candidate-owned endpoints as the operator because that would import records into the Admin actor's account.

## Candidate account activation

**Current contract:** none for Admin-created Candidates. Existing signup/password/OTP routes are end-user flows and are not an Admin provisioning substitute.

**Required endpoint:** a single-use claim workflow such as `POST /api/v1/admin/users/{user_public_id}/activation-invitations`, with public token validation/acceptance endpoints owned by the authentication product.

**Required fields:** subject public ID, destination channel, expiry policy, idempotency key, safe delivery status, invited/claimed timestamps, and revocation/resend metadata. Raw claim tokens must not be returned to Admin APIs or logs.

**Permission:** `users.assisted.activate`, backend-enforced and auditable.

**Security constraint:** the end user sets their own password. Tokens must be hashed at rest, single-use, expiring, revocable, and replay-safe. Admin must never generate or see a permanent or temporary password.

**Persistence:** durable activation state distinct from account active/claimed state, with immutable actor/subject audit events.

**Frontend blocker:** `BACKEND_CANDIDATE_ACCOUNT_ACTIVATION_REQUIRED`.

## Admin-assisted profile mutations

**Current contracts:** `PATCH /api/v1/users/me` and Career write routes for employment, education, internship, freelance, certifications, and related records are scoped to `current.id`. Resume imports persist `source_type=resume` provenance but are also Candidate-owned.

**Required endpoint:** Admin-subject routes such as `PATCH /api/v1/admin/users/{user_public_id}/assisted-profile` and explicit assisted Career child-resource endpoints, or one reviewed import-plan endpoint with equivalent authorization and audit semantics.

**Required fields:** changed field/value, source classification (`ADMIN_ENTERED` or `CV_EXTRACTED`), source reference, operator, entered-at timestamp, optional confidence/warning metadata, and candidate confirmation state. Verified status must be immutable through these endpoints.

**Permission:** `users.assisted.profile.manage`, split from account suspension/security permissions.

**Security constraint:** only allowlisted profile fields; no government identifiers, credentials, tokens, provider payloads, or Permanent Address coordinates. Candidate confirmation and source verification must remain separate transitions.

**Persistence:** field- or record-level provenance plus append-only audit history. Later Candidate edits/confirmation must not erase source lineage.

**Frontend blocker:** `BACKEND_ADMIN_PROFILE_MUTATION_REQUIRED`.

## Generalized in-person verification

**Current contract:** `POST /api/v1/admin/verification-requests/{verification_request_public_id}/direct-confirmation` accepts `confirmation_method=in_person`, `confirmed_by`, `verifier_role`, `contact_detail_used`, `confirmation_outcome`, and `internal_note`. It requires `FINALIZE_VERIFICATION`, a linked canonical claim, `pending_admin_quality_review`, and completed review of every applicable evidence item. The backend records decision actor/time, internal provenance metadata, the finalization event, and the canonical outcome.

**Supported now:** final-quality Direct Confirmation for existing supported verification requests. The Admin eligibility correction in this milestone now mirrors the canonical state/evidence requirements.

**Missing for a generalized contract:** explicit checked-field identifiers, explicit evidence IDs used for the confirmation, a separately supplied occurrence timestamp when the verification happened earlier, and applicability to verification types outside the existing request workflow.

**Required endpoint:** only if product requires broader behavior, add a typed in-person confirmation resource under the verification request with checked fields, evidence references, performed-at, performer identity/role, scope, limitations, outcome, and idempotency key.

**Permission:** retain backend `FINALIZE_VERIFICATION` or introduce a narrower backend permission; never rely on frontend role checks alone.

**Security constraint:** no universal “mark verified” endpoint. Material discrepancies must use correction. Permanent Address remains governed by its certified document/manual-location/final-review rules.

**Persistence:** append-only confirmation record linked to the request, evidence versions, actor, and resulting state transition.

**Frontend blocker:** `BACKEND_IN_PERSON_VERIFICATION_CONTRACT_REQUIRED` only for generalized/broader in-person operations; the existing final-quality path is supported.

## Court-record / Criminal Check result

**Current contract:** HR V2 defines `VerificationReportCourtSearchItem` with subject display, scope, search period, searched-at, finding, evidence ID, reviewer, limitations, and status. The service currently returns a default `NOT_ORDERED` item. There is no Admin write route, persisted result model, upload-intent association, or workflow transition. `police_clearance` is explicitly not a supported verification-preference check.

**Required endpoints:** a typed Admin result endpoint under the canonical person/request, plus upload-intent/complete endpoints that associate evidence to that exact check. The canonical Verification Report must read the same persisted record.

**Required fields:** backend-defined result enum, searched-at, jurisdiction/coverage, search period, source classification, finding, reviewer, remarks/limitations, evidence public IDs, idempotency key, and subject/request public IDs.

**Permission:** a dedicated backend permission such as `verification.court_check.manage`; evidence upload and terminal result recording should be separately enforceable if operational roles differ.

**Security constraint:** terminology must preserve actual scope; “court-record search” must not be represented as police verification or criminal clearance. Evidence validation needs allowlisted MIME types, bounded size, checksums, malware/integrity handling, private object keys, and signed access only.

**Persistence:** one canonical structured result and evidence association consumed by the Verification Report. No Admin-local second data store.

**Frontend blocker:** `BACKEND_COURT_CHECK_STRUCTURED_RESULT_REQUIRED`.

## Admin organization provisioning

**Current contracts:** `POST /api/v1/organizations` creates an organization for the authenticated actor and makes that actor its owner. Admin organization APIs are read-only Company360 projections. `POST /api/v1/admin/verification-requests/{id}/create-canonical-organization` only resolves a verification target; it does not provision an HR workspace or first HR account.

**Required endpoint:** an Admin provisioning contract such as `POST /api/v1/admin/organizations/provision` that creates a workspace without granting the Admin operator membership.

**Required fields:** idempotency key, organization name/type, only currently supported metadata, canonical duplicate-match decision, first HR name/work email/role, and invitation policy.

**Permission:** `organizations.provision`, backend-enforced and distinct from Registry resolution and Company360 read access.

**Security constraint:** canonical duplicate search must cover normalized name/domain, Registry linkage, existing workspaces, first-HR membership, active account, and pending invitation. The operator must not become owner or gain cross-organization business access.

**Persistence:** organization plus initial unclaimed owner/HR invitation should be atomic or a durable resumable saga with explicit failure state.

**Frontend blocker:** `BACKEND_ADMIN_ORGANIZATION_CREATION_REQUIRED`.

## First HR account activation

**Current contracts:** `POST /api/v1/organizations/{org_public_id}/invitations` is restricted to an existing organization manager, rejects `OWNER`, creates a hashed single-use token, and sends a team invitation. Public invitation lookup exists, but acceptance requires an already authenticated user. It cannot bootstrap the first owner for an Admin-provisioned workspace.

**Required endpoint:** the organization provisioning contract must create the initial owner/HR claim invitation, or expose a dedicated `POST /api/v1/admin/organizations/{org_public_id}/initial-owner-invitation` endpoint.

**Required fields:** work email, name, initial role, expiry, idempotency key, and safe delivery status. The raw token must never be returned through the Admin API.

**Permission:** `organizations.provision` or a narrower `organizations.initial_owner.invite` permission.

**Security constraint:** secure single-use claim, end-user-selected password, token hashing, expiry/revocation/replay protection, domain and duplicate-account checks, and no Admin-visible password or OTP.

**Persistence:** explicit invitation pending/accepted/revoked/expired states and immutable audit events.

**Frontend blocker:** `BACKEND_HR_ACCOUNT_ACTIVATION_REQUIRED`.

## Integration order

1. Consolidate Backend V1.1 hardening and HR Backend V2 onto one canonical backend source.
2. Decide Candidate and initial-HR claim semantics, permissions, duplicate policy, and provenance vocabulary.
3. Add Candidate assisted creation/profile contracts and tests.
4. Add organization provisioning/initial-owner claim contracts and tests.
5. Add canonical court-check persistence, evidence, workflow, and report projection.
6. Extend in-person confirmation only if the existing final-quality contract is insufficient for approved product types.
7. Generate and freeze integrated OpenAPI before Admin Batch 2 implementation.
