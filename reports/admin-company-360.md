# Admin Company Search and Company 360

## Release identity

| Item                     | Value                                                                       |
| ------------------------ | --------------------------------------------------------------------------- |
| Admin starting SHA       | `f281fc249069b9dd222ec1c124661f0981e01e79`                                  |
| Admin implementation SHA | `601f64bbe700a12ef29f4febd934c79400883b7c`                                  |
| Admin branch             | `codex/admin-company-360`                                                   |
| Backend starting SHA     | `2d50009de7e8a0388f29916201045b3d47158bf1`                                  |
| Backend final SHA        | `8f00ab667d530389c0af3a870aea18c6d77c694f`                                  |
| Backend branch           | `codex/admin-company-360`                                                   |
| Staging Admin URL        | `https://codex-admin-verification-operations.d2bqzsobe5n064.amplifyapp.com` |
| Amplify staging job      | `39` - succeeded                                                            |
| Staging backend          | `kairo-staging-backend:232`                                                 |
| Production impact        | None                                                                        |

## API architecture

The existing authenticated Admin transport, bearer-token refresh flow, `users.view`
permission, verification case workspace, Trust Registry detail route, shared pagination
contracts, and canonical organization/verification models were reused.

The legacy `GET /api/v1/admin/organizations/search` endpoint remains available for its
existing consumers. It was not broad enough for the paginated operational directory or
Company 360 projections, so the following read-only Admin endpoints were added:

- `GET /api/v1/admin/organizations`
- `GET /api/v1/admin/organizations/{organization_public_id}`
- `GET /api/v1/admin/organizations/{organization_public_id}/overview`
- `GET /api/v1/admin/organizations/{organization_public_id}/people`
- `GET /api/v1/admin/organizations/{organization_public_id}/verifications`
- `GET /api/v1/admin/organizations/{organization_public_id}/team`
- `GET /api/v1/admin/organizations/{organization_public_id}/activity`

No database migration was required.

## Organization search

The Registry now links to `/admin/registry/organizations`. The directory is entirely
backend-driven and supports case-insensitive partial lookup by organization name,
domain, public organization ID, and primary owner email. It also supports organization
type and account-status filters, a 300 ms debounce, and backend pagination.

Live staging checks confirmed:

- Name search: `Keiretsu` returned one workspace.
- Domain search: `acceptance-university.example` returned one workspace.
- Public ID search returned the exact workspace.
- Primary-owner email local-part search returned matching workspaces.
- An unmatched query returned the explicit `No organizations found` state.
- Account-status and organization-type filters returned scoped backend results.
- Corrected default pagination shows 10 rows and advances from `1-10 of 24` to
  `11-20 of 24`.

## Company 360

The stable detail route is
`/admin/registry/organizations/{organization_public_id}`. It supports direct loading,
hard refresh, and browser Back navigation.

### Overview

The Overview renders canonical organization metadata plus database-aggregated People,
Requests, Verified, In Progress, Needs Attention, completion-rate, exact verification
status, and exact verification-type counts. Unsupported metadata is shown as unavailable
rather than fabricated.

### People

The scoped People table includes masked identity, relationship/lifecycle status,
verification totals, last activity, search/status filters, pagination, and a request
navigation action. Live staging covered both empty and populated states.

### Verification requests

The scoped request table includes candidate, masked email, verification type, requester,
created date, canonical status, completion date, and last update. Backend filters cover
status, type, candidate search, and created date range. Rows deep-link to the existing
Admin verification case workspace; no duplicate case UI was introduced.

### Team

The Team tab lists only canonical organization memberships with masked email, actual
workspace role, membership status, joined date, and last activity.

### Activity

The Activity tab displays chronological canonical verification and invitation audit
events. It does not synthesize frontend events. Live staging pagination advanced from
events `1-20 of 67` to `21-40 of 67`.

## Authorization and privacy

Every new endpoint uses the existing backend-enforced Admin `users.view` permission.
Focused endpoint tests prove non-Admin rejection and cross-organization isolation for
detail, overview, people, verifications, team, and activity.

The projections expose only public IDs and safe operational metadata. User and owner
emails are masked. Passwords, OTPs, tokens, government identifiers, provider payloads,
credentials, and raw private documents are not returned.

## Performance notes

Directory metrics are produced with grouped aggregate subqueries and outer joins rather
than per-row service calls. Company overview counts use grouped database aggregation.
All scoped lists are filtered in SQL and paginated by the shared backend contract. No
browser-side organization download/filter workaround was added, and no N+1 query path
was introduced.

## Validation

### Backend

- Focused Company 360 suite: 7 passed.
- Full non-integration suite: 998 passed, 46 deselected, 13 warnings.
- New-file Ruff validation: passed.
- Python compile validation: passed.
- Alembic head: unchanged; no migration added.
- Full-tree Ruff still reports 89 pre-existing `B008` warnings in shared dependency
  declarations; none were introduced by this work.

### Admin

- TypeScript: passed.
- Tests: 38 files, 226 tests passed.
- ESLint: 0 errors, 12 pre-existing Fast Refresh warnings.
- Prettier: passed.
- Production Amplify build: passed with artifact safety scan.
- Staging Amplify build: passed with artifact safety scan.
- `git diff --check`: passed.

## Staging QA and data truth

Amplify job `39` deployed exact Admin SHA
`601f64bbe700a12ef29f4febd934c79400883b7c`. The backend is healthy on task definition
`kairo-staging-backend:232`, built from exact backend SHA
`8f00ab667d530389c0af3a870aea18c6d77c694f`.

Live browser evidence covered directory loading, name/domain/ID/owner search, no-result
state, type/status filters, pagination, Overview, empty and populated People states,
Verifications, Team, Activity, verification-case deep links, direct detail links, hard
refresh, and browser Back. Browser console warnings/errors were empty. Recent staging
backend logs contained no Company 360 4xx/5xx responses and no backend exceptions.

Read-only ECS reconciliation task
`ab5f0ae5466b44089b903ac05d9bd8b5` exited 0 and queried canonical staging data for
`Institution Acceptance University` (`24cacf7c-1d4a-4113-bccb-9ac7d1a1f996`). Database
truth exactly matched the Admin UI:

| Metric                       | Database | Admin UI |
| ---------------------------- | -------: | -------: |
| People                       |        0 |        0 |
| Verification total           |        5 |        5 |
| Verified                     |        2 |        2 |
| Pending Admin Quality Review |        3 |        3 |
| Education requests           |        5 |        5 |
| Team members                 |        1 |        1 |

No staging business data was mutated during QA. Production services, data, DNS, and the
production Admin deployment were not changed.

## Outcome

Company search and Company 360 are operational in staging with no remaining P0 or P1
blocker.
