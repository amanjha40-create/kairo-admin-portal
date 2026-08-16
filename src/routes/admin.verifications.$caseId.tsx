import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Flag,
  MailWarning,
  Shield,
  StickyNote,
  UserPlus,
  ArrowUp,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  X,
  MessageSquare,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OutreachWorkspace } from "@/features/admin/components/outreach-workspace";
import { OrganizationResolutionPanel } from "@/features/admin/components/organization-resolution-panel";
import { useOutreachSession } from "@/features/admin/workflow/use-outreach-session";

import { StatusBadge } from "@/features/admin/components/status-badge";
import { PriorityBadge } from "@/features/admin/components/priority-badge";
import { WorkspaceSection, SourceBadge } from "@/features/admin/components/workspace-section";
import { EvidencePanel } from "@/features/admin/components/evidence-panel";
import { CaseTimeline } from "@/features/admin/components/case-timeline";
import { InternalNotesPanel } from "@/features/admin/components/internal-notes-panel";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/features/admin/components/states";
import {
  useAdminAccess,
  setDevAdminRole,
  getDevAdminRole,
  AdminAccessChecking,
} from "@/features/admin/auth/admin-access";
import { shouldEnableAdminProtectedQuery } from "@/features/admin/auth/protected-query";
import { appEnv } from "@/config/env";
import { formatAge, formatRelativeTime } from "@/features/admin/lib/format";
import { AdminRegistryDetailLink } from "@/features/admin/lib/admin-registry-detail-link";
import { getVerificationRegistryLinkModel } from "@/features/admin/lib/admin-registry-route";
import {
  ALL_ASSIGNEES,
  ATTENTION_FLAG_LABEL,
  ORGANIZATION_STATUS_LABEL,
  SLA_LABEL,
  VERIFICATION_TYPE_LABEL,
  createVerificationReviewAdapter,
  type Assignee,
  type VerificationCaseDetail,
  type AttentionFlagRecord,
  type OrganizationSearchResult,
  PRIORITY_LABEL,
  getCandidateProfileRoute,
  verificationCaseDetailQueryOptions,
  verificationReviewKeys,
} from "@/features/admin/runtime/verification-review";
import {
  COMMUNICATION_STATE_LABEL,
  CORRECTION_STATE_LABEL,
  CONTACT_SOURCE_LABEL,
  CONTACT_STATE_LABEL,
} from "@/features/admin/runtime/verification-review";
import type { Priority } from "@/features/admin/data/types";
import {
  useVerificationWorkflow,
  type UseVerificationWorkflowResult,
} from "@/features/admin/workflow/use-verification-workflow";
import {
  buildWorkflowCaseState,
  evaluateWorkflowEligibility,
  isTerminalStatus,
} from "@/features/admin/workflow/eligibility";
import {
  FIELD_CONFIRMATION_LABEL,
  type WorkflowAction,
  type AdminRoleKey,
  type WorkflowActor,
} from "@/features/admin/workflow/types";
import { ROLE_LABEL } from "@/features/admin/workflow/permissions";
import {
  CancelDialog,
  CorrectionDialog,
  OutreachDialog,
  VerifyDialog,
  RejectDialog,
  ReturnToVerifierDialog,
  UnableDialog,
  ClarificationRequestDialog,
  ClarificationResponseDialog,
} from "@/features/admin/components/workflow-dialogs";
import { UnsavedChangesDialog } from "@/features/admin/components/unsaved-changes-dialog";

export const Route = createFileRoute("/admin/verifications/$caseId")({
  head: () => ({
    meta: [
      { title: "Verification case — Kairo Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CaseWorkspaceRoute,
});

function CaseWorkspaceRoute() {
  const { caseId } = Route.useParams();
  const access = useAdminAccess();
  const detailQuery = useQuery({
    ...verificationCaseDetailQueryOptions(caseId),
    enabled: shouldEnableAdminProtectedQuery(access.state),
  });

  if (!shouldEnableAdminProtectedQuery(access.state)) {
    return <AdminAccessChecking />;
  }

  if (detailQuery.isPending) {
    return (
      <div className="mx-auto max-w-5xl">
        <LoadingSkeleton rows={8} />
      </div>
    );
  }

  if (detailQuery.isError) {
    if (detailQuery.error.message === "The requested resource could not be found.") {
      return <CaseWorkspaceNotFound />;
    }

    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState
          title="Case failed to load"
          description={detailQuery.error.message}
          action={
            <button
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

  if (!detailQuery.data) {
    return <CaseWorkspaceNotFound />;
  }

  return <CaseWorkspace detail={detailQuery.data} />;
}

function CaseWorkspaceNotFound() {
  const { caseId } = Route.useParams();

  return (
    <div className="mx-auto max-w-2xl">
      <EmptyState
        title={`Case ${caseId} not found`}
        description="The case may have been merged, removed, or the identifier is incorrect."
        action={
          <Link
            to="/admin/verifications"
            search={{ view: "all-active" }}
            className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90"
          >
            Back to Verifications
          </Link>
        }
      />
    </div>
  );
}

function useProductionVerificationWorkflow(
  detail: VerificationCaseDetail,
  actor: WorkflowActor,
  caseId: string,
  refresh: () => Promise<void>,
): UseVerificationWorkflowResult {
  const adapter = useMemo(() => createVerificationReviewAdapter(appEnv), []);
  const [acknowledgedFlagIds, setAcknowledgedFlagIds] = useState<Set<string>>(new Set());
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);

  const unsupportedActions = new Set<WorkflowAction>(["record_clarification_request"]);

  const getEligibility = (action: WorkflowAction, opts?: { rejectionIsHighRisk?: boolean }) => {
    const base = evaluateWorkflowEligibility(
      detail as never,
      action,
      actor,
      buildWorkflowCaseState(detail as never, {
        currentStatus: detail.summary.status,
        acknowledgedFlagIds,
      }),
      opts,
    );

    if (unsupportedActions.has(action)) {
      return {
        ...base,
        allowed: false,
        blockingReasons: [
          "This action is not available in production yet because the backend does not expose a matching workflow capability.",
        ],
        warnings: [],
      };
    }

    return base;
  };

  return {
    currentStatus: detail.summary.status,
    isTerminal: isTerminalStatus(detail.summary.status),
    assignedReviewer: detail.summary.assignedReviewer,
    priority: detail.summary.priority,
    notes: detail.notes,
    extraTimelineEvents: [],
    sessionCorrections: [],
    sessionCommunications: [],
    sessionClarifications: [],
    sessionDecision: null,
    acknowledgedFlagIds,
    selectedSuggestionId,
    hasSessionChanges: false,
    nextExpectedAction: detail.statusMeta.nextExpectedAction,
    getEligibility,
    async setAssignedReviewer(next) {
      await adapter.assignCase(caseId, next);
      await refresh();
    },
    async setPriority(next) {
      await adapter.changePriority(caseId, next);
      await refresh();
    },
    async addNote(body, category) {
      await adapter.addNote(caseId, body, category);
      await refresh();
    },
    acknowledgeFlag(flagId) {
      setAcknowledgedFlagIds((prev) => {
        const next = new Set(prev);
        next.add(flagId);
        return next;
      });
    },
    selectSuggestion(id) {
      setSelectedSuggestionId(id);
    },
    async submitCorrection(payload) {
      await adapter.requestCorrections(caseId, {
        corrections: payload.affectedFieldKeys.map((fieldKey) => ({
          field_key: fieldKey,
          request_text: payload.candidateMessage,
          guidance: {
            reasons: payload.reasons,
            requested_items: payload.requestedItems,
            internal_note: payload.internalNote ?? null,
          },
        })),
      });
      await refresh();
    },
    async submitOutreach() {
      await adapter.approveCase(caseId, "Approved for dispatch from the Admin Portal.");
      await refresh();
    },
    async submitVerify(payload) {
      await adapter.finalizeCase(caseId, {
        outcome: "verified",
        decisionSummary: payload.decisionSummary,
      });
      await refresh();
    },
    async submitReject(payload) {
      if (detail.summary.status === "pending_admin_quality_review") {
        await adapter.finalizeCase(caseId, {
          outcome: "rejected",
          decisionSummary: payload.decisionSummary,
        });
      } else {
        await adapter.rejectCase(caseId, payload.decisionSummary);
      }
      await refresh();
    },
    async submitUnable(payload) {
      const decisionSummary = [payload.attemptsSummary, payload.outstandingUncertainty]
        .map((value) => value.trim())
        .filter(Boolean)
        .join("\n\n");
      if (detail.summary.status === "pending_admin_quality_review") {
        await adapter.finalizeCase(caseId, {
          outcome: "unable_to_verify",
          decisionSummary,
        });
      } else {
        await adapter.markUnableToVerify(caseId, decisionSummary);
      }
      await refresh();
    },
    async submitCancel(payload) {
      await adapter.cancelCase(caseId, payload.decisionSummary);
      await refresh();
    },
    async submitReturnToVerifier(payload) {
      await adapter.returnToVerifier(caseId, payload.decisionSummary);
      await refresh();
    },
    async submitClarificationRequest() {
      throw new Error("Employer clarification requests remain unavailable in production.");
    },
    async submitClarificationResponse(payload) {
      await adapter.recordClarificationResponse(caseId, payload.response);
      await refresh();
    },
  };
}

function CaseWorkspace({ detail }: { detail: VerificationCaseDetail }) {
  const { caseId } = Route.useParams();
  const { admin } = useAdminAccess();
  const queryClient = useQueryClient();
  const adapter = useMemo(() => createVerificationReviewAdapter(appEnv), []);

  async function refreshCase() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: verificationReviewKeys.detail("production", caseId),
      }),
      queryClient.invalidateQueries({
        queryKey: verificationReviewKeys.list("production"),
      }),
    ]);
  }

  const actor = useMemo(
    () => ({
      name: admin?.name ?? "Reviewer",
      role: admin?.role ?? "Reviewer",
      roleKey: admin?.roleKey ?? ("reviewer" as const),
      permissions: admin?.permissions ?? [],
    }),
    [admin],
  );

  const demoWorkflow = useVerificationWorkflow(detail as never, actor);
  const productionWorkflow = useProductionVerificationWorkflow(
    detail,
    {
      ...actor,
      id: admin?.id,
    } as WorkflowActor & { id?: string },
    caseId,
    refreshCase,
  );
  const workflow = appEnv.adminDemoMode ? demoWorkflow : productionWorkflow;
  const outreach = useOutreachSession(detail, actor);
  const reviewerOptionsQuery = useQuery({
    queryKey: ["admin", "verification-reviewers"],
    queryFn: () => adapter.listReviewers(),
    enabled: !appEnv.adminDemoMode,
  });

  const [dialog, setDialog] = useState<WorkflowAction | null>(null);
  const [pendingLeaveHref, setPendingLeaveHref] = useState<null | (() => void)>(null);

  const anySessionChanges =
    appEnv.adminDemoMode && (workflow.hasSessionChanges || outreach.hasSessionChanges);

  const assignedReviewerDisplay = useMemo(
    () =>
      resolveReviewerLabel({
        assignedReviewer: workflow.assignedReviewer,
        assignedReviewerId: detail.summary.assignedReviewerId,
        reviewers: reviewerOptionsQuery.data ?? [],
        currentAdmin: admin,
      }),
    [
      admin,
      detail.summary.assignedReviewerId,
      reviewerOptionsQuery.data,
      workflow.assignedReviewer,
    ],
  );
  const currentAssignedReviewerKey = appEnv.adminDemoMode
    ? workflow.assignedReviewer
    : (detail.summary.assignedReviewerId ?? null);

  async function handleAssign(next: Assignee) {
    if (
      appEnv.adminDemoMode
        ? next === workflow.assignedReviewer
        : next === currentAssignedReviewerKey
    ) {
      return;
    }
    await workflow.setAssignedReviewer(next);
    const reviewerLabel =
      reviewerOptionsQuery.data?.find((reviewer) => reviewer.id === next)?.label ?? next;
    toast(`Assigned to ${reviewerLabel}`, {
      description: appEnv.adminDemoMode
        ? "Session-only change. Not persisted to the backend."
        : "Reviewer assignment saved to the backend.",
    });
  }
  async function handlePriority(next: Priority) {
    if (next === workflow.priority) return;
    await workflow.setPriority(next);
    toast(`Priority set to ${PRIORITY_LABEL[next]}`, {
      description: appEnv.adminDemoMode
        ? "Session-only change. Not persisted to the backend."
        : "Priority updated in the backend.",
    });
  }
  function handleAckFlag(f: AttentionFlagRecord) {
    if (workflow.acknowledgedFlagIds.has(f.id)) return;
    workflow.acknowledgeFlag(f.id, f.label);
    toast(`Flag acknowledged: ${f.label}`, {
      description: "Session-only change. Not persisted to the backend.",
    });
  }

  const timeline = useMemo(
    () => [...detail.timeline, ...workflow.extraTimelineEvents, ...outreach.extraTimelineEvents],
    [detail.timeline, workflow.extraTimelineEvents, outreach.extraTimelineEvents],
  );
  const assignmentOptions = useMemo(() => {
    if (appEnv.adminDemoMode) {
      return ALL_ASSIGNEES.map((assignee) => ({ key: assignee, label: assignee }));
    }

    const options = new Map<string, { key: string; label: string }>();
    for (const reviewer of reviewerOptionsQuery.data ?? []) {
      options.set(reviewer.id, {
        key: reviewer.id,
        label: reviewer.label === admin?.name ? `${reviewer.label} (me)` : reviewer.label,
      });
    }
    const currentReviewerKey = detail.summary.assignedReviewerId;
    if (currentReviewerKey) {
      options.set(currentReviewerKey, {
        key: currentReviewerKey,
        label: assignedReviewerDisplay,
      });
    }
    return [...options.values()];
  }, [
    admin?.name,
    assignedReviewerDisplay,
    detail.summary.assignedReviewerId,
    reviewerOptionsQuery.data,
  ]);

  const ageHours = Math.max(
    0,
    Math.round((Date.now() - new Date(detail.summary.submittedAt).getTime()) / 3_600_000),
  );

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Link
          to="/admin/verifications"
          search={{ view: "all-active" }}
          className="inline-flex items-center gap-1 hover:text-foreground"
          onClick={(e) => {
            if (anySessionChanges) {
              e.preventDefault();
              const target = e.currentTarget as HTMLAnchorElement;
              const href = target.getAttribute("href") ?? "/admin/verifications?view=all-active";
              setPendingLeaveHref(() => () => {
                window.location.assign(href);
              });
            }
          }}
        >
          <ArrowLeft aria-hidden className="size-3" />
          Verifications
        </Link>
        <ChevronRight aria-hidden className="size-3" />
        <span className="font-mono text-foreground">{detail.summary.reference}</span>
      </nav>

      {appEnv.adminDemoMode && anySessionChanges ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-[11px] text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
        >
          <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>
            <strong>Session-only workspace.</strong> Changes on this page are visible here for the
            current browser session. They are not saved to the backend and will reset on reload or
            when leaving the case.
          </span>
        </div>
      ) : null}

      {!appEnv.adminDemoMode && detail.summary.status === "pending_admin_quality_review" ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
        >
          <Shield aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>
            <strong>Final quality review.</strong> The verifier has responded. Only the final review
            actions on this screen can set the canonical verification outcome.
          </span>
        </div>
      ) : null}

      {/* Sticky header */}
      <header className="sticky top-14 z-20 -mx-3 border-b border-border bg-background/95 px-3 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">
                {detail.summary.reference}
              </span>
              <StatusBadge status={workflow.currentStatus} />
              <PriorityBadge priority={workflow.priority} />
              <SlaBadge state={detail.summary.slaState} />
              {appEnv.adminDemoMode && workflow.currentStatus !== detail.summary.status ? (
                <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-800 ring-1 ring-inset ring-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-900/60">
                  Session status
                </span>
              ) : null}
            </div>
            <h1 className="mt-1.5 truncate text-lg font-semibold tracking-tight text-foreground">
              {detail.candidate.name}
            </h1>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {VERIFICATION_TYPE_LABEL[detail.summary.verificationType]} ·{" "}
              {detail.summary.organizationName} · {detail.summary.roleOrProgram}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Menu
              label="Assign"
              icon={UserPlus}
              current={assignedReviewerDisplay}
              options={assignmentOptions}
              onSelect={(k) => void handleAssign(k as Assignee)}
            />
            <Menu
              label="Priority"
              icon={ArrowUp}
              current={PRIORITY_LABEL[workflow.priority]}
              options={(["urgent", "high", "normal", "low"] as Priority[]).map((p) => ({
                key: p,
                label: PRIORITY_LABEL[p],
              }))}
              onSelect={(k) => void handlePriority(k as Priority)}
            />
            <button
              onClick={() => document.getElementById("internal-note-body")?.focus()}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs text-foreground hover:bg-accent"
            >
              <StickyNote aria-hidden className="size-3.5" />
              Add note
            </button>
            <DevRoleMenu />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span>
            <Users aria-hidden className="mr-1 inline size-3" />
            Assigned to <span className="text-foreground">{assignedReviewerDisplay}</span>
          </span>
          <span>
            <Clock aria-hidden className="mr-1 inline size-3" />
            Age {formatAge(ageHours)}
          </span>
          <span>Last updated {formatRelativeTime(detail.summary.updatedAt)}</span>
          {admin ? (
            <span>
              Acting as <span className="text-foreground">{admin.name}</span> · {admin.role}
            </span>
          ) : null}
        </div>
      </header>

      {/* Two-column workspace */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          <ClaimSummarySection detail={detail} />
          <RequestContextSection detail={detail} />
          <WorkspaceSection
            id="evidence"
            title="Evidence"
            description={`${detail.evidence.length} document${detail.evidence.length === 1 ? "" : "s"} attached to this case.`}
          >
            <EvidencePanel items={detail.evidence} />
          </WorkspaceSection>

          {appEnv.adminDemoMode ? (
            <>
              <OrganizationResolutionPanel detail={detail} outreach={outreach} />
              <OutreachWorkspace
                detail={detail}
                outreach={outreach}
                actor={actor}
                acknowledgedFlagIds={workflow.acknowledgedFlagIds}
              />
            </>
          ) : (
            <>
              <ProductionOrganizationSection
                detail={detail}
                adapter={adapter}
                caseId={caseId}
                onRefresh={refreshCase}
              />
              <ProductionVerifierSection
                detail={detail}
                adapter={adapter}
                caseId={caseId}
                onRefresh={refreshCase}
              />
            </>
          )}

          <CorrectionsSection
            detail={detail}
            workflow={workflow}
            onOpenCorrection={() => setDialog("request_correction")}
          />

          <AdminReviewHistorySection
            detail={detail}
            reviewers={reviewerOptionsQuery.data ?? []}
            currentAdmin={admin}
          />

          <WorkspaceSection
            id="timeline"
            title="Case timeline"
            description="Append-only history of everything that has happened on this case."
          >
            <CaseTimeline events={timeline} />
          </WorkspaceSection>
        </div>

        {/* Right sidebar */}
        <aside className="flex min-w-0 flex-col gap-4">
          <CaseStatusSidebar
            detail={detail}
            workflow={workflow}
            ageHours={ageHours}
            assignedReviewerDisplay={assignedReviewerDisplay}
          />
          {workflow.sessionDecision ? (
            <DecisionSummaryPanel workflow={workflow} detail={detail} />
          ) : null}
          <AttentionFlagsPanel
            flags={detail.flags}
            acknowledged={workflow.acknowledgedFlagIds}
            onAck={handleAckFlag}
          />
          <CandidateSummaryPanel detail={detail} />

          <WorkspaceSection
            id="notes"
            title="Internal notes"
            description="Visible only to Kairo operators."
          >
            <InternalNotesPanel
              notes={workflow.notes}
              onAdd={async (body, cat) => {
                await workflow.addNote(body, cat);
                toast("Internal note added", {
                  description: appEnv.adminDemoMode ? "Session-only." : "Saved to the backend.",
                });
              }}
              author={admin?.name ?? "Reviewer"}
              role={admin?.role ?? "Reviewer"}
              mode={appEnv.adminDemoMode ? "demo" : "production"}
            />
          </WorkspaceSection>
          <DecisionPreparationPanel
            detail={detail}
            workflow={workflow}
            onOpen={(a) => setDialog(a)}
          />
        </aside>
      </div>

      {/* Dialogs */}
      <CorrectionDialog
        open={dialog === "request_correction"}
        onOpenChange={(o) => !o && setDialog(null)}
        detail={detail}
        workflow={workflow}
      />
      <OutreachDialog
        open={dialog === "approve_outreach"}
        onOpenChange={(o) => !o && setDialog(null)}
        detail={detail}
        workflow={workflow}
      />
      <VerifyDialog
        open={dialog === "verify"}
        onOpenChange={(o) => !o && setDialog(null)}
        detail={detail}
        workflow={workflow}
      />
      <RejectDialog
        open={dialog === "reject"}
        onOpenChange={(o) => !o && setDialog(null)}
        detail={detail}
        workflow={workflow}
      />
      <UnableDialog
        open={dialog === "unable_to_verify"}
        onOpenChange={(o) => !o && setDialog(null)}
        detail={detail}
        workflow={workflow}
      />
      <ReturnToVerifierDialog
        open={dialog === "return_to_verifier"}
        onOpenChange={(o) => !o && setDialog(null)}
        workflow={workflow}
      />
      <CancelDialog
        open={dialog === "cancel"}
        onOpenChange={(o) => !o && setDialog(null)}
        workflow={workflow}
      />
      <ClarificationRequestDialog
        open={dialog === "record_clarification_request"}
        onOpenChange={(o) => !o && setDialog(null)}
        detail={detail}
        workflow={workflow}
      />
      <ClarificationResponseDialog
        open={dialog === "record_clarification_response"}
        onOpenChange={(o) => !o && setDialog(null)}
        detail={detail}
        workflow={workflow}
      />
      <UnsavedChangesDialog
        open={pendingLeaveHref !== null}
        onOpenChange={(o) => !o && setPendingLeaveHref(null)}
        onConfirm={() => {
          const fn = pendingLeaveHref;
          setPendingLeaveHref(null);
          if (fn) fn();
        }}
      />
    </div>
  );
}

// =====================================================================
// Section components
// =====================================================================

function ClaimSummarySection({ detail }: { detail: VerificationCaseDetail }) {
  return (
    <WorkspaceSection
      id="claim"
      title="Claim summary"
      description={detail.claim.headline}
      action={
        <div className="hidden gap-1.5 sm:flex">
          <SourceBadge source="candidate" />
          <SourceBadge source="kairo_derived" />
          <SourceBadge source="verifier_confirmed" />
        </div>
      }
    >
      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {detail.claim.fields.map((f) => (
          <div key={f.key} className="min-w-0">
            <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {f.label}
            </dt>
            <dd className="mt-0.5 truncate text-sm text-foreground" title={f.value}>
              {f.value}
            </dd>
            <div className="mt-1">
              <SourceBadge source={f.source} />
            </div>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-[11px] text-muted-foreground">
        Fields are labelled by their source. A field is not treated as verified just because it was
        provided.
      </p>
    </WorkspaceSection>
  );
}

function RequestContextSection({ detail }: { detail: VerificationCaseDetail }) {
  const linkedRecord = detail.linkedRecord;
  const consent = detail.consent;
  const context = detail.routingContext;
  const registryLink = getVerificationRegistryLinkModel(
    context.registryRecordId,
    context.registryName,
  );

  return (
    <WorkspaceSection
      id="request-context"
      title="Request context"
      description="Backend-owned context for the linked record, candidate consent, routing, and current workflow ownership."
    >
      <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
        <ContextField
          label="Workflow owner"
          value={context.workflowOwner}
          helper="Who must act next according to the backend workflow state."
        />
        <ContextField
          label="Linked canonical record"
          value={linkedRecord?.label ?? "No linked record returned"}
          helper={
            linkedRecord?.canonicalStatus
              ? `Canonical status: ${formatBackendLabel(linkedRecord.canonicalStatus)}`
              : "This request should stay linked to a canonical Career record."
          }
        />
        <ContextField
          label="Target verifier contact"
          value={context.targetOrganizationEmail ?? detail.summary.verifierContactLabel}
        />
        <ContextField
          label="Request origin"
          value={context.originType ? formatBackendLabel(context.originType) : "Not provided"}
        />
        <ContextField
          label="Organization resolution"
          value={
            context.organizationResolutionStatus
              ? formatBackendLabel(context.organizationResolutionStatus)
              : "Pending"
          }
        />
        <ContextField
          label="Registry resolution"
          value={
            context.registryResolutionStatus
              ? formatBackendLabel(context.registryResolutionStatus)
              : "Pending"
          }
          helper={
            registryLink ? (
              <AdminRegistryDetailLink
                organizationId={registryLink.organizationId}
                className="inline-flex items-center text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {registryLink.label}
              </AdminRegistryDetailLink>
            ) : (
              (context.registryName ?? undefined)
            )
          }
        />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
        <div className="rounded-md border border-border bg-background p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Candidate consented fields
          </p>
          {consent.fields.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {consent.fields.map((field) => (
                <span
                  key={field}
                  className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground"
                >
                  {formatBackendLabel(field)}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">
              The backend did not return field-level consent metadata for this request.
            </p>
          )}
        </div>
        <div className="rounded-md border border-border bg-background p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Consented evidence scope
          </p>
          {consent.evidenceScope.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {consent.evidenceScope.map((field) => (
                <span
                  key={field}
                  className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground"
                >
                  {formatBackendLabel(field)}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">
              No explicit evidence-scope list was returned for this request.
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
        <ContextField
          label="Routing confidence"
          value={
            context.routingConfidence != null
              ? `${Math.round(context.routingConfidence)}%`
              : "Not provided"
          }
        />
        <ContextField
          label="Candidate submission"
          value={
            consent.submittedAt
              ? formatRelativeTime(consent.submittedAt)
              : "No resubmission recorded"
          }
          helper={consent.candidateResponse ?? undefined}
        />
      </div>
    </WorkspaceSection>
  );
}

function ContextField({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: React.ReactNode;
}) {
  const helperIsPlainText = typeof helper === "string" || typeof helper === "number";

  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
      {helper ? (
        helperIsPlainText ? (
          <p className="mt-1 text-[11px] text-muted-foreground">{helper}</p>
        ) : (
          <div className="mt-1 text-[11px] text-muted-foreground">{helper}</div>
        )
      ) : null}
    </div>
  );
}

function AdminReviewHistorySection({
  detail,
  reviewers,
  currentAdmin,
}: {
  detail: VerificationCaseDetail;
  reviewers: Array<{ id: string; label: string }>;
  currentAdmin?: { id?: string; name?: string } | null;
}) {
  const isFinalReview = detail.summary.status === "pending_admin_quality_review";

  return (
    <WorkspaceSection
      id="review-history"
      title={isFinalReview ? "Final quality review context" : "Admin review history"}
      description={
        isFinalReview
          ? "Pre-dispatch review history and backend review rounds leading into final quality review."
          : "Backend review rounds already recorded for this request."
      }
    >
      {isFinalReview ? (
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          Finalization happens only from this stage. Pre-dispatch approval is not a terminal
          verification outcome.
        </div>
      ) : null}
      {detail.reviewCycles.length === 0 ? (
        <EmptyState
          title="No recorded review rounds yet"
          description="The backend has not returned any explicit admin review rounds for this request."
        />
      ) : (
        <ul className="space-y-2">
          {detail.reviewCycles.map((cycle) => (
            <li key={cycle.id} className="rounded-md border border-border bg-background p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-foreground">
                  Review round {cycle.round}
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {formatBackendLabel(cycle.status)}
                  </span>
                </p>
                <span className="text-[11px] text-muted-foreground">
                  Assigned{" "}
                  {resolveReviewerLabel({
                    assignedReviewer: cycle.assignedReviewer,
                    assignedReviewerId: cycle.assignedReviewerId,
                    reviewers,
                    currentAdmin,
                  })}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {cycle.assignedAt
                  ? `Assigned ${formatRelativeTime(cycle.assignedAt)}`
                  : "Assignment time not returned"}
                {cycle.decidedAt ? ` · Decided ${formatRelativeTime(cycle.decidedAt)}` : ""}
              </p>
              {cycle.decisionSummary ? (
                <p className="mt-2 whitespace-pre-wrap text-xs text-foreground">
                  {cycle.decisionSummary}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </WorkspaceSection>
  );
}

function ProductionOrganizationSection({
  detail,
  adapter,
  caseId,
  onRefresh,
}: {
  detail: VerificationCaseDetail;
  adapter: ReturnType<typeof createVerificationReviewAdapter>;
  caseId: string;
  onRefresh: () => Promise<void>;
}) {
  const [search, setSearch] = useState(detail.organization.candidateEntered);
  const [results, setResults] = useState<OrganizationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [registryNote, setRegistryNote] = useState("");
  const [registryDraft, setRegistryDraft] = useState(() => ({
    legalName: detail.organization.candidateEntered,
    displayName: detail.organization.candidateEntered,
    organizationType: detail.summary.verificationType === "education" ? "institution" : "employer",
    country: "",
    stateProvince: "",
    website: "",
  }));

  async function runSearch() {
    if (!search.trim()) return;
    setIsSearching(true);
    try {
      setResults(await adapter.searchOrganizations(search.trim()));
    } catch (error) {
      toast.error("Organization search failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSearching(false);
    }
  }

  async function resolve(result: OrganizationSearchResult) {
    try {
      await adapter.resolveOrganization(caseId, result.id);
      if (result.registryRecordId) {
        await adapter.resolveRegistry(caseId, result.registryRecordId);
      } else {
        await adapter.deferRegistryResolution(
          caseId,
          registryNote.trim() || "No registry record was available on the selected organization.",
        );
      }
      toast.success("Organization resolved", {
        description: result.registryRecordId
          ? "Organization and registry links were saved to the backend."
          : "Organization was saved and registry resolution was deferred.",
      });
      await onRefresh();
    } catch (error) {
      toast.error("Organization resolution failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function createRegistryRecord() {
    if (
      !registryDraft.legalName.trim() ||
      !registryDraft.organizationType.trim() ||
      !registryDraft.country.trim()
    ) {
      toast.error("Registry record is incomplete", {
        description: "Legal name, organization type, and country are required by the backend.",
      });
      return;
    }

    try {
      await adapter.createRegistryRecord(caseId, {
        legalName: registryDraft.legalName.trim(),
        displayName: registryDraft.displayName.trim() || undefined,
        organizationType: registryDraft.organizationType.trim(),
        country: registryDraft.country.trim().toUpperCase(),
        stateProvince: registryDraft.stateProvince.trim() || undefined,
        website: registryDraft.website.trim() || undefined,
        note: registryNote.trim() || undefined,
      });
      toast.success("Registry record created", {
        description: "The backend created and linked a registry record for this request.",
      });
      await onRefresh();
    } catch (error) {
      toast.error("Registry record creation failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <WorkspaceSection
      id="organization"
      title="Organization resolution"
      description="Search backend organizations and save the canonical match for this request."
    >
      <div className="space-y-3 text-xs">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Candidate entered
          </p>
          <p className="text-foreground">{detail.organization.candidateEntered}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Current canonical organization
          </p>
          <p className="text-foreground">
            {detail.organization.matched?.canonicalName ?? "Not resolved yet"}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search organizations"
            className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs text-foreground"
          />
          <button
            type="button"
            onClick={() => void runSearch()}
            className="h-8 rounded-md border border-border bg-background px-3 text-xs text-foreground hover:bg-accent"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>
        <textarea
          value={registryNote}
          onChange={(event) => setRegistryNote(event.target.value)}
          rows={2}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
          placeholder="Optional note if registry resolution needs to be deferred."
        />
        {results.length === 0 ? (
          <div className="space-y-3">
            <p className="text-[11px] text-muted-foreground">
              Search results will appear here. If no canonical match exists, you can create and
              resolve a registry record directly against the backend.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={registryDraft.legalName}
                onChange={(event) =>
                  setRegistryDraft((current) => ({ ...current, legalName: event.target.value }))
                }
                placeholder="Legal name"
                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
              />
              <input
                value={registryDraft.displayName}
                onChange={(event) =>
                  setRegistryDraft((current) => ({ ...current, displayName: event.target.value }))
                }
                placeholder="Display name"
                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
              />
              <input
                value={registryDraft.organizationType}
                onChange={(event) =>
                  setRegistryDraft((current) => ({
                    ...current,
                    organizationType: event.target.value,
                  }))
                }
                placeholder="Organization type"
                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
              />
              <input
                value={registryDraft.country}
                onChange={(event) =>
                  setRegistryDraft((current) => ({ ...current, country: event.target.value }))
                }
                placeholder="Country code"
                maxLength={2}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs uppercase text-foreground"
              />
              <input
                value={registryDraft.stateProvince}
                onChange={(event) =>
                  setRegistryDraft((current) => ({
                    ...current,
                    stateProvince: event.target.value,
                  }))
                }
                placeholder="State / province"
                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
              />
              <input
                value={registryDraft.website}
                onChange={(event) =>
                  setRegistryDraft((current) => ({ ...current, website: event.target.value }))
                }
                placeholder="Website"
                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
              />
            </div>
            <button
              type="button"
              onClick={() => void createRegistryRecord()}
              className="h-8 rounded-md border border-border bg-background px-3 text-xs text-foreground hover:bg-accent"
            >
              Create registry record
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {results.map((result) => (
              <li key={result.id} className="rounded-md border border-border bg-background p-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{result.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {result.organizationType} · Registry {result.registryResolutionStatus}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void resolve(result)}
                    className="h-7 rounded-md border border-border bg-background px-2 text-[11px] text-foreground hover:bg-accent"
                  >
                    Resolve
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </WorkspaceSection>
  );
}

function ProductionVerifierSection({
  detail,
  adapter,
  caseId,
  onRefresh,
}: {
  detail: VerificationCaseDetail;
  adapter: ReturnType<typeof createVerificationReviewAdapter>;
  caseId: string;
  onRefresh: () => Promise<void>;
}) {
  const contact = detail.contacts[0];
  const [reviewNote, setReviewNote] = useState("");

  async function review(reviewStatus: "approved" | "changes_requested") {
    try {
      await adapter.reviewContact(caseId, {
        reviewStatus,
        reviewNotes: reviewNote.trim() || undefined,
      });
      toast.success(reviewStatus === "approved" ? "Contact approved" : "Contact changes requested");
      await onRefresh();
    } catch (error) {
      toast.error("Contact review failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <WorkspaceSection
      id="outreach"
      title="Verifier contact & response"
      description="Backend-backed contact review, verifier delivery state, and quality-review context."
    >
      <div className="space-y-3 text-xs">
        {contact ? (
          <div className="rounded-md border border-border bg-background p-3">
            <p className="font-medium text-foreground">{contact.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {contact.role} · {contact.organization}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {contact.emailMasked}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Review state: {CONTACT_STATE_LABEL[contact.state]}
            </p>
          </div>
        ) : (
          <EmptyState
            title="No verifier contact on this request"
            description="A backend contact must exist before the request can be approved for dispatch."
          />
        )}
        <textarea
          value={reviewNote}
          onChange={(event) => setReviewNote(event.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
          placeholder="Optional review note for the contact decision."
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void review("approved")}
            disabled={!contact}
            className="h-8 rounded-md border border-border bg-background px-3 text-xs text-foreground hover:bg-accent disabled:opacity-50"
          >
            Approve contact
          </button>
          <button
            type="button"
            onClick={() => void review("changes_requested")}
            disabled={!contact}
            className="h-8 rounded-md border border-border bg-background px-3 text-xs text-foreground hover:bg-accent disabled:opacity-50"
          >
            Request contact changes
          </button>
        </div>
        {detail.verifierResponse ? (
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Verifier response summary
            </p>
            <p className="mt-1 text-foreground">
              Delivery {detail.verifierResponse.deliveryStatus} · Decision{" "}
              {detail.verifierResponse.status}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Recipient {detail.verifierResponse.maskedRecipient} · Updated{" "}
              {formatRelativeTime(detail.verifierResponse.updatedAt)}
            </p>
          </div>
        ) : null}
      </div>
    </WorkspaceSection>
  );
}

function CorrectionsSection({
  detail,

  workflow,
  onOpenCorrection,
}: {
  detail: VerificationCaseDetail;
  workflow: UseVerificationWorkflowResult;
  onOpenCorrection: () => void;
}) {
  const eligibility = workflow.getEligibility("request_correction");
  const disabled = !eligibility.allowed;
  return (
    <WorkspaceSection
      id="corrections"
      title="Corrections & clarifications"
      description="Requests sent to the candidate and their responses."
      action={
        <button
          type="button"
          onClick={onOpenCorrection}
          disabled={disabled}
          title={
            disabled
              ? (eligibility.blockingReasons[0] ?? "Not available")
              : "Request a correction from the candidate."
          }
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs",
            disabled ? "text-muted-foreground opacity-60" : "text-foreground hover:bg-accent",
          )}
        >
          <Wrench aria-hidden className="size-3" />
          Request correction
        </button>
      }
    >
      {detail.corrections.length + workflow.sessionCorrections.length === 0 ? (
        <EmptyState
          title="No corrections requested"
          description="No corrections or clarifications have been issued for this case."
        />
      ) : (
        <ul className="space-y-3">
          {detail.corrections.map((c) => (
            <li key={c.id} className="rounded-md border border-border bg-background p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs font-medium text-foreground">
                  {c.requestedBy}
                  <span className="font-normal text-muted-foreground"> requested a correction</span>
                </p>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {CORRECTION_STATE_LABEL[c.state]}
                </span>
              </div>
              <p className="mt-1 text-xs text-foreground">{c.reason}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Fields: {c.fields.join(", ")} · {formatRelativeTime(c.requestedAt)}
              </p>
              {c.candidateResponse ? (
                <div className="mt-2 rounded bg-muted/60 p-2 text-xs text-foreground">
                  <p className="font-medium">Candidate response</p>
                  <p className="mt-0.5 text-muted-foreground">{c.candidateResponse}</p>
                </div>
              ) : null}
            </li>
          ))}
          {workflow.sessionCorrections.map((c) => (
            <li
              key={c.id}
              className="rounded-md border border-sky-300 bg-sky-50/40 p-3 dark:border-sky-800 dark:bg-sky-950/20"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs font-medium text-foreground">
                  {c.actorName}
                  <span className="font-normal text-muted-foreground"> requested a correction</span>
                </p>
                <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
                  Session-only
                </span>
              </div>
              <p className="mt-1 text-xs text-foreground">{c.reasonLabels.join(", ")}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Fields: {c.affectedFieldKeys.join(", ")} · {formatRelativeTime(c.at)}
              </p>
              {c.requestedItems.length > 0 ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Requested: {c.requestedItems.join(", ")}
                </p>
              ) : null}
              <div className="mt-2 rounded bg-background/60 p-2 text-xs text-foreground">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Candidate-facing message
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-xs">{c.candidateMessage}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </WorkspaceSection>
  );
}

function CaseStatusSidebar({
  detail,
  workflow,
  ageHours,
  assignedReviewerDisplay,
}: {
  detail: VerificationCaseDetail;
  workflow: UseVerificationWorkflowResult;
  ageHours: number;
  assignedReviewerDisplay: string;
}) {
  const statusChanged = workflow.currentStatus !== detail.summary.status;
  return (
    <WorkspaceSection id="status" title="Case status">
      <div className="space-y-2 text-xs">
        <StatusRow label="Status" value={<StatusBadge status={workflow.currentStatus} />} />
        <p className="text-[11px] text-muted-foreground">
          {statusChanged && appEnv.adminDemoMode
            ? "Session-only status change on this workspace."
            : detail.statusMeta.description}
        </p>
        <StatusRow
          label="Stage"
          value={<span className="text-foreground">{detail.statusMeta.stage}</span>}
        />
        <StatusRow label="Priority" value={<PriorityBadge priority={workflow.priority} />} />
        <StatusRow
          label="Assigned"
          value={
            <span
              className={cn(
                "text-foreground",
                assignedReviewerDisplay === "Unassigned" && "italic text-muted-foreground",
              )}
            >
              {assignedReviewerDisplay}
            </span>
          }
        />
        <StatusRow
          label="Workflow owner"
          value={<span className="text-foreground">{detail.routingContext.workflowOwner}</span>}
        />
        <StatusRow
          label="Submitted"
          value={
            <span className="text-foreground">
              {formatRelativeTime(detail.summary.submittedAt)}
            </span>
          }
        />
        <StatusRow
          label="Age"
          value={<span className="text-foreground">{formatAge(ageHours)}</span>}
        />
        <StatusRow
          label="SLA target"
          value={<span className="text-foreground">{detail.statusMeta.slaTargetHours}h</span>}
        />
        <StatusRow label="SLA state" value={<SlaBadge state={detail.summary.slaState} />} />
        <div className="mt-2 rounded-md bg-muted/60 p-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Next expected action
          </p>
          <p className="mt-0.5 text-xs text-foreground">{workflow.nextExpectedAction}</p>
        </div>
      </div>
    </WorkspaceSection>
  );
}

function StatusRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <div className="text-right">{value}</div>
    </div>
  );
}

function AttentionFlagsPanel({
  flags,
  acknowledged,
  onAck,
}: {
  flags: AttentionFlagRecord[];
  acknowledged: Set<string>;
  onAck: (f: AttentionFlagRecord) => void;
}) {
  return (
    <WorkspaceSection id="attention" title="Attention & risk">
      {flags.length === 0 ? (
        <EmptyState
          title="No attention flags"
          description="Nothing needs reviewer attention right now."
        />
      ) : (
        <ul className="space-y-2">
          {flags.map((f) => {
            const isAck = acknowledged.has(f.id);
            const state = isAck ? "acknowledged" : f.state;
            return (
              <li key={f.id} className="rounded-md border border-border bg-background p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <Flag
                        aria-hidden
                        className={cn(
                          "size-3",
                          f.severity === "high" ? "text-rose-500" : "text-amber-500",
                        )}
                      />
                      {ATTENTION_FLAG_LABEL[f.flag]}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{f.reason}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {formatRelativeTime(f.createdAt)} · {f.source} · severity {f.severity}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                      state === "open" &&
                        "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
                      state === "acknowledged" &&
                        "bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
                      state === "resolved" &&
                        "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
                    )}
                  >
                    {state}
                  </span>
                </div>
                {!isAck && f.state === "open" ? (
                  <button
                    type="button"
                    onClick={() => onAck(f)}
                    className="mt-2 inline-flex h-6 items-center gap-1 rounded border border-border bg-background px-1.5 text-[11px] text-foreground hover:bg-accent"
                  >
                    <CheckCircle2 aria-hidden className="size-3" />
                    Acknowledge (session-only)
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </WorkspaceSection>
  );
}

function CandidateSummaryPanel({ detail }: { detail: VerificationCaseDetail }) {
  const c = detail.candidate;
  const candidateProfileRoute = getCandidateProfileRoute(c.candidateId);
  return (
    <WorkspaceSection id="candidate" title="Candidate">
      <div className="space-y-2 text-xs">
        <div>
          <p className="text-sm font-medium text-foreground">{c.name}</p>
          <p className="text-[11px] text-muted-foreground">{c.email}</p>
          <p className="font-mono text-[11px] text-muted-foreground">{c.phoneMasked}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <StatusRow
            label="Profile"
            value={<span className="text-foreground">{c.profileType}</span>}
          />
          <StatusRow
            label="Signed up"
            value={<span className="text-foreground">{formatRelativeTime(c.signupAt)}</span>}
          />
          <StatusRow
            label="Trust score"
            value={<span className="text-foreground tabular-nums">{c.trustScore}</span>}
          />
          <StatusRow
            label="Passport"
            value={
              <span className="text-foreground capitalize">
                {c.trustPassportStatus.replace(/_/g, " ")}
              </span>
            }
          />
          <StatusRow
            label="Records"
            value={<span className="text-foreground tabular-nums">{c.employmentRecordCount}</span>}
          />
          <StatusRow
            label="Prior verifications"
            value={
              <span className="text-foreground tabular-nums">{c.previousVerificationCount}</span>
            }
          />
        </dl>
        {c.riskFlags.length > 0 ? (
          <div className="rounded bg-amber-50 p-2 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="font-medium">Risk flags</p>
            <ul className="mt-0.5 list-inside list-disc">
              {c.riskFlags.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {candidateProfileRoute ? (
          <Link
            to={candidateProfileRoute.to}
            params={candidateProfileRoute.params}
            className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Open candidate profile
            <ExternalLink aria-hidden className="size-3" />
          </Link>
        ) : null}
      </div>
    </WorkspaceSection>
  );
}

function DecisionSummaryPanel({
  workflow,
  detail,
}: {
  workflow: UseVerificationWorkflowResult;
  detail: VerificationCaseDetail;
}) {
  const d = workflow.sessionDecision!;
  const tone =
    d.kind === "verify"
      ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30"
      : d.kind === "reject"
        ? "border-destructive/40 bg-destructive/5"
        : "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/40";
  return (
    <WorkspaceSection
      id="decision-summary"
      title="Decision summary"
      description={`Terminal decision recorded for ${detail.summary.reference}.`}
    >
      <div className={cn("rounded-md border p-3", tone)}>
        <p className="text-xs font-semibold text-foreground">
          {d.kind === "verify" ? "Verified" : d.kind === "reject" ? "Rejected" : "Unable to Verify"}
        </p>
        <dl className="mt-2 space-y-1 text-[11px]">
          <SummaryRow label="Reason" value={d.reasonLabel} />
          {d.basisLabel ? <SummaryRow label="Basis" value={d.basisLabel} /> : null}
          <SummaryRow label="Performed by" value={`${d.actorName} · ${d.actorRole}`} />
          <SummaryRow label="Performed at" value={new Date(d.at).toLocaleString()} />
          <SummaryRow
            label="Candidate communication"
            value={d.candidateMessage ? "Prepared (not sent)" : "Not required"}
          />
          <SummaryRow label="Persistence" value="Session-only — not saved to backend" />
        </dl>
        {d.fieldConfirmations ? (
          <div className="mt-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Field confirmation
            </p>
            <ul className="mt-1 space-y-0.5 text-[11px]">
              {detail.claim.fields.map((f) => (
                <li key={f.key} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="text-foreground">
                    {FIELD_CONFIRMATION_LABEL[d.fieldConfirmations?.[f.key] ?? "not_applicable"]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {d.decisionSummary ? (
          <div className="mt-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Summary
            </p>
            <p className="mt-1 whitespace-pre-wrap text-[11px] text-foreground">
              {d.decisionSummary}
            </p>
          </div>
        ) : null}
      </div>
    </WorkspaceSection>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right text-foreground">{value}</dd>
    </div>
  );
}

function DecisionPreparationPanel({
  detail,
  workflow,
  onOpen,
}: {
  detail: VerificationCaseDetail;
  workflow: UseVerificationWorkflowResult;
  onOpen: (a: WorkflowAction) => void;
}) {
  const evidenceReviewed = detail.evidence.filter((e) => e.reviewStatus === "reviewed").length;
  const evidenceAttention = detail.evidence.filter(
    (e) => e.reviewStatus === "needs_attention",
  ).length;
  const openFlags = detail.flags.filter(
    (f) => f.state === "open" && !workflow.acknowledgedFlagIds.has(f.id),
  ).length;
  const outreachContact = detail.contacts.find(
    (c) => c.outreachEligible && c.internalApprovalStatus === "approved",
  );

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: "Evidence reviewed",
      value: (
        <span className="tabular-nums text-foreground">
          {evidenceReviewed} / {detail.evidence.length}
        </span>
      ),
    },
    {
      label: "Evidence needing attention",
      value: <span className="tabular-nums text-foreground">{evidenceAttention}</span>,
    },
    {
      label: "Open attention flags",
      value: <span className="tabular-nums text-foreground">{openFlags}</span>,
    },
    {
      label: "Organization",
      value: (
        <span className="text-foreground">
          {ORGANIZATION_STATUS_LABEL[detail.summary.organizationStatus]}
        </span>
      ),
    },
    {
      label: "Approved contact",
      value: (
        <span className={cn("text-foreground", !outreachContact && "text-muted-foreground")}>
          {outreachContact ? "Available" : "None"}
        </span>
      ),
    },
    {
      label: "Outreach",
      value: (
        <span className="text-foreground capitalize">
          {detail.summary.outreachStatus.replace(/_/g, " ")}
        </span>
      ),
    },
    { label: "SLA", value: <SlaBadge state={detail.summary.slaState} /> },
  ];

  const primaryActions: {
    action: WorkflowAction;
    label: string;
    icon: typeof Wrench;
    destructive?: boolean;
  }[] = [
    { action: "request_correction", label: "Request Correction", icon: Wrench },
    { action: "approve_outreach", label: "Approve for Dispatch", icon: Shield },
    { action: "verify", label: "Finalize Verified", icon: CheckCircle2 },
    { action: "reject", label: "Reject", icon: X, destructive: true },
    { action: "unable_to_verify", label: "Finalize Unable to Verify", icon: AlertTriangle },
    { action: "return_to_verifier", label: "Return to Verifier", icon: MailWarning },
    { action: "cancel", label: "Cancel", icon: X, destructive: true },
  ];

  const clarActions: {
    action: WorkflowAction;
    label: string;
  }[] = [
    { action: "record_clarification_request", label: "Record employer clarification" },
    { action: "record_clarification_response", label: "Record candidate response" },
  ];

  if (workflow.isTerminal) {
    return (
      <WorkspaceSection
        id="decision"
        title="Decision preparation"
        description="Case is in a terminal state. No further workflow transitions are permitted."
      >
        <div className="rounded-md border border-dashed border-border bg-muted/40 p-3 text-[11px] text-muted-foreground">
          Reopening completed cases is not available in this build.
        </div>
      </WorkspaceSection>
    );
  }

  return (
    <WorkspaceSection
      id="decision"
      title="Decision preparation"
      description="Actions are gated by explicit workflow rules and your permissions."
    >
      <dl className="space-y-1.5 text-xs">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd>{r.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex flex-col gap-1.5">
        {primaryActions.map(({ action, label, icon: Icon, destructive }) => {
          const el = workflow.getEligibility(action);
          if (el.irrelevant && !el.allowed) return null;
          return (
            <ActionButton
              key={action}
              icon={Icon}
              label={label}
              destructive={destructive}
              eligibility={el}
              onClick={() => onOpen(action)}
            />
          );
        })}
      </div>
      <div className="mt-4">
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Clarification (secondary)
        </p>
        <div className="flex flex-col gap-1.5">
          {clarActions.map(({ action, label }) => {
            const el = workflow.getEligibility(action);
            if (el.irrelevant && !el.allowed) return null;
            return (
              <ActionButton
                key={action}
                icon={MessageSquare}
                label={label}
                eligibility={el}
                onClick={() => onOpen(action)}
              />
            );
          })}
        </div>
      </div>
      {appEnv.adminDemoMode ? (
        <p className="mt-3 text-[11px] italic text-muted-foreground">
          Every action is session-only. Nothing is sent, persisted, or forwarded to candidate-facing
          surfaces.
        </p>
      ) : null}
    </WorkspaceSection>
  );
}

function ActionButton({
  label,
  icon: Icon,
  eligibility,
  destructive,
  onClick,
}: {
  label: string;
  icon: typeof Wrench;
  eligibility: ReturnType<UseVerificationWorkflowResult["getEligibility"]>;
  destructive?: boolean;
  onClick: () => void;
}) {
  const disabled = !eligibility.allowed;
  const [showWhy, setShowWhy] = useState(false);
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-disabled={disabled}
          title={disabled ? eligibility.blockingReasons[0] : undefined}
          className={cn(
            "inline-flex h-8 flex-1 items-center gap-1.5 rounded-md border px-2 text-xs font-medium",
            disabled
              ? "border-border bg-background text-muted-foreground"
              : destructive
                ? "border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10"
                : "border-border bg-background text-foreground hover:bg-accent",
          )}
        >
          <Icon aria-hidden className="size-3.5" />
          {label}
        </button>
        {disabled ? (
          <button
            type="button"
            onClick={() => setShowWhy((v) => !v)}
            aria-expanded={showWhy}
            className="rounded-md border border-border bg-background px-1.5 py-1 text-[10px] text-muted-foreground hover:bg-accent"
          >
            {showWhy ? "Hide" : "Why?"}
          </button>
        ) : null}
      </div>
      {disabled && showWhy ? (
        <ul className="mt-1 list-inside list-disc space-y-0.5 rounded-md border border-border bg-muted/50 p-2 text-[11px] text-muted-foreground">
          {eligibility.blockingReasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// =====================================================================
// Small header helpers
// =====================================================================

function SlaBadge({ state }: { state: VerificationCaseDetail["summary"]["slaState"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium",
        state === "breached" && "bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200",
        state === "approaching" &&
          "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
        state === "within" &&
          "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
      )}
    >
      {SLA_LABEL[state]}
    </span>
  );
}

type MenuOption = string | { key: string; label: string };

function Menu({
  label,
  icon: Icon,
  current,
  options,
  onSelect,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  current: string;
  options: MenuOption[];
  onSelect: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs text-foreground hover:bg-accent"
      >
        <Icon aria-hidden className="size-3.5" />
        {label}
        <span className="hidden text-muted-foreground sm:inline">· {current}</span>
      </button>
      {open ? (
        <>
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-border bg-popover p-1 text-xs shadow-md"
          >
            {options.map((o) => {
              const key = typeof o === "string" ? o : o.key;
              const label = typeof o === "string" ? o : o.label;
              return (
                <button
                  key={key}
                  role="menuitem"
                  onClick={() => {
                    onSelect(key);
                    setOpen(false);
                  }}
                  className="block w-full rounded px-2 py-1.5 text-left text-foreground hover:bg-accent"
                >
                  {label}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

/**
 * Dev-only role switcher for testing permission-blocked states. Uses
 * localStorage; never surfaced as a production feature.
 */
function DevRoleMenu() {
  if (!import.meta.env.DEV) return null;
  const roles: AdminRoleKey[] = [
    "admin",
    "operations_lead",
    "trust_safety",
    "reviewer",
    "read_only",
  ];
  const current: AdminRoleKey =
    (typeof window !== "undefined" ? getDevAdminRole() : null) ?? "admin";
  return (
    <Menu
      label="Dev role"
      icon={Users}
      current={ROLE_LABEL[current]}
      options={roles.map((r) => ({ key: r, label: ROLE_LABEL[r] }))}
      onSelect={(k) => {
        setDevAdminRole(k as AdminRoleKey);
        toast(`Dev role: ${ROLE_LABEL[k as AdminRoleKey]}`, {
          description: "Session-only. For testing permission-blocked states.",
        });
      }}
    />
  );
}

function resolveReviewerLabel({
  assignedReviewer,
  assignedReviewerId,
  reviewers,
  currentAdmin,
}: {
  assignedReviewer: string;
  assignedReviewerId?: string | null;
  reviewers: Array<{ id: string; label: string }>;
  currentAdmin?: { id?: string; name?: string } | null;
}) {
  if (assignedReviewer !== "Unassigned" && !looksLikeUuid(assignedReviewer)) {
    return assignedReviewer;
  }

  const currentId =
    assignedReviewerId ?? (looksLikeUuid(assignedReviewer) ? assignedReviewer : null);
  if (!currentId) return "Unassigned";

  const reviewer = reviewers.find((candidate) => candidate.id === currentId);
  if (reviewer) return reviewer.label;
  if (currentAdmin?.id === currentId) return currentAdmin.name ?? "Assigned reviewer";
  return currentId;
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function formatBackendLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
