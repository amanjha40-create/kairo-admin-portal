# KairoID Admin V1.1 Assisted Operations Batch 2 Certification

## Certification scope

This report certifies the Admin frontend source release candidate for assisted Candidate onboarding, reviewed CV import, Admin-assisted profile and Career maintenance, organization provisioning, first-HR invitation, structured Court/Criminal Check operations, and generalized in-person verification.

No staging or production deployment is part of this certification. No backend, database, AWS, email-provider, or production-data mutation was performed.

## Certified sources

- Admin frontend base: `bb46887c820470613ce7c31c4659aa23e16b529e`
- Admin frontend branch: `codex/admin-v1-1-assisted-operations-batch2`
- Admin frontend release commit: the immutable commit containing this report; its final SHA is reported in the external closeout because a commit cannot embed its own final SHA.
- Minimum backend SHA: `aec4a41d255b9659168e2630442a89c932d043c2`
- Minimum database schema: Alembic `093`
- Certified backend ARM64 digest: `sha256:39d2cb724c3e5eb4d5c8f664f5190ef482f2ffffc41a61b15f483112b81970`
- Backend contract handoff: `reports/admin-v1-1-backend-contract-handoff.md` in the certified backend worktree
- Backend integration handoff: `reports/backend-admin-v1-1-integration-handoff.md` in the certified backend worktree

## Implemented contract surface

### Candidate and activation

- Manual assisted Candidate creation uses the canonical Admin endpoint and backend-issued public ID.
- Duplicate email, duplicate phone, existing/unclaimed Candidate, validation, permission, and generic operational failures are surfaced without raw backend exceptions.
- Account state remains distinct from claim, identity, and verification state.
- Activation send and resend expose only safe lifecycle data. Passwords, activation tokens, OTPs, and auth tokens are never requested or rendered.
- Mutation retries retain stable idempotency keys for the same user action.

### CV and assisted profile

- CV upload, parse, review, per-record import decisions, edits, deselection, and selected-data commit use the certified Admin wrappers.
- Import decisions include `import_action`, optional `target_record_id`, and explicit distinct-role confirmation where the backend requires them.
- Admin-entered, CV-imported, Candidate-confirmed, and source-verified provenance remain distinct.
- Profile and Career mutations use Admin endpoints. Existing Career records use the certified update contract.
- Backend protection of source-verified data is preserved and explained; it is not bypassed.

### Organization and first HR

- Organization creation uses canonical backend state and normalized-duplicate handling.
- Organization lifecycle distinguishes an existing organization from an operational organization with an accepted owner.
- First-HR invite and resend use the fixed certified owner role and never collect or generate a password.
- Session receipts report pending invitation state after send/resend. Accepted owner membership is read canonically from Company360.

### Court and in-person operations

- Court/Criminal Check supports structured create, update, evidence, scope/limitations, result states, and finalize operations.
- Evidence selection is prevalidated for certified PDF, JPEG, PNG, and WebP types and the 50 MiB size ceiling before upload.
- Court finalization invalidates the canonical Company360/report projection instead of maintaining a frontend-only result.
- In-person verification permits only `identity_observation` and `document_observation`.
- Performed-by identity is backend authoritative. The UI does not permit verifier impersonation.
- In-person verification never acts as a universal person, employment, education, or Permanent Address verification shortcut.
- Permanent Address source and server-authoritative three-check behavior are unchanged.

## Permission coverage

The frontend maps and tests all seven certified backend permissions:

- create assisted Candidate
- manage assisted profile
- send Candidate activation
- create organization
- invite first HR
- manage Court check
- perform in-person verification

Backend `403` responses remain authoritative. The UI does not broaden permission scope.

## Validation evidence

- Focused Batch 2 tests: 19 passing
- Focused Admin regression selection: 81 passing across 9 files
- Full Admin suite: 331/331 passing across 48 files
- Company360 regression: passing
- Permanent Address regression: passing
- Authentication and permission regression: passing
- TypeScript: passing with zero errors
- ESLint: passing with zero errors and 12 pre-existing Fast Refresh warnings
- Production build: passing
- Explicit `NITRO_PRESET=aws_amplify` build: passing
- Generated Amplify runtime deep links: all required routes returned HTTP 200
- Artifact privacy verifier: passing
- `git diff --check`: passing before report generation and required again before commit

Validated built-artifact deep links:

- `/admin/users`
- `/admin/users/:userId`
- `/admin/registry/organizations`
- `/admin/registry/organizations/:organizationId`
- `/admin/verifications/permanent-address`

The generic repository `vite preview` command expects a non-Amplify `dist/server/server.js`; the explicit Amplify build is instead previewed through its generated `.amplify-hosting/compute/default/server.js` entrypoint. That generated runtime returned HTTP 200 for every route above.

## Privacy and artifact findings

- No password, activation token, OTP, OAuth token, encryption key, raw S3 path, or raw Permanent Address coordinate is rendered by the new workflows.
- Production configuration is fixed to `https://api.kairoid.com` with demo mode disabled.
- Artifact verification found no forbidden fixture or environment leakage.
- Framework runtime bundles contain internal `localhost` URL-normalization defaults; these are dependency implementation details, not application API fallbacks. The application artifact verifier and production environment guard both pass.

## Certified limitations

- The backend does not expose Admin list/read endpoints for Court or in-person operation receipts. Newly created receipts are therefore visible for the current session, while canonical downstream state is refreshed from existing projections.
- The backend does not expose an Admin read/status endpoint for a pending first-HR invitation after refresh. Pending state is shown from the mutation receipt; accepted owner membership is shown from Company360.
- The HR verification-report read contract is organization-member scoped. Admin cannot directly fetch it. Court finalization invalidates Company360 and explains this boundary.
- Candidate confirmation is Candidate-only and is not represented as an Admin mutation.
- Live activation email, first-HR invitation, Court, and in-person smoke checks remain deployment gates because this source-only task intentionally made no provider, AWS, database, or environment mutation.

## Certification result

The Admin V1.1 Assisted Operations Batch 2 frontend is a source-certified release candidate, contingent on integrating the certified backend source, deploying schema `093`, and completing the controlled deployment smoke sequence in the release handoff.
