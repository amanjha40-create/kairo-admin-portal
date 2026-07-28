import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, AlertTriangle } from "lucide-react";
import { WorkspaceSection } from "@/features/admin/components/workspace-section";
import { AdminSearchField } from "@/features/admin/components/search-field";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/features/admin/components/states";
import { TablePagination } from "@/features/admin/components/table-pagination";
import {
  REGISTRY_ORG_STATE_LABEL,
  getRegistryOrgTypeLabel,
  registryListQueryOptions,
  registryMetricsQueryOptions,
  type RegistryOrgState,
} from "@/features/admin/data/registry";
import { ApiError } from "@/lib/api/errors";

export const Route = createFileRoute("/admin/registry/")({
  head: () => ({
    meta: [{ title: "Registry — Kairo Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: RegistryPage,
});

const STATE_FILTERS: Array<{ key: "all" | RegistryOrgState; label: string }> = [
  { key: "all", label: "All" },
  { key: "verified", label: "Verified" },
  { key: "unverified", label: "Unverified" },
  { key: "duplicate_review", label: "Duplicates" },
  { key: "deprecated", label: "Deprecated" },
];

function RegistryPage() {
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | RegistryOrgState>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const metricsQuery = useQuery(registryMetricsQueryOptions());
  const listQuery = useQuery(
    registryListQueryOptions({
      query,
      state: stateFilter,
      page,
      pageSize,
    }),
  );

  const onQueryChange = (next: string) => {
    setQuery(next);
    setPage(1);
  };

  const onStateFilterChange = (next: "all" | RegistryOrgState) => {
    setStateFilter(next);
    setPage(1);
  };

  const onPageSizeChange = (next: number) => {
    setPageSize(next);
    setPage(1);
  };

  if (metricsQuery.isPending || listQuery.isPending) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <LoadingSkeleton rows={8} />
      </div>
    );
  }

  const error = metricsQuery.error ?? listQuery.error ?? null;
  if (error) {
    const copy = getRegistryListErrorCopy(error);
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState
          title={copy.title}
          description={copy.description}
          action={
            <button
              type="button"
              onClick={() => {
                void metricsQuery.refetch();
                void listQuery.refetch();
              }}
              className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90"
            >
              Try again
            </button>
          }
        />
      </div>
    );
  }

  const metrics = metricsQuery.data;
  const result = listQuery.data;
  if (!metrics || !result) {
    return null;
  }

  const hasFilters = query.trim().length > 0 || stateFilter !== "all";

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Registry</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Canonical organizations used across Kairo verifications. Contacts, activity, duplicate
          review signals and lifecycle state live on the org detail page.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Organizations" value={metrics.total} sub={`${metrics.verified} verified`} />
        <Metric label="Unverified" value={metrics.unverified} sub="Needs registry review" />
        <Metric
          label="Duplicate review"
          value={metrics.duplicates}
          sub="Awaits canonicalization"
          tone="warning"
        />
        <Metric
          label="Approved contacts"
          value={metrics.contactsApproved}
          sub={`${metrics.contactsBounced} bounced`}
        />
      </div>

      <WorkspaceSection
        title="Organizations"
        description={`${result.total} total record${result.total === 1 ? "" : "s"}${hasFilters ? `, ${result.items.length} on this page.` : "."}`}
        action={
          <div className="w-64">
            <AdminSearchField
              value={query}
              onChange={onQueryChange}
              placeholder="Search name, domain, country"
            />
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {STATE_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => onStateFilterChange(filter.key)}
              className={
                "h-7 rounded-md border px-2 text-[11px] font-medium " +
                (stateFilter === filter.key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:bg-accent")
              }
            >
              {filter.label}
            </button>
          ))}
        </div>
        {result.total === 0 ? (
          <EmptyState
            title={hasFilters ? "No organizations match" : "No registry organizations yet"}
            description={
              hasFilters
                ? "Try clearing filters or the search box."
                : "Registry records will appear here once the backend returns admin projections."
            }
          />
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-xs">
                <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Organization</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Country</th>
                    <th className="px-3 py-2 font-medium">State</th>
                    <th className="px-3 py-2 font-medium">Contacts</th>
                    <th className="px-3 py-2 font-medium">Active cases</th>
                    <th className="px-3 py-2 font-medium">Verifications</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {result.items.map((organization) => (
                    <tr key={organization.id} className="hover:bg-accent/40">
                      <td className="px-3 py-2">
                        <Link
                          to="/admin/registry/$organizationId"
                          params={{ organizationId: organization.id }}
                          className="flex min-w-0 items-center gap-2 text-foreground hover:underline"
                        >
                          <Building2 aria-hidden className="size-3.5 text-muted-foreground" />
                          <span className="min-w-0">
                            <span className="block font-medium">{organization.canonicalName}</span>
                            <span className="block text-[11px] font-mono text-muted-foreground">
                              {organization.domain ?? "Domain unavailable"}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {getRegistryOrgTypeLabel(organization.orgType)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{organization.country}</td>
                      <td className="px-3 py-2">
                        <StateChip state={organization.state} />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {typeof organization.contactCount === "number"
                          ? organization.contactCount
                          : "Unavailable"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {organization.activeCaseCount}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {organization.totalVerifications}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={result.page}
              pageSize={result.pageSize}
              total={result.total}
              onPageChange={setPage}
              onPageSizeChange={onPageSizeChange}
            />
          </div>
        )}
      </WorkspaceSection>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-1">
        <p className="text-xl font-semibold tracking-tight text-foreground">{value}</p>
        {tone === "warning" && value > 0 ? (
          <AlertTriangle aria-hidden className="size-3.5 text-amber-600" />
        ) : null}
      </div>
      {sub ? <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function StateChip({ state }: { state: RegistryOrgState }) {
  const map: Record<RegistryOrgState, string> = {
    verified:
      "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60",
    unverified:
      "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60",
    duplicate_review:
      "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60",
    deprecated: "bg-muted text-muted-foreground ring-border",
  };
  return (
    <span
      className={
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset " +
        map[state]
      }
    >
      {REGISTRY_ORG_STATE_LABEL[state]}
    </span>
  );
}

function getRegistryListErrorCopy(error: Error) {
  if (error instanceof ApiError && error.code === "unauthorized") {
    return {
      title: "Sign in required",
      description: error.message,
    };
  }

  if (error instanceof ApiError && error.code === "forbidden") {
    return {
      title: "Registry access denied",
      description: error.message,
    };
  }

  return {
    title: "Registry failed to load",
    description: error.message,
  };
}
