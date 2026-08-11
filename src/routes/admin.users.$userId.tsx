import type React from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, Phone, ShieldCheck, Users as UsersIcon } from "lucide-react";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/features/admin/components/states";
import { WorkspaceSection } from "@/features/admin/components/workspace-section";
import {
  ADMIN_USER_ACCOUNT_STATUS_LABEL,
  userDetailQueryOptions,
  type AdminUserAccountStatus,
  type AdminUserVerificationBreakdown,
} from "@/features/admin/data/users";
import { formatRelativeTime } from "@/features/admin/lib/format";
import { ApiError } from "@/lib/api/errors";

export const Route = createFileRoute("/admin/users/$userId")({
  head: () => ({
    meta: [
      { title: "User detail — Kairo Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: UserDetailPage,
});

function UserDetailPage() {
  const { userId } = Route.useParams();
  const detailQuery = useQuery(userDetailQueryOptions(userId));

  if (detailQuery.isPending) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <LoadingSkeleton rows={10} />
      </div>
    );
  }

  if (detailQuery.error) {
    const copy = getUserDetailErrorCopy(detailQuery.error);
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState
          title={copy.title}
          description={copy.description}
          action={
            <button
              type="button"
              onClick={() => void detailQuery.refetch()}
              className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90"
            >
              Try again
            </button>
          }
        />
      </div>
    );
  }

  const user = detailQuery.data;
  if (!user) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <EmptyState
          title="Candidate not found"
          description="This candidate may have been removed or the link is incorrect."
          action={
            <Link
              to="/admin/users"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent"
            >
              <ArrowLeft aria-hidden className="size-3" />
              Back to Users
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <ol className="flex items-center gap-1">
          <li>
            <Link to="/admin/users" className="hover:text-foreground hover:underline">
              Users
            </Link>
          </li>
          <li>/</li>
          <li className="font-medium text-foreground">{user.displayName}</li>
        </ol>
      </nav>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              {user.displayName}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Candidate account {user.id}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <AccountStatusChip status={user.accountStatus} />
              <VerificationChip label="Email verified" ok={user.emailVerified} />
              <VerificationChip label="Phone verified" ok={user.phoneVerified} />
              <VerificationChip label="Onboarding complete" ok={user.onboardingCompleted} />
            </div>
          </div>
          {user.deletedAt ? (
            <div className="max-w-sm rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              This account has been tombstoned. Admin can inspect the remaining operational record
              without recovering erased candidate data.
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] md:grid-cols-4">
          <Field icon={<Mail className="size-3" />} label="Email">
            {user.email}
          </Field>
          <Field icon={<Phone className="size-3" />} label="Phone">
            {user.phone ?? "Unavailable"}
          </Field>
          <Field label="Created">{new Date(user.createdAt).toLocaleDateString()}</Field>
          <Field label="Updated">{formatRelativeTime(user.updatedAt)}</Field>
          <Field label="Profile completion">{user.profileCompletionPercentage}%</Field>
          <Field label="Role">{user.currentRole ?? "Unavailable"}</Field>
          <Field label="Headline">{user.headline ?? "Unavailable"}</Field>
          <Field label="Location">{user.location ?? "Unavailable"}</Field>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <WorkspaceSection
            title="Trust"
            description={
              user.trust.lastCalculatedAt
                ? `Last calculated ${formatRelativeTime(user.trust.lastCalculatedAt)}`
                : "Trust score is not currently available."
            }
          >
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric label="Overall" value={user.trust.overall ?? "Unavailable"} />
              <Metric label="Status" value={user.trust.status ?? "Unavailable"} />
              <Metric
                label="Verification completeness"
                value={`${user.trust.verificationCompletenessPercentage}%`}
              />
              <Metric label="Profile completion" value={`${user.profileCompletionPercentage}%`} />
            </div>
          </WorkspaceSection>

          <WorkspaceSection
            title="Career summary"
            description={`${user.careerSummary.totalItems} canonical record(s)`}
          >
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Metric label="Employments" value={user.careerSummary.employments} />
              <Metric label="Educations" value={user.careerSummary.educations} />
              <Metric label="Certifications" value={user.careerSummary.certifications} />
              <Metric label="Projects" value={user.careerSummary.projects} />
              <Metric label="User documents" value={user.careerSummary.userDocuments} />
            </div>
          </WorkspaceSection>

          <WorkspaceSection
            title="Verification summary"
            description={`${user.verificationSummary.overall.total} backend-owned verification request(s)`}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <BreakdownCard title="Overall" breakdown={user.verificationSummary.overall} />
              <BreakdownCard title="Employment" breakdown={user.verificationSummary.employments} />
              <BreakdownCard title="Education" breakdown={user.verificationSummary.educations} />
              <BreakdownCard
                title="Certification"
                breakdown={user.verificationSummary.certifications}
              />
            </div>
          </WorkspaceSection>

          <WorkspaceSection
            title="Verification requests"
            description={`${user.verifications.length} request${user.verifications.length === 1 ? "" : "s"}`}
          >
            {user.verifications.length === 0 ? (
              <EmptyState
                title="No verification requests"
                description="This candidate has no linked verification workflow yet."
              />
            ) : (
              <div className="overflow-hidden rounded-md border border-border">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border text-xs">
                    <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Request</th>
                        <th className="px-3 py-2 font-medium">Type</th>
                        <th className="px-3 py-2 font-medium">Organization</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-background">
                      {user.verifications.map((item) => (
                        <tr key={item.id} className="hover:bg-accent/40">
                          <td className="px-3 py-2">
                            <Link
                              to="/admin/verifications/$caseId"
                              params={{ caseId: item.id }}
                              className="text-foreground hover:underline"
                            >
                              {item.linkedRecordLabel}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {humanize(item.requestType)}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {item.organizationName ?? "Unassigned"}
                          </td>
                          <td className="px-3 py-2">
                            <StatusPill label={humanize(item.status)} />
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {formatRelativeTime(item.updatedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </WorkspaceSection>

          <WorkspaceSection
            title="Activity"
            description={`${user.activity.length} real backend event${user.activity.length === 1 ? "" : "s"}`}
          >
            {user.activity.length === 0 ? (
              <EmptyState
                title="No recent activity"
                description="Operational activity will appear here when the backend records it."
              />
            ) : (
              <ol className="relative space-y-2 border-l border-border pl-4">
                {user.activity.map((event) => (
                  <li key={event.id} className="relative">
                    <span
                      aria-hidden
                      className="absolute -left-[19px] top-1.5 size-2 rounded-full bg-muted-foreground/60 ring-2 ring-background"
                    />
                    <div className="text-xs">
                      <p className="text-foreground">{event.title}</p>
                      {event.detail ? (
                        <p className="mt-0.5 text-muted-foreground">{event.detail}</p>
                      ) : null}
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatRelativeTime(event.occurredAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </WorkspaceSection>
        </div>

        <aside className="flex flex-col gap-4">
          <WorkspaceSection
            title="Passport"
            description={user.passport.ready ? "Ready" : "Not ready"}
          >
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <Metric label="Active links" value={user.passport.activeLinks} />
              <Metric label="Revoked links" value={user.passport.revokedLinks} />
              <Metric label="Expired links" value={user.passport.expiredLinks} />
              <Metric label="Unique views" value={user.passport.uniqueViews} />
            </div>
            <dl className="mt-3 space-y-1 text-[11px] text-muted-foreground">
              <div className="flex items-center justify-between gap-2">
                <dt>Total views</dt>
                <dd className="text-foreground">{user.passport.totalViews}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt>Latest share</dt>
                <dd className="text-foreground">
                  {user.passport.latestShareCreatedAt
                    ? formatRelativeTime(user.passport.latestShareCreatedAt)
                    : "Unavailable"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt>Last viewed</dt>
                <dd className="text-foreground">
                  {user.passport.lastViewedAt
                    ? formatRelativeTime(user.passport.lastViewedAt)
                    : "Unavailable"}
                </dd>
              </div>
            </dl>
          </WorkspaceSection>
        </aside>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-xs text-foreground">{children}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

function BreakdownCard({
  title,
  breakdown,
}: {
  title: string;
  breakdown: AdminUserVerificationBreakdown;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {breakdown.total} request{breakdown.total === 1 ? "" : "s"}
      </p>
      {Object.keys(breakdown.statuses).length === 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">No status data yet.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-[11px]">
          {Object.entries(breakdown.statuses).map(([status, total]) => (
            <li key={status} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{humanize(status)}</span>
              <span className="tabular-nums text-foreground">{total}</span>
            </li>
          ))}
        </ul>
      )}
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

function VerificationChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset " +
        (ok
          ? "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60"
          : "bg-muted text-muted-foreground ring-border")
      }
    >
      {ok ? <ShieldCheck aria-hidden className="size-3" /> : null}
      {label}
    </span>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
      {label}
    </span>
  );
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (part) => part.toUpperCase());
}

function getUserDetailErrorCopy(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return {
        title: "Your session expired",
        description: "Sign in again to continue reviewing this candidate account.",
      };
    }
    if (error.status === 403) {
      return {
        title: "Users access is restricted",
        description: "Your account does not have permission to inspect candidate operations.",
      };
    }
    if (error.status === 404) {
      return {
        title: "Candidate not found",
        description: "The backend no longer recognizes this candidate record.",
      };
    }
  }
  return {
    title: "Candidate detail failed to load",
    description: "The Admin candidate detail could not be loaded. Try again shortly.",
  };
}

void UsersIcon;
