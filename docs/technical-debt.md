# Technical Debt

## Consolidate duplicated production verification runtime

- Priority: Medium
- Status: Post-Controlled Pilot

The compile-time Demo/Production runtime split is intentional and should remain.

The duplicated production implementation between:

- `src/features/admin/data/verification-review.ts`
- `src/features/admin/runtime/verification-review.production.ts`

should be consolidated into a shared production implementation after the controlled pilot to prevent frontend/backend contract drift.
