import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Flame, ShieldAlert, Users } from "lucide-react";
import { appEnv } from "@/config/env";
import { AdminSearchField } from "@/features/admin/components/search-field";
import { FilterBar } from "@/features/admin/components/filter-bar";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/features/admin/components/states";
import { useAdminAccess } from "@/features/admin/auth/admin-access";
import { shouldEnableAdminProtectedQuery } from "@/features/admin/auth/protected-query";
import { formatRelativeTime } from "@/features/admin/lib/format";
import {
  createAdminRiskAdapter,
  riskInvestigationsQueryOptions,
  riskKeys,
  riskSummaryQueryOptions,
  TRUST_SAFETY_SEVERITY_LABEL,
  TRUST_SAFETY_STATUS_LABEL,
  TRUST_SAFETY_SUBJECT_TYPE_LABEL,
  type AdminRiskAssignee,
  type AdminRiskCreatePayload,
  type AdminRiskSeverity,
  type AdminRiskStatus,
  type AdminRiskSubjectType,
} from "@/features/admin/data/risk.production";
import { hasPermission } from "@/features/admin/workflow/permissions";
import { cn } from "@/lib/utils";

export function ProductionRiskCenterPage() {
  const access = useAdminAccess();
  const permissions = access.admin?.permissions ?? [];
  const canCreate = hasPermission(permissions, "risk.create");
  const queryClient = useQueryClient();
  const adapter = useMemo(() => createAdminRiskAdapter(appEnv), []);
  const initialCreateState = useMemo(readInitialCreateState, []);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AdminRiskStatus | "all">("all");
  const [severity, setSeverity] = useState<AdminRiskSeverity | "all">("all");
  const [subjectType, setSubjectType] = useState<AdminRiskSubjectType | "all">("all");
  const [assigneeUserId, setAssigneeUserId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(initialCreateState.showCreate);
  const [createPayload, setCreatePayload] = useState<AdminRiskCreatePayload>(
    initialCreateState.createPayload,
  );

  const summaryQuery = useQuery({
    ...riskSummaryQueryOptions(),
    enabled: shouldEnableAdminProtectedQuery(access.state),
  });
  const listQuery = useQuery({
    ...riskInvestigationsQueryOptions({
      query,
      status,
      severity,
      subjectType,
      assigneeUserId: assigneeUserId !== "all" ? assigneeUserId : null,
      page,
      pageSize: 20,
    }),
    enabled: shouldEnableAdminProtectedQuery(access.state),
  });
  const assigneesQuery = useQuery({
    queryKey: riskKeys.assignees(),
    queryFn: () => adapter.listAssignees(),
    enabled: shouldEnableAdminProtectedQuery(access.state),
  });
  const createMutation = useMutation({
    mutationFn: () => adapter.create(createPayload),
    onSuccess: async (created) => {
      setCreatePayload(emptyCreatePayload());
      setShowCreate(false);
      await queryClient.invalidateQueries({ queryKey: riskKeys.all() });
      window.location.assign(`/admin/risk/${created.id}`);
    },
  });

  if (!shouldEnableAdminProtectedQuery(access.state)) {
    return <LoadingSkeleton rows={8} />;
  }

  if (summaryQuery.isPending || listQuery.isPending) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <LoadingSkeleton rows={8} />
      </div>
    );
  }

  if (summaryQuery.error || listQuery.error) {
    const message =
      (summaryQuery.error ?? listQuery.error)?.message ?? "Trust & Safety failed to load.";
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState
          title="Trust & Safety failed to load"
          description={message}
          action={
            <button
              type="button"
              onClick={() => {
                void Promise.all([summaryQuery.refetch(), listQuery.refetch()]);
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

  const summary = summaryQuery.data;
  const result = listQuery.data;
  const assignees = assigneesQuery.data ?? [];
  const activeCount = [status, severity, subjectType, assigneeUserId].filter(
    (value) => value !== "all",
  ).length;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Trust &amp; Safety
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Investigate explainable risk signals across users, verification requests, and registry
            records.
          </p>
        </div>
        {canCreate ? (
          <button
            type="button"
            onClick={() => setShowCreate((value) => !value)}
            className="inline-flex h-9 items-center rounded-md bg-[#0B2545] px-3 text-sm font-semibold text-white hover:bg-[#0B2545]/92"
          >
            {showCreate ? "Hide create form" : "Create investigation"}
          </button>
        ) : null}
      </header>

      <section aria-labelledby="risk-metrics">
        <h2 id="risk-metrics" className="sr-only">
          Trust &amp; Safety summary
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricTile
            icon={ShieldAlert}
            label="Open investigations"
            value={summary.openInvestigations}
          />
          <MetricTile
            icon={Flame}
            label="High or critical"
            value={summary.highOrCriticalInvestigations}
            tone="bad"
          />
          <MetricTile icon={Users} label="Unassigned" value={summary.unassignedInvestigations} />
          <MetricTile icon={AlertTriangle} label="Active signals" value={summary.activeSignals} />
        </div>
      </section>

      {showCreate ? (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Create investigation</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Subject type
              <select
                value={createPayload.subjectType}
                onChange={(event) =>
                  setCreatePayload((current) => ({
                    ...current,
                    subjectType: event.target.value as AdminRiskCreatePayload["subjectType"],
                  }))
                }
                className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
              >
                <option value="user">User</option>
                <option value="verification_request">Verification</option>
                <option value="trust_registry_record">Registry</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Subject public ID
              <input
                value={createPayload.subjectPublicId}
                onChange={(event) =>
                  setCreatePayload((current) => ({
                    ...current,
                    subjectPublicId: event.target.value,
                  }))
                }
                className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                placeholder="Paste canonical public ID"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Severity
              <select
                value={createPayload.severity}
                onChange={(event) =>
                  setCreatePayload((current) => ({
                    ...current,
                    severity: event.target.value as AdminRiskCreatePayload["severity"],
                  }))
                }
                className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Signal type
              <input
                value={createPayload.signalType ?? "manual_review"}
                onChange={(event) =>
                  setCreatePayload((current) => ({ ...current, signalType: event.target.value }))
                }
                className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
              />
            </label>
          </div>
          <label className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
            Summary
            <textarea
              value={createPayload.summary}
              onChange={(event) =>
                setCreatePayload((current) => ({ ...current, summary: event.target.value }))
              }
              rows={4}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              placeholder="Explain why this subject requires Trust & Safety review."
            />
          </label>
          {createMutation.error ? (
            <p className="mt-2 text-xs text-destructive">{createMutation.error.message}</p>
          ) : null}
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              disabled={
                createMutation.isPending ||
                !createPayload.subjectPublicId.trim() ||
                !createPayload.summary.trim()
              }
              onClick={() => void createMutation.mutateAsync()}
              className="inline-flex h-9 items-center rounded-md bg-[#0B2545] px-3 text-sm font-semibold text-white hover:bg-[#0B2545]/92 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createMutation.isPending ? "Creating…" : "Create investigation"}
            </button>
          </div>
        </section>
      ) : null}

      <div className="flex flex-col gap-2">
        <AdminSearchField
          value={query}
          onChange={(value) => {
            setPage(1);
            setQuery(value);
          }}
          placeholder="Search investigation title, summary, or subject"
          ariaLabel="Search investigations"
          className="max-w-xl"
        />
        <FilterBar
          activeCount={activeCount}
          onClear={() => {
            setPage(1);
            setStatus("all");
            setSeverity("all");
            setSubjectType("all");
            setAssigneeUserId("all");
          }}
        >
          <SelectPill
            label="Status"
            value={status}
            onChange={(value) => {
              setPage(1);
              setStatus(value as AdminRiskStatus | "all");
            }}
            options={[["all", "All"], ...Object.entries(TRUST_SAFETY_STATUS_LABEL)]}
          />
          <SelectPill
            label="Severity"
            value={severity}
            onChange={(value) => {
              setPage(1);
              setSeverity(value as AdminRiskSeverity | "all");
            }}
            options={[["all", "All"], ...Object.entries(TRUST_SAFETY_SEVERITY_LABEL)]}
          />
          <SelectPill
            label="Subject"
            value={subjectType}
            onChange={(value) => {
              setPage(1);
              setSubjectType(value as AdminRiskSubjectType | "all");
            }}
            options={[["all", "All"], ...Object.entries(TRUST_SAFETY_SUBJECT_TYPE_LABEL)]}
          />
          <SelectPill
            label="Assignee"
            value={assigneeUserId}
            onChange={(value) => {
              setPage(1);
              setAssigneeUserId(value);
            }}
            options={[
              ["all", "All"],
              ...assignees.map(
                (assignee) =>
                  [assignee.userId, formatRiskAssigneeLabel(assignee)] as [string, string],
              ),
            ]}
          />
        </FilterBar>
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          title="No investigations found"
          description="Adjust the current filters or create a manual investigation for a canonical subject."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Subject</th>
                <th className="px-3 py-2 font-medium">Summary</th>
                <th className="px-3 py-2 font-medium">Severity</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Assignee</th>
                <th className="px-3 py-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((item) => (
                <tr key={item.id} className="hover:bg-accent/30">
                  <td className="border-b border-border px-3 py-2 align-top">
                    <Link
                      to="/admin/risk/$investigationId"
                      params={{ investigationId: item.id }}
                      className="font-medium text-foreground hover:underline"
                    >
                      {item.subjectLabel}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {TRUST_SAFETY_SUBJECT_TYPE_LABEL[item.subjectType] ?? item.subjectType}
                    </p>
                  </td>
                  <td className="border-b border-border px-3 py-2 align-top text-xs text-foreground">
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-muted-foreground">
                      {item.primarySignalSummary ?? item.summary}
                    </p>
                  </td>
                  <td className="border-b border-border px-3 py-2 align-top">
                    <ProductionSeverityBadge severity={item.severity} />
                  </td>
                  <td className="border-b border-border px-3 py-2 align-top">
                    <ProductionStatusBadge status={item.status} />
                  </td>
                  <td className="border-b border-border px-3 py-2 align-top text-xs text-muted-foreground">
                    {item.assignee?.fullName || item.assignee?.email || "Unassigned"}
                  </td>
                  <td className="border-b border-border px-3 py-2 align-top text-xs text-muted-foreground">
                    {formatRelativeTime(item.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            Previous
          </button>
          <span>
            Page {result.page} of {result.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= result.totalPages}
            onClick={() => setPage((value) => value + 1)}
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ShieldAlert;
  label: string;
  value: number;
  tone?: "good" | "bad";
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon
          aria-hidden
          className={cn(
            "size-3.5",
            tone === "good" && "text-emerald-600",
            tone === "bad" && "text-rose-600",
          )}
        />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export function ProductionSeverityBadge({ severity }: { severity: AdminRiskSeverity }) {
  const tone =
    severity === "critical"
      ? "bg-rose-50 text-rose-900 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/60"
      : severity === "high"
        ? "bg-orange-50 text-orange-900 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-900/60"
        : severity === "medium"
          ? "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60"
          : "bg-zinc-100 text-zinc-800 ring-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-200 dark:ring-zinc-700";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        tone,
      )}
    >
      {TRUST_SAFETY_SEVERITY_LABEL[severity] ?? severity}
    </span>
  );
}

export function ProductionStatusBadge({ status }: { status: AdminRiskStatus }) {
  const tone =
    status === "resolved"
      ? "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60"
      : status === "dismissed"
        ? "bg-zinc-100 text-zinc-800 ring-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-200 dark:ring-zinc-700"
        : status === "awaiting_information"
          ? "bg-orange-50 text-orange-900 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-900/60"
          : "bg-sky-50 text-sky-900 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-900/60";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        tone,
      )}
    >
      {TRUST_SAFETY_STATUS_LABEL[status] ?? status}
    </span>
  );
}

function SelectPill({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="h-full bg-transparent text-xs text-foreground focus:outline-none"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function emptyCreatePayload(): AdminRiskCreatePayload {
  return {
    subjectType: "user",
    subjectPublicId: "",
    summary: "",
    severity: "medium",
    signalType: "manual_review",
  };
}

function formatRiskAssigneeLabel(assignee: AdminRiskAssignee) {
  return assignee.fullName?.trim() || assignee.email;
}

function readInitialCreateState() {
  if (typeof window === "undefined") {
    return {
      showCreate: false,
      createPayload: emptyCreatePayload(),
    };
  }

  const params = new URLSearchParams(window.location.search);
  const create = params.get("create") === "1";
  const subjectType = params.get("subjectType");
  const subjectPublicId = params.get("subjectPublicId");
  if (
    !create ||
    !subjectPublicId ||
    (subjectType !== "user" &&
      subjectType !== "verification_request" &&
      subjectType !== "trust_registry_record")
  ) {
    return {
      showCreate: false,
      createPayload: emptyCreatePayload(),
    };
  }

  return {
    showCreate: true,
    createPayload: {
      ...emptyCreatePayload(),
      subjectType,
      subjectPublicId,
    } satisfies AdminRiskCreatePayload,
  };
}
