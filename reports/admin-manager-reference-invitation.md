# Admin Reporting Manager Invitation

## Scope

Add the normal Admin-owned invitation action for an eligible Reporting Manager Reference in the Verification Case Workspace. Candidate and HR public surfaces remain unchanged.

## Baseline

- Admin canonical staging lineage: `fc203ad131f853bb90e3a213630976049a98abbf`
- Backend certified SHA: `53ac452d1b35615bc71b5fb895a4ddc0f1d32f8c`
- Backend staging target at task start: API242 / DB088
- Existing Evidence Review workflow is preserved.

## Backend Contract

- Read: `GET /api/v1/admin/employments/{employment_id}/references`
- Send: `POST /api/v1/admin/employments/{employment_id}/references/reporting-manager/invite`
- Payload: backend nomination ID plus a UUID idempotency key
- Authorization: existing backend `dispatch_verification` permission
- Backend eligibility remains authoritative for verified employment, current HR validation, confirmed relationship, accepted contact provenance, employer-confirmed email, active invitation state, rate limits, and completion state.
- The response exposes delivery status and safe timestamps. The Admin UI does not render the invitation token, secure URL, full private contact, or provider details.

## Admin UI

- The Verification Case Workspace includes a References section for linked Employment cases in non-demo mode.
- It shows HR Reference, employer confirmation, Manager Reference status, and completed-reference progress from the Admin report endpoint.
- `Send reference request` appears only for backend `ready_to_invite` state when the case and canonical Employment are verified and the current Admin has the mapped dispatch permission.
- A confirmation dialog explains the external email side effect.
- The control prevents rapid duplicate submission, supplies an idempotency key, and refetches authoritative state before presenting success.
- Active, completed, blocked, unauthorized, and unavailable states do not expose the primary send action.

## Validation

- Focused tests: 16 passed
- Full Admin tests: 283 passed across 43 files
- TypeScript: passed with zero errors
- ESLint: passed with zero errors and 12 pre-existing Fast Refresh warnings
- Prettier: passed
- Production build: passed with the AWS Amplify preset and production environment enforcement
- Staging build: passed against `https://staging-api.kairoid.com`
- Artifact verification: passed; no forbidden fixtures or environment leakage
- `git diff --check`: passed

## Staging Evidence

- Admin commit: `722ed2d3f8b79af32033701dbfdc4644fc13503e`
- Amplify deployment: job 42 succeeded on the exact Admin commit.
- Controlled invitation count: 0 before, 1 after.
- Manager email count: 0 before, exactly 1 after; provider accepted delivery.
- The secure manager link opened without a KairoID login and the questionnaire was submitted once.
- Manager Reference is `completed`; the authoritative Candidate summary is 2/2 references completed.
- Completion is represented once by `reference_completed`; there is no duplicate invitation, email, or completion event.

## Browser Submission Defect

- The original HTML questionnaire POST was rejected with HTTP 403 when a browser supplied an incidental KairoID `Authorization` header. The capability token itself was valid and incomplete same-origin probes reached normal HTTP 422 validation.
- Backend commits `2486d5dbfb81dde3af9275eb6c0864d8a45f4089` and `dbee34b482d6520d9646b8e428d2e25f0f96e8c8` added a form-specific capability dependency for the server-rendered manager form.
- The final behavior accepts private-browser form submissions with missing or opaque `null` Origin while preserving token validation and rejecting explicit foreign origins. Strict JSON capability endpoints are unchanged.
- Focused backend validation: 75 passed.
- Full non-integration backend validation: 2,170 passed, 60 deselected.
- Ruff lint, Ruff format, and `git diff --check`: passed.
- Corrected staging backend: `kairo-staging-backend:244`, SHA `dbee34b482d6520d9646b8e428d2e25f0f96e8c8`, healthy 1/1/0 with `/live` and `/ready` returning 200.

## Final Data And Privacy Evidence

- Employment remains `verified`; HR Reference and Manager Reference are both `completed`.
- Authorized report contains the completed professional-reference answers.
- Candidate-facing schema contains no private manager answers, contact details, token, or secure URL.
- Authorized report contains no manager contact, token, or secure URL.
- Trust Score remains 82 and no post-response References contributor/snapshot exists; the response did not change the score.
- A completed link returns a recorded/already-completed state and no form, preventing replay.
- Android source was not changed. Live Android visual refresh is not recorded because no emulator or device was attached; backend Candidate-summary truth is 2/2.
- Admin post-response visual refresh was not certified in the final pass because the existing Chrome tab rendered blank after a hard reload; the authoritative backend read-only check returned the completed state.

## Source Boundaries

- Backend source changed: yes, limited to the public HTML form capability guard and focused regression tests described above
- Android source changed: no
- HR Workspace source changed: no
- iOS source changed: no
- Production changed: no
