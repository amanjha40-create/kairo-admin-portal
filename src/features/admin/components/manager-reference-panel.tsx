import { useRef, useState } from "react";
import { CheckCircle2, Loader2, Send, ShieldCheck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WorkspaceSection } from "./workspace-section";
import type { EmploymentReferencesOverview } from "../data/employment-references";
import type { VerificationStatus } from "../data/types";
import { formatRelativeTime } from "../lib/format";
import { evaluateManagerInvitationEligibility } from "../workflow/manager-reference-invitation";
import type { WorkflowPermission } from "../workflow/types";

const STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  awaiting_hr_validation: "Awaiting employer confirmation",
  ready_to_invite: "Ready to invite",
  invitation_sent: "Invitation sent",
  opened: "Opened",
  completed: "Completed",
  declined: "Declined",
  expired: "Invitation expired",
  needs_review: "Needs review",
  pending: "Pending",
  cannot_confirm: "Unable to confirm",
};

function statusLabel(status: string) {
  return STATUS_LABEL[status] ?? status.replace(/_/g, " ");
}

function ReferenceRow({
  label,
  value,
  helper,
  complete = false,
}: {
  label: string;
  value: string;
  helper?: string | null;
  complete?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
          {helper ? <p className="mt-1 text-[11px] text-muted-foreground">{helper}</p> : null}
        </div>
        {complete ? (
          <CheckCircle2
            aria-label="Completed"
            className="mt-0.5 size-4 shrink-0 text-emerald-600"
          />
        ) : null}
      </div>
    </div>
  );
}

export function ManagerReferencePanel({
  references,
  isLoading,
  isError,
  caseStatus,
  canonicalEmploymentStatus,
  permissions,
  onRetry,
  onSend,
  createIdempotencyKey = () => globalThis.crypto.randomUUID(),
}: {
  references?: EmploymentReferencesOverview;
  isLoading: boolean;
  isError: boolean;
  caseStatus: VerificationStatus;
  canonicalEmploymentStatus?: string;
  permissions: WorkflowPermission[];
  onRetry: () => void;
  onSend: (idempotencyKey: string) => Promise<void>;
  createIdempotencyKey?: () => string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const sendingRef = useRef(false);
  const attemptKeyRef = useRef<string | null>(null);

  const eligibility = references
    ? evaluateManagerInvitationEligibility({
        references,
        caseStatus,
        canonicalEmploymentStatus,
        permissions,
      })
    : { allowed: false, reason: null };

  async function handleSend() {
    if (sendingRef.current || !references || !eligibility.allowed) return;
    sendingRef.current = true;
    setIsSending(true);
    setSendError(null);
    attemptKeyRef.current ??= createIdempotencyKey();

    try {
      await onSend(attemptKeyRef.current);
      attemptKeyRef.current = null;
      setDialogOpen(false);
    } catch {
      setSendError(
        "The reference request could not be confirmed. Refresh the case before trying again.",
      );
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  }

  return (
    <WorkspaceSection
      id="employment-references"
      title="References"
      description="Backend-authoritative HR and reporting manager reference state for this employment."
    >
      {isLoading ? (
        <div role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 aria-hidden className="size-3.5 animate-spin" />
          Loading employment references
        </div>
      ) : isError || !references ? (
        <div role="alert" className="rounded-md border border-border bg-muted/30 p-3">
          <p className="text-xs font-medium text-foreground">References could not be loaded</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            No invitation action is available until the authoritative state is restored.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ReferenceRow
              label="HR Reference"
              value={statusLabel(references.hrReference.status)}
              helper={
                references.hrReference.completedAt
                  ? `Completed ${formatRelativeTime(references.hrReference.completedAt)}`
                  : null
              }
              complete={references.hrReference.status === "completed"}
            />
            <ReferenceRow
              label="Reporting Manager"
              value={
                references.reportingManager.relationshipConfirmedByHr
                  ? "Confirmed by employer"
                  : "Awaiting employer confirmation"
              }
              helper={
                references.managerContactProvenance
                  ? `Contact provenance: ${statusLabel(references.managerContactProvenance)}`
                  : null
              }
              complete={references.reportingManager.relationshipConfirmedByHr}
            />
            <ReferenceRow
              label="Manager Reference"
              value={statusLabel(references.reportingManager.status)}
              helper={
                references.reportingManager.completedAt
                  ? `Completed ${formatRelativeTime(references.reportingManager.completedAt)}`
                  : references.reportingManager.invitationSentAt
                    ? `Sent ${formatRelativeTime(references.reportingManager.invitationSentAt)}`
                    : null
              }
              complete={references.reportingManager.status === "completed"}
            />
          </div>

          <div className="mt-3 flex flex-col gap-2 rounded-md border border-border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium text-foreground">
                {references.completedCount} of {references.totalCount} references completed
              </p>
              {eligibility.reason && references.reportingManager.status === "ready_to_invite" ? (
                <p className="mt-1 text-[11px] text-muted-foreground">{eligibility.reason}</p>
              ) : null}
              {references.invitation?.deliveryStatus ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Delivery status: {statusLabel(references.invitation.deliveryStatus)}
                </p>
              ) : null}
            </div>
            {eligibility.allowed ? (
              <button
                type="button"
                onClick={() => {
                  setSendError(null);
                  setDialogOpen(true);
                }}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-[#0B2545] px-3 text-xs font-semibold text-white hover:bg-[#0B2545]/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0FA8A5] focus-visible:ring-offset-2"
              >
                <Send aria-hidden className="size-3.5" />
                Send reference request
              </button>
            ) : null}
          </div>
        </>
      )}

      <AlertDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!isSending) setDialogOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send reference request?</AlertDialogTitle>
            <AlertDialogDescription>
              KairoID will email the HR-confirmed reporting manager a secure link to complete the
              professional reference. No private link or full contact address is shown here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-foreground" />
            The backend will re-check finalization, employer confirmation, contact provenance, and
            active-invitation state before delivery.
          </div>
          {sendError ? (
            <p role="alert" className="text-xs text-destructive">
              {sendError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={isSending}
              aria-busy={isSending}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#0B2545] px-4 text-sm font-semibold text-white hover:bg-[#0B2545]/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0FA8A5] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
              {isSending ? "Sending request" : "Send request"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspaceSection>
  );
}
