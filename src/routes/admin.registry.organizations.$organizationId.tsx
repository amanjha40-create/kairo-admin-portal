import { useState, type ReactNode } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  ShieldAlert,
  Users,
} from "lucide-react";
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
import {
  companyActivityQueryOptions,
  companyDetailQueryOptions,
  companyOverviewQueryOptions,
  companyPeopleQueryOptions,
  companyTeamQueryOptions,
  companyVerificationsQueryOptions,
  type CompanyActivityItem,
  type CompanyDetail,
  type CompanyOverview,
  type CompanyPage,
  type CompanyPersonItem,
  type CompanyTeamItem,
  type CompanyVerificationItem,
} from "@/features/admin/data/organizations";
import { useDebouncedValue } from "@/features/admin/hooks/use-debounced-value";
import { hasPermission } from "@/features/admin/workflow/permissions";
import { ApiError } from "@/lib/api/errors";

export const Route = createFileRoute("/admin/registry/organizations/$organizationId")({
  head: () => ({
    meta: [
      { title: "Company 360 — KairoID Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Company360Page,
});

type CompanyTab = "overview" | "people" | "verifications" | "team" | "activity";

const TABS: Array<{ id: CompanyTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "people", label: "People" },
  { id: "verifications", label: "Verifications" },
  { id: "team", label: "Team" },
  { id: "activity", label: "Activity" },
];

const VERIFICATION_TYPES = [
  "employment",
  "education",
  "identity",
  "document",
  "license",
  "medical",
  "reference",
  "platform",
  "certification",
  "custom",
];

const VERIFICATION_STATUSES = [
  "draft",
  "pending_subject_acceptance",
  "accepted",
  "pending_subject_submission",
  "pending_admin_review",
  "awaiting_subject_corrections",
  "pending_admin_re_review",
  "approved_for_organization_verification",
  "pending_organization_resolution",
  "pending_organization_acceptance",
  "in_progress",
  "awaiting_information",
  "pending_admin_quality_review",
  "verified",
  "rejected",
  "unable_to_verify",
  "cancelled",
  "withdrawn_by_candidate",
  "expired",
];

function Company360Page() {
  const { organizationId } = Route.useParams();
  const access = useAdminAccess();
  const canView = hasPermission(access.admin?.permissions ?? [], "users.view");
  const [tab, setTab] = useState<CompanyTab>("overview");
  const [peopleSearch, setPeopleSearch] = useState("");
  const [peopleStatus, setPeopleStatus] = useState("all");
  const [peoplePage, setPeoplePage] = useState(1);
  const [peoplePageSize, setPeoplePageSize] = useState(20);
  const [verificationSearch, setVerificationSearch] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("all");
  const [verificationType, setVerificationType] = useState("all");
  const [createdAfter, setCreatedAfter] = useState("");
  const [createdBefore, setCreatedBefore] = useState("");
  const [verificationPage, setVerificationPage] = useState(1);
  const [verificationPageSize, setVerificationPageSize] = useState(20);
  const [teamSearch, setTeamSearch] = useState("");
  const [teamStatus, setTeamStatus] = useState("all");
  const [teamPage, setTeamPage] = useState(1);
  const [teamPageSize, setTeamPageSize] = useState(20);
  const [activityPage, setActivityPage] = useState(1);

  const enabled = canView && !appEnv.adminDemoMode;
  const detailQuery = useQuery({ ...companyDetailQueryOptions(organizationId), enabled });
  const overviewQuery = useQuery({ ...companyOverviewQueryOptions(organizationId), enabled });
  const peopleQuery = useQuery({
    ...companyPeopleQueryOptions(organizationId, {
      search: useDebouncedValue(peopleSearch, 300),
      status: peopleStatus,
      page: peoplePage,
      pageSize: peoplePageSize,
    }),
    enabled: enabled && tab === "people",
  });
  const verificationsQuery = useQuery({
    ...companyVerificationsQueryOptions(organizationId, {
      search: useDebouncedValue(verificationSearch, 300),
      status: verificationStatus,
      verificationType,
      createdAfter,
      createdBefore,
      page: verificationPage,
      pageSize: verificationPageSize,
    }),
    enabled: enabled && tab === "verifications",
  });
  const teamQuery = useQuery({
    ...companyTeamQueryOptions(organizationId, {
      search: useDebouncedValue(teamSearch, 300),
      status: teamStatus,
      page: teamPage,
      pageSize: teamPageSize,
    }),
    enabled: enabled && tab === "team",
  });
  const activityQuery = useQuery({
    ...companyActivityQueryOptions(organizationId, {
      page: activityPage,
      pageSize: tab === "overview" ? 10 : 20,
    }),
    enabled: enabled && (tab === "overview" || tab === "activity"),
  });

  if (!canView) {
    return (
      <PermissionDeniedState description="Company 360 requires permission to read organization and user operations data." />
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

  if (detailQuery.isPending || overviewQuery.isPending) {
    return <LoadingSkeleton rows={12} className="mx-auto max-w-[1500px]" />;
  }

  const primaryError = detailQuery.error ?? overviewQuery.error;
  if (primaryError) {
    const notFound = primaryError instanceof ApiError && primaryError.code === "not_found";
    return (
      <ErrorState
        title={notFound ? "Organization not found" : "Company 360 failed to load"}
        description={primaryError.message}
        action={
          <Link
            to="/admin/registry/organizations"
            className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background"
          >
            Back to organizations
          </Link>
        }
      />
    );
  }

  const company = detailQuery.data;
  const overview = overviewQuery.data;
  if (!company || !overview) return null;

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
      <header className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/admin/registry/organizations"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden className="size-3.5" /> Organizations
          </Link>
          <div className="flex items-center gap-2">
            <StatusChip value={company.accountStatus} />
            <span className="rounded bg-muted px-2 py-1 text-[10px] font-medium text-foreground">
              {company.isWorkspaceCustomer ? "KairoID workspace" : "No active workspace members"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-[#0B2545] text-white shadow-sm">
            <Building2 aria-hidden className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {company.name}
            </h1>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="font-mono">{company.id}</span>
              {company.domain ? <span>{company.domain}</span> : null}
              <span>{formatLabel(company.organizationType)}</span>
            </div>
          </div>
          {company.registryRecordId ? (
            <Link
              to="/admin/registry/$organizationId"
              params={{ organizationId: company.registryRecordId }}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
            >
              Registry record <ExternalLink aria-hidden className="size-3" />
            </Link>
          ) : null}
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={
              "h-8 whitespace-nowrap rounded-md px-3 text-xs font-medium " +
              (tab === item.id
                ? "bg-[#0B2545] text-white shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground")
            }
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "overview" ? (
        <OverviewTab company={company} overview={overview} activity={activityQuery.data?.items} />
      ) : null}
      {tab === "people" ? (
        <PeopleTab
          query={peopleQuery}
          search={peopleSearch}
          status={peopleStatus}
          onSearch={(value) => {
            setPeopleSearch(value);
            setPeoplePage(1);
          }}
          onStatus={(value) => {
            setPeopleStatus(value);
            setPeoplePage(1);
          }}
          onOpenRequests={(name) => {
            setVerificationSearch(name);
            setVerificationPage(1);
            setTab("verifications");
          }}
          onPage={setPeoplePage}
          onPageSize={(value) => {
            setPeoplePageSize(value);
            setPeoplePage(1);
          }}
        />
      ) : null}
      {tab === "verifications" ? (
        <VerificationsTab
          query={verificationsQuery}
          search={verificationSearch}
          status={verificationStatus}
          type={verificationType}
          createdAfter={createdAfter}
          createdBefore={createdBefore}
          onSearch={(value) => {
            setVerificationSearch(value);
            setVerificationPage(1);
          }}
          onStatus={(value) => {
            setVerificationStatus(value);
            setVerificationPage(1);
          }}
          onType={(value) => {
            setVerificationType(value);
            setVerificationPage(1);
          }}
          onCreatedAfter={(value) => {
            setCreatedAfter(value);
            setVerificationPage(1);
          }}
          onCreatedBefore={(value) => {
            setCreatedBefore(value);
            setVerificationPage(1);
          }}
          onPage={setVerificationPage}
          onPageSize={(value) => {
            setVerificationPageSize(value);
            setVerificationPage(1);
          }}
        />
      ) : null}
      {tab === "team" ? (
        <TeamTab
          query={teamQuery}
          search={teamSearch}
          status={teamStatus}
          onSearch={(value) => {
            setTeamSearch(value);
            setTeamPage(1);
          }}
          onStatus={(value) => {
            setTeamStatus(value);
            setTeamPage(1);
          }}
          onPage={setTeamPage}
          onPageSize={(value) => {
            setTeamPageSize(value);
            setTeamPage(1);
          }}
        />
      ) : null}
      {tab === "activity" ? <ActivityTab query={activityQuery} onPage={setActivityPage} /> : null}
    </div>
  );
}

function OverviewTab({
  company,
  overview,
  activity,
}: {
  company: CompanyDetail;
  overview: CompanyOverview;
  activity?: CompanyActivityItem[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="People"
          value={overview.peopleCount}
          icon={<Users className="size-4" />}
        />
        <MetricCard
          label="Requests"
          value={overview.verificationTotal}
          icon={<Activity className="size-4" />}
        />
        <MetricCard
          label="Verified"
          value={overview.verifiedCount}
          icon={<CheckCircle2 className="size-4" />}
          tone="positive"
        />
        <MetricCard
          label="In progress"
          value={overview.inProgressCount}
          icon={<Clock3 className="size-4" />}
        />
        <MetricCard
          label="Needs attention"
          value={overview.needsAttentionCount}
          icon={<ShieldAlert className="size-4" />}
          tone="warning"
        />
        <MetricCard
          label="Completion rate"
          value={overview.completionRate == null ? "Unavailable" : `${overview.completionRate}%`}
          sub={
            overview.completionRate == null
              ? "No eligible requests"
              : `${overview.completionRateNumerator} of ${overview.completionRateDenominator} eligible`
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown title="Verification status" values={overview.statusCounts} />
        <Breakdown title="Verification type" values={overview.typeCounts} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <WorkspaceSection title="Organization details" description="Canonical workspace metadata.">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <Detail label="Account status" value={formatLabel(company.accountStatus)} />
            <Detail label="Onboarding" value={formatLabel(company.onboardingStatus)} />
            <Detail label="Verification state" value={formatLabel(company.verificationState)} />
            <Detail label="Team size" value={String(company.teamSize)} />
            <Detail label="Primary owner" value={company.primaryOwnerName ?? "Unavailable"} />
            <Detail label="Owner email" value={company.primaryOwnerEmailMasked ?? "Unavailable"} />
            <Detail label="Industry" value={company.industry ?? "Unavailable"} />
            <Detail label="Location" value={company.location ?? "Unavailable"} />
            <Detail label="Organization size" value={company.organizationSize ?? "Unavailable"} />
            <Detail label="Created" value={formatDate(company.createdAt)} />
            <Detail label="Last activity" value={formatDate(company.lastActivityAt)} />
          </dl>
        </WorkspaceSection>
        <WorkspaceSection
          title="Recent activity"
          description="Backend audit events for this organization."
        >
          <ActivityList items={activity ?? []} compact />
        </WorkspaceSection>
      </div>
    </div>
  );
}

function PeopleTab({
  query,
  search,
  status,
  onSearch,
  onStatus,
  onOpenRequests,
  onPage,
  onPageSize,
}: {
  query: UseQueryResult<CompanyPage<CompanyPersonItem>, Error>;
  search: string;
  status: string;
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
  onOpenRequests: (name: string) => void;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  return (
    <WorkspaceSection
      title="People"
      description="Candidates and people associated with this workspace."
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <AdminSearchField
          value={search}
          onChange={onSearch}
          placeholder="Search person name, email, or ID"
          className="min-w-64 flex-1"
        />
        <FilterSelect
          value={status}
          onChange={onStatus}
          label="Lifecycle status"
          values={["active", "archived", "merged"]}
        />
      </div>
      <QueryState query={query} emptyTitle="No people found">
        {query.data ? (
          <DataTable
            headers={[
              "Person",
              "Relationship",
              "Requests",
              "Verified",
              "Pending",
              "Last activity",
              "Actions",
            ]}
            rows={query.data.items.map((person) => [
              <div key="person">
                <div className="font-medium text-foreground">{person.displayName}</div>
                <div className="text-[11px] text-muted-foreground">
                  {person.emailMasked ?? person.id}
                </div>
              </div>,
              formatLabel(person.relationship),
              person.verificationRequestCount,
              person.verifiedCount,
              person.pendingCount,
              formatDate(person.lastActivityAt),
              <div key="actions" className="flex items-center gap-2">
                {person.linkedUserId ? (
                  <Link
                    to="/admin/users/$userId"
                    params={{ userId: person.linkedUserId }}
                    className="font-medium text-foreground hover:underline"
                  >
                    View person
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => onOpenRequests(person.displayName)}
                  className="font-medium text-foreground hover:underline"
                >
                  View requests
                </button>
              </div>,
            ])}
            page={query.data.page}
            pageSize={query.data.pageSize}
            total={query.data.total}
            onPage={onPage}
            onPageSize={onPageSize}
          />
        ) : null}
      </QueryState>
    </WorkspaceSection>
  );
}

function VerificationsTab({
  query,
  search,
  status,
  type,
  createdAfter,
  createdBefore,
  onSearch,
  onStatus,
  onType,
  onCreatedAfter,
  onCreatedBefore,
  onPage,
  onPageSize,
}: {
  query: UseQueryResult<CompanyPage<CompanyVerificationItem>, Error>;
  search: string;
  status: string;
  type: string;
  createdAfter: string;
  createdBefore: string;
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
  onType: (value: string) => void;
  onCreatedAfter: (value: string) => void;
  onCreatedBefore: (value: string) => void;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  return (
    <WorkspaceSection
      title="Verification requests"
      description="Requests owned by this organization. Open a row in the existing Admin case workspace."
    >
      <div className="mb-3 grid gap-2 lg:grid-cols-[minmax(220px,1fr)_180px_180px_150px_150px]">
        <AdminSearchField
          value={search}
          onChange={onSearch}
          placeholder="Search candidate name, email, or request ID"
        />
        <FilterSelect
          value={status}
          onChange={onStatus}
          label="Verification status"
          values={VERIFICATION_STATUSES}
        />
        <FilterSelect
          value={type}
          onChange={onType}
          label="Verification type"
          values={VERIFICATION_TYPES}
        />
        <DateInput value={createdAfter} onChange={onCreatedAfter} label="Created after" />
        <DateInput value={createdBefore} onChange={onCreatedBefore} label="Created before" />
      </div>
      <QueryState query={query} emptyTitle="No verification requests found">
        {query.data ? (
          <DataTable
            headers={[
              "Candidate",
              "Type",
              "Requested by",
              "Created",
              "Status",
              "Completed",
              "Updated",
            ]}
            rows={query.data.items.map((request) => [
              <Link
                key="candidate"
                to="/admin/verifications/$caseId"
                params={{ caseId: request.id }}
                className="block min-w-48 hover:underline"
              >
                <span className="block font-medium text-foreground">{request.candidateName}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {request.candidateEmailMasked}
                </span>
              </Link>,
              formatLabel(request.requestType),
              request.requestedBy ?? "Unavailable",
              formatDate(request.createdAt),
              <StatusChip key="status" value={request.status} />,
              formatDate(request.completedAt),
              formatDate(request.updatedAt),
            ])}
            page={query.data.page}
            pageSize={query.data.pageSize}
            total={query.data.total}
            onPage={onPage}
            onPageSize={onPageSize}
          />
        ) : null}
      </QueryState>
    </WorkspaceSection>
  );
}

function TeamTab({
  query,
  search,
  status,
  onSearch,
  onStatus,
  onPage,
  onPageSize,
}: {
  query: UseQueryResult<CompanyPage<CompanyTeamItem>, Error>;
  search: string;
  status: string;
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  return (
    <WorkspaceSection
      title="Workspace team"
      description="Current organization members and canonical workspace roles."
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <AdminSearchField
          value={search}
          onChange={onSearch}
          placeholder="Search team member name or email"
          className="min-w-64 flex-1"
        />
        <FilterSelect
          value={status}
          onChange={onStatus}
          label="Member status"
          values={["active", "suspended"]}
        />
      </div>
      <QueryState query={query} emptyTitle="No workspace members found">
        {query.data ? (
          <DataTable
            headers={["Member", "Role", "Status", "Joined", "Last activity"]}
            rows={query.data.items.map((member) => [
              <div key="member">
                <div className="font-medium text-foreground">{member.displayName}</div>
                <div className="text-[11px] text-muted-foreground">{member.emailMasked}</div>
              </div>,
              formatLabel(member.role),
              <StatusChip key="status" value={member.status} />,
              formatDate(member.joinedAt),
              formatDate(member.lastActivityAt),
            ])}
            page={query.data.page}
            pageSize={query.data.pageSize}
            total={query.data.total}
            onPage={onPage}
            onPageSize={onPageSize}
          />
        ) : null}
      </QueryState>
    </WorkspaceSection>
  );
}

function ActivityTab({
  query,
  onPage,
}: {
  query: UseQueryResult<CompanyPage<CompanyActivityItem>, Error>;
  onPage: (page: number) => void;
}) {
  return (
    <WorkspaceSection
      title="Organization activity"
      description="Chronological verification and invitation audit events."
    >
      <QueryState query={query} emptyTitle="No activity recorded">
        {query.data ? (
          <>
            <ActivityList items={query.data.items} />
            <TablePagination
              page={query.data.page}
              pageSize={query.data.pageSize}
              total={query.data.total}
              onPageChange={onPage}
              onPageSizeChange={() => {}}
              pageSizeOptions={[20]}
            />
          </>
        ) : null}
      </QueryState>
    </WorkspaceSection>
  );
}

function QueryState<T>({
  query,
  emptyTitle,
  children,
}: {
  query: UseQueryResult<CompanyPage<T>, Error>;
  emptyTitle: string;
  children: ReactNode;
}) {
  if (query.isPending) return <LoadingSkeleton rows={8} />;
  if (query.error)
    return (
      <ErrorState
        title="Data failed to load"
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
    );
  if (query.data?.total === 0)
    return <EmptyState title={emptyTitle} description="Try another search or filter." />;
  return <>{children}</>;
}

function DataTable({
  headers,
  rows,
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  headers: string[];
  rows: ReactNode[][];
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-xs">
          <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-3 py-2 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {rows.map((cells, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-accent/30">
                {cells.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-2.5 text-muted-foreground">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPage}
        onPageSizeChange={onPageSize}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  tone?: "default" | "positive" | "warning";
}) {
  const color =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-amber-600"
        : "text-[#0FA8A5]";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div
        className={`flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide ${color}`}
      >
        {icon}
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold tracking-tight text-foreground">{value}</div>
      {sub ? <div className="mt-1 text-[10px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

function Breakdown({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values).sort((left, right) => right[1] - left[1]);
  const max = Math.max(...entries.map(([, value]) => value), 1);
  return (
    <WorkspaceSection title={title} description="Exact backend taxonomy and counts.">
      {entries.length === 0 ? (
        <EmptyState title="No verification data" />
      ) : (
        <div className="space-y-3">
          {entries.map(([label, value]) => (
            <div key={label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-foreground">{formatLabel(label)}</span>
                <span className="tabular-nums text-muted-foreground">{value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[#0FA8A5]"
                  style={{ width: `${Math.max((value / max) * 100, 3)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </WorkspaceSection>
  );
}

function ActivityList({
  items,
  compact = false,
}: {
  items: CompanyActivityItem[];
  compact?: boolean;
}) {
  if (items.length === 0) return <EmptyState title="No activity recorded" />;
  return (
    <ol className="space-y-3 border-l border-border pl-4">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span className="absolute -left-[19px] top-1.5 size-2 rounded-full bg-[#0FA8A5] ring-4 ring-background" />
          <div className="text-xs font-medium text-foreground">{formatLabel(item.eventType)}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {item.actorName ?? "System"}
            {item.newStatus ? ` · ${formatLabel(item.newStatus)}` : ""} ·{" "}
            {formatDate(item.occurredAt)}
          </div>
          {!compact && item.subjectId ? (
            <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {item.subjectId}
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  values,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  values: string[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
    >
      <option value="all">All {label.toLowerCase()}</option>
      {values.map((item) => (
        <option key={item} value={item}>
          {formatLabel(item)}
        </option>
      ))}
    </select>
  );
}

function DateInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <label className="grid gap-1 text-[10px] text-muted-foreground">
      <span>{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
      />
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-foreground">{value}</dd>
    </div>
  );
}

function StatusChip({ value }: { value: string }) {
  const tone =
    value === "active" || value === "verified"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : value === "suspended" || value === "rejected"
        ? "bg-red-50 text-red-800 ring-red-200"
        : "bg-muted text-foreground ring-border";
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${tone}`}
    >
      {formatLabel(value)}
    </span>
  );
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string) {
  if (!value) return "Unavailable";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}
