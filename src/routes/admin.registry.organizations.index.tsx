import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Database, Network } from "lucide-react";
import { appEnv } from "@/config/env";
import { useAdminAccess } from "@/features/admin/auth/admin-access";
import { AdminSearchField } from "@/features/admin/components/search-field";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PermissionDeniedState,
} from "@/features/admin/components/states";
import { TablePagination } from "@/features/admin/components/table-pagination";
import { WorkspaceSection } from "@/features/admin/components/workspace-section";
import { companyDirectoryQueryOptions } from "@/features/admin/data/organizations";
import { useDebouncedValue } from "@/features/admin/hooks/use-debounced-value";
import { hasPermission } from "@/features/admin/workflow/permissions";

export const Route = createFileRoute("/admin/registry/organizations/")({
  head: () => ({
    meta: [
      { title: "Organizations — KairoID Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OrganizationDirectoryPage,
});

const ORGANIZATION_TYPES = [
  { value: "all", label: "All types" },
  { value: "employer", label: "Employer" },
  { value: "university", label: "University" },
  { value: "staffing_agency", label: "Staffing agency" },
  { value: "background_verification_partner", label: "Verification partner" },
  { value: "government", label: "Government" },
  { value: "certification_body", label: "Certification body" },
  { value: "hospital", label: "Hospital" },
  { value: "gig_platform", label: "Gig platform" },
  { value: "financial_institution", label: "Financial institution" },
  { value: "other", label: "Other" },
];

const ACCOUNT_STATUSES = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "setup_incomplete", label: "Setup incomplete" },
  { value: "suspended", label: "Suspended" },
];

function OrganizationDirectoryPage() {
  const access = useAdminAccess();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [organizationType, setOrganizationType] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const debouncedSearch = useDebouncedValue(search, 300);
  const canView = hasPermission(access.admin?.permissions ?? [], "users.view");
  const options = companyDirectoryQueryOptions({
    search: debouncedSearch,
    status,
    organizationType,
    page,
    pageSize,
  });
  const query = useQuery({
    ...options,
    enabled: canView && !appEnv.adminDemoMode,
  });

  if (!canView) {
    return (
      <PermissionDeniedState description="Company 360 contains organization, people, and workspace membership data and requires user-directory access." />
    );
  }

  if (appEnv.adminDemoMode) {
    return (
      <EmptyState
        title="Company 360 is unavailable in Demo Mode"
        description="This workspace intentionally displays only real backend organization data."
      />
    );
  }

  const hasFilters = search.trim().length > 0 || status !== "all" || organizationType !== "all";

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Link to="/admin/registry" className="hover:text-foreground hover:underline">
              Registry
            </Link>
            <span>/</span>
            <span>Organizations</span>
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Client organizations
          </h1>
          <p className="mt-0.5 max-w-3xl text-sm text-muted-foreground">
            Search real KairoID workspaces and open a complete operational view of their people,
            verification activity, and team.
          </p>
        </div>
        <Link
          to="/admin/registry"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
        >
          <Network aria-hidden className="size-3.5" />
          Trust Registry
        </Link>
      </header>

      <div className="relative overflow-hidden rounded-xl border border-border bg-card px-5 py-5">
        <div className="absolute right-0 top-0 h-28 w-56 bg-[radial-gradient(circle_at_top_right,rgba(15,168,165,0.16),transparent_68%)]" />
        <div className="relative flex flex-col gap-3 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <label
              className="mb-1.5 block text-xs font-medium text-foreground"
              htmlFor="company-search"
            >
              Search organizations
            </label>
            <AdminSearchField
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Company name, domain, organization ID, or owner email"
              ariaLabel="Search client organizations"
              className="max-w-3xl"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={organizationType}
              onChange={(event) => {
                setOrganizationType(event.target.value);
                setPage(1);
              }}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
              aria-label="Organization type"
            >
              {ORGANIZATION_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
              aria-label="Account status"
            >
              {ACCOUNT_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <WorkspaceSection
        title="Organization results"
        description={
          query.data
            ? `${query.data.total} matching workspace${query.data.total === 1 ? "" : "s"}. Counts are backend-derived.`
            : "Backend-driven organization directory."
        }
      >
        {query.isPending ? <LoadingSkeleton rows={8} /> : null}
        {query.error ? (
          <ErrorState
            title="Organizations failed to load"
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
        {query.data?.total === 0 ? (
          <EmptyState
            title="No organizations found"
            description={
              hasFilters
                ? "Try another company name, domain, identifier, or clear the filters."
                : "No client workspaces are currently available."
            }
          />
        ) : null}
        {query.data && query.data.total > 0 ? (
          <div className="overflow-hidden rounded-md border border-border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-xs">
                <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Organization</th>
                    <th className="px-3 py-2 font-medium">People</th>
                    <th className="px-3 py-2 font-medium">Requests</th>
                    <th className="px-3 py-2 font-medium">Verified</th>
                    <th className="px-3 py-2 font-medium">Pending</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Open</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {query.data.items.map((company) => (
                    <tr key={company.id} className="hover:bg-accent/40">
                      <td className="px-3 py-3">
                        <div className="flex min-w-[250px] items-center gap-2.5">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#0B2545] text-white">
                            <Building2 aria-hidden className="size-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block font-medium text-foreground">
                              {company.name}
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {company.domain ?? company.id}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 tabular-nums text-foreground">
                        {company.peopleCount}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-foreground">
                        {company.requestCount}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-foreground">
                        {company.verifiedCount}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-foreground">
                        {company.pendingCount + company.inProgressCount}
                      </td>
                      <td className="px-3 py-3">
                        <AccountStatus
                          status={company.accountStatus}
                          customer={company.isWorkspaceCustomer}
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          to="/admin/registry/organizations/$organizationId"
                          params={{ organizationId: company.id }}
                          className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
                        >
                          Open <ArrowRight aria-hidden className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={query.data.page}
              pageSize={query.data.pageSize}
              total={query.data.total}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPageSize(value);
                setPage(1);
              }}
            />
          </div>
        ) : null}
      </WorkspaceSection>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <Database aria-hidden className="size-4 text-[#0FA8A5]" />
        Company 360 reads canonical workspace data. Trust Registry identity remains a separate,
        linked source of organization truth.
      </div>
    </div>
  );
}

function AccountStatus({ status, customer }: { status: string; customer: boolean }) {
  const tone =
    status === "active"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : status === "suspended"
        ? "bg-red-50 text-red-800 ring-red-200"
        : "bg-amber-50 text-amber-800 ring-amber-200";
  return (
    <div className="flex flex-col items-start gap-1">
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${tone}`}>
        {formatLabel(status)}
      </span>
      <span className="text-[10px] text-muted-foreground">
        {customer ? "Workspace customer" : "No workspace members"}
      </span>
    </div>
  );
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
