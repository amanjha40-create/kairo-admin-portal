import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { appEnv } from "@/config/env";
import { useAdminAccess } from "@/features/admin/auth/admin-access";
import { shouldEnableAdminProtectedQuery } from "@/features/admin/auth/protected-query";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/features/admin/components/states";
import { WorkspaceSection } from "@/features/admin/components/workspace-section";
import {
  createAdminRiskAdapter,
  riskInvestigationDetailQueryOptions,
  riskKeys,
  type AdminRiskSeverity,
  type AdminRiskStatus,
  TRUST_SAFETY_SEVERITY_LABEL,
  TRUST_SAFETY_STATUS_LABEL,
  TRUST_SAFETY_SUBJECT_TYPE_LABEL,
  type AdminRiskAssignee,
  type AdminRiskEvent,
  type AdminRiskInvestigationDetail,
  type AdminRiskNote,
  type AdminRiskSignal,
} from "@/features/admin/data/risk.production";
import { formatRelativeTime } from "@/features/admin/lib/format";
import { hasPermission } from "@/features/admin/workflow/permissions";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

export function TrustSafetyInvestigationProduction({
  investigationId,
}: {
  investigationId: string;
}) {
  const access = useAdminAccess();
  const permissions = access.admin?.permissions ?? [];
  const canView = hasPermission(permissions, "risk.view");
  const canAssign = hasPermission(permissions, "risk.assign");
  const canNote = hasPermission(permissions, "risk.note");
  const canUpdateSeverity = hasPermission(permissions, "risk.update_severity");
  const canResolve = hasPermission(permissions, "risk.resolve");
  const adapter = useMemo(() => createAdminRiskAdapter(appEnv), []);
  const queryClient = useQueryClient();
  const [statusDraft, setStatusDraft] = useState<"open" | "in_review" | "awaiting_information">(
    "in_review",
  );
  const [statusReason, setStatusReason] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [resolutionReason, setResolutionReason] = useState("");
  const [dismissalReason, setDismissalReason] = useState("");

  const detailQuery = useQuery({
    ...riskInvestigationDetailQueryOptions(investigationId),
    enabled: canView && shouldEnableAdminProtectedQuery(access.state),
  });
  const assigneesQuery = useQuery({
    queryKey: riskKeys.assignees(),
    queryFn: () => adapter.listAssignees(),
    enabled: canAssign && shouldEnableAdminProtectedQuery(access.state),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: riskKeys.all() });
  };

  const assignMutation = useMutation({
    mutationFn: (assigneeUserId: string) => adapter.assign(investigationId, assigneeUserId),
    onSuccess: async () => {
      toast.success("Investigation assignment updated");
      await refresh();
    },
    onError: (error) => {
      toast.error(resolveRiskErrorMessage(error, "The assignee could not be updated."));
    },
  });

  const severityMutation = useMutation({
    mutationFn: (severity: AdminRiskInvestigationDetail["severity"]) =>
      adapter.updateSeverity(investigationId, severity),
    onSuccess: async () => {
      toast.success("Investigation severity updated");
      await refresh();
    },
    onError: (error) => {
      toast.error(resolveRiskErrorMessage(error, "The severity could not be updated."));
    },
  });

  const noteMutation = useMutation({
    mutationFn: (body: string) => adapter.addNote(investigationId, body),
    onSuccess: async () => {
      setNoteBody("");
      toast.success("Investigation note added");
      await refresh();
    },
    onError: (error) => {
      toast.error(resolveRiskErrorMessage(error, "The note could not be added."));
    },
  });

  const statusMutation = useMutation({
    mutationFn: () =>
      adapter.updateStatus(investigationId, statusDraft, statusReason.trim() || undefined),
    onSuccess: async () => {
      setStatusReason("");
      toast.success("Investigation workflow state updated");
      await refresh();
    },
    onError: (error) => {
      toast.error(resolveRiskErrorMessage(error, "The workflow state could not be updated."));
    },
  });

  const resolveMutation = useMutation({
    mutationFn: () => adapter.resolve(investigationId, resolutionReason.trim()),
    onSuccess: async () => {
      setResolutionReason("");
      toast.success("Investigation resolved");
      await refresh();
    },
    onError: (error) => {
      toast.error(resolveRiskErrorMessage(error, "The investigation could not be resolved."));
    },
  });

  const dismissMutation = useMutation({
    mutationFn: () => adapter.dismiss(investigationId, dismissalReason.trim()),
    onSuccess: async () => {
      setDismissalReason("");
      toast.success("Investigation dismissed");
      await refresh();
    },
    onError: (error) => {
      toast.error(resolveRiskErrorMessage(error, "The investigation could not be dismissed."));
    },
  });

  if (!shouldEnableAdminProtectedQuery(access.state)) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <LoadingSkeleton rows={8} />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <EmptyState
          title="No access"
          description="Your role does not include the risk.view permission."
        />
      </div>
    );
  }

  if (detailQuery.isPending) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <LoadingSkeleton rows={8} />
      </div>
    );
  }

  if (detailQuery.error) {
    const copy = getRiskDetailErrorCopy(detailQuery.error);
    return (
      <div className="mx-auto max-w-2xl p-8">
        <ErrorState
          title={copy.title}
          description={copy.description}
          action={
            <button
              type="button"
              onClick={() => {
                void detailQuery.refetch();
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

  const investigation = detailQuery.data;
  if (!investigation) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <EmptyState
          title="Investigation not found"
          description="The investigation may have been removed or the identifier is incorrect."
          action={
            <Link
              to="/admin/risk"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent"
            >
              <ArrowLeft aria-hidden className="size-3" />
              Back to investigations
            </Link>
          }
        />
      </div>
    );
  }

  const isTerminal = investigation.status === "resolved" || investigation.status === "dismissed";

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <ol className="flex items-center gap-1">
          <li>
            <Link to="/admin/risk" className="hover:text-foreground hover:underline">
              Trust &amp; Safety
            </Link>
          </li>
          <li>/</li>
          <li className="font-medium text-foreground">{investigation.id}</li>
        </ol>
      </nav>

      <header className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="text-base font-semibold tracking-tight text-foreground">
                {investigation.title}
              </h1>
              <SeverityBadge severity={investigation.severity} />
              <StatusBadge status={investigation.status} />
            </div>
            <p className="mt-1 text-sm text-foreground">{investigation.summary}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {TRUST_SAFETY_SUBJECT_TYPE_LABEL[investigation.subjectType] ??
                investigation.subjectType}
              {" · "}
              {investigation.subjectLabel}
              {" · Opened "}
              {formatRelativeTime(investigation.createdAt)}
              {" · Updated "}
              {formatRelativeTime(investigation.updatedAt)}
            </p>
          </div>
          <div className="rounded-md border border-border bg-background px-3 py-2 text-right text-[11px] text-muted-foreground">
            <div>
              Assignee:{" "}
              <span className="text-foreground">
                {investigation.assignee?.fullName || investigation.assignee?.email || "Unassigned"}
              </span>
            </div>
            <div>
              Signals: <span className="text-foreground">{investigation.signals.length}</span>
            </div>
            <div>
              Notes: <span className="text-foreground">{investigation.notes.length}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <SignalsSection signals={investigation.signals} />
          <SubjectContextSection investigation={investigation} />
          <NotesSection
            notes={investigation.notes}
            noteBody={noteBody}
            onNoteBodyChange={setNoteBody}
            onSubmit={() => void noteMutation.mutateAsync(noteBody.trim())}
            canNote={canNote}
            isSubmitting={noteMutation.isPending}
          />
          <TimelineSection events={investigation.timeline} />
        </div>

        <aside className="flex flex-col gap-4">
          <AssignmentPanel
            investigation={investigation}
            assignees={assigneesQuery.data ?? []}
            canAssign={canAssign}
            canUpdateSeverity={canUpdateSeverity}
            onAssign={(assigneeUserId) => void assignMutation.mutateAsync(assigneeUserId)}
            onSeverityChange={(severity) => void severityMutation.mutateAsync(severity)}
            isAssigning={assignMutation.isPending}
            isUpdatingSeverity={severityMutation.isPending}
          />
          <WorkflowPanel
            investigation={investigation}
            canResolve={canResolve}
            statusDraft={statusDraft}
            setStatusDraft={setStatusDraft}
            statusReason={statusReason}
            setStatusReason={setStatusReason}
            onSubmit={() => void statusMutation.mutateAsync()}
            isSubmitting={statusMutation.isPending}
          />
          <ResolutionPanel
            investigation={investigation}
            canResolve={canResolve}
            isTerminal={isTerminal}
            resolutionReason={resolutionReason}
            setResolutionReason={setResolutionReason}
            dismissalReason={dismissalReason}
            setDismissalReason={setDismissalReason}
            onResolve={() => void resolveMutation.mutateAsync()}
            onDismiss={() => void dismissMutation.mutateAsync()}
            isResolving={resolveMutation.isPending}
            isDismissing={dismissMutation.isPending}
          />
        </aside>
      </div>
    </div>
  );
}

function SignalsSection({ signals }: { signals: AdminRiskSignal[] }) {
  return (
    <WorkspaceSection
      id="signals"
      title="Why flagged"
      description="Explainable signals attached to this investigation."
    >
      {signals.length === 0 ? (
        <EmptyState title="No risk signals attached." />
      ) : (
        <ul className="space-y-2">
          {signals.map((signal) => (
            <li key={signal.id} className="rounded-md border border-border bg-background p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{signal.summary}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {signal.signalType} · {signal.source} · {signal.subjectPublicId}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <SeverityBadge severity={signal.severity} />
                  <span className="text-[10px] text-muted-foreground">
                    {signal.status} · {formatRelativeTime(signal.detectedAt)}
                  </span>
                </div>
              </div>
              {Object.keys(signal.metadata).length > 0 ? (
                <dl className="mt-3 grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                  {Object.entries(signal.metadata).map(([key, value]) => (
                    <div key={key} className="rounded bg-muted/40 px-2 py-1">
                      <dt className="font-medium text-foreground">{humanizeKey(key)}</dt>
                      <dd className="mt-0.5 break-words">{stringifyMetadata(value)}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </WorkspaceSection>
  );
}

function SubjectContextSection({ investigation }: { investigation: AdminRiskInvestigationDetail }) {
  const { user, verification, registry } = investigation.subjectContext;

  return (
    <WorkspaceSection
      id="subject"
      title="Subject context"
      description="Canonical context returned from backend-owned product truth."
    >
      <div className="grid gap-3 md:grid-cols-2">
        {user ? (
          <SubjectCard
            title="User"
            href={`/admin/users/${user.id}`}
            rows={[
              ["Display name", user.displayName],
              ["Account status", user.accountStatus],
              ["Trust status", user.trustStatus ?? "Unavailable"],
              ["Trust score", user.trustScore == null ? "Unavailable" : String(user.trustScore)],
              ["Verification total", String(user.verificationTotal)],
            ]}
          />
        ) : null}
        {verification ? (
          <SubjectCard
            title="Verification"
            href={`/admin/verifications/${verification.id}`}
            rows={[
              ["Subject", verification.subjectName],
              ["Status", verification.status],
              ["Request type", verification.requestType],
              ["Evidence", String(verification.evidenceCount)],
              ["Timeline events", String(verification.timelineCount)],
              [
                "Organization",
                verification.organizationName ?? verification.registryName ?? "Unavailable",
              ],
            ]}
            footerLinks={[
              verification.candidateUserId
                ? { label: "Open candidate", href: `/admin/users/${verification.candidateUserId}` }
                : null,
              verification.organizationPublicId
                ? {
                    label: "Open organization",
                    href: `/admin/registry/${verification.organizationPublicId}`,
                  }
                : null,
              verification.registryRecordPublicId
                ? {
                    label: "Open registry record",
                    href: `/admin/registry/${verification.registryRecordPublicId}`,
                  }
                : null,
            ]}
          />
        ) : null}
        {registry ? (
          <SubjectCard
            title="Registry"
            href={`/admin/registry/${registry.id}`}
            rows={[
              ["Legal name", registry.legalName],
              ["Display name", registry.displayName ?? "Unavailable"],
              ["Lifecycle", registry.lifecycleStatus],
              ["Trust status", registry.trustStatus],
              ["Linked organizations", String(registry.linkedOrganizationCount)],
              ["Verification requests", String(registry.verificationCount)],
            ]}
          />
        ) : null}
      </div>
      {!user && !verification && !registry ? (
        <div className="mt-3">
          <EmptyState
            title="Subject context unavailable"
            description="The backend returned no related subject projection for this investigation."
          />
        </div>
      ) : null}
    </WorkspaceSection>
  );
}

function SubjectCard({
  title,
  href,
  rows,
  footerLinks = [],
}: {
  title: string;
  href: string;
  rows: Array<[string, string]>;
  footerLinks?: Array<{ label: string; href: string } | null>;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <a
          href={href}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground hover:underline"
        >
          Open
          <ExternalLink aria-hidden className="size-3" />
        </a>
      </div>
      <dl className="mt-3 grid gap-2 text-[11px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      {footerLinks.filter(Boolean).length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {footerLinks.map((link) =>
            link ? (
              <a
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground hover:bg-accent"
              >
                {link.label}
              </a>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}

function NotesSection({
  notes,
  noteBody,
  onNoteBodyChange,
  onSubmit,
  canNote,
  isSubmitting,
}: {
  notes: AdminRiskNote[];
  noteBody: string;
  onNoteBodyChange: (value: string) => void;
  onSubmit: () => void;
  canNote: boolean;
  isSubmitting: boolean;
}) {
  return (
    <WorkspaceSection
      id="notes"
      title="Internal notes"
      description="Admin-only notes persisted by the backend."
    >
      {canNote ? (
        <div className="rounded-md border border-border bg-background p-3">
          <textarea
            value={noteBody}
            onChange={(event) => onNoteBodyChange(event.target.value)}
            rows={3}
            placeholder="Add an internal Trust & Safety note."
            className="block w-full resize-y rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              disabled={!noteBody.trim() || isSubmitting}
              onClick={onSubmit}
              className="inline-flex h-8 items-center gap-1 rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <StickyNote aria-hidden className="size-3" />
              {isSubmitting ? "Saving…" : "Add note"}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
          Your role does not include the risk.note permission.
        </div>
      )}

      {notes.length === 0 ? (
        <div className="mt-3">
          <EmptyState title="No notes yet" />
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {notes.map((note) => (
            <li key={note.id} className="rounded-md border border-border bg-background p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs font-medium text-foreground">
                  {note.authorDisplayName ?? note.authorUserId ?? "Kairo operator"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatRelativeTime(note.createdAt)}
                </p>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-xs text-foreground">{note.body}</p>
            </li>
          ))}
        </ul>
      )}
    </WorkspaceSection>
  );
}

function TimelineSection({ events }: { events: AdminRiskEvent[] }) {
  return (
    <WorkspaceSection
      id="timeline"
      title="Timeline"
      description="Backend-authored Trust & Safety investigation history."
    >
      {events.length === 0 ? (
        <EmptyState title="No timeline events yet" />
      ) : (
        <ol className="relative space-y-3 border-l border-border pl-4">
          {events.map((event) => (
            <li key={event.id} className="relative">
              <span
                aria-hidden
                className="absolute -left-[19px] top-1 size-2 rounded-full bg-foreground/60"
              />
              <p className="text-xs font-medium text-foreground">{humanizeKey(event.eventType)}</p>
              <p className="text-[11px] text-muted-foreground">
                {event.detail ?? "No additional detail provided."}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {event.actorDisplayName ?? event.actorUserId ?? "Kairo operator"} ·{" "}
                {formatRelativeTime(event.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </WorkspaceSection>
  );
}

function AssignmentPanel({
  investigation,
  assignees,
  canAssign,
  canUpdateSeverity,
  onAssign,
  onSeverityChange,
  isAssigning,
  isUpdatingSeverity,
}: {
  investigation: AdminRiskInvestigationDetail;
  assignees: AdminRiskAssignee[];
  canAssign: boolean;
  canUpdateSeverity: boolean;
  onAssign: (assigneeUserId: string) => void;
  onSeverityChange: (severity: AdminRiskInvestigationDetail["severity"]) => void;
  isAssigning: boolean;
  isUpdatingSeverity: boolean;
}) {
  return (
    <WorkspaceSection
      id="assignment"
      title="Assignment"
      description="Assignee and severity are backend-controlled."
    >
      <div className="space-y-3 text-xs">
        <label className="flex flex-col gap-1 text-muted-foreground">
          Assignee
          <select
            disabled={!canAssign || isAssigning}
            value={investigation.assignee?.userId ?? ""}
            onChange={(event) => {
              if (!event.target.value) return;
              onAssign(event.target.value);
            }}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
          >
            <option value="">Unassigned</option>
            {assignees.map((assignee) => (
              <option key={assignee.userId} value={assignee.userId}>
                {assignee.fullName || assignee.email}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-muted-foreground">
          Severity
          <select
            disabled={!canUpdateSeverity || isUpdatingSeverity}
            value={investigation.severity}
            onChange={(event) =>
              onSeverityChange(event.target.value as AdminRiskInvestigationDetail["severity"])
            }
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
          >
            {Object.entries(TRUST_SAFETY_SEVERITY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </WorkspaceSection>
  );
}

function WorkflowPanel({
  investigation,
  canResolve,
  statusDraft,
  setStatusDraft,
  statusReason,
  setStatusReason,
  onSubmit,
  isSubmitting,
}: {
  investigation: AdminRiskInvestigationDetail;
  canResolve: boolean;
  statusDraft: "open" | "in_review" | "awaiting_information";
  setStatusDraft: (value: "open" | "in_review" | "awaiting_information") => void;
  statusReason: string;
  setStatusReason: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const isTerminal = investigation.status === "resolved" || investigation.status === "dismissed";
  const allowedStatuses = NON_TERMINAL_STATUS_OPTIONS[investigation.status] ?? [];

  return (
    <WorkspaceSection
      id="workflow"
      title="Workflow"
      description="Move the investigation through the supported Trust & Safety workflow."
    >
      {isTerminal ? (
        <div className="rounded-md border border-dashed border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
          This investigation is already closed and cannot return to an active workflow state.
        </div>
      ) : (
        <div className="space-y-3 text-xs">
          <label className="flex flex-col gap-1 text-muted-foreground">
            Next state
            <select
              disabled={!canResolve || isSubmitting}
              value={statusDraft}
              onChange={(event) =>
                setStatusDraft(event.target.value as "open" | "in_review" | "awaiting_information")
              }
              className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
            >
              {allowedStatuses.map((value) => (
                <option key={value} value={value}>
                  {TRUST_SAFETY_STATUS_LABEL[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-muted-foreground">
            Reason
            <textarea
              value={statusReason}
              onChange={(event) => setStatusReason(event.target.value)}
              rows={3}
              placeholder="Optional reason recorded in the timeline."
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <button
            type="button"
            disabled={!canResolve || isSubmitting || allowedStatuses.length === 0}
            onClick={onSubmit}
            className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Updating…" : "Update state"}
          </button>
        </div>
      )}
    </WorkspaceSection>
  );
}

function ResolutionPanel({
  investigation,
  canResolve,
  isTerminal,
  resolutionReason,
  setResolutionReason,
  dismissalReason,
  setDismissalReason,
  onResolve,
  onDismiss,
  isResolving,
  isDismissing,
}: {
  investigation: AdminRiskInvestigationDetail;
  canResolve: boolean;
  isTerminal: boolean;
  resolutionReason: string;
  setResolutionReason: (value: string) => void;
  dismissalReason: string;
  setDismissalReason: (value: string) => void;
  onResolve: () => void;
  onDismiss: () => void;
  isResolving: boolean;
  isDismissing: boolean;
}) {
  return (
    <WorkspaceSection
      id="resolution"
      title="Resolution"
      description="Resolution closes the investigation without changing unrelated domain truth."
    >
      {isTerminal ? (
        <div className="space-y-2 text-xs">
          <StatusBadge status={investigation.status} />
          {investigation.resolutionReason ? (
            <p className="rounded-md border border-border bg-background px-3 py-2 text-foreground">
              {investigation.resolutionReason}
            </p>
          ) : null}
          {investigation.dismissalReason ? (
            <p className="rounded-md border border-border bg-background px-3 py-2 text-foreground">
              {investigation.dismissalReason}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3 text-xs">
          <label className="flex flex-col gap-1 text-muted-foreground">
            Resolve reason
            <textarea
              value={resolutionReason}
              onChange={(event) => setResolutionReason(event.target.value)}
              rows={3}
              placeholder="Describe why this investigation is resolved."
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <button
            type="button"
            disabled={!canResolve || !resolutionReason.trim() || isResolving}
            onClick={onResolve}
            className="inline-flex h-8 items-center rounded-md bg-emerald-700 px-3 text-xs font-medium text-white hover:bg-emerald-700/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isResolving ? "Resolving…" : "Resolve investigation"}
          </button>

          <label className="flex flex-col gap-1 text-muted-foreground">
            Dismiss reason
            <textarea
              value={dismissalReason}
              onChange={(event) => setDismissalReason(event.target.value)}
              rows={3}
              placeholder="Describe why this investigation should be dismissed."
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <button
            type="button"
            disabled={!canResolve || !dismissalReason.trim() || isDismissing}
            onClick={onDismiss}
            className="inline-flex h-8 items-center rounded-md border border-rose-300 bg-rose-50 px-3 text-xs font-medium text-rose-900 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {isDismissing ? "Dismissing…" : "Dismiss investigation"}
          </button>
        </div>
      )}
    </WorkspaceSection>
  );
}

function SeverityBadge({ severity }: { severity: AdminRiskSeverity }) {
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
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset",
        tone,
      )}
    >
      {TRUST_SAFETY_SEVERITY_LABEL[severity] ?? severity}
    </span>
  );
}

function StatusBadge({ status }: { status: AdminRiskStatus }) {
  const tone =
    status === "resolved"
      ? "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60"
      : status === "dismissed"
        ? "bg-zinc-100 text-zinc-800 ring-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-200 dark:ring-zinc-700"
        : status === "awaiting_information"
          ? "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60"
          : "bg-sky-50 text-sky-900 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-900/60";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset",
        tone,
      )}
    >
      {TRUST_SAFETY_STATUS_LABEL[status] ?? status}
    </span>
  );
}

const NON_TERMINAL_STATUS_OPTIONS: Record<
  string,
  Array<"open" | "in_review" | "awaiting_information">
> = {
  open: ["in_review", "awaiting_information"],
  in_review: ["open", "awaiting_information"],
  awaiting_information: ["open", "in_review"],
};

function getRiskDetailErrorCopy(error: Error) {
  if (error instanceof ApiError && error.status === 404) {
    return {
      title: "Investigation not found",
      description: "The requested Trust & Safety investigation does not exist.",
    };
  }

  if (error instanceof ApiError && error.status === 403) {
    return {
      title: "Access denied",
      description: "Your role does not have permission to view this investigation.",
    };
  }

  if (error instanceof ApiError && error.status === 401) {
    return {
      title: "Session expired",
      description: "Sign in again to continue reviewing Trust & Safety investigations.",
    };
  }

  return {
    title: "Investigation failed to load",
    description: error.message,
  };
}

function resolveRiskErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function humanizeKey(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function stringifyMetadata(value: unknown) {
  if (value == null) return "Unavailable";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
