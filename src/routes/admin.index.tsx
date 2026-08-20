import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  MailWarning,
  Rocket,
  Send,
  Zap,
} from "lucide-react";
import { SectionHeader } from "@/features/admin/components/section-header";
import { MetricCard } from "@/features/admin/components/metric-card";
import { AttentionCard } from "@/features/admin/components/attention-card";
import { Funnel } from "@/features/admin/components/funnel";
import { VerificationStatusGrid } from "@/features/admin/components/verification-status-grid";
import { ActivityItem } from "@/features/admin/components/activity-item";
import { ControlledPilotUnavailableState } from "@/features/admin/components/controlled-pilot-unavailable-state";
import { PlatformSummary } from "@/features/admin/components/platform-summary";
import { DateRangeSelector } from "@/features/admin/components/date-range-selector";
import { LoadingSkeleton, EmptyState, RetryState } from "@/features/admin/components/states";
import { useAdminAccess } from "@/features/admin/auth/admin-access";
import { shouldEnableAdminProtectedQuery } from "@/features/admin/auth/protected-query";
import { overviewDashboardQueryOptions } from "@/features/admin/data/overview";
import { appEnv } from "@/config/env";
import { adminNotificationUnreadCountQueryOptions } from "@/features/admin/data/notifications";
import { adminCommunicationSummaryQueryOptions } from "@/features/admin/data/communications.production";
import { getCommunicationMetrics } from "@/features/admin/runtime/communications";
import {
  SERVICE_HEALTH_LABEL,
  listServices,
  getSystemOverviewMetrics,
  mockDeployments,
  type ServiceHealthState,
} from "@/features/admin/runtime/system";
import type { PlatformServiceStatus } from "@/features/admin/data/types";
import { formatRelativeTime } from "@/features/admin/lib/format";
import {
  getOverviewRecentDeployment,
  shouldShowOverviewDemoOperationalSections,
} from "@/features/admin/lib/overview-operational-sections";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Overview — Kairo Admin" },
      {
        name: "description",
        content: "Kairo growth, verification operations and urgent activity.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const access = useAdminAccess();
  const overviewQuery = useQuery({
    ...overviewDashboardQueryOptions(),
    enabled: shouldEnableAdminProtectedQuery(access.state),
  });
  const showDemoOperationalSections = shouldShowOverviewDemoOperationalSections(appEnv);
  const notificationsSummaryQuery = useQuery({
    ...adminNotificationUnreadCountQueryOptions(),
    enabled: shouldEnableAdminProtectedQuery(access.state) && !showDemoOperationalSections,
  });
  const communicationsSummaryQuery = useQuery({
    ...adminCommunicationSummaryQueryOptions(),
    enabled: shouldEnableAdminProtectedQuery(access.state) && !showDemoOperationalSections,
  });
  const comms = showDemoOperationalSections ? getCommunicationMetrics() : null;
  const services = showDemoOperationalSections
    ? listServices().map<PlatformServiceStatus>((service) => ({
        id: service.id,
        name: service.name,
        note: service.note,
        state:
          service.state === "operational"
            ? "operational"
            : service.state === "degraded"
              ? "degraded"
              : "action_required",
      }))
    : null;
  const sys = showDemoOperationalSections ? getSystemOverviewMetrics() : null;
  const recentDeployment = showDemoOperationalSections
    ? getOverviewRecentDeployment(mockDeployments)
    : null;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-8">
      {/* Page header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Overview</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Monitor Kairo's growth, verification operations and urgent platform activity.
          </p>
        </div>
        <DateRangeSelector />
      </header>

      {!shouldEnableAdminProtectedQuery(access.state) || overviewQuery.isPending ? (
        <OverviewLoadingState />
      ) : overviewQuery.isError ? (
        <RetryState
          title="Overview unavailable"
          description={overviewQuery.error.message}
          onRetry={() => {
            void overviewQuery.refetch();
          }}
        />
      ) : overviewQuery.data.isEmpty ? (
        <EmptyState
          title="No overview data yet"
          description="Overview metrics will appear here once verification activity begins."
        />
      ) : (
        <>
          {/* Primary metrics */}
          <section aria-labelledby="metrics-heading">
            <SectionHeader
              title="Business metrics"
              description="How verification operations are moving today."
            />
            <h2 id="metrics-heading" className="sr-only">
              Primary metrics
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {overviewQuery.data.metrics.map((m) => (
                <MetricCard key={m.id} metric={m} />
              ))}
            </div>
          </section>

          {/* Urgent attention */}
          <section aria-labelledby="attention-heading">
            <SectionHeader
              title="Urgent attention"
              description="Operational work that needs an admin decision now."
            />
            <h2 id="attention-heading" className="sr-only">
              Urgent attention
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {overviewQuery.data.attention.map((a) => (
                <AttentionCard key={a.id} item={a} />
              ))}
            </div>
          </section>

          {/* Funnel + Verification operations */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <section aria-labelledby="funnel-heading" className="lg:col-span-2">
              <SectionHeader
                title="Onboarding & verification funnel"
                description="Where requests progress and where they drop off."
              />
              <h2 id="funnel-heading" className="sr-only">
                Funnel
              </h2>
              <div className="rounded-lg border border-border bg-card p-4">
                <Funnel stages={overviewQuery.data.funnel} />
              </div>
            </section>

            <section aria-labelledby="ops-heading" className="lg:col-span-3">
              <SectionHeader
                title="Verification operations"
                description="Live status across the verification pipeline. Select a status to open its queue."
              />
              <h2 id="ops-heading" className="sr-only">
                Verification operations
              </h2>
              <VerificationStatusGrid items={overviewQuery.data.statuses} />
            </section>
          </div>

          {/* Activity + Platform */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <section aria-labelledby="activity-heading" className="lg:col-span-3">
              <SectionHeader
                title="Recent activity"
                description="Latest admin events recorded by the shared backend."
              />
              <h2 id="activity-heading" className="sr-only">
                Recent activity
              </h2>
              <div className="rounded-lg border border-border bg-card px-3">
                {overviewQuery.data.activity.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {overviewQuery.data.activity.map((a) => (
                      <ActivityItem key={a.id} item={a} />
                    ))}
                  </ul>
                ) : (
                  <div className="py-6">
                    <EmptyState title="No recent activity yet" />
                  </div>
                )}
              </div>
            </section>

            <section aria-labelledby="platform-heading" className="lg:col-span-2">
              <SectionHeader
                title="Platform summary"
                description="Application-level status for enabled overview surfaces."
              />
              <h2 id="platform-heading" className="sr-only">
                Platform
              </h2>
              {services ? (
                <PlatformSummary services={services} />
              ) : (
                <ControlledPilotUnavailableState section="System" />
              )}
            </section>
          </div>
        </>
      )}

      {/* Communications */}
      <section aria-labelledby="comms-heading">
        <SectionHeader
          title="Communications"
          description="Delivery health across every outbound verification message."
          actions={
            showDemoOperationalSections ? (
              <Link
                to="/admin/communications"
                className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent"
              >
                Open center <ArrowRight aria-hidden className="size-3" />
              </Link>
            ) : undefined
          }
        />
        <h2 id="comms-heading" className="sr-only">
          Communications
        </h2>
        {comms ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            <CommTile
              label="Sent (total)"
              value={comms.total}
              tone="neutral"
              icon={<Send aria-hidden className="size-3.5" />}
            />
            <CommTile label="Pending" value={comms.pending} tone="neutral" />
            <CommTile label="Delivered" value={comms.delivered} tone="good" />
            <CommTile label="Awaiting response" value={comms.awaitingResponse} tone="warn" />
            <CommTile
              label="Failed / bounced"
              value={comms.failedTotal}
              tone="bad"
              icon={<MailWarning aria-hidden className="size-3.5" />}
            />
            <CommTile label="Follow-ups due today" value={comms.followUpsDueToday} tone="warn" />
          </div>
        ) : notificationsSummaryQuery.data && communicationsSummaryQuery.data ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <CommTile
              label="Unread notifications"
              value={notificationsSummaryQuery.data.unreadCount}
              tone={notificationsSummaryQuery.data.unreadCount > 0 ? "warn" : "neutral"}
              icon={<Bell aria-hidden className="size-3.5" />}
            />
            <CommTile
              label="Queued"
              value={communicationsSummaryQuery.data.queued}
              tone="neutral"
            />
            <CommTile label="Sent" value={communicationsSummaryQuery.data.sent} tone="good" />
            <CommTile label="Failed" value={communicationsSummaryQuery.data.failed} tone="bad" />
            <CommTile
              label="Failures (24h)"
              value={communicationsSummaryQuery.data.recentFailures24h}
              tone={communicationsSummaryQuery.data.recentFailures24h > 0 ? "bad" : "neutral"}
              icon={<MailWarning aria-hidden className="size-3.5" />}
            />
            <CommTile
              label="Resendable failed"
              value={communicationsSummaryQuery.data.resendableFailed}
              tone={communicationsSummaryQuery.data.resendableFailed > 0 ? "warn" : "neutral"}
            />
          </div>
        ) : notificationsSummaryQuery.isPending || communicationsSummaryQuery.isPending ? (
          <LoadingSkeleton rows={2} />
        ) : notificationsSummaryQuery.isError || communicationsSummaryQuery.isError ? (
          <RetryState
            title="Communications summary unavailable"
            description={
              notificationsSummaryQuery.error?.message ??
              communicationsSummaryQuery.error?.message ??
              "Unable to load the communications summary."
            }
            onRetry={() => {
              void notificationsSummaryQuery.refetch();
              void communicationsSummaryQuery.refetch();
            }}
          />
        ) : (
          <ControlledPilotUnavailableState section="Communications" />
        )}
      </section>

      {/* System operations */}
      <section aria-labelledby="sys-heading">
        <SectionHeader
          title="System operations"
          description="Platform health, background activity and open incidents."
          actions={
            showDemoOperationalSections ? (
              <Link
                to="/admin/system"
                className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent"
              >
                Open system <ArrowRight aria-hidden className="size-3" />
              </Link>
            ) : undefined
          }
        />
        <h2 id="sys-heading" className="sr-only">
          System operations
        </h2>
        {sys && comms ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <SysTile label="Platform status" href="/admin/system">
              <PlatformSummaryChip
                states={[
                  sys.api,
                  sys.database,
                  sys.emailDelivery,
                  sys.smsDelivery,
                  sys.backgroundJobs,
                  sys.documentStorage,
                ]}
              />
            </SysTile>
            <SysTile
              label="Failed jobs"
              href="/admin/system"
              icon={<Zap aria-hidden className="size-3.5" />}
            >
              <p
                className={cn(
                  "text-xl font-semibold tabular-nums",
                  sys.failedJobs > 0 ? "text-rose-700 dark:text-rose-300" : "text-foreground",
                )}
              >
                {sys.failedJobs}
              </p>
            </SysTile>
            <SysTile
              label="Open incidents"
              href="/admin/system"
              icon={<Bell aria-hidden className="size-3.5" />}
            >
              <p
                className={cn(
                  "text-xl font-semibold tabular-nums",
                  sys.openAlerts > 0 ? "text-rose-700 dark:text-rose-300" : "text-foreground",
                )}
              >
                {sys.openAlerts}
              </p>
            </SysTile>
            <SysTile
              label="Delivery failures"
              href="/admin/system"
              icon={<AlertTriangle aria-hidden className="size-3.5" />}
            >
              <p
                className={cn(
                  "text-xl font-semibold tabular-nums",
                  comms.failedTotal > 0 ? "text-amber-700 dark:text-amber-300" : "text-foreground",
                )}
              >
                {comms.failedTotal}
              </p>
            </SysTile>
            <SysTile
              label="Recent deployment"
              href="/admin/system"
              icon={<Rocket aria-hidden className="size-3.5" />}
            >
              {recentDeployment ? (
                <>
                  <p className="text-xs font-medium text-foreground">{recentDeployment.version}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatRelativeTime(recentDeployment.deployedAt)}
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Deployment summary unavailable.</p>
              )}
            </SysTile>
          </div>
        ) : (
          <ControlledPilotUnavailableState section="System" />
        )}
      </section>
    </div>
  );
}

function OverviewLoadingState() {
  return (
    <>
      <section aria-labelledby="metrics-heading">
        <SectionHeader
          title="Business metrics"
          description="Loading current verification operations."
        />
        <h2 id="metrics-heading" className="sr-only">
          Primary metrics
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-lg border border-border bg-card p-4">
              <LoadingSkeleton rows={3} />
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="lg:col-span-2">
          <SectionHeader
            title="Onboarding & verification funnel"
            description="Loading verification flow."
          />
          <div className="rounded-lg border border-border bg-card p-4">
            <LoadingSkeleton rows={6} />
          </div>
        </section>

        <section className="lg:col-span-3">
          <SectionHeader
            title="Verification operations"
            description="Loading status distribution."
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="rounded-lg border border-border bg-card p-3">
                <LoadingSkeleton rows={2} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function SysTile({
  label,
  href,
  icon,
  children,
}: {
  label: string;
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={href}
      className="block rounded-lg border border-border bg-card p-3 hover:bg-accent/40"
    >
      <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </Link>
  );
}

function PlatformSummaryChip({ states }: { states: ServiceHealthState[] }) {
  const worst: ServiceHealthState = states.includes("incident")
    ? "incident"
    : states.includes("degraded")
      ? "degraded"
      : states.includes("delayed")
        ? "delayed"
        : states.includes("unknown")
          ? "unknown"
          : "operational";
  const cls =
    worst === "operational"
      ? "text-emerald-700 dark:text-emerald-300"
      : worst === "incident"
        ? "text-rose-700 dark:text-rose-300"
        : worst === "unknown"
          ? "text-muted-foreground"
          : "text-amber-700 dark:text-amber-300";
  return (
    <p className={cn("inline-flex items-center gap-1 text-sm font-semibold", cls)}>
      <Activity aria-hidden className="size-3.5" /> {SERVICE_HEALTH_LABEL[worst]}
    </p>
  );
}

function CommTile({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "neutral" | "good" | "warn" | "bad";
  icon?: React.ReactNode;
}) {
  const toneCls =
    tone === "good"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "warn"
        ? "text-amber-700 dark:text-amber-300"
        : tone === "bad"
          ? "text-rose-700 dark:text-rose-300"
          : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${toneCls}`}>{value}</p>
    </div>
  );
}
