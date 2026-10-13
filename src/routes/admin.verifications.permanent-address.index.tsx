import { type FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, MapPinned, Search } from "lucide-react";
import { appEnv } from "@/config/env";
import { useAdminAccess } from "@/features/admin/auth/admin-access";
import { StatusPill } from "@/features/admin/components/permanent-address-workspace";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PermissionDeniedState,
} from "@/features/admin/components/states";
import { permanentAddressListQueryOptions } from "@/features/admin/data/permanent-address";
import {
  formatAddressDocumentStatus,
  formatManualReviewStatus,
  formatPermanentAddressStatus,
} from "@/features/admin/lib/permanent-address";
import { hasPermission } from "@/features/admin/workflow/permissions";

export const Route = createFileRoute("/admin/verifications/permanent-address/")({
  head: () => ({
    meta: [
      { title: "Permanent Address reviews — KairoID Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PermanentAddressDirectory,
});

const PAGE_SIZE = 20;

function PermanentAddressDirectory() {
  const access = useAdminAccess();
  const canView = hasPermission(access.admin?.permissions ?? [], "verification.review_address");
  const [offset, setOffset] = useState(0);
  const [candidateInput, setCandidateInput] = useState("");
  const [candidateFilter, setCandidateFilter] = useState<string | undefined>();
  const query = useQuery({
    ...permanentAddressListQueryOptions({
      limit: PAGE_SIZE,
      offset,
      candidateId: candidateFilter,
    }),
    enabled: canView && !appEnv.adminDemoMode,
  });

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOffset(0);
    setCandidateFilter(candidateInput.trim() || undefined);
  }

  if (!canView) {
    return (
      <PermissionDeniedState description="Permanent Address review requires the backend verification-review permission." />
    );
  }

  if (appEnv.adminDemoMode) {
    return (
      <EmptyState
        title="Permanent Address review is unavailable in Demo Mode"
        description="This workspace intentionally displays only canonical backend data."
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Link
              to="/admin/verifications"
              search={{ view: "all-active" }}
              className="hover:text-foreground hover:underline"
            >
              Verifications
            </Link>
            <span>/</span>
            <span>Permanent Address</span>
          </div>
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
            <MapPinned aria-hidden className="size-5 text-[#0FA8A5]" /> Permanent Address reviews
          </h1>
          <p className="mt-0.5 max-w-3xl text-sm text-muted-foreground">
            Discover Candidate address work, including cases where a required document has not yet
            been uploaded.
          </p>
        </div>
        <Link
          to="/admin/verifications"
          search={{ view: "all-active" }}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
        >
          <ArrowLeft aria-hidden className="size-3.5" /> Verification queue
        </Link>
      </header>

      <form
        onSubmit={submitSearch}
        className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-end"
      >
        <label className="min-w-0 flex-1 text-xs font-medium text-foreground">
          Exact Candidate public ID
          <input
            value={candidateInput}
            onChange={(event) => setCandidateInput(event.target.value)}
            placeholder="Candidate UUID"
            className="mt-1.5 h-9 w-full rounded-md border border-border bg-background px-3 font-mono text-xs text-foreground placeholder:font-sans placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90"
          >
            <Search aria-hidden className="size-3.5" /> Find Candidate
          </button>
          {candidateFilter ? (
            <button
              type="button"
              onClick={() => {
                setCandidateInput("");
                setCandidateFilter(undefined);
                setOffset(0);
              }}
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
            >
              Clear
            </button>
          ) : null}
        </div>
      </form>

      <section
        aria-labelledby="address-review-results"
        className="rounded-lg border border-border bg-card"
      >
        <header className="border-b border-border px-4 py-3">
          <h2 id="address-review-results" className="text-sm font-semibold text-foreground">
            Review discovery
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Status and eligibility values come directly from API251.
          </p>
        </header>
        <div className="p-4">
          {query.isPending ? <LoadingSkeleton rows={8} /> : null}
          {query.error ? (
            <ErrorState
              title="Permanent Address reviews failed to load"
              description={query.error.message}
              action={
                <button
                  type="button"
                  onClick={() => void query.refetch()}
                  className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background"
                >
                  Try again
                </button>
              }
            />
          ) : null}
          {query.data && query.data.items.length === 0 ? (
            <EmptyState
              title="No Permanent Address reviews found"
              description={
                candidateFilter
                  ? "No current review exists for that Candidate public ID."
                  : "No current Candidate address versions are available."
              }
            />
          ) : null}
          {query.data?.items.length ? (
            <div className="overflow-hidden rounded-md border border-border">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-xs">
                  <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Candidate</th>
                      <th className="px-3 py-2 font-medium">Document</th>
                      <th className="px-3 py-2 font-medium">Location</th>
                      <th className="px-3 py-2 font-medium">Manual review</th>
                      <th className="px-3 py-2 font-medium">Overall</th>
                      <th className="px-3 py-2 text-right font-medium">Open</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {query.data.items.map((item) => (
                      <tr key={item.candidateId} className="hover:bg-accent/40">
                        <td className="px-3 py-3">
                          <p className="font-medium text-foreground">
                            Candidate {item.candidateId.slice(0, 8)}
                          </p>
                          <p className="mt-0.5 max-w-[230px] truncate font-mono text-[10px] text-muted-foreground">
                            {item.candidateId}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {item.addressVersion
                              ? `Address version ${item.addressVersion}`
                              : "No address version"}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill
                            value={item.documentStatus}
                            label={formatAddressDocumentStatus(item.documentStatus)}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium tabular-nums text-foreground">
                            {item.successfulLocationChecks}/{item.requiredLocationChecks}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {item.currentAttemptState
                              ? item.currentAttemptState.replaceAll("_", " ")
                              : "No attempt"}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-foreground">
                            {formatManualReviewStatus(item.manualReviewStatus)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {item.pendingManualReviewTargetAvailable
                              ? item.manualLocationApprovalEligible
                                ? "Eligible"
                                : "Target available; approval blocked"
                              : "No pending target"}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill
                            value={item.overallStatus}
                            label={formatPermanentAddressStatus(item.overallStatus)}
                          />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Link
                            to="/admin/verifications/permanent-address/$candidateId"
                            params={{ candidateId: item.candidateId }}
                            className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
                          >
                            Review <ArrowRight aria-hidden className="size-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-border px-3 py-2">
                <span className="text-[11px] text-muted-foreground">
                  Showing {offset + 1}–{offset + query.data.items.length}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    disabled={offset === 0}
                    className="h-8 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      query.data?.nextOffset != null && setOffset(query.data.nextOffset)
                    }
                    disabled={query.data.nextOffset == null}
                    className="h-8 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
