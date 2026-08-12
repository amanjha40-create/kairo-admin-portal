import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Building2, Plus } from "lucide-react";
import { appEnv } from "@/config/env";
import { WorkspaceSection } from "@/features/admin/components/workspace-section";
import { AdminSearchField } from "@/features/admin/components/search-field";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/features/admin/components/states";
import { TablePagination } from "@/features/admin/components/table-pagination";
import {
  REGISTRY_ORG_STATE_LABEL,
  createRegistryDataAdapter,
  getRegistryLifecycleStatusLabel,
  getRegistryOrgTypeLabel,
  registryKeys,
  registryListQueryOptions,
  registryMetricsQueryOptions,
  type RegistryCreatePayload,
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

const ORG_TYPE_FILTERS = [
  { value: "all", label: "All types" },
  { value: "employer", label: "Employer" },
  { value: "educational_institution", label: "Educational institution" },
  { value: "private_company", label: "Private company" },
  { value: "public_company", label: "Public company" },
  { value: "government", label: "Government" },
  { value: "non_profit", label: "Non-profit" },
  { value: "platform", label: "Platform" },
];

function RegistryPage() {
  const queryClient = useQueryClient();
  const adapter = useMemo(() => createRegistryDataAdapter(appEnv), []);
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | RegistryOrgState>("all");
  const [organizationType, setOrganizationType] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const metricsQuery = useQuery(registryMetricsQueryOptions());
  const listQuery = useQuery(
    registryListQueryOptions({
      query,
      state: stateFilter,
      organizationType,
      page,
      pageSize,
    }),
  );

  const createMutation = useMutation({
    mutationFn: (payload: RegistryCreatePayload) => adapter.createOrganization(payload),
    onSuccess: async () => {
      setShowCreateForm(false);
      await queryClient.invalidateQueries({ queryKey: registryKeys.all() });
    },
  });

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

  const error = metricsQuery.error ?? listQuery.error ?? createMutation.error ?? null;
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

  const hasFilters = query.trim().length > 0 || stateFilter !== "all" || organizationType !== "all";

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Registry</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Canonical organization truth for verifications, resolution, duplicate handling, and
            shared operational identity across Kairo.
          </p>
        </div>
        {!appEnv.adminDemoMode ? (
          <button
            type="button"
            onClick={() => setShowCreateForm((value) => !value)}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
          >
            <Plus aria-hidden className="size-3.5" />
            Create registry organization
          </button>
        ) : null}
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric
          label="Organizations"
          value={metrics.total}
          sub={`${metrics.linkedOrganizations} linked`}
        />
        <Metric
          label="Employers"
          value={metrics.employers}
          sub={`${metrics.institutions} institutions`}
        />
        <Metric
          label="Unresolved orgs"
          value={metrics.unresolvedOrganizations}
          sub="Needs canonical resolution"
        />
        <Metric
          label="Duplicate review"
          value={metrics.duplicates}
          sub="Potential merge candidates"
          tone="warning"
        />
        <Metric
          label="Verified"
          value={metrics.verified}
          sub={`${metrics.unverified} unverified`}
        />
      </div>

      {showCreateForm && !appEnv.adminDemoMode ? (
        <CreateRegistryForm
          pending={createMutation.isPending}
          onCancel={() => setShowCreateForm(false)}
          onSubmit={(payload) => createMutation.mutate(payload)}
        />
      ) : null}

      <WorkspaceSection
        title="Organizations"
        description={`${result.total} total record${result.total === 1 ? "" : "s"}${hasFilters ? `, ${result.items.length} on this page.` : "."}`}
        action={
          <div className="w-64">
            <AdminSearchField
              value={query}
              onChange={onQueryChange}
              placeholder="Search name, domain, alias"
            />
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
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
          <select
            value={organizationType}
            onChange={(event) => {
              setOrganizationType(event.target.value);
              setPage(1);
            }}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
          >
            {ORG_TYPE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
                    <th className="px-3 py-2 font-medium">Lifecycle</th>
                    <th className="px-3 py-2 font-medium">Primary domain</th>
                    <th className="px-3 py-2 font-medium">Aliases</th>
                    <th className="px-3 py-2 font-medium">Identifiers</th>
                    <th className="px-3 py-2 font-medium">Linked orgs</th>
                    <th className="px-3 py-2 font-medium">Verifications</th>
                    <th className="px-3 py-2 font-medium">Updated</th>
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
                              {organization.id}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {getRegistryOrgTypeLabel(organization.orgType)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          <StateChip state={organization.state} />
                          <span className="text-[10px] text-muted-foreground">
                            {getRegistryLifecycleStatusLabel(organization.lifecycleStatus)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {organization.domain ?? "Unavailable"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {organization.aliasesCount}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {organization.identifiersCount}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {organization.linkedOrganizationCount}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {organization.totalVerifications}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(organization.updatedAt).toLocaleDateString()}
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

function CreateRegistryForm({
  pending,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  onCancel: () => void;
  onSubmit: (payload: RegistryCreatePayload) => void;
}) {
  const [form, setForm] = useState<RegistryCreatePayload>({
    legalName: "",
    displayName: "",
    organizationType: "employer",
    country: "IN",
    stateProvince: "",
    website: "",
    lifecycleStatus: "draft",
    trustStatus: "unreviewed",
    registryConfidenceScore: 0,
  });

  const invalid = form.legalName.trim().length === 0 || form.country.trim().length !== 2;

  return (
    <WorkspaceSection
      title="Create registry organization"
      description="Create a canonical operational organization record for resolution and verification routing."
    >
      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (invalid || pending) {
            return;
          }
          onSubmit({
            ...form,
            country: form.country.trim().toUpperCase(),
            displayName: form.displayName?.trim() || undefined,
            stateProvince: form.stateProvince?.trim() || undefined,
            website: form.website?.trim() || undefined,
          });
        }}
      >
        <label className="grid gap-1 text-xs">
          <span className="font-medium text-foreground">Legal name</span>
          <input
            value={form.legalName}
            onChange={(event) => setForm((value) => ({ ...value, legalName: event.target.value }))}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
          />
        </label>
        <label className="grid gap-1 text-xs">
          <span className="font-medium text-foreground">Display name</span>
          <input
            value={form.displayName ?? ""}
            onChange={(event) =>
              setForm((value) => ({ ...value, displayName: event.target.value }))
            }
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
          />
        </label>
        <label className="grid gap-1 text-xs">
          <span className="font-medium text-foreground">Organization type</span>
          <select
            value={form.organizationType}
            onChange={(event) =>
              setForm((value) => ({ ...value, organizationType: event.target.value }))
            }
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
          >
            {ORG_TYPE_FILTERS.filter((item) => item.value !== "all").map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          <span className="font-medium text-foreground">Country</span>
          <input
            value={form.country}
            maxLength={2}
            onChange={(event) => setForm((value) => ({ ...value, country: event.target.value }))}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm uppercase text-foreground"
          />
        </label>
        <label className="grid gap-1 text-xs">
          <span className="font-medium text-foreground">State / province</span>
          <input
            value={form.stateProvince ?? ""}
            onChange={(event) =>
              setForm((value) => ({ ...value, stateProvince: event.target.value }))
            }
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
          />
        </label>
        <label className="grid gap-1 text-xs">
          <span className="font-medium text-foreground">Website</span>
          <input
            value={form.website ?? ""}
            onChange={(event) => setForm((value) => ({ ...value, website: event.target.value }))}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
          />
        </label>
        <div className="md:col-span-2 flex items-center gap-2">
          <button
            type="submit"
            disabled={invalid || pending}
            className="inline-flex h-9 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
          >
            {pending ? "Creating..." : "Create organization"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
          >
            Cancel
          </button>
        </div>
      </form>
    </WorkspaceSection>
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
