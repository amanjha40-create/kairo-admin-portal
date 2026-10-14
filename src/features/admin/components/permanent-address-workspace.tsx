import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  History,
  Loader2,
  MapPinCheck,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { WorkspaceSection, SourceBadge } from "@/features/admin/components/workspace-section";
import type {
  AddressDocumentDecisionOutcome,
  AddressDocumentReviewDetail,
  ManualLocationComparison,
  ManualLocationOutcome,
  PermanentAddressDetail,
} from "@/features/admin/data/permanent-address";
import {
  canReviewAddressDocument,
  formatAddressDocumentStatus,
  formatMachineValue,
  formatManualReviewStatus,
  formatPermanentAddressStatus,
  isBackendVerified,
  manualLocationActionState,
  statusTone,
} from "@/features/admin/lib/permanent-address";

interface PermanentAddressWorkspaceProps {
  detail: PermanentAddressDetail;
  documentDetail?: AddressDocumentReviewDetail;
  canReview: boolean;
  mutationPending: boolean;
  loadDocumentContent: (contentPath: string) => Promise<Blob>;
  onDocumentDecision: (outcome: AddressDocumentDecisionOutcome) => Promise<void>;
  onLocationDecision: (outcome: ManualLocationOutcome) => Promise<void>;
}

export function PermanentAddressWorkspace({
  detail,
  documentDetail,
  canReview,
  mutationPending,
  loadDocumentContent,
  onDocumentDecision,
  onLocationDecision,
}: PermanentAddressWorkspaceProps) {
  const summary = detail.permanentAddress;
  const document = detail.document;
  const attempt = detail.latestAttempt;
  const manualActions = manualLocationActionState(attempt, summary.documentStatus);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewState, setPreviewState] = useState<
    | { state: "idle" | "loading" | "error"; url: null; type: null }
    | { state: "rendering" | "ready"; url: string; type: "pdf" | "image" | "unsupported" }
  >({ state: "idle", url: null, type: null });
  const [inspectedDocument, setInspectedDocument] = useState(false);
  const [documentDecision, setDocumentDecision] = useState<AddressDocumentDecisionOutcome | null>(
    null,
  );
  const [locationDecision, setLocationDecision] = useState<ManualLocationOutcome | null>(null);

  useEffect(() => {
    setInspectedDocument(false);
  }, [document.documentId]);

  useEffect(() => {
    return () => {
      if (previewState.url) URL.revokeObjectURL(previewState.url);
    };
  }, [previewState.url]);

  async function openPreview() {
    if (!document.contentPath) return;
    setPreviewOpen(true);
    setPreviewState({ state: "loading", url: null, type: null });
    try {
      const blob = await loadDocumentContent(document.contentPath);
      const type = getPreviewType(blob.type, document.documentType);
      const url = URL.createObjectURL(blob);
      setPreviewState({ state: "rendering", url, type });
    } catch {
      setPreviewState({ state: "error", url: null, type: null });
    }
  }

  async function submitDocumentDecision() {
    if (!documentDecision) return;
    await onDocumentDecision(documentDecision);
    setDocumentDecision(null);
  }

  async function submitLocationDecision() {
    if (!locationDecision) return;
    await onLocationDecision(locationDecision);
    setLocationDecision(null);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        <WorkspaceSection
          id="permanent-address-summary"
          title="Permanent Address"
          description="Current backend-authoritative verification state."
          action={<SourceBadge source="kairo_derived" />}
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryMetric
              label="Overall status"
              value={formatPermanentAddressStatus(summary.overallStatus)}
              status={summary.overallStatus}
              icon={ShieldCheck}
            />
            <SummaryMetric
              label="Address version"
              value={summary.addressVersion ? `Version ${summary.addressVersion}` : "Not created"}
              icon={History}
            />
            <SummaryMetric
              label="Document"
              value={formatAddressDocumentStatus(summary.documentStatus)}
              status={summary.documentStatus}
              icon={FileCheck2}
            />
            <SummaryMetric
              label="Location checks"
              value={`${summary.successfulLocationChecks} of ${summary.requiredLocationChecks} completed`}
              icon={MapPinCheck}
            />
          </div>
          <div className="mt-3 grid gap-2 rounded-md border border-border bg-muted/20 p-3 text-xs sm:grid-cols-2">
            <KeyValue
              label="Manual review"
              value={formatManualReviewStatus(summary.manualReviewStatus)}
            />
            <KeyValue
              label="Pending onsite location"
              value={
                summary.pendingManualReviewTargetAvailable
                  ? "Available for manual review"
                  : "Not available"
              }
            />
            <KeyValue
              label="Target source"
              value={
                summary.activeTargetSource ? formatMachineValue(summary.activeTargetSource) : "None"
              }
            />
            <KeyValue
              label="Current attempt"
              value={
                summary.currentAttemptState
                  ? formatMachineValue(summary.currentAttemptState)
                  : "None"
              }
            />
          </div>
          {isBackendVerified(summary.overallStatus) ? (
            <p className="mt-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              <CheckCircle2 aria-hidden className="size-4 shrink-0" />
              The backend explicitly reports this Permanent Address as verified.
            </p>
          ) : null}
        </WorkspaceSection>

        <WorkspaceSection
          id="claimed-address"
          title="Claimed address"
          description="Current structured Permanent Address provided by the Candidate."
          action={<SourceBadge source="candidate" />}
        >
          {detail.claimedAddress ? (
            <address className="not-italic text-sm leading-6 text-foreground">
              <span className="block">{detail.claimedAddress.addressLine1}</span>
              {detail.claimedAddress.addressLine2 ? (
                <span className="block">{detail.claimedAddress.addressLine2}</span>
              ) : null}
              <span className="block">
                {[detail.claimedAddress.locality, detail.claimedAddress.city]
                  .filter(Boolean)
                  .join(", ")}
              </span>
              <span className="block">
                {detail.claimedAddress.state} {detail.claimedAddress.postalCode}
              </span>
              <span className="block">India</span>
            </address>
          ) : (
            <p className="text-xs text-muted-foreground">
              No current claimed Permanent Address is available from the backend.
            </p>
          )}
        </WorkspaceSection>

        <WorkspaceSection
          id="address-document"
          title="Address document"
          description="Review is independent from location progress and does not verify the address by itself."
          action={
            <StatusPill
              value={document.reviewState}
              label={formatAddressDocumentStatus(document.reviewState)}
            />
          }
        >
          {!document.present ? (
            <div className="rounded-md border border-dashed border-amber-300 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
              <div className="flex items-start gap-3">
                <FileText
                  aria-hidden
                  className="mt-0.5 size-5 text-amber-700 dark:text-amber-300"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">Address document required</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    No current document record exists. The Candidate remains discoverable for
                    review.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <dl className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                <MetaCard
                  label="Type"
                  value={formatMachineValue(document.documentType ?? "Unknown")}
                />
                <MetaCard
                  label="Upload state"
                  value={formatAddressDocumentStatus(document.uploadState)}
                />
                <MetaCard
                  label="Uploaded"
                  value={
                    document.uploadedAt ? formatDateTime(document.uploadedAt) : "Not available"
                  }
                />
                <MetaCard label="Issued" value={document.issuedOn ?? "Not supplied"} />
              </dl>
              {documentDetail?.expiresAt ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Document expiry: {documentDetail.expiresAt}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {document.previewAvailable && document.contentPath ? (
                  <button
                    type="button"
                    onClick={() => void openPreview()}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <FileText aria-hidden className="size-3.5" />
                    Open secure preview
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Protected preview is not available for the current document state.
                  </p>
                )}
              </div>
              {canReviewAddressDocument(document) ? (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-xs font-semibold text-foreground">Document decision</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Inspect the protected document before recording a decision.
                  </p>
                  {!canReview ? (
                    <p className="mt-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                      Your backend role does not include verification review permission.
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <DecisionButton
                      label="Approve matching"
                      onClick={() => setDocumentDecision("APPROVE_MATCHING")}
                      disabled={!canReview || !inspectedDocument || mutationPending}
                    />
                    <DecisionButton
                      label="Reject"
                      onClick={() => setDocumentDecision("REJECT")}
                      disabled={!canReview || !inspectedDocument || mutationPending}
                      variant="destructive"
                    />
                    <DecisionButton
                      label="Request correction"
                      onClick={() => setDocumentDecision("REQUEST_CORRECTION")}
                      disabled={!canReview || !inspectedDocument || mutationPending}
                      variant="outline"
                    />
                    <DecisionButton
                      label="Request different document"
                      onClick={() => setDocumentDecision("REQUEST_DIFFERENT_DOCUMENT")}
                      disabled={!canReview || !inspectedDocument || mutationPending}
                      variant="outline"
                    />
                  </div>
                </div>
              ) : null}
            </>
          )}
        </WorkspaceSection>

        <WorkspaceSection
          id="location-checks"
          title="Location checks"
          description="Progress is counted by the backend across separate server days."
          action={
            <span className="text-xs font-semibold tabular-nums text-foreground">
              {summary.successfulLocationChecks}/{summary.requiredLocationChecks}
            </span>
          }
        >
          <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div
              className="h-full rounded-full bg-[#0FA8A5]"
              style={{
                width: `${Math.min(100, (summary.successfulLocationChecks / summary.requiredLocationChecks) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {summary.separateDaysRequired
              ? "Each successful check must occur on a separate day."
              : "Progress requirements are controlled by the backend."}
            {summary.todayComplete ? " Today’s check is complete." : ""}
          </p>
          {summary.cycleExpiresAt ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 aria-hidden className="size-3.5" /> Cycle expires{" "}
              {formatDateTime(summary.cycleExpiresAt)}
            </p>
          ) : null}

          {!attempt ? (
            <div className="mt-4 rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
              No location attempt is available for review.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <MetaCard
                  label="Automatic result"
                  value={formatMachineValue(attempt.automaticResult)}
                />
                <MetaCard label="GPS quality" value={formatMachineValue(attempt.gpsQuality)} />
                <MetaCard
                  label="Accepted samples"
                  value={
                    attempt.acceptedSampleCount == null
                      ? "Not available"
                      : String(attempt.acceptedSampleCount)
                  }
                />
                <MetaCard
                  label="Accuracy summary"
                  value={
                    attempt.accuracyM == null
                      ? "Not available"
                      : `${Math.round(attempt.accuracyM)} m`
                  }
                />
              </div>

              {attempt.automaticFailureReason ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                  Automatic decision reason: {formatMachineValue(attempt.automaticFailureReason)}
                </p>
              ) : null}

              <LocationDiagnostics
                comparisons={attempt.candidateComparisons}
                candidateCount={attempt.candidateCount}
              />

              <div className="rounded-md border border-border bg-muted/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Pending onsite location</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {attempt.pendingTargetAvailable
                        ? "Available for manual review"
                        : "No retained target is available"}
                    </p>
                  </div>
                  <StatusPill
                    value={attempt.manualReviewStatus ?? "not_pending"}
                    label={formatManualReviewStatus(attempt.manualReviewStatus)}
                  />
                </div>
                {manualActions.actionsAvailable ? (
                  <div className="mt-3 border-t border-border pt-3">
                    {!manualActions.approvalAvailable && manualActions.approvalBlockedReason ? (
                      <p className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                        <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                        Manual location approval unavailable. {manualActions.approvalBlockedReason}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <DecisionButton
                        label="Approve onsite location"
                        onClick={() => setLocationDecision("APPROVE_ONSITE_LOCATION")}
                        disabled={!canReview || !manualActions.approvalAvailable || mutationPending}
                      />
                      <DecisionButton
                        label="Reject onsite location"
                        onClick={() => setLocationDecision("REJECT_ONSITE_LOCATION")}
                        disabled={!canReview || mutationPending}
                        variant="destructive"
                      />
                      <DecisionButton
                        label="Request address correction"
                        onClick={() => setLocationDecision("REQUEST_ADDRESS_CORRECTION")}
                        disabled={!canReview || mutationPending}
                        variant="outline"
                      />
                      <DecisionButton
                        label="Request additional evidence"
                        onClick={() => setLocationDecision("REQUEST_ADDITIONAL_EVIDENCE")}
                        disabled={!canReview || mutationPending}
                        variant="outline"
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              <AttemptHistory detail={attempt} />
            </div>
          )}
        </WorkspaceSection>
      </div>

      <aside className="space-y-4">
        <WorkspaceSection
          title="Candidate reference"
          description="Use this public ID for exact lookup."
        >
          <p className="break-all font-mono text-xs text-foreground">{summary.candidateId}</p>
          {summary.addressVersionId ? (
            <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">
              Version ID: {summary.addressVersionId}
            </p>
          ) : null}
        </WorkspaceSection>

        <WorkspaceSection
          title="Address versions"
          description="Historical decisions remain visible but are not current."
        >
          {detail.versions.length ? (
            <ol className="space-y-2">
              {detail.versions.map((version) => (
                <li
                  key={version.addressVersionId}
                  className="rounded-md border border-border p-2.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">
                      Version {version.addressVersion}
                    </span>
                    <StatusPill
                      value={version.current ? "current" : "historical"}
                      label={version.current ? "Current" : "Historical"}
                    />
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    Created {formatDateTime(version.createdAt)}
                  </p>
                  {version.invalidatedAt ? (
                    <p className="mt-0.5 text-muted-foreground">
                      Invalidated {formatDateTime(version.invalidatedAt)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-muted-foreground">No address version history.</p>
          )}
        </WorkspaceSection>

        <WorkspaceSection
          title="Safe audit trail"
          description="No address text, document contents, or location coordinates."
        >
          {detail.audit.length ? (
            <ol className="space-y-3">
              {detail.audit.map((event, index) => (
                <li key={`${event.action}:${event.at}:${index}`} className="flex gap-2 text-xs">
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-[#0FA8A5]" aria-hidden />
                  <span>
                    <span className="block font-medium text-foreground">
                      {formatMachineValue(event.action)}
                    </span>
                    <time className="text-muted-foreground" dateTime={event.at}>
                      {formatDateTime(event.at)}
                    </time>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-muted-foreground">No document audit events are available.</p>
          )}
        </WorkspaceSection>

        <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          Permanent Address V1 does not contribute to Trust Score. Review decisions do not change
          the score.
        </div>
      </aside>

      <DocumentPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        state={previewState}
        onRendered={() => {
          setPreviewState((current) =>
            current.url
              ? { ...current, state: "ready" }
              : { state: "error", url: null, type: null },
          );
          setInspectedDocument(true);
        }}
        onRetry={() => void openPreview()}
      />

      <DocumentDecisionDialog
        outcome={documentDecision}
        pending={mutationPending}
        onClose={() => setDocumentDecision(null)}
        onConfirm={() => void submitDocumentDecision()}
      />

      <LocationDecisionDialog
        outcome={locationDecision}
        pending={mutationPending}
        onClose={() => setLocationDecision(null)}
        onConfirm={() => void submitLocationDecision()}
      />
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  status,
  icon: Icon,
}: {
  label: string;
  value: string;
  status?: string;
  icon: typeof ShieldCheck;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon aria-hidden className="size-3.5" /> {label}
      </div>
      <div className="mt-2">
        {status ? (
          <StatusPill value={status} label={value} />
        ) : (
          <p className="text-sm font-semibold text-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}

export function StatusPill({ value, label }: { value: string; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset",
        statusTone(value),
      )}
    >
      {label}
    </span>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-xs font-medium text-foreground">{value}</dd>
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2.5">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-xs font-medium text-foreground">{value}</dd>
    </div>
  );
}

function DecisionButton({
  label,
  onClick,
  disabled,
  variant = "primary",
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  variant?: "primary" | "outline" | "destructive";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-9 items-center justify-center rounded-md px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-foreground text-background hover:bg-foreground/90",
        variant === "outline" &&
          "border border-border bg-background text-foreground hover:bg-accent",
        variant === "destructive" &&
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      )}
    >
      {label}
    </button>
  );
}

function LocationDiagnostics({
  comparisons,
  candidateCount,
}: {
  comparisons: ManualLocationComparison[];
  candidateCount: number;
}) {
  if (!comparisons.length) {
    return (
      <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
        No privacy-safe provider comparisons are available. Provider candidate count:{" "}
        {candidateCount}.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">Privacy-safe location diagnostics</p>
        <span className="text-[11px] text-muted-foreground">
          {candidateCount} provider candidates
        </span>
      </div>
      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        {comparisons.map((comparison, index) => (
          <div key={index} className="rounded-md border border-border bg-background p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Candidate {index + 1}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <Comparison label="Country" value={comparison.countryMatch} />
              <Comparison label="State" value={comparison.stateMatch} />
              <Comparison label="City/locality" value={comparison.cityMatch} />
              <Comparison label="PIN" value={comparison.postalCodeMatch} />
              <Comparison
                label="Provider PIN present"
                value={comparison.providerPostalCodePresent}
              />
              <Comparison
                label="Supported precision"
                value={comparison.reversePrecisionSupported}
              />
              <Comparison
                label="Estimated point"
                value={comparison.reverseEstimatedPointAddress}
                trueLabel="Yes"
                falseLabel="No"
              />
              <Comparison label="Street" value={comparison.streetMatch} />
            </dl>
            <div className="mt-2 grid gap-1 border-t border-border pt-2 text-[11px] text-muted-foreground">
              <span>
                Place type:{" "}
                {comparison.reversePlaceType
                  ? formatMachineValue(comparison.reversePlaceType)
                  : "Not available"}
              </span>
              <span>
                Street reason:{" "}
                {comparison.streetDecisionReason
                  ? formatMachineValue(comparison.streetDecisionReason)
                  : "Not available"}
              </span>
              <span>
                Address number:{" "}
                {comparison.addressNumberState
                  ? formatMachineValue(comparison.addressNumberState)
                  : "Not available"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Comparison({
  label,
  value,
  trueLabel = "Match",
  falseLabel = "Conflict",
}: {
  label: string;
  value: boolean | null;
  trueLabel?: string;
  falseLabel?: string;
}) {
  const labelValue = value == null ? "Not available" : value ? trueLabel : falseLabel;
  return (
    <div>
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{labelValue}</dd>
    </div>
  );
}

function AttemptHistory({
  detail,
}: {
  detail: NonNullable<PermanentAddressDetail["latestAttempt"]>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <p className="text-xs font-semibold text-foreground">Attempt history</p>
        <ol className="mt-2 space-y-2">
          {detail.history.map((item) => (
            <li key={item.sessionId} className="rounded-md border border-border p-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">
                  {formatMachineValue(item.automaticResult)}
                </span>
                <time className="text-[10px] text-muted-foreground" dateTime={item.attemptedAt}>
                  {formatDateTime(item.attemptedAt)}
                </time>
              </div>
              <p className="mt-1 text-muted-foreground">
                Manual review: {formatManualReviewStatus(item.manualReviewStatus)}
              </p>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <p className="text-xs font-semibold text-foreground">Resolution history</p>
        {detail.resolutions.length ? (
          <ol className="mt-2 space-y-2">
            {detail.resolutions.map((item) => (
              <li key={item.auditEventId} className="rounded-md border border-border p-2.5 text-xs">
                <p className="font-medium text-foreground">{formatMachineValue(item.outcome)}</p>
                <time className="mt-1 block text-muted-foreground" dateTime={item.reviewedAt}>
                  {formatDateTime(item.reviewedAt)}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            No manual resolution has been recorded.
          </p>
        )}
      </div>
    </div>
  );
}

function DocumentPreviewDialog({
  open,
  onOpenChange,
  state,
  onRendered,
  onRetry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state:
    | { state: "idle" | "loading" | "error"; url: null; type: null }
    | { state: "rendering" | "ready"; url: string; type: "pdf" | "image" | "unsupported" };
  onRendered: () => void;
  onRetry: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Protected address document</DialogTitle>
          <DialogDescription>
            Review the full document against Candidate identity and the current claimed address.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-[55vh] items-center justify-center overflow-hidden rounded-md border border-border bg-muted/30">
          {state.state === "loading" || state.state === "idle" ? (
            <div className="text-center text-xs text-muted-foreground">
              <Loader2 aria-hidden className="mx-auto size-6 animate-spin" />
              <p className="mt-2">Loading protected preview</p>
            </div>
          ) : null}
          {state.state === "error" ? (
            <div className="p-6 text-center">
              <AlertTriangle aria-hidden className="mx-auto size-6 text-amber-600" />
              <p className="mt-2 text-sm font-medium text-foreground">Preview unavailable</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The protected content may have changed or the session may be stale.
              </p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
              >
                <RefreshCw aria-hidden className="size-3.5" /> Retry
              </button>
            </div>
          ) : null}
          {state.url && state.type === "pdf" ? (
            <iframe
              title="Protected address document preview"
              src={state.url}
              className="h-[72vh] min-h-[560px] w-full bg-background"
              onLoad={onRendered}
            />
          ) : null}
          {state.url && state.type === "image" ? (
            <div className="max-h-[72vh] w-full overflow-auto p-4 text-center">
              <img
                src={state.url}
                alt="Protected address document preview"
                className="mx-auto h-auto max-w-full object-contain"
                onLoad={onRendered}
              />
            </div>
          ) : null}
          {state.url && state.type === "unsupported" ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              This protected file type cannot be displayed inline.
            </div>
          ) : null}
        </div>
        {state.state === "ready" ? (
          <p className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 aria-hidden className="size-4" /> Preview loaded for inspection.
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DocumentDecisionDialog({
  outcome,
  pending,
  onClose,
  onConfirm,
}: {
  outcome: AddressDocumentDecisionOutcome | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [identity, setIdentity] = useState(false);
  const [acceptable, setAcceptable] = useState(false);
  const [address, setAddress] = useState(false);

  useEffect(() => {
    if (!outcome) {
      setIdentity(false);
      setAcceptable(false);
      setAddress(false);
    }
  }, [outcome]);

  const approval = outcome === "APPROVE_MATCHING";
  const valid = !approval || (identity && acceptable && address);
  const title = outcome ? DOCUMENT_DECISION_LABEL[outcome] : "Document decision";
  return (
    <Dialog open={Boolean(outcome)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {approval
              ? "Confirm that this document sufficiently supports the Candidate's current claimed Permanent Address. This does not verify the Permanent Address by itself."
              : "Record this decision against the current document and address version. The backend remains authoritative."}
          </DialogDescription>
        </DialogHeader>
        {approval ? (
          <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
            <ReviewConfirmation
              checked={identity}
              onChange={setIdentity}
              label="Candidate identity matches"
            />
            <ReviewConfirmation
              checked={acceptable}
              onChange={setAcceptable}
              label="Document is acceptable and current"
            />
            <ReviewConfirmation
              checked={address}
              onChange={setAddress}
              label="Document address matches the full claimed address"
            />
          </div>
        ) : null}
        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="mt-2 inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent sm:mt-0"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!valid || pending}
            className="inline-flex h-9 items-center justify-center rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Saving…" : title}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewConfirmation({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-xs text-foreground">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      <span>{label}</span>
    </label>
  );
}

function LocationDecisionDialog({
  outcome,
  pending,
  onClose,
  onConfirm,
}: {
  outcome: ManualLocationOutcome | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const title = outcome ? LOCATION_DECISION_LABEL[outcome] : "Location review decision";
  const approval = outcome === "APPROVE_ONSITE_LOCATION";
  return (
    <Dialog open={Boolean(outcome)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {approval
              ? "This will establish the fixed onsite location target and count this as one location check. The Candidate will still need the remaining checks on separate days."
              : "The backend will record this resolution without rewriting the original automatic result or location history."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="mt-2 inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent sm:mt-0"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex h-9 items-center justify-center rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Saving…" : title}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const DOCUMENT_DECISION_LABEL: Record<AddressDocumentDecisionOutcome, string> = {
  APPROVE_MATCHING: "Approve matching",
  REJECT: "Reject document",
  REQUEST_CORRECTION: "Request correction",
  REQUEST_DIFFERENT_DOCUMENT: "Request different document",
};

const LOCATION_DECISION_LABEL: Record<ManualLocationOutcome, string> = {
  APPROVE_ONSITE_LOCATION: "Approve onsite location",
  REJECT_ONSITE_LOCATION: "Reject onsite location",
  REQUEST_ADDRESS_CORRECTION: "Request address correction",
  REQUEST_ADDITIONAL_EVIDENCE: "Request additional evidence",
};

function getPreviewType(
  mimeType: string,
  documentType: string | null,
): "pdf" | "image" | "unsupported" {
  const normalized = mimeType.split(";", 1)[0]?.trim().toLowerCase();
  if (normalized === "application/pdf") return "pdf";
  if (["image/jpeg", "image/png", "image/webp"].includes(normalized)) return "image";
  if (documentType === "passport" || documentType === "driving_license") return "unsupported";
  return "unsupported";
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
}
