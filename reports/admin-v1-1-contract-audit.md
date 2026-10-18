# Admin V1.1 Assisted Operations Contract Audit

## Baseline

| Item                             | Audited value                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Canonical Admin repository       | `/Users/Aman/Desktop/work/kairo-admin-portal-admin5-recovery`                                          |
| Isolated implementation worktree | `/private/tmp/kairo-admin-v1-1-assisted-operations`                                                    |
| Starting Admin SHA               | `0962f515c619e0cbc6d94141442ff63b3f32a06c`                                                             |
| Production Admin SHA             | `0962f515c619e0cbc6d94141442ff63b3f32a06c` (Amplify app `d2bqzsobe5n064`, `main`, job `14`, succeeded) |
| Branch                           | `codex/admin-v1-1-assisted-operations`                                                                 |
| Backend V1.1 source              | `43c4683795a7ee961a84a7c545da68e90d8f58e1`                                                             |
| HR Backend V2 source             | `5b6edb13c4b09c64a146d9759046fc182afeff3b`                                                             |
| Backend branch relationship      | Diverged after `473811f410b3918a4febd7dbc4fdaf20a8584893`; neither tip contains the other              |

No local work in the older Admin checkout or canonical recovery checkout was reset, deleted, staged, or incorporated. The implementation worktree started clean at the exact deployed Admin source.

## Founder requirement classification

| Founder requirement                               | Classification                                                                                | Can proceed now?                   | Contract truth                                                                                                                                                     |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Create Candidate/person from CV                   | `C. PARTIAL_BACKEND_CONTRACT` plus `D/E` blockers                                             | No persistence UI                  | Resume parse/review/import exists only for the authenticated Candidate. Admin account creation and secure claim are absent.                                        |
| Admin-assisted profile creation                   | `D. BACKEND_EXTENSION_REQUIRED`                                                               | No                                 | Basic profile and Career writes are Candidate-owner scoped; Admin has read/account-management operations only.                                                     |
| Operational/in-person verification                | `A. FRONTEND_ONLY_EXISTING_BACKEND` for existing final-quality cases; `C` for generalized use | Yes, narrow correction implemented | Direct Confirmation already accepts `in_person`; frontend eligibility was broader than the endpoint and is corrected to the canonical final-quality/evidence gate. |
| Court-record / Criminal Check result and evidence | `D. BACKEND_EXTENSION_REQUIRED`                                                               | No                                 | HR V2 exposes a report-shaped placeholder only; no write, persistence, evidence, or Admin permission exists.                                                       |
| Create organization and initiate first HR account | `D. BACKEND_EXTENSION_REQUIRED` plus `E. PRODUCT/SECURITY_DECISION_REQUIRED`                  | No                                 | Current organization creation assigns the caller as owner; current invitation cannot create the first owner and requires authenticated acceptance.                 |

## Current Admin surface audit

### Routes and navigation

- People directory and person detail use `/admin/users` and `/admin/users/{public_id}`.
- Company360 uses `/admin/registry/organizations` and `/admin/registry/organizations/{public_id}`.
- Verification Operations uses `/admin/verifications` and the existing case workspace.
- Permanent Address uses `/admin/verifications/permanent-address` and its certified review workflow.
- There is no current Create Person, CV import, assisted profile editor, general Create Organization, or Court Check entry route.
- No new top-level navigation was added because the required persistence contracts do not exist.

### API clients and state

- Admin Users supports list, detail, internal note, suspend/restore, session revocation, and password-reset initiation. It does not create Candidate identities or mutate Candidate profile/Career records.
- Company360 is a read-only operational projection. Existing Registry/case organization creation is scoped to verification resolution and is not HR workspace provisioning.
- Verification Operations uses backend-driven case detail, eligibility, evidence-review, and mutation adapters. No local success state is used for production operations.
- Upload primitives exist for Candidate-owned resume/documents and existing verification evidence, but no Admin court-check upload association exists.

### Auth and permissions

- Admin permissions come from the backend session projection and route guards.
- Existing relevant backend permissions include `READ_USERS`, `MANAGE_USER_ACCOUNTS`, `MANAGE_USER_SECURITY`, `DISPATCH_VERIFICATION`, and `FINALIZE_VERIFICATION`.
- No backend permissions exist for assisted Candidate creation, assisted profile mutation, Admin organization provisioning, first-owner invitation, or court-check result management.
- The V1.1 frontend does not infer those permissions or expose unauthorized actions.

## Exact backend contract audit

### Candidate account, CV, and profile

| Capability             | Existing endpoint/contract                                               | Permission/identity        | Missing contract                                                         |
| ---------------------- | ------------------------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------ |
| Admin Candidate create | No `POST /api/v1/admin/users`                                            | None                       | Subject creation, duplicate result, unclaimed state, audit, idempotency  |
| Resume upload/process  | `/api/v1/resumes/*`                                                      | Authenticated `current.id` | Admin target-subject scope and assisted permission                       |
| Resume review/import   | `/api/v1/resumes/{id}/review-session`, `/api/v1/resume-reviews/*`        | Authenticated `current.id` | Admin target-subject scope; reviewed Admin/CV provenance; claim workflow |
| Basic profile update   | `PATCH /api/v1/users/me`                                                 | Candidate owner            | Admin allowlisted mutation and provenance                                |
| Career writes          | Candidate employment/education/internship/freelance/certification routes | Candidate owner            | Admin allowlisted mutation and provenance                                |
| Candidate activation   | No Admin Candidate claim endpoint                                        | None                       | Hashed single-use invitation and user-selected password                  |

The resume pipeline correctly identifies extracted claims with `source_type=resume`; its import endpoint explicitly imports only Candidate-confirmed claims and leaves them unverified. Reusing it as the Admin actor would violate ownership and provenance.

### In-person/direct confirmation

**Endpoint:** `POST /api/v1/admin/verification-requests/{verification_request_public_id}/direct-confirmation`.

**Request:** `confirmation_method` (`phone`, `email`, `video_call`, `in_person`, `other`), `confirmed_by`, `verifier_role`, `contact_detail_used`, `confirmation_outcome`, and `internal_note`.

**Response:** canonical `VerificationRequestResponse` after the backend transition.

**Permission:** backend `FINALIZE_VERIFICATION` through `require_finalizer`.

**Backend prerequisites:** request is `pending_admin_quality_review`, linked canonical claim exists, all applicable evidence is reviewed, and outcome is clean. Material discrepancies must use correction.

**Audit:** backend decision actor/time, an internal note with direct-confirmation metadata, finalization event, canonical outcome, and trust-score recalculation request. Evidence review stores evidence public ID, reviewer, and review time before finalization.

**Implemented correction:** Direct Confirmation is no longer offered from pre-dispatch, organization-resolution, or verifier-work states. Incomplete applicable evidence is a blocker, not a warning. `in_person` remains a validated method.

**Limit:** this is not a universal in-person verification button. Broader verification types or explicit per-confirmation evidence/checked-field selection require the dependency described in `admin-v1-1-backend-dependencies.md`.

### Permanent Address

Permanent Address remains on its certified backend workflow. No Direct Confirmation shortcut or universal verified mutation was added. Its document, manual-location/onsite, final-review, evidence, and privacy requirements are unchanged.

### Court-record / Criminal Check

HR Backend V2 defines `VerificationReportCourtSearchItem` with safe subject display, scope, search period, searched time, finding, evidence ID, reviewer, limitations, and status. The current service emits the default `NOT_ORDERED` item. There is no Admin write endpoint, persisted structured result, evidence upload association, result enum transition, or backend permission. The Admin therefore does not render a form or simulate persistence.

### Organization and first HR account

| Capability                         | Existing contract                                                             | Why it is insufficient                                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Organization create                | `POST /api/v1/organizations`                                                  | Creates for `current.id` and makes that actor owner; an Admin operator must not become the customer workspace owner. |
| Admin organization lookup          | `GET /api/v1/admin/organizations*`                                            | Read-only Company360 projection.                                                                                     |
| Case canonical organization create | `POST /api/v1/admin/verification-requests/{id}/create-canonical-organization` | Resolves one verification target; does not provision HR workspace/account.                                           |
| Team invitation                    | `POST /api/v1/organizations/{org}/invitations`                                | Requires existing organization manager; rejects owner role.                                                          |
| Team invitation acceptance         | `POST /api/v1/workspace/team-invitations/{token}/accept`                      | Requires an already authenticated user; cannot securely bootstrap the first HR owner.                                |

No password field, generated password, raw token, or fake invitation state was introduced.

## Security decisions

- Admin-generated permanent password: prohibited and not implemented.
- Candidate/HR activation: blocked until a single-use, hashed, expiring, replay-safe claim contract exists.
- Admin/CV data: must remain `ADMIN_ENTERED` or `CV_EXTRACTED`; it must not become Candidate-confirmed or source-verified by implication.
- Verification: Direct Confirmation remains backend-finalized, permission-checked, evidence-gated, and limited to a canonical request.
- Court terminology: future UI must preserve actual court-search scope and limitations; it must not promise police verification or criminal clearance.
- Privacy: no OTP, token, password, raw object key, provider payload, Aadhaar, or Permanent Address coordinate is added to an Admin projection.

## Implemented files

- `src/features/admin/workflow/eligibility.ts`
- `src/features/admin/workflow/eligibility.test.ts`
- `reports/admin-v1-1-contract-audit.md`
- `reports/admin-v1-1-backend-dependencies.md`
- `reports/admin-v1-1-foundation-certification.md`

## Validation

Validation evidence is recorded in `reports/admin-v1-1-foundation-certification.md` after the focused and full Admin gates complete.

## Visual evidence

No staging or production deployment is authorized, and no unsupported route was added. The supported “Verify via Direct Confirmation” dialog already exposes the `In person` method in the established Admin case workspace; this milestone changes only when that action is truthfully eligible. Source and focused test evidence replace a new live screenshot for this non-visual correction.
