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

- Amplify deployment: pending
- Controlled invitation before/after: pending
- Manager email count: must move from 0 to exactly 1
- Manager Reference completion and final References 2/2: pending
- Android refresh, report, Passport privacy, and Trust Score invariant: pending

## Source Boundaries

- Backend source changed: no
- Android source changed: no
- HR Workspace source changed: no
- iOS source changed: no
- Production changed: no
