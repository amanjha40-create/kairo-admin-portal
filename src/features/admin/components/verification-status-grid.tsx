import { Link } from "@tanstack/react-router";
import { StatusBadge } from "./status-badge";
import { formatAge, formatNumber } from "../lib/format";
import type { VerificationStatus, VerificationStatusSummary } from "../data/types";

/** Maps a semantic verification status to the queue's `?view=` filter. */
type QueueView =
  | "all-active"
  | "pre-dispatch"
  | "candidate-correction"
  | "pending-resolution"
  | "approved-dispatch"
  | "awaiting-verifier"
  | "quality-review"
  | "completed";

const STATUS_TO_VIEW: Record<VerificationStatus, QueueView> = {
  draft: "all-active",
  pending_subject_acceptance: "all-active",
  accepted: "all-active",
  pending_subject_submission: "all-active",
  pending_admin_review: "pre-dispatch",
  awaiting_subject_corrections: "candidate-correction",
  pending_admin_re_review: "pre-dispatch",
  approved_for_organization_verification: "approved-dispatch",
  pending_organization_resolution: "pending-resolution",
  pending_organization_acceptance: "awaiting-verifier",
  in_progress: "awaiting-verifier",
  awaiting_information: "awaiting-verifier",
  pending_admin_quality_review: "quality-review",
  verified: "completed",
  rejected: "completed",
  unable_to_verify: "completed",
  cancelled: "completed",
  expired: "completed",
};

export function VerificationStatusGrid({ items }: { items: VerificationStatusSummary[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((s) => {
        const delta = s.periodDelta;
        const deltaLabel =
          delta === 0 ? "no change" : delta > 0 ? `+${delta} in period` : `${delta} in period`;
        const deltaTone =
          delta > 0
            ? "text-amber-700 dark:text-amber-400"
            : delta < 0
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-muted-foreground";
        return (
          <Link
            key={s.status}
            to="/admin/verifications"
            search={{ view: STATUS_TO_VIEW[s.status] }}
            className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-3 transition-colors hover:border-foreground/20 hover:bg-accent/40"
            aria-label={`Open ${s.label} queue`}
          >
            <div className="flex items-center justify-between">
              <StatusBadge status={s.status} />
              <span className="text-lg font-semibold tabular-nums text-foreground">
                {formatNumber(s.count)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {s.oldestAgeHours != null ? (
                  <>
                    Oldest:{" "}
                    <span className="tabular-nums text-foreground">
                      {formatAge(s.oldestAgeHours)}
                    </span>
                  </>
                ) : (
                  <span className="opacity-60">—</span>
                )}
              </span>
              <span className={deltaTone}>{deltaLabel}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
