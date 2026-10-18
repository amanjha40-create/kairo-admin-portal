import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileText, LockKeyhole, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { useAdminAccess } from "@/features/admin/auth/admin-access";
import { EmptyState } from "@/features/admin/components/states";
import { WorkspaceSection } from "@/features/admin/components/workspace-section";
import {
  adminOperationsKeys,
  createAdminOperationsAdapter,
  managedCandidateQueryOptions,
  type CareerClaimType,
  type ProfileMutationResult,
  type ResumeImportBatch,
  type ResumeImportAction,
  type ResumeParsedResult,
  type ResumeReviewPlan,
  type ResumeReviewSession,
} from "@/features/admin/data/admin-operations";
import { userKeys } from "@/features/admin/data/users";
import { getOperationError } from "@/features/admin/lib/operation-error";
import { hasPermission } from "@/features/admin/workflow/permissions";
import { ApiError } from "@/lib/api/errors";

export function AssistedCandidateWorkspace({ candidateId }: { candidateId: string }) {
  const access = useAdminAccess();
  const queryClient = useQueryClient();
  const permissions = access.admin?.permissions ?? [];
  const canReadManagedStatus = hasPermission(permissions, "create_person");
  const canActivate = hasPermission(permissions, "send_candidate_activation");
  const canManageProfile = hasPermission(permissions, "manage_assisted_profile");
  const candidateQuery = useQuery({
    ...managedCandidateQueryOptions(candidateId),
    enabled: canReadManagedStatus,
  });

  if (!canReadManagedStatus && !canActivate && !canManageProfile) return null;
  if (candidateQuery.isPending) {
    return (
      <WorkspaceSection title="Assisted operations" description="Checking managed-account scope">
        <div className="h-20 animate-pulse rounded-md bg-muted" />
      </WorkspaceSection>
    );
  }
  if (candidateQuery.error instanceof ApiError && candidateQuery.error.status === 404) return null;
  if (candidateQuery.error) {
    return (
      <WorkspaceSection title="Assisted operations" description="Managed Candidate status">
        <p className="text-xs text-destructive">
          {getOperationError(candidateQuery.error, "Assisted operations could not be loaded.")}
        </p>
      </WorkspaceSection>
    );
  }
  const candidate = candidateQuery.data;
  if (!candidate) return null;

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminOperationsKeys.candidate(candidateId) }),
      queryClient.invalidateQueries({ queryKey: userKeys.all() }),
    ]);
  };

  return (
    <div className="space-y-4">
      <WorkspaceSection
        title="Account claim"
        description="Admin-managed Candidate activation and truthful account state"
      >
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <StatusField label="Claim state" value={claimStatusLabel(candidate.claimStatus)} />
            <StatusField label="Contact" value={candidate.emailMasked} />
            <StatusField
              label="Password configured"
              value={candidate.passwordConfigured ? "Yes" : "No"}
            />
            <StatusField
              label="Activation expiry"
              value={
                candidate.activationExpiresAt
                  ? formatDateTime(candidate.activationExpiresAt)
                  : "Not sent"
              }
            />
          </div>
          {canActivate ? (
            <ActivationAction
              candidateId={candidateId}
              claimStatus={candidate.claimStatus}
              resendAvailableAt={candidate.activationLastSentAt}
              onComplete={refresh}
            />
          ) : (
            <span className="text-xs text-muted-foreground">Activation permission required</span>
          )}
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-[#0FA8A5]" />
          Admin never sees or creates a password or activation token. The Candidate claims the
          account through the single-use link and sets their own password.
        </div>
      </WorkspaceSection>

      {canManageProfile ? (
        <>
          <ProfileEditor candidateId={candidateId} onComplete={refresh} />
          <CareerEditor candidateId={candidateId} onComplete={refresh} />
          <CvReviewWorkspace candidateId={candidateId} onComplete={refresh} />
        </>
      ) : (
        <WorkspaceSection title="Assisted profile" description="Profile and CV operations">
          <EmptyState
            title="Assisted profile access is restricted"
            description="The manage_assisted_profile permission is required."
          />
        </WorkspaceSection>
      )}
    </div>
  );
}

function ActivationAction({
  candidateId,
  claimStatus,
  resendAvailableAt,
  onComplete,
}: {
  candidateId: string;
  claimStatus: string;
  resendAvailableAt?: string;
  onComplete: () => Promise<void>;
}) {
  const adapter = useMemo(() => createAdminOperationsAdapter(), []);
  const isResend = claimStatus === "activation_pending";
  const mutation = useMutation({
    mutationFn: () =>
      isResend ? adapter.resendActivation(candidateId) : adapter.sendActivation(candidateId),
    onSuccess: async (receipt) => {
      toast.success(
        receipt.deliveryState === "queued"
          ? isResend
            ? "A fresh activation link was queued"
            : "Activation link queued"
          : "Activation delivery failed",
      );
      await onComplete();
    },
    onError: (error) => toast.error(getOperationError(error, "Activation could not be sent.")),
  });

  if (claimStatus === "claimed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="size-4" /> Claimed
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      title={resendAvailableAt ? `Last sent ${formatDateTime(resendAvailableAt)}` : undefined}
      className="inline-flex h-9 items-center gap-2 rounded-md bg-[#0B2545] px-3 text-xs font-medium text-white disabled:opacity-50"
    >
      {isResend ? <RefreshCw className="size-3.5" /> : <Send className="size-3.5" />}
      {mutation.isPending ? "Sending..." : isResend ? "Resend activation" : "Send activation"}
    </button>
  );
}

function ProfileEditor({
  candidateId,
  onComplete,
}: {
  candidateId: string;
  onComplete: () => Promise<void>;
}) {
  const adapter = useMemo(() => createAdminOperationsAdapter(), []);
  const [headline, setHeadline] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [source, setSource] = useState<"admin_entered" | "cv_extracted">("admin_entered");
  const [receipt, setReceipt] = useState<ProfileMutationResult | null>(null);
  const mutation = useMutation({
    mutationFn: () =>
      adapter.updateProfile(candidateId, {
        ...(headline.trim() ? { headline: headline.trim() } : {}),
        ...(currentRole.trim() ? { currentRole: currentRole.trim() } : {}),
        ...(location.trim() ? { location: location.trim() } : {}),
        ...(bio.trim() ? { bio: bio.trim() } : {}),
        source,
      }),
    onSuccess: async (result) => {
      setReceipt(result);
      toast.success("Profile changes recorded with provenance");
      await onComplete();
    },
    onError: (error) =>
      toast.error(
        getOperationError(
          error,
          "The profile could not be updated. Source-verified fields cannot be replaced by lower-confidence data.",
        ),
      ),
  });
  const hasValue = [headline, currentRole, location, bio].some((value) => value.trim());
  return (
    <WorkspaceSection
      title="Assisted profile"
      description="Allowed profile fields with append-only provenance"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <SmallInput label="Headline" value={headline} onChange={setHeadline} />
        <SmallInput label="Current role" value={currentRole} onChange={setCurrentRole} />
        <SmallInput label="Location" value={location} onChange={setLocation} />
        <label className="space-y-1 text-xs font-medium">
          Provenance
          <select
            value={source}
            onChange={(event) => setSource(event.target.value as typeof source)}
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="admin_entered">Admin entered</option>
            <option value="cv_extracted">Imported from CV</option>
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium sm:col-span-2">
          Bio
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <ProvenanceLegend />
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!hasValue || mutation.isPending}
          className="h-8 rounded-md bg-foreground px-3 text-xs font-medium text-background disabled:opacity-50"
        >
          {mutation.isPending ? "Saving..." : "Save profile changes"}
        </button>
      </div>
      {receipt ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {receipt.updatedFields.length} field(s) saved as{" "}
          {provenanceLabel(receipt.provenanceSource)}. Candidate confirmation required:{" "}
          {receipt.candidateConfirmationRequired ? "Yes" : "No"}.
        </p>
      ) : null}
    </WorkspaceSection>
  );
}

function CareerEditor({
  candidateId,
  onComplete,
}: {
  candidateId: string;
  onComplete: () => Promise<void>;
}) {
  const adapter = useMemo(() => createAdminOperationsAdapter(), []);
  const [claimType, setClaimType] = useState<CareerClaimType>("employment");
  const [recordId, setRecordId] = useState("");
  const [payload, setPayload] = useState("{}");
  const [source, setSource] = useState<"admin_entered" | "cv_extracted">("admin_entered");
  const mutation = useMutation({
    mutationFn: () =>
      adapter.mutateCareer(
        candidateId,
        { claimType, payload: JSON.parse(payload), source },
        recordId.trim() || undefined,
      ),
    onSuccess: async (result) => {
      toast.success(`${claimType} record saved as ${result.verificationStatus}`);
      await onComplete();
    },
    onError: (error) =>
      toast.error(
        getOperationError(
          error,
          "The Career record could not be saved. Check the canonical fields.",
        ),
      ),
  });
  return (
    <WorkspaceSection
      title="Career record"
      description="Create a canonical record without changing its verification status"
    >
      <div className="grid gap-3 md:grid-cols-[180px_180px_1fr_auto] md:items-end">
        <label className="space-y-1 text-xs font-medium">
          Claim type
          <select
            value={claimType}
            onChange={(event) => setClaimType(event.target.value as CareerClaimType)}
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs"
          >
            {(["employment", "education", "internship", "freelance", "certification"] as const).map(
              (type) => (
                <option key={type} value={type}>
                  {humanize(type)}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium">
          Existing record ID (optional)
          <input
            value={recordId}
            onChange={(event) => setRecordId(event.target.value)}
            placeholder="Leave blank to create"
            className="h-9 w-full rounded-md border border-border bg-background px-3 font-mono text-xs"
          />
        </label>
        <label className="space-y-1 text-xs font-medium">
          Source
          <select
            value={source}
            onChange={(event) => setSource(event.target.value as typeof source)}
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="admin_entered">Admin entered</option>
            <option value="cv_extracted">Imported from CV</option>
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium">
          Canonical claim payload (JSON)
          <textarea
            value={payload}
            onChange={(event) => setPayload(event.target.value)}
            className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
          />
        </label>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="h-9 rounded-md bg-foreground px-3 text-xs font-medium text-background disabled:opacity-50"
        >
          {mutation.isPending ? "Saving..." : recordId.trim() ? "Update record" : "Create record"}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Backend canonical validators remain authoritative. Admin entry never marks a Career record
        Verified.
      </p>
    </WorkspaceSection>
  );
}

function CvReviewWorkspace({
  candidateId,
  onComplete,
}: {
  candidateId: string;
  onComplete: () => Promise<void>;
}) {
  const adapter = useMemo(() => createAdminOperationsAdapter(), []);
  const [file, setFile] = useState<File | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ResumeParsedResult | null>(null);
  const [review, setReview] = useState<ResumeReviewSession | null>(null);
  const [plan, setPlan] = useState<ResumeReviewPlan | null>(null);
  const [batch, setBatch] = useState<ResumeImportBatch | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [importIdempotencyKey] = useState(() => crypto.randomUUID());

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a CV first.");
      return adapter.uploadResume(candidateId, file);
    },
    onSuccess: (receipt) => {
      setResumeId(receipt.resumeId);
      toast.success("CV uploaded; parsing started");
    },
    onError: (error) => toast.error(getOperationError(error, "The CV could not be processed.")),
  });
  const loadParsed = useMutation({
    mutationFn: async () => {
      if (!resumeId) throw new Error("Upload a CV first.");
      return adapter.getParsedResume(candidateId, resumeId);
    },
    onSuccess: setParsed,
    onError: (error) =>
      toast.error(getOperationError(error, "The parsed CV draft is not ready yet.")),
  });
  const createReview = useMutation({
    mutationFn: async () => {
      if (!resumeId) throw new Error("Upload a CV first.");
      return adapter.createResumeReview(candidateId, resumeId);
    },
    onSuccess: (session) => {
      setReview(session);
      setDrafts(
        Object.fromEntries(
          session.items.map((item) => [item.id, JSON.stringify(item.editedPayload, null, 2)]),
        ),
      );
    },
    onError: (error) => toast.error(getOperationError(error, "The CV review could not be opened.")),
  });
  const saveItem = useMutation({
    mutationFn: async (itemId: string) => {
      const item = review?.items.find((entry) => entry.id === itemId);
      if (!review || !item) throw new Error("Review item is unavailable.");
      return adapter.updateReviewItem(candidateId, review.id, item.id, {
        expectedVersion: item.version,
        selected: item.selected,
        editedPayload: JSON.parse(drafts[item.id] ?? "{}"),
        importAction: item.importAction,
        targetRecordId: item.targetRecordId,
        confirmDistinctRole:
          item.claimType === "employment" &&
          item.importAction === "create_new" &&
          item.duplicateStatus !== "no_match",
      });
    },
    onSuccess: (item) => {
      setReview((current) =>
        current
          ? {
              ...current,
              version: current.version + 1,
              items: current.items.map((entry) => (entry.id === item.id ? item : entry)),
            }
          : current,
      );
      toast.success("CV review item saved");
    },
    onError: (error) =>
      toast.error(getOperationError(error, "The review item could not be saved.")),
  });
  const validate = useMutation({
    mutationFn: async () => {
      if (!review) throw new Error("Open a CV review first.");
      return adapter.validateReview(candidateId, review.id, review.version);
    },
    onSuccess: (result) => {
      setPlan(result);
      setReview((current) => (current ? { ...current, version: result.version } : current));
      toast[result.ready ? "success" : "error"](
        result.ready ? "Selected CV data is ready to import" : "Review blockers need attention",
      );
    },
    onError: (error) =>
      toast.error(getOperationError(error, "The import plan could not be validated.")),
  });
  const commit = useMutation({
    mutationFn: async () => {
      if (!review || !plan?.ready) throw new Error("Validate the selected data first.");
      return adapter.importReview(candidateId, review.id, review.version, importIdempotencyKey);
    },
    onSuccess: async (result) => {
      setBatch(result);
      toast.success("Selected CV data imported with CV provenance");
      await onComplete();
    },
    onError: (error) =>
      toast.error(getOperationError(error, "The selected CV data could not be imported.")),
  });

  return (
    <WorkspaceSection
      title="CV import"
      description="Upload, parse, review, edit, select, validate, then commit"
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-64 flex-1 space-y-1 text-xs font-medium">
          CV file
          <input
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="block h-9 w-full rounded-md border border-border bg-background px-2 py-1 text-xs file:border-0 file:bg-transparent"
          />
        </label>
        <ActionButton onClick={() => upload.mutate()} disabled={!file || upload.isPending}>
          <FileText className="size-3.5" /> {upload.isPending ? "Uploading..." : "Upload and parse"}
        </ActionButton>
        <ActionButton
          onClick={() => loadParsed.mutate()}
          disabled={!resumeId || loadParsed.isPending}
        >
          <RefreshCw className="size-3.5" /> Refresh parsed draft
        </ActionButton>
        <ActionButton
          onClick={() => createReview.mutate()}
          disabled={!parsed || createReview.isPending}
        >
          Open review
        </ActionButton>
      </div>

      {parsed ? (
        <div className="mt-3 rounded-md border border-border bg-muted/20 p-3 text-xs">
          <div className="font-medium">Parser status: {humanize(parsed.status)}</div>
          <div className="mt-1 text-muted-foreground">
            Schema {parsed.schemaVersion}; {parsed.warnings.length} warning(s). Parser output
            remains a draft.
          </div>
        </div>
      ) : null}

      {review ? (
        <div className="mt-4 space-y-3">
          {review.items.map((item) => (
            <div key={item.id} className="rounded-md border border-border bg-background p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={(event) =>
                      setReview((current) =>
                        current
                          ? {
                              ...current,
                              items: current.items.map((entry) =>
                                entry.id === item.id
                                  ? { ...entry, selected: event.target.checked }
                                  : entry,
                              ),
                            }
                          : current,
                      )
                    }
                  />
                  {humanize(item.claimType)} · Imported from CV
                </label>
                <span className="text-[11px] text-muted-foreground">
                  {item.confidence === undefined
                    ? "Confidence unavailable"
                    : `${Math.round(item.confidence * 100)}% confidence`}
                </span>
              </div>
              <textarea
                value={drafts[item.id] ?? "{}"}
                onChange={(event) =>
                  setDrafts((current) => ({ ...current, [item.id]: event.target.value }))
                }
                className="mt-2 min-h-28 w-full rounded-md border border-border bg-muted/20 px-3 py-2 font-mono text-[11px]"
              />
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="space-y-1 text-[11px] font-medium">
                  Import decision
                  <select
                    value={item.importAction}
                    onChange={(event) =>
                      setReview((current) =>
                        current
                          ? {
                              ...current,
                              items: current.items.map((entry) =>
                                entry.id === item.id
                                  ? {
                                      ...entry,
                                      importAction: event.target.value as ResumeImportAction,
                                    }
                                  : entry,
                              ),
                            }
                          : current,
                      )
                    }
                    className="h-8 w-full rounded-md border border-border bg-background px-2"
                  >
                    <option value="create_new">Create new record</option>
                    <option value="link_existing">Link existing record</option>
                    <option value="update_existing">Update existing record</option>
                    <option value="skip">Skip</option>
                  </select>
                </label>
                <label className="space-y-1 text-[11px] font-medium">
                  Target record ID (for link/update)
                  <input
                    value={item.targetRecordId ?? ""}
                    onChange={(event) =>
                      setReview((current) =>
                        current
                          ? {
                              ...current,
                              items: current.items.map((entry) =>
                                entry.id === item.id
                                  ? { ...entry, targetRecordId: event.target.value || undefined }
                                  : entry,
                              ),
                            }
                          : current,
                      )
                    }
                    className="h-8 w-full rounded-md border border-border bg-background px-2 font-mono"
                  />
                </label>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Duplicate assessment: {humanize(item.duplicateStatus)}. A distinct Employment create
                decision is explicitly confirmed when saved.
              </p>
              {item.conflictWarnings.length ? (
                <p className="mt-2 text-[11px] text-amber-700">{item.conflictWarnings.join(" ")}</p>
              ) : null}
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => saveItem.mutate(item.id)}
                  disabled={saveItem.isPending}
                  className="h-7 rounded-md border border-border px-2 text-[11px] font-medium hover:bg-accent"
                >
                  Save selection and edits
                </button>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              Source-verified records are protected by the backend and cannot be replaced by CV
              data.
            </p>
            <div className="flex gap-2">
              <ActionButton onClick={() => validate.mutate()} disabled={validate.isPending}>
                Validate selected data
              </ActionButton>
              <button
                type="button"
                onClick={() => commit.mutate()}
                disabled={!plan?.ready || commit.isPending}
                className="h-8 rounded-md bg-[#0B2545] px-3 text-xs font-medium text-white disabled:opacity-50"
              >
                {commit.isPending ? "Importing..." : "Commit selected data"}
              </button>
            </div>
          </div>
          {plan ? (
            <div
              className={`rounded-md border px-3 py-2 text-xs ${plan.ready ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}
            >
              {plan.ready
                ? "Import plan ready. Review your selection before committing."
                : plan.items.flatMap((item) => item.blockers).join(" ") ||
                  "The import plan contains blockers."}
            </div>
          ) : null}
          {batch ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-950">
              Import {humanize(batch.status)}: {batch.importedCount} imported, {batch.linkedCount}{" "}
              linked, {batch.blockedCount} blocked. Imported values remain CV-derived, not source
              verified.
            </div>
          ) : null}
        </div>
      ) : null}
    </WorkspaceSection>
  );
}

function ProvenanceLegend() {
  return (
    <div className="flex flex-wrap gap-1.5 text-[10px]">
      {(["admin_entered", "cv_extracted", "candidate_confirmed", "source_verified"] as const).map(
        (source) => (
          <span
            key={source}
            className="rounded-full border border-border bg-background px-2 py-1 text-muted-foreground"
          >
            {provenanceLabel(source)}
          </span>
        ),
      )}
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function SmallInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1 text-xs font-medium">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
      />
    </label>
  );
}

function StatusField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium text-foreground">{value}</div>
    </div>
  );
}

function claimStatusLabel(status: string) {
  return status === "admin_created_unclaimed"
    ? "Admin-created / unclaimed"
    : status === "activation_pending"
      ? "Activation pending"
      : status === "claimed"
        ? "Claimed / active"
        : humanize(status);
}

function provenanceLabel(source: string) {
  return source === "admin_entered"
    ? "Admin entered"
    : source === "cv_extracted"
      ? "Imported from CV"
      : source === "candidate_confirmed"
        ? "Candidate confirmed"
        : source === "source_verified"
          ? "Verified by source"
          : humanize(source);
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}
