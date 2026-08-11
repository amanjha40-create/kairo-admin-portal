import type React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Users as UsersIcon } from "lucide-react";
import { WorkspaceSection } from "@/features/admin/components/workspace-section";
import { AdminSearchField } from "@/features/admin/components/search-field";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/features/admin/components/states";
import { TablePagination } from "@/features/admin/components/table-pagination";
import {
  ADMIN_USER_ACCOUNT_STATUS_LABEL,
  userListQueryOptions,
  type AdminUserAccountStatus,
  type AdminUserSortBy,
} from "@/features/admin/data/users";
import { formatRelativeTime } from "@/features/admin/lib/format";
import { ApiError } from "@/lib/api/errors";

export const Route = createFileRoute("/admin/users/")({
  head: () => ({
    meta: [{ title: "Users — Kairo Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: UsersDirectoryPage,
});

const STATUS_FILTERS: Array<{ key: "all" | AdminUserAccountStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "deleted", label: "Deleted" },
];

const SORT_OPTIONS: Array<{ value: AdminUserSortBy; label: string }> = [
  { value: "created_at", label: "Created" },
  { value: "updated_at", label: "Latest activity" },
  { value: "full_name", label: "Name" },
  { value: "email", label: "Email" },
];

function UsersDirectoryPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | AdminUserAccountStatus>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<AdminUserSortBy>("created_at");

  const listQuery = useQuery(
    userListQueryOptions({
      query,
      status,
      page,
      pageSize,
      sortBy,
      sortOrder: sortBy === "full_name" || sortBy === "email" ? "asc" : "desc",
    }),
  );

  const onQueryChange = (next: string) => {
    setQuery(next);
    setPage(1);
  };

  const onStatusChange = (next: "all" | AdminUserAccountStatus) => {
    setStatus(next);
    setPage(1);
  };

  const onPageSizeChange = (next: number) => {
    setPageSize(next);
    setPage(1);
  };

  if (listQuery.isPending) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <LoadingSkeleton rows={8} />
      </div>
    );
  }

  if (listQuery.error) {
    const copy = getUsersListErrorCopy(listQuery.error);
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState
          title={copy.title}
          description={copy.description}
          action={
            <button
              type="button"
              onClick={() => void listQuery.refetch()}
              className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90"
            >
              Try again
            </button>
          }
        />
      </div>
    );
  }

  const result = listQuery.data;
  if (!result) return null;

  const hasFilters = query.trim().length > 0 || status !== "all";

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Users</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Candidate operations directory backed by the shared Kairo backend. Search by name, email,
          or public ID to inspect account state, trust, verifications, and passport readiness.
        </p>
      </header>

      <WorkspaceSection
        title="Directory"
        description={`${result.total} total candidate account${result.total === 1 ? "" : "s"}${hasFilters ? `, ${result.items.length} on this page.` : "."}`}
        action={
          <div className="w-64">
            <AdminSearchField
              value={query}
              onChange={onQueryChange}
              placeholder="Search name, email, public ID"
            />
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => onStatusChange(filter.key)}
              className={
                "h-7 rounded-md border px-2 text-[11px] font-medium " +
                (status === filter.key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:bg-accent")
              }
            >
              {filter.label}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>Sort</span>
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value as AdminUserSortBy);
                setPage(1);
              }}
              className="h-7 rounded border border-border bg-background px-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Sort users"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {result.total === 0 ? (
          <EmptyState
            title={hasFilters ? "No users match" : "No candidate accounts yet"}
            description={
              hasFilters
                ? "Try clearing the search box or status filter."
                : "Candidate accounts will appear here once the backend returns Admin user projections."
            }
          />
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-xs">
                <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Candidate</th>
                    <th className="px-3 py-2 font-medium">Account</th>
                    <th className="px-3 py-2 font-medium">Profile</th>
                    <th className="px-3 py-2 font-medium">Trust</th>
                    <th className="px-3 py-2 font-medium">Verifications</th>
                    <th className="px-3 py-2 font-medium">Career</th>
                    <th className="px-3 py-2 font-medium">Passport</th>
                    <th className="px-3 py-2 font-medium">Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {result.items.map((user) => (
                    <tr key={user.id} className="hover:bg-accent/40">
                      <td className="px-3 py-2">
                        <Link
                          to="/admin/users/$userId"
                          params={{ userId: user.id }}
                          className="flex min-w-0 items-center gap-2 text-foreground hover:underline"
                        >
                          <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                            {initials(user.displayName)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{user.displayName}</span>
                            <span className="block truncate text-[11px] font-mono text-muted-foreground">
                              {user.maskedEmail}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <AccountStatusChip status={user.accountStatus} />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {user.profileCompletionPercentage}%
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {typeof user.trustScoreOverall === "number" ? (
                          <span className="tabular-nums text-foreground">
                            {user.trustScoreOverall}
                          </span>
                        ) : (
                          "Unavailable"
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {user.activeVerificationCount} active / {user.completedVerificationCount}{" "}
                        done
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{user.careerRecordCount}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {user.activePassportShareCount} active links
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {user.lastRelevantActivityAt
                          ? formatRelativeTime(user.lastRelevantActivityAt)
                          : "—"}
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

function AccountStatusChip({ status }: { status: AdminUserAccountStatus }) {
  const tone =
    status === "active"
      ? "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60"
      : status === "deleted"
        ? "bg-zinc-100 text-zinc-800 ring-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-200 dark:ring-zinc-700"
        : "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60";
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${tone}`}
    >
      {ADMIN_USER_ACCOUNT_STATUS_LABEL[status]}
    </span>
  );
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getUsersListErrorCopy(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return {
        title: "Your session expired",
        description: "Sign in again to continue reviewing candidate accounts.",
      };
    }
    if (error.status === 403) {
      return {
        title: "Users access is restricted",
        description: "Your account does not have permission to review candidate operations.",
      };
    }
  }
  return {
    title: "Users directory failed to load",
    description: "The Admin users directory could not be loaded. Try again shortly.",
  };
}

void UsersIcon;
void AlertTriangle;
