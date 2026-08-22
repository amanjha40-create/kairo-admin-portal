import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  LoaderCircle,
  RefreshCw,
  Server,
  ShieldAlert,
  TimerReset,
} from "lucide-react";
import { toast } from "sonner";
import { appEnv } from "@/config/env";
import { useAdminAccess } from "@/features/admin/auth/admin-access";
import { shouldEnableAdminProtectedQuery } from "@/features/admin/auth/protected-query";
import {
  adminSystemActivityQueryOptions,
  adminSystemFailuresQueryOptions,
  adminSystemIncidentDetailQueryOptions,
  adminSystemIncidentsQueryOptions,
  adminSystemKeys,
  adminSystemRuntimeQueryOptions,
  adminSystemStatusQueryOptions,
  adminSystemWorkloadsQueryOptions,
  createAdminSystemAdapter,
  SYSTEM_HEALTH_LABEL,
  SYSTEM_INCIDENT_SEVERITY_LABEL,
  SYSTEM_INCIDENT_STATUS_LABEL,
  type AdminSystemHealthState,
  type AdminSystemIncidentSeverity,
  type AdminSystemIncidentStatus,
} from "@/features/admin/data/system.production";
import { formatRelativeTime } from "@/features/admin/lib/format";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PermissionDeniedState,
} from "@/features/admin/components/states";
import { TablePagination } from "@/features/admin/components/table-pagination";
import { WorkspaceSection } from "@/features/admin/components/workspace-section";
import { hasPermission } from "@/features/admin/workflow/permissions";
import { cn } from "@/lib/utils";

const INCIDENT_STATUS_OPTIONS = ["all", "open", "monitoring", "resolved"] as const;
const INCIDENT_SEVERITY_OPTIONS = ["all", "low", "medium", "high", "critical"] as const;

export function SystemOperationsProductionPage() {
  const access = useAdminAccess();
  const permissions = access.admin?.permissions ?? [];
  const canView = hasPermission(permissions, "system.view");
  const canManageIncidents = hasPermission(permissions, "system.alerts.manage");
  const canRetryFailures = hasPermission(permissions, "communications.failure.review");
  const queryClient = useQueryClient();
  const adapter = useMemo(() => createAdminSystemAdapter(appEnv), []);

  const [incidentStatus, setIncidentStatus] = useState<AdminSystemIncidentStatus | "all">("all");
  const [incidentSeverity, setIncidentSeverity] = useState<AdminSystemIncidentSeverity | "all">(
    "all",
  );
  const [incidentCategory, setIncidentCategory] = useState("");
  const [incidentPage, setIncidentPage] = useState(1);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [activityPage, setActivityPage] = useState(1);
  const [showCreateIncident, setShowCreateIncident] = useState(false);
  const [createPayload, setCreatePayload] = useState({
    title: "",
    summary: "",
    category: "",
    severity: "medium" as AdminSystemIncidentSeverity,
  });
  const [resolveReason, setResolveReason] = useState("");

  const statusQuery = useQuery({
    ...adminSystemStatusQueryOptions(),
    enabled: shouldEnableAdminProtectedQuery(access.state),
  });
  const runtimeQuery = useQuery({
    ...adminSystemRuntimeQueryOptions(),
    enabled: shouldEnableAdminProtectedQuery(access.state),
  });
  const workloadsQuery = useQuery({
    ...adminSystemWorkloadsQueryOptions(),
    enabled: shouldEnableAdminProtectedQuery(access.state),
  });
  const failuresQuery = useQuery({
    ...adminSystemFailuresQueryOptions(),
    enabled: shouldEnableAdminProtectedQuery(access.state),
  });
  const activityQuery = useQuery({
    ...adminSystemActivityQueryOptions({ page: activityPage, pageSize: 10 }),
    enabled: shouldEnableAdminProtectedQuery(access.state),
  });
  const incidentsQuery = useQuery({
    ...adminSystemIncidentsQueryOptions({
      status: incidentStatus,
      severity: incidentSeverity,
      category: incidentCategory.trim() || "all",
      page: incidentPage,
      pageSize: 10,
    }),
    enabled: shouldEnableAdminProtectedQuery(access.state),
  });
  const incidentDetailQuery = useQuery({
    ...adminSystemIncidentDetailQueryOptions(selectedIncidentId),
    enabled: shouldEnableAdminProtectedQuery(access.state) && Boolean(selectedIncidentId),
  });

  useEffect(() => {
    if (!incidentsQuery.data) return;
    if (
      selectedIncidentId &&
      incidentsQuery.data.items.some((item) => item.publicId === selectedIncidentId)
    ) {
      return;
    }
    setSelectedIncidentId(incidentsQuery.data.items[0]?.publicId ?? null);
  }, [incidentsQuery.data, selectedIncidentId]);

  const createIncidentMutation = useMutation({
    mutationFn: () => adapter.createIncident(createPayload),
    onSuccess: async (created) => {
      setShowCreateIncident(false);
      setCreatePayload({
        title: "",
        summary: "",
        category: "",
        severity: "medium",
      });
      setSelectedIncidentId(created.publicId);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: adminSystemKeys.incidents({
            status: incidentStatus,
            severity: incidentSeverity,
            category: incidentCategory.trim() || "all",
            page: incidentPage,
            pageSize: 10,
          }),
        }),
        queryClient.invalidateQueries({
          queryKey: adminSystemKeys.activity({ page: activityPage, pageSize: 10 }),
        }),
      ]);
      toast.success("Incident created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateIncidentMutation = useMutation({
    mutationFn: ({
      publicId,
      status,
      severity,
    }: {
      publicId: string;
      status?: Exclude<AdminSystemIncidentStatus, "resolved">;
      severity?: AdminSystemIncidentSeverity;
    }) => adapter.updateIncident(publicId, { status, severity }),
    onSuccess: async (updated) => {
      setSelectedIncidentId(updated.publicId);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: adminSystemKeys.incidents({
            status: incidentStatus,
            severity: incidentSeverity,
            category: incidentCategory.trim() || "all",
            page: incidentPage,
            pageSize: 10,
          }),
        }),
        queryClient.invalidateQueries({ queryKey: adminSystemKeys.incident(updated.publicId) }),
        queryClient.invalidateQueries({
          queryKey: adminSystemKeys.activity({ page: activityPage, pageSize: 10 }),
        }),
      ]);
      toast.success("Incident updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resolveIncidentMutation = useMutation({
    mutationFn: ({ publicId, reason }: { publicId: string; reason: string }) =>
      adapter.resolveIncident(publicId, { reason }),
    onSuccess: async (resolved) => {
      setResolveReason("");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: adminSystemKeys.incidents({
            status: incidentStatus,
            severity: incidentSeverity,
            category: incidentCategory.trim() || "all",
            page: incidentPage,
            pageSize: 10,
          }),
        }),
        queryClient.invalidateQueries({ queryKey: adminSystemKeys.incident(resolved.publicId) }),
        queryClient.invalidateQueries({
          queryKey: adminSystemKeys.activity({ page: activityPage, pageSize: 10 }),
        }),
      ]);
      toast.success("Incident resolved");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const retryFailureMutation = useMutation({
    mutationFn: (publicId: string) => adapter.retryCommunicationFailure(publicId),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminSystemKeys.failures() }),
        queryClient.invalidateQueries({ queryKey: adminSystemKeys.workloads() }),
        queryClient.invalidateQueries({
          queryKey: adminSystemKeys.activity({ page: activityPage, pageSize: 10 }),
        }),
      ]);
      toast.success(result.message);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (!shouldEnableAdminProtectedQuery(access.state)) {
    return <LoadingSkeleton rows={10} />;
  }

  if (!canView) {
    return (
      <div className="mx-auto max-w-3xl">
        <PermissionDeniedState description="Your role does not include the system.view permission." />
      </div>
    );
  }

  const topLevelError =
    statusQuery.error ?? runtimeQuery.error ?? workloadsQuery.error ?? failuresQuery.error;
  if (topLevelError) {
    return (
      <div className="mx-auto max-w-3xl">
        <ErrorState
          title="System Operations unavailable"
          description={topLevelError.message}
          action={
            <button
              type="button"
              onClick={() => {
                void Promise.all([
                  statusQuery.refetch(),
                  runtimeQuery.refetch(),
                  workloadsQuery.refetch(),
                  failuresQuery.refetch(),
                  activityQuery.refetch(),
                  incidentsQuery.refetch(),
                ]);
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

  if (
    statusQuery.isPending ||
    runtimeQuery.isPending ||
    workloadsQuery.isPending ||
    failuresQuery.isPending
  ) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <LoadingSkeleton rows={12} />
      </div>
    );
  }

  const status = statusQuery.data;
  const runtime = runtimeQuery.data;
  const workloads = workloadsQuery.data ?? [];
  const failures = failuresQuery.data ?? [];
  const activity = activityQuery.data;
  const incidents = incidentsQuery.data;
  const selectedIncident = incidentDetailQuery.data;

  if (!status || !runtime) return null;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            System Operations
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Backend-driven health, failures, runtime metadata, retryable operational issues, and
            persisted incidents.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void Promise.all([
              statusQuery.refetch(),
              runtimeQuery.refetch(),
              workloadsQuery.refetch(),
              failuresQuery.refetch(),
              activityQuery.refetch(),
              incidentsQuery.refetch(),
              selectedIncidentId ? incidentDetailQuery.refetch() : Promise.resolve(),
            ]);
          }}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-accent"
        >
          <RefreshCw aria-hidden className="size-3.5" />
          Refresh
        </button>
      </header>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <MetricCard
          icon={Server}
          label="Overall health"
          value={SYSTEM_HEALTH_LABEL[status.overallStatus]}
          tone={statusTone(status.overallStatus)}
          helper={`Checked ${formatRelativeTime(status.checkedAt)}`}
        />
        <MetricCard
          icon={ShieldAlert}
          label="Open incidents"
          value={String(incidents?.items.filter((item) => item.status !== "resolved").length ?? 0)}
          tone={
            (incidents?.items.filter((item) => item.status !== "resolved").length ?? 0) > 0
              ? "bad"
              : "neutral"
          }
          helper="Current page filter scope"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Retryable failures"
          value={String(failures.filter((item) => item.retrySupported).length)}
          tone={failures.some((item) => item.retrySupported) ? "warn" : "neutral"}
          helper="Safe communication retries only"
        />
        <MetricCard
          icon={Database}
          label="Migration"
          value={runtime.migration.matchesExpected ? "Current" : "Mismatch"}
          tone={runtime.migration.matchesExpected ? "good" : "bad"}
          helper={
            runtime.migration.currentRevision && runtime.migration.expectedRevision
              ? `${runtime.migration.currentRevision} / ${runtime.migration.expectedRevision}`
              : "Revision metadata unavailable"
          }
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <WorkspaceSection
          title="Dependency health"
          description="Canonical dependency checks from the shared backend runtime."
        >
          <div className="grid gap-3 md:grid-cols-2">
            {status.dependencies.map((dependency) => (
              <div
                key={dependency.key}
                className="rounded-md border border-border bg-background p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{dependency.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Checked {formatRelativeTime(dependency.checkedAt)}
                    </p>
                  </div>
                  <HealthBadge state={dependency.status} />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {dependency.latencyMs != null ? <p>Latency {dependency.latencyMs} ms</p> : null}
                  {dependency.reason ? <p>{dependency.reason}</p> : null}
                  {dependency.critical ? <p>Critical dependency</p> : null}
                </div>
              </div>
            ))}
          </div>
        </WorkspaceSection>

        <WorkspaceSection
          title="Runtime metadata"
          description="Safe runtime and release identity for the current deployment."
        >
          <dl className="grid gap-2 text-xs">
            <MetaRow label="Environment" value={runtime.environment} />
            <MetaRow label="Application" value={runtime.applicationName} />
            <MetaRow label="Version" value={runtime.applicationVersion} />
            <MetaRow label="API prefix" value={runtime.apiVersionPrefix} />
            <MetaRow
              label="Started"
              value={`${formatRelativeTime(runtime.runtimeStartedAt)} (${runtime.runtimeStartedAt})`}
            />
            <MetaRow label="Python" value={runtime.pythonVersion} />
            <MetaRow label="Jobs" value={runtime.jobBackend} />
            <MetaRow label="Email" value={runtime.emailBackend} />
            <MetaRow label="OTP" value={runtime.phoneOtpBackend} />
            <MetaRow
              label="Resume processing"
              value={runtime.resumeProcessingEnabled ? "Enabled" : "Disabled"}
            />
            <MetaRow
              label="Email sending"
              value={runtime.emailSendEnabled ? "Enabled" : "Disabled"}
            />
            <MetaRow label="Git SHA" value={runtime.release.gitSha ?? "Unavailable"} />
            <MetaRow label="Build ID" value={runtime.release.buildId ?? "Unavailable"} />
            <MetaRow label="Deployed at" value={runtime.release.deployedAt ?? "Unavailable"} />
          </dl>
        </WorkspaceSection>
      </div>

      <WorkspaceSection
        title="Operational workloads"
        description="Background work and delivery pipelines that currently exist in the backend."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {workloads.map((workload) => (
            <div key={workload.key} className="rounded-md border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{workload.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{workload.note}</p>
                </div>
                <HealthBadge state={workload.status} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <CompactMetric label="Pending" value={workload.pending} />
                <CompactMetric label="Processing" value={workload.processing} />
                <CompactMetric label="Succeeded (24h)" value={workload.succeededRecent} />
                <CompactMetric label="Failed" value={workload.failed} tone="bad" />
                <CompactMetric label="Retryable" value={workload.retryable} tone="warn" />
              </dl>
              <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                {workload.oldestPendingAt ? (
                  <p>Oldest pending {formatRelativeTime(workload.oldestPendingAt)}</p>
                ) : null}
                {workload.latestSuccessAt ? (
                  <p>Latest success {formatRelativeTime(workload.latestSuccessAt)}</p>
                ) : null}
                {workload.latestFailureAt ? (
                  <p>Latest failure {formatRelativeTime(workload.latestFailureAt)}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        title="Failures"
        description="Backend-persisted operational failures only. No fabricated telemetry."
      >
        {failures.length === 0 ? (
          <EmptyState
            title="No persisted failures"
            description="The shared backend is not currently reporting persisted operational failures."
          />
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-xs">
                <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Failure</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Latest</th>
                    <th className="px-3 py-2 font-medium">Retry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {failures.map((item) => (
                    <tr key={item.publicId}>
                      <td className="px-3 py-2">
                        <div className="font-medium text-foreground">{item.title}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {item.subjectReference}
                        </div>
                        {item.safeError ? (
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {item.safeError}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        <div>{item.kind}</div>
                        <div>{item.category}</div>
                        <div>Attempts {item.retryCount}</div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        <div>{formatRelativeTime(item.latestFailureAt)}</div>
                        <div className="text-[11px]">
                          First seen {formatRelativeTime(item.firstFailureAt)}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {item.retrySupported ? (
                          <button
                            type="button"
                            disabled={!canRetryFailures || retryFailureMutation.isPending}
                            onClick={() => void retryFailureMutation.mutateAsync(item.publicId)}
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs font-medium text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {retryFailureMutation.isPending ? (
                              <LoaderCircle aria-hidden className="size-3 animate-spin" />
                            ) : (
                              <TimerReset aria-hidden className="size-3" />
                            )}
                            Retry
                          </button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">No safe retry</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </WorkspaceSection>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <WorkspaceSection
          title="Incidents"
          description="Persisted operational incidents recorded by admins or backend truth."
          action={
            canManageIncidents ? (
              <button
                type="button"
                onClick={() => setShowCreateIncident((value) => !value)}
                className="inline-flex h-8 items-center rounded-md border border-border px-2.5 text-xs font-medium text-foreground hover:bg-accent"
              >
                {showCreateIncident ? "Hide create form" : "Create incident"}
              </button>
            ) : null
          }
        >
          {showCreateIncident ? (
            <div className="mb-4 rounded-md border border-border bg-background p-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  Title
                  <input
                    value={createPayload.title}
                    onChange={(event) =>
                      setCreatePayload((current) => ({ ...current, title: event.target.value }))
                    }
                    className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  Category
                  <input
                    value={createPayload.category}
                    onChange={(event) =>
                      setCreatePayload((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                    placeholder="delivery, infrastructure, processing"
                  />
                </label>
              </div>
              <label className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
                Summary
                <textarea
                  rows={4}
                  value={createPayload.summary}
                  onChange={(event) =>
                    setCreatePayload((current) => ({ ...current, summary: event.target.value }))
                  }
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Severity
                  <select
                    value={createPayload.severity}
                    onChange={(event) =>
                      setCreatePayload((current) => ({
                        ...current,
                        severity: event.target.value as AdminSystemIncidentSeverity,
                      }))
                    }
                    className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                  >
                    {INCIDENT_SEVERITY_OPTIONS.filter((value) => value !== "all").map((value) => (
                      <option key={value} value={value}>
                        {SYSTEM_INCIDENT_SEVERITY_LABEL[value]}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={
                    createIncidentMutation.isPending ||
                    !createPayload.title.trim() ||
                    !createPayload.summary.trim() ||
                    !createPayload.category.trim()
                  }
                  onClick={() => void createIncidentMutation.mutateAsync()}
                  className="inline-flex h-8 items-center rounded-md bg-[#0B2545] px-3 text-xs font-semibold text-white hover:bg-[#0B2545]/92 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createIncidentMutation.isPending ? "Creating…" : "Create"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="mb-3 grid gap-3 md:grid-cols-[160px_160px_minmax(0,1fr)]">
            <SelectControl
              label="Status"
              value={incidentStatus}
              options={INCIDENT_STATUS_OPTIONS}
              onChange={(next) => {
                setIncidentStatus(next as AdminSystemIncidentStatus | "all");
                setIncidentPage(1);
              }}
            />
            <SelectControl
              label="Severity"
              value={incidentSeverity}
              options={INCIDENT_SEVERITY_OPTIONS}
              onChange={(next) => {
                setIncidentSeverity(next as AdminSystemIncidentSeverity | "all");
                setIncidentPage(1);
              }}
            />
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Category
              <input
                value={incidentCategory}
                onChange={(event) => {
                  setIncidentCategory(event.target.value);
                  setIncidentPage(1);
                }}
                placeholder="Filter incident category"
                className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
              />
            </label>
          </div>

          {incidentsQuery.isError ? (
            <ErrorState
              title="Incidents failed to load"
              description={incidentsQuery.error.message}
              action={
                <button
                  type="button"
                  onClick={() => void incidentsQuery.refetch()}
                  className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90"
                >
                  Try again
                </button>
              }
            />
          ) : incidentsQuery.isPending ? (
            <LoadingSkeleton rows={5} />
          ) : incidents && incidents.total > 0 ? (
            <>
              <div className="overflow-hidden rounded-md border border-border">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border text-xs">
                    <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Incident</th>
                        <th className="px-3 py-2 font-medium">Severity</th>
                        <th className="px-3 py-2 font-medium">State</th>
                        <th className="px-3 py-2 font-medium">Opened</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-background">
                      {incidents.items.map((item) => (
                        <tr
                          key={item.publicId}
                          onClick={() => setSelectedIncidentId(item.publicId)}
                          className={cn(
                            "cursor-pointer hover:bg-accent/40",
                            item.publicId === selectedIncidentId && "bg-accent/30",
                          )}
                        >
                          <td className="px-3 py-2">
                            <div className="font-medium text-foreground">{item.title}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {item.category} · {item.source}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <SeverityBadge severity={item.severity} />
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge status={item.status} />
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {formatRelativeTime(item.openedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePagination
                  page={incidents.page}
                  pageSize={incidents.pageSize}
                  total={incidents.total}
                  onPageChange={setIncidentPage}
                  onPageSizeChange={() => undefined}
                  pageSizeOptions={[10]}
                />
              </div>
            </>
          ) : (
            <EmptyState
              title="No incidents returned"
              description="No incidents match the current filters."
            />
          )}
        </WorkspaceSection>

        <WorkspaceSection
          title="Incident detail"
          description="Authoritative incident state and append-only history."
        >
          {incidentDetailQuery.isError ? (
            <ErrorState
              title="Incident detail unavailable"
              description={incidentDetailQuery.error.message}
              action={
                <button
                  type="button"
                  onClick={() => void incidentDetailQuery.refetch()}
                  className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90"
                >
                  Try again
                </button>
              }
            />
          ) : incidentDetailQuery.isPending ? (
            <LoadingSkeleton rows={6} />
          ) : selectedIncident ? (
            <div className="space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    {selectedIncident.title}
                  </h3>
                  <SeverityBadge severity={selectedIncident.severity} />
                  <StatusBadge status={selectedIncident.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{selectedIncident.summary}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Opened {formatRelativeTime(selectedIncident.openedAt)} · Category{" "}
                  {selectedIncident.category}
                </p>
                {selectedIncident.referenceType && selectedIncident.referencePublicId ? (
                  <p className="text-[11px] text-muted-foreground">
                    Linked {selectedIncident.referenceType}: {selectedIncident.referencePublicId}
                  </p>
                ) : null}
              </div>

              {canManageIncidents && selectedIncident.status !== "resolved" ? (
                <div className="space-y-3 rounded-md border border-border bg-background p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Status
                      <select
                        value={selectedIncident.status}
                        onChange={(event) =>
                          void updateIncidentMutation.mutateAsync({
                            publicId: selectedIncident.publicId,
                            status: event.target.value as Exclude<
                              AdminSystemIncidentStatus,
                              "resolved"
                            >,
                          })
                        }
                        className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                      >
                        <option value="open">Open</option>
                        <option value="monitoring">Monitoring</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Severity
                      <select
                        value={selectedIncident.severity}
                        onChange={(event) =>
                          void updateIncidentMutation.mutateAsync({
                            publicId: selectedIncident.publicId,
                            severity: event.target.value as AdminSystemIncidentSeverity,
                          })
                        }
                        className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                      >
                        {INCIDENT_SEVERITY_OPTIONS.filter((value) => value !== "all").map(
                          (value) => (
                            <option key={value} value={value}>
                              {SYSTEM_INCIDENT_SEVERITY_LABEL[value]}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Resolve reason
                    <textarea
                      rows={3}
                      value={resolveReason}
                      onChange={(event) => setResolveReason(event.target.value)}
                      className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="Explain how the issue was resolved."
                    />
                  </label>
                  <button
                    type="button"
                    disabled={resolveIncidentMutation.isPending || !resolveReason.trim()}
                    onClick={() =>
                      void resolveIncidentMutation.mutateAsync({
                        publicId: selectedIncident.publicId,
                        reason: resolveReason,
                      })
                    }
                    className="inline-flex h-8 items-center rounded-md bg-[#0B2545] px-3 text-xs font-semibold text-white hover:bg-[#0B2545]/92 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Resolve incident
                  </button>
                </div>
              ) : null}

              <div className="rounded-md border border-border bg-background">
                <div className="border-b border-border px-3 py-2 text-xs font-medium text-foreground">
                  Incident history
                </div>
                {selectedIncident.history.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {selectedIncident.history.map((event) => (
                      <li key={event.publicId} className="px-3 py-2 text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-foreground">
                            {event.eventType.replaceAll("_", " ")}
                          </span>
                          <span className="text-muted-foreground">
                            {formatRelativeTime(event.createdAt)}
                          </span>
                        </div>
                        {event.detail ? (
                          <p className="mt-1 text-muted-foreground">{event.detail}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-3 py-6">
                    <EmptyState title="No history yet" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              title="Select an incident"
              description="Choose an incident from the list to inspect its authoritative history."
            />
          )}
        </WorkspaceSection>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <WorkspaceSection
          title="Recent activity"
          description="Recent backend-recorded operational events."
        >
          {activityQuery.isError ? (
            <ErrorState
              title="Recent activity unavailable"
              description={activityQuery.error.message}
              action={
                <button
                  type="button"
                  onClick={() => void activityQuery.refetch()}
                  className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90"
                >
                  Try again
                </button>
              }
            />
          ) : activityQuery.isPending ? (
            <LoadingSkeleton rows={6} />
          ) : activity && activity.total > 0 ? (
            <div className="overflow-hidden rounded-md border border-border">
              <ul className="divide-y divide-border bg-background">
                {activity.items.map((item) => (
                  <li key={item.publicId} className="px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-foreground">{item.title}</span>
                      <span className="text-muted-foreground">
                        {formatRelativeTime(item.occurredAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {item.kind}
                      {item.status ? ` · ${item.status}` : ""}
                      {item.detail ? ` · ${item.detail}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
              <TablePagination
                page={activity.page}
                pageSize={activity.pageSize}
                total={activity.total}
                onPageChange={setActivityPage}
                onPageSizeChange={() => undefined}
                pageSizeOptions={[10]}
              />
            </div>
          ) : (
            <EmptyState
              title="No recent operational activity"
              description="No matching backend activity has been recorded yet."
            />
          )}
        </WorkspaceSection>

        <WorkspaceSection
          title="Current truth boundaries"
          description="What this frontend intentionally does and does not claim."
        >
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li>
              Health is derived from backend probes for API process, PostgreSQL, Redis, and
              object-storage support where enabled.
            </li>
            <li>
              Workloads summarize only persisted delivery, notification, resume-processing, and
              connector records already owned by the backend.
            </li>
            <li>
              Retry is available only for supported communication failures and reuses the canonical
              backend resend behavior.
            </li>
            <li>
              Incidents are backend-persisted and append-only. This page does not invent AWS
              infrastructure, queue depths, provider dashboards, or deployment history.
            </li>
          </ul>
        </WorkspaceSection>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = "neutral",
}: {
  icon: typeof Server;
  label: string;
  value: string;
  helper: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p
            className={cn(
              "mt-2 text-xl font-semibold",
              tone === "good" && "text-emerald-700 dark:text-emerald-300",
              tone === "warn" && "text-amber-700 dark:text-amber-300",
              tone === "bad" && "text-rose-700 dark:text-rose-300",
            )}
          >
            {value}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{helper}</p>
        </div>
        <Icon aria-hidden className="size-5 text-muted-foreground" />
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-all text-foreground">{value}</dd>
    </div>
  );
}

function CompactMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warn" | "bad";
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-sm font-semibold tabular-nums text-foreground",
          tone === "warn" && value > 0 && "text-amber-700 dark:text-amber-300",
          tone === "bad" && value > 0 && "text-rose-700 dark:text-rose-300",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function HealthBadge({ state }: { state: AdminSystemHealthState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        state === "healthy" &&
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        state === "degraded" &&
          "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
        state === "unavailable" &&
          "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
        state === "unknown" &&
          "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
      )}
    >
      {SYSTEM_HEALTH_LABEL[state]}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: AdminSystemIncidentSeverity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        severity === "low" &&
          "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
        severity === "medium" && "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
        severity === "high" &&
          "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
        severity === "critical" &&
          "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
      )}
    >
      {SYSTEM_INCIDENT_SEVERITY_LABEL[severity]}
    </span>
  );
}

function StatusBadge({ status }: { status: AdminSystemIncidentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        status === "open" && "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
        status === "monitoring" &&
          "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
        status === "resolved" &&
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
      )}
    >
      {SYSTEM_INCIDENT_STATUS_LABEL[status]}
    </span>
  );
}

function SelectControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (next: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "all"
              ? "All"
              : option === "monitoring"
                ? "Monitoring"
                : option.charAt(0).toUpperCase() + option.slice(1)}
          </option>
        ))}
      </select>
    </label>
  );
}

function statusTone(state: AdminSystemHealthState): "neutral" | "good" | "warn" | "bad" {
  if (state === "healthy") return "good";
  if (state === "degraded") return "warn";
  if (state === "unavailable") return "bad";
  return "neutral";
}
