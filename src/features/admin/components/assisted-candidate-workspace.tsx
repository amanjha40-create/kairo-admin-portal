import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, FileText, LockKeyhole, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { useAdminAccess } from "@/features/admin/auth/admin-access";
import {
  AssistedCareerEditor,
  CAREER_CLAIM_DEFINITIONS,
  type CareerFieldDefinition,
} from "@/features/admin/components/assisted-career-editor";
import { EmptyState } from "@/features/admin/components/states";
import { WorkspaceSection } from "@/features/admin/components/workspace-section";
import {
  adminOperationsKeys,
  assistedCareerRecordsQueryOptions,
  candidateCareerDocumentsQueryOptions,
  candidateDocumentsQueryOptions,
  createAdminOperationsAdapter,
  managedResumesQueryOptions,
  managedResumeStatusQueryOptions,
  managedCandidateQueryOptions,
  type ProfileMutationResult,
  type ProfileMutationInput,
  type CareerClaimType,
  type ResumeImportBatch,
  type ResumeImportAction,
  type ResumeParsedResult,
  type ResumeReviewPlan,
  type ResumeReviewSession,
} from "@/features/admin/data/admin-operations";
import { userKeys } from "@/features/admin/data/users";
import { getOperationError } from "@/features/admin/lib/operation-error";
import { hasPermission } from "@/features/admin/workflow/permissions";
import {
  getResumeReviewSummary,
  getResumeReviewUpdateInput,
  isImportableResumeClaimType,
  resumeReviewBlockerLabel,
} from "@/features/admin/workflow/resume-review";
import { ApiError } from "@/lib/api/errors";

export interface AssistedProfileInitialValues {
  fullName?: string;
  phone?: string;
  headline?: string;
  currentRole?: string;
  location?: string;
}

export function AssistedCandidateWorkspace({
  candidateId,
  initialProfile,
}: {
  candidateId: string;
  initialProfile?: AssistedProfileInitialValues;
}) {
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

  if (!canReadManagedStatus) {
    return (
      <WorkspaceSection
        title="Assisted operations"
        description="Admin-managed Candidate eligibility"
      >
        <EmptyState
          title="Assisted operations access is restricted"
          description="The create_person permission is required before managed-account eligibility can be checked. No assisted action is available."
        />
      </WorkspaceSection>
    );
  }
  if (candidateQuery.isPending) {
    return (
      <WorkspaceSection title="Assisted operations" description="Checking managed-account scope">
        <div className="h-20 animate-pulse rounded-md bg-muted" />
      </WorkspaceSection>
    );
  }
  if (candidateQuery.error instanceof ApiError && candidateQuery.error.status === 404) {
    return (
      <div className="space-y-4">
        <WorkspaceSection
          title="Assisted profile"
          description="Candidate-managed account boundaries"
        >
          <EmptyState
            title="Candidate-managed profile"
            description="Account activation remains Candidate-controlled. Authorized profile, Career, document, and CV review actions preserve Candidate confirmation and verified-field protections."
          />
        </WorkspaceSection>
        {canManageProfile ? (
          <>
            <div id="assisted-profile" className="scroll-mt-20">
              <AssistedCareerEditor
                candidateId={candidateId}
                onComplete={async () => {
                  await queryClient.invalidateQueries({ queryKey: userKeys.all() });
                }}
              />
            </div>
            <CandidateDocumentsWorkspace candidateId={candidateId} />
            <div id="cv-review" className="scroll-mt-20">
              <CvReviewWorkspace
                candidateId={candidateId}
                onComplete={async () => {
                  await queryClient.invalidateQueries({ queryKey: userKeys.all() });
                }}
              />
            </div>
          </>
        ) : null}
      </div>
    );
  }
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
      <div id="account-activation" className="scroll-mt-20">
        <WorkspaceSection
          title="Account activation"
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
      </div>

      {canManageProfile ? (
        <>
          <div id="assisted-profile" className="scroll-mt-20 space-y-4">
            <ProfileEditor
              candidateId={candidateId}
              initialProfile={initialProfile}
              onComplete={refresh}
            />
            <AssistedCareerEditor candidateId={candidateId} onComplete={refresh} />
          </div>
          <CandidateDocumentsWorkspace candidateId={candidateId} />
          <div id="cv-review" className="scroll-mt-20">
            <CvReviewWorkspace candidateId={candidateId} onComplete={refresh} />
          </div>
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
  const queryClient = useQueryClient();
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
  initialProfile,
  onComplete,
}: {
  candidateId: string;
  initialProfile?: AssistedProfileInitialValues;
  onComplete: () => Promise<void>;
}) {
  const adapter = useMemo(() => createAdminOperationsAdapter(), []);
  const [fullName, setFullName] = useState(initialProfile?.fullName ?? "");
  const [phone, setPhone] = useState(initialProfile?.phone ?? "");
  const [headline, setHeadline] = useState(initialProfile?.headline ?? "");
  const [currentRole, setCurrentRole] = useState(initialProfile?.currentRole ?? "");
  const [industry, setIndustry] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [location, setLocation] = useState(initialProfile?.location ?? "");
  const [locationCity, setLocationCity] = useState("");
  const [locationRegion, setLocationRegion] = useState("");
  const [locationCountry, setLocationCountry] = useState("");
  const [bio, setBio] = useState("");
  const [receipt, setReceipt] = useState<ProfileMutationResult | null>(null);
  const profileInput = (): ProfileMutationInput => {
    const input: ProfileMutationInput = { source: "admin_entered" };
    const addOptionalChange = (
      key: Exclude<keyof ProfileMutationInput, "fullName" | "yearsOfExperience" | "source">,
      value: string,
      initialValue = "",
    ) => {
      const next = value.trim();
      if (next !== initialValue.trim()) input[key] = next || null;
    };
    const nextFullName = fullName.trim();
    if (nextFullName && nextFullName !== (initialProfile?.fullName ?? "").trim()) {
      input.fullName = nextFullName;
    }
    addOptionalChange("phone", phone, initialProfile?.phone);
    addOptionalChange("headline", headline, initialProfile?.headline);
    addOptionalChange("currentRole", currentRole, initialProfile?.currentRole);
    addOptionalChange("industry", industry);
    addOptionalChange("location", location, initialProfile?.location);
    addOptionalChange("locationCity", locationCity);
    addOptionalChange("locationRegion", locationRegion);
    addOptionalChange("locationCountry", locationCountry.toUpperCase());
    addOptionalChange("bio", bio);
    if (yearsOfExperience.trim()) {
      input.yearsOfExperience = Number.parseInt(yearsOfExperience, 10);
    }
    return input;
  };
  const mutation = useMutation({
    mutationFn: () => adapter.updateProfile(candidateId, profileInput()),
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
  const hasValue = Object.keys(profileInput()).some((key) => key !== "source");
  return (
    <WorkspaceSection
      title="Assisted profile"
      description="Edit API42-supported profile fields with Admin-entered provenance"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <SmallInput label="Full name" value={fullName} onChange={setFullName} />
        <SmallInput label="Phone" value={phone} onChange={setPhone} />
        <SmallInput label="Headline" value={headline} onChange={setHeadline} />
        <SmallInput label="Current role" value={currentRole} onChange={setCurrentRole} />
        <SmallInput label="Industry" value={industry} onChange={setIndustry} />
        <SmallInput
          label="Years of experience"
          value={yearsOfExperience}
          onChange={setYearsOfExperience}
          type="number"
        />
        <SmallInput label="Location" value={location} onChange={setLocation} />
        <SmallInput label="City" value={locationCity} onChange={setLocationCity} />
        <SmallInput label="State / region" value={locationRegion} onChange={setLocationRegion} />
        <SmallInput
          label="Country code"
          value={locationCountry}
          onChange={(value) => setLocationCountry(value.slice(0, 2))}
        />
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
        <div className="space-y-1">
          <ProvenanceLegend />
          <p className="text-[11px] text-muted-foreground">
            Changes are recorded as Admin entered and are not source verified.
          </p>
        </div>
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

const CANDIDATE_DOCUMENT_TYPES = [
  ["other", "Other document"],
  ["address_proof", "Address proof"],
  ["government_id", "Government ID"],
  ["passport", "Passport"],
  ["driving_license", "Driving licence"],
  ["voter_id", "Voter ID"],
  ["birth_certificate", "Birth certificate"],
] as const;

const EMPLOYMENT_DOCUMENT_TYPES = [
  ["pay_stub", "Pay stub"],
  ["offer_letter", "Offer letter"],
  ["appointment_letter", "Appointment letter"],
  ["experience_letter", "Experience letter"],
  ["relieving_letter", "Relieving letter"],
  ["payslip", "Payslip"],
  ["employment_id_card", "Employment ID card"],
  ["contract", "Contract"],
  ["employment_contract", "Employment contract"],
  ["hr_letter", "HR letter"],
  ["bank_statement", "Bank statement"],
  ["form_w2", "Form W-2"],
  ["form_1099", "Form 1099"],
  ["other", "Other employment document"],
] as const;

const EDUCATION_DOCUMENT_TYPES = [
  ["degree_certificate", "Degree certificate"],
  ["passing_certificate", "Passing certificate"],
  ["provisional_certificate", "Provisional certificate"],
  ["transcript", "Transcript"],
  ["marksheet", "Marksheet"],
  ["migration_certificate", "Migration certificate"],
  ["admission_letter", "Admission letter"],
  ["enrollment_proof", "Enrollment proof"],
  ["other", "Other education document"],
] as const;

type CandidateDocumentScope = "identity" | "employment" | "education";

export function CandidateDocumentsWorkspace({ candidateId }: { candidateId: string }) {
  const adapter = useMemo(() => createAdminOperationsAdapter(), []);
  const queryClient = useQueryClient();
  const identityDocuments = useQuery(candidateDocumentsQueryOptions(candidateId));
  const employmentRecords = useQuery(assistedCareerRecordsQueryOptions(candidateId, "employment"));
  const educationRecords = useQuery(assistedCareerRecordsQueryOptions(candidateId, "education"));
  const [scope, setScope] = useState<CandidateDocumentScope>("identity");
  const [careerRecordId, setCareerRecordId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("other");
  const [evidenceRole, setEvidenceRole] = useState<"primary" | "supporting">("supporting");
  const careerClaimType = scope === "education" ? "education" : "employment";
  const careerRecords =
    scope === "education"
      ? (educationRecords.data?.items ?? [])
      : (employmentRecords.data?.items ?? []);
  const effectiveCareerRecordId =
    scope === "identity" ? "" : careerRecordId || careerRecords[0]?.recordId || "";
  const careerDocuments = useQuery(
    candidateCareerDocumentsQueryOptions(candidateId, careerClaimType, effectiveCareerRecordId),
  );
  const documentTypes =
    scope === "employment"
      ? EMPLOYMENT_DOCUMENT_TYPES
      : scope === "education"
        ? EDUCATION_DOCUMENT_TYPES
        : CANDIDATE_DOCUMENT_TYPES;
  const displayedDocuments =
    scope === "identity"
      ? (identityDocuments.data?.items ?? [])
      : (careerDocuments.data?.items ?? []);
  const documentsPending =
    scope === "identity" ? identityDocuments.isPending : careerDocuments.isPending;
  const documentsError = scope === "identity" ? identityDocuments.error : careerDocuments.error;
  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a document first.");
      if (scope === "identity") {
        return adapter.uploadDocument(candidateId, documentType, file);
      }
      if (!effectiveCareerRecordId) {
        throw new Error(`Add or choose an ${scope} record before uploading its document.`);
      }
      return adapter.uploadCareerDocument(candidateId, {
        claimType: scope,
        careerRecordId: effectiveCareerRecordId,
        documentType,
        evidenceRole: scope === "employment" ? evidenceRole : undefined,
        file,
      });
    },
    onSuccess: async () => {
      setFile(null);
      if (scope === "identity") {
        await queryClient.invalidateQueries({
          queryKey: adminOperationsKeys.documents(candidateId),
        });
      } else {
        await queryClient.invalidateQueries({
          queryKey: adminOperationsKeys.careerDocuments(
            candidateId,
            scope,
            effectiveCareerRecordId,
          ),
        });
      }
      toast.success("Private Candidate document uploaded");
    },
    onError: (error) =>
      toast.error(getOperationError(error, "The Candidate document could not be uploaded.")),
  });
  const view = useMutation({
    mutationFn: (input: {
      documentId: string;
      scope: CandidateDocumentScope;
      careerRecordId?: string;
    }) =>
      input.scope === "identity"
        ? adapter.viewDocument(candidateId, input.documentId)
        : adapter.viewCareerDocument(
            candidateId,
            input.scope,
            input.careerRecordId ?? "",
            input.documentId,
          ),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
    onError: (error) =>
      toast.error(getOperationError(error, "The private document could not be opened.")),
  });

  return (
    <div id="candidate-documents" className="scroll-mt-20">
      <WorkspaceSection
        title="Documents"
        description="Private Candidate files, optionally attached to an existing Career record without creating a verification case"
      >
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[170px_minmax(200px,1fr)_200px_minmax(220px,1fr)_auto] xl:items-end">
          <label className="space-y-1 text-xs font-medium">
            Association
            <select
              value={scope}
              onChange={(event) => {
                const next = event.target.value as CandidateDocumentScope;
                setScope(next);
                setCareerRecordId("");
                setDocumentType(
                  next === "employment"
                    ? EMPLOYMENT_DOCUMENT_TYPES[0][0]
                    : next === "education"
                      ? EDUCATION_DOCUMENT_TYPES[0][0]
                      : CANDIDATE_DOCUMENT_TYPES[0][0],
                );
              }}
              className="h-9 w-full rounded-md border border-border bg-background px-2"
            >
              <option value="identity">Candidate profile</option>
              <option value="employment">Employment record</option>
              <option value="education">Education record</option>
            </select>
          </label>
          {scope !== "identity" ? (
            <label className="space-y-1 text-xs font-medium">
              Career record
              <select
                value={effectiveCareerRecordId}
                onChange={(event) => setCareerRecordId(event.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-2"
              >
                {careerRecords.length === 0 ? (
                  <option value="">No {scope} record available</option>
                ) : (
                  careerRecords.map((record) => (
                    <option key={record.recordId} value={record.recordId}>
                      {careerDocumentRecordLabel(record.claimType, record.payload)}
                    </option>
                  ))
                )}
              </select>
            </label>
          ) : (
            <div className="hidden xl:block" />
          )}
          <label className="space-y-1 text-xs font-medium">
            Document type
            <select
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-2"
            >
              {documentTypes.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {scope === "employment" ? (
            <label className="space-y-1 text-xs font-medium xl:col-start-3">
              Evidence role
              <select
                value={evidenceRole}
                onChange={(event) =>
                  setEvidenceRole(event.target.value as "primary" | "supporting")
                }
                className="h-9 w-full rounded-md border border-border bg-background px-2"
              >
                <option value="supporting">Supporting</option>
                <option value="primary">Primary</option>
              </select>
            </label>
          ) : null}
          <label className="space-y-1 text-xs font-medium">
            File
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block h-9 w-full rounded-md border border-border bg-background px-2 py-1 text-xs file:border-0 file:bg-transparent"
            />
          </label>
          <ActionButton
            onClick={() => upload.mutate()}
            disabled={
              !file || upload.isPending || (scope !== "identity" && !effectiveCareerRecordId)
            }
          >
            <FileText className="size-3.5" />{" "}
            {upload.isPending ? "Uploading..." : "Upload document"}
          </ActionButton>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Files remain private and unverified. Career association does not submit a verification,
          share a file, or change the Career record&apos;s verification status. The canonical upload
          pipeline validates declared type, size, stored object metadata, and checksum; no dedicated
          malware-scanning service is currently configured.
        </p>
        {documentsPending ? (
          <p className="mt-3 text-xs text-muted-foreground">Loading private documents...</p>
        ) : documentsError ? (
          <p className="mt-3 text-xs text-destructive">
            {getOperationError(documentsError, "Private documents could not be loaded.")}
          </p>
        ) : displayedDocuments.length ? (
          <div className="mt-3 divide-y divide-border rounded-md border border-border">
            {displayedDocuments.map((document) => (
              <div
                key={document.id}
                className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{document.originalFilename}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {humanize(document.documentType)} · {formatBytes(document.byteSize)} ·{" "}
                    {humanize(document.verificationStatus)}
                    {"evidenceRole" in document && document.evidenceRole
                      ? ` · ${humanize(String(document.evidenceRole))}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    view.mutate({
                      documentId: document.id,
                      scope,
                      careerRecordId: effectiveCareerRecordId || undefined,
                    })
                  }
                  disabled={view.isPending}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 font-medium hover:bg-accent disabled:opacity-50"
                >
                  <ExternalLink className="size-3" /> Open
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            {scope === "identity"
              ? "No private Candidate profile documents yet."
              : effectiveCareerRecordId
                ? `No private documents are attached to this ${scope} record.`
                : `Add an ${scope} Career record before attaching a document.`}
          </p>
        )}
      </WorkspaceSection>
    </div>
  );
}

function careerDocumentRecordLabel(claimType: CareerClaimType, payload: Record<string, unknown>) {
  if (claimType === "employment") {
    return [payload.role_title, payload.company_name].filter(Boolean).join(" at ") || "Employment";
  }
  return [payload.degree, payload.institution_name].filter(Boolean).join(" at ") || "Education";
}

function CvReviewWorkspace({
  candidateId,
  onComplete,
}: {
  candidateId: string;
  onComplete: () => Promise<void>;
}) {
  const adapter = useMemo(() => createAdminOperationsAdapter(), []);
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ResumeParsedResult | null>(null);
  const [review, setReview] = useState<ResumeReviewSession | null>(null);
  const [plan, setPlan] = useState<ResumeReviewPlan | null>(null);
  const [batch, setBatch] = useState<ResumeImportBatch | null>(null);
  const [uploadPhase, setUploadPhase] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Record<string, unknown>>>({});
  const resumesQuery = useQuery(managedResumesQueryOptions(candidateId));
  const persistedResume = resumesQuery.data?.items[0];
  const activeResumeId = resumeId ?? persistedResume?.id ?? null;
  const statusQuery = useQuery({
    ...managedResumeStatusQueryOptions(candidateId, activeResumeId ?? "unavailable"),
    enabled: Boolean(activeResumeId),
  });
  const parsedQuery = useQuery({
    queryKey: [...adminOperationsKeys.resumes(candidateId), activeResumeId, "parsed-result"],
    queryFn: () => adapter.getParsedResume(candidateId, activeResumeId!),
    enabled: Boolean(activeResumeId) && statusQuery.data?.status === "needs_review",
    retry: false,
  });
  const reviewQuery = useQuery({
    queryKey: [...adminOperationsKeys.resumes(candidateId), activeResumeId, "review-session"],
    queryFn: () => adapter.getResumeReview(candidateId, activeResumeId!),
    enabled: Boolean(activeResumeId) && statusQuery.data?.status === "needs_review",
    retry: false,
  });
  const importQuery = useQuery({
    queryKey: [
      ...adminOperationsKeys.resumes(candidateId),
      activeResumeId,
      review?.id,
      "import-status",
    ],
    queryFn: () => adapter.getResumeImportStatus(candidateId, review!.id),
    enabled: Boolean(review?.id) && review?.status === "imported",
    retry: false,
  });

  useEffect(() => {
    if (parsedQuery.data) setParsed(parsedQuery.data);
  }, [parsedQuery.data]);

  useEffect(() => {
    if (!reviewQuery.data || review) return;
    setReview(reviewQuery.data);
    setDrafts(
      Object.fromEntries(
        reviewQuery.data.items.map((item) => [item.id, { ...item.editedPayload }]),
      ),
    );
  }, [review, reviewQuery.data]);

  useEffect(() => {
    if (importQuery.data) setBatch(importQuery.data);
  }, [importQuery.data]);

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a CV first.");
      setUploadPhase("Uploading CV to private storage");
      return adapter.uploadResume(candidateId, file);
    },
    onSuccess: async (receipt) => {
      setResumeId(receipt.resumeId);
      setParsed(null);
      setReview(null);
      setPlan(null);
      setBatch(null);
      setUploadPhase("Upload complete; parser job queued");
      await queryClient.invalidateQueries({ queryKey: adminOperationsKeys.resumes(candidateId) });
      toast.success("CV uploaded; parsing started");
    },
    onError: (error) => {
      setUploadPhase("Upload failed");
      toast.error(getOperationError(error, "The CV could not be processed."));
    },
  });
  const loadParsed = useMutation({
    mutationFn: async () => {
      if (!activeResumeId) throw new Error("Upload a CV first.");
      return adapter.getParsedResume(candidateId, activeResumeId);
    },
    onSuccess: setParsed,
    onError: (error) =>
      toast.error(getOperationError(error, "The parsed CV draft is not ready yet.")),
  });
  const createReview = useMutation({
    mutationFn: async () => {
      if (!activeResumeId) throw new Error("Upload a CV first.");
      return adapter.createResumeReview(candidateId, activeResumeId);
    },
    onSuccess: (session) => {
      setReview(session);
      setDrafts(
        Object.fromEntries(session.items.map((item) => [item.id, { ...item.editedPayload }])),
      );
    },
    onError: (error) => toast.error(getOperationError(error, "The CV review could not be opened.")),
  });
  const saveItem = useMutation({
    mutationFn: async (itemId: string) => {
      const item = review?.items.find((entry) => entry.id === itemId);
      if (!review || !item) throw new Error("Review item is unavailable.");
      return adapter.updateReviewItem(
        candidateId,
        review.id,
        item.id,
        getResumeReviewUpdateInput(item, drafts[item.id] ?? {}),
      );
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
      return adapter.importReview(candidateId, review.id, review.version, review.id);
    },
    onSuccess: async (result) => {
      setBatch(result);
      toast.success("Selected CV data imported with CV provenance");
      await onComplete();
    },
    onError: (error) =>
      toast.error(getOperationError(error, "The selected CV data could not be imported.")),
  });
  const reviewSummary = review ? getResumeReviewSummary(review.items, plan) : null;
  const planByItem = new Map((plan?.items ?? []).map((item) => [item.itemId, item] as const));

  return (
    <WorkspaceSection
      title="CV import"
      description="Review parser suggestions, then explicitly import selected drafts into Career"
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
          disabled={
            !activeResumeId || statusQuery.data?.status !== "needs_review" || loadParsed.isPending
          }
        >
          <RefreshCw className="size-3.5" /> Refresh parsed draft
        </ActionButton>
        <ActionButton
          onClick={() => createReview.mutate()}
          disabled={!parsed || Boolean(review) || createReview.isPending}
        >
          {review ? "Review loaded" : "Open review"}
        </ActionButton>
      </div>

      {uploadPhase ? (
        <div
          className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground"
          role="status"
        >
          {upload.isPending ? (
            <span className="size-2 animate-pulse rounded-full bg-[#0FA8A5]" />
          ) : null}
          {uploadPhase}
        </div>
      ) : null}

      {activeResumeId ? (
        <div className="mt-3 rounded-md border border-border bg-muted/20 p-3 text-xs">
          <div className="font-medium">
            CV processing:{" "}
            {humanize(statusQuery.data?.status ?? persistedResume?.processingStatus ?? "loading")}
          </div>
          <div className="mt-1 text-muted-foreground">
            {persistedResume?.originalFilename ?? "Uploaded CV"}. Processing state is loaded from
            the backend and survives refresh.
          </div>
          {statusQuery.data?.status === "failed" ? (
            <div className="mt-2 text-destructive">
              Parsing failed. Upload the file again or check the resume worker before retrying.
            </div>
          ) : null}
        </div>
      ) : resumesQuery.isPending ? (
        <p className="mt-3 text-xs text-muted-foreground">Checking previous CV uploads...</p>
      ) : null}

      {parsed ? (
        <div className="mt-3 rounded-md border border-border bg-muted/20 p-3 text-xs">
          <div className="font-medium">Parser status: {humanize(parsed.status)}</div>
          <div className="mt-1 text-muted-foreground">
            Schema {parsed.schemaVersion}; {parsed.warnings.length} warning(s). Parser output
            remains a draft and is not visible in Career until an Admin confirms the import.
          </div>
          {parsed.warnings.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-amber-800">
              {parsed.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {review ? (
        <div className="mt-4 space-y-3">
          {reviewSummary ? (
            <div className="grid gap-2 sm:grid-cols-5" aria-label="CV review summary">
              {[
                ["Detected", reviewSummary.detected],
                ["Selected", reviewSummary.selected],
                ["Excluded", reviewSummary.excluded],
                ["Needs attention", reviewSummary.blocked],
                ["Unsupported", reviewSummary.unsupported],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-md border border-border bg-muted/20 p-2 text-xs"
                >
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {label}
                  </div>
                  <div className="mt-1 text-base font-semibold">{value}</div>
                </div>
              ))}
            </div>
          ) : null}
          {plan && !plan.ready && plan.items.some((item) => item.blockers.length) ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
              <div className="font-medium">Items that need attention</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {plan.items
                  .filter((item) => item.blockers.length)
                  .map((item) => (
                    <a
                      key={item.itemId}
                      href={`#resume-review-${item.itemId}`}
                      className="rounded border border-amber-300 bg-white px-2 py-1 font-medium hover:bg-amber-100"
                    >
                      {humanize(item.claimType)}: {item.blockers.length}
                    </a>
                  ))}
              </div>
            </div>
          ) : null}
          {review.items.map((item) => {
            const importable = isImportableResumeClaimType(item.claimType);
            const itemPlan = planByItem.get(item.id);
            return (
              <div
                id={`resume-review-${item.id}`}
                key={item.id}
                className="scroll-mt-20 rounded-md border border-border bg-background p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={importable && item.selected}
                      disabled={!importable}
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
                {!importable ? (
                  <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-2 text-[11px] text-amber-900">
                    {item.claimType === "profile"
                      ? "Profile suggestions are reviewed in the Profile section and cannot be imported as Career records."
                      : "This parsed claim type is not supported for Career import. Its source payload remains visible for an honest review, but it must be excluded."}
                  </div>
                ) : null}
                {importable ? (
                  <ResumeClaimEditor
                    claimType={item.claimType}
                    payload={drafts[item.id] ?? item.editedPayload}
                    onChange={(payload) =>
                      setDrafts((current) => ({ ...current, [item.id]: payload }))
                    }
                  />
                ) : (
                  <ReadablePayload payload={item.editedPayload} />
                )}
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="space-y-1 text-[11px] font-medium">
                    Import decision
                    <select
                      value={importable ? item.importAction : "skip"}
                      disabled={!importable}
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
                      {importable ? <option value="create_new">Create new record</option> : null}
                      {importable ? (
                        <option value="link_existing">Link existing record</option>
                      ) : null}
                      {importable ? (
                        <option value="update_existing">Update existing record</option>
                      ) : null}
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
                      disabled={!importable || item.importAction === "skip"}
                    />
                  </label>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Duplicate assessment: {humanize(item.duplicateStatus)}. A distinct Employment
                  create decision is explicitly confirmed when saved.
                </p>
                {item.duplicateCandidates.length ? (
                  <details className="mt-2 text-[11px] text-muted-foreground">
                    <summary className="cursor-pointer font-medium">
                      {item.duplicateCandidates.length} possible existing match(es)
                    </summary>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {item.duplicateCandidates.map((candidate, index) => (
                        <ReadablePayload
                          key={String(candidate.id ?? index)}
                          payload={candidate}
                          compact
                        />
                      ))}
                    </div>
                  </details>
                ) : null}
                {item.conflictWarnings.length ? (
                  <p className="mt-2 text-[11px] text-amber-700">
                    {item.conflictWarnings.join(" ")}
                  </p>
                ) : null}
                {itemPlan?.blockers.length ? (
                  <ul className="mt-2 list-disc space-y-1 rounded border border-amber-200 bg-amber-50 px-6 py-2 text-[11px] text-amber-900">
                    {itemPlan.blockers.map((blocker) => (
                      <li key={blocker}>{resumeReviewBlockerLabel(blocker)}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  {importable ? (
                    <button
                      type="button"
                      onClick={() =>
                        setReview((current) =>
                          current
                            ? {
                                ...current,
                                items: current.items.map((entry) =>
                                  entry.id === item.id
                                    ? {
                                        ...entry,
                                        selected: !entry.selected,
                                        importAction: entry.selected ? "skip" : "create_new",
                                      }
                                    : entry,
                                ),
                              }
                            : current,
                        )
                      }
                      className="h-7 rounded-md border border-border px-2 text-[11px] font-medium hover:bg-accent"
                    >
                      {item.selected && item.importAction !== "skip" ? "Exclude" : "Restore"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => saveItem.mutate(item.id)}
                    disabled={saveItem.isPending}
                    className="h-7 rounded-md border border-border px-2 text-[11px] font-medium hover:bg-accent"
                  >
                    {importable ? "Save and confirm" : "Confirm unsupported exclusion"}
                  </button>
                </div>
              </div>
            );
          })}
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
                {commit.isPending ? "Importing..." : "Import selected data into Career"}
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
              verified, and this action does not publish, share, or verify them.
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

function ResumeClaimEditor({
  claimType,
  payload,
  onChange,
}: {
  claimType: string;
  payload: Record<string, unknown>;
  onChange: (payload: Record<string, unknown>) => void;
}) {
  const definition = CAREER_CLAIM_DEFINITIONS[claimType as CareerClaimType];
  if (!definition) return <ReadablePayload payload={payload} />;
  const known = new Set(definition.fields.map((field) => field.key));
  const additional = Object.fromEntries(
    Object.entries(payload).filter(([key]) => key !== "claim_type" && !known.has(key)),
  );
  const update = (field: CareerFieldDefinition, value: string | boolean) => {
    const next = { ...payload };
    if (field.type === "checkbox") next[field.key] = Boolean(value);
    else if (field.type === "tags") {
      next[field.key] = String(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    } else next[field.key] = value === "" && field.nullable ? null : value;
    onChange(next);
  };
  return (
    <div className="mt-3 space-y-3 rounded-md border border-border bg-muted/10 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {definition.fields.map((field) => (
          <ResumeClaimField
            key={field.key}
            field={field}
            value={payload[field.key]}
            onChange={(value) => update(field, value)}
          />
        ))}
      </div>
      {Object.keys(additional).length ? (
        <details className="text-[11px] text-muted-foreground">
          <summary className="cursor-pointer font-medium">Additional extracted details</summary>
          <ReadablePayload payload={additional} compact />
        </details>
      ) : null}
    </div>
  );
}

function ResumeClaimField({
  field,
  value,
  onChange,
}: {
  field: CareerFieldDefinition;
  value: unknown;
  onChange: (value: string | boolean) => void;
}) {
  const className = `space-y-1 text-[11px] font-medium ${field.wide ? "sm:col-span-2" : ""}`;
  if (field.type === "checkbox") {
    return (
      <label
        className={`flex items-center gap-2 rounded-md border border-border px-3 py-2 ${field.wide ? "sm:col-span-2" : ""}`}
      >
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        {field.label}
      </label>
    );
  }
  if (field.type === "select") {
    return (
      <label className={className}>
        {field.label}
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full rounded-md border border-border bg-background px-2"
        >
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  const textValue = Array.isArray(value)
    ? value.join(", ")
    : value === null || value === undefined
      ? ""
      : String(value);
  return (
    <label className={className}>
      {field.label}
      {field.required ? " *" : ""}
      {field.type === "textarea" ? (
        <textarea
          value={textValue}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      ) : (
        <input
          type={field.type === "url" ? "url" : "text"}
          inputMode={field.type === "date" ? "numeric" : undefined}
          placeholder={field.type === "date" ? "YYYY, YYYY-MM, or YYYY-MM-DD" : undefined}
          value={textValue}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
        />
      )}
    </label>
  );
}

function ReadablePayload({
  payload,
  compact = false,
}: {
  payload: Record<string, unknown>;
  compact?: boolean;
}) {
  const entries = Object.entries(payload).filter(
    ([key, value]) => key !== "claim_type" && value !== null && value !== "",
  );
  return (
    <dl className={`grid gap-2 ${compact ? "mt-2" : "mt-3 sm:grid-cols-2"}`}>
      {entries.map(([key, value]) => (
        <div key={key} className="rounded border border-border bg-muted/20 px-2 py-1.5">
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {humanize(key)}
          </dt>
          <dd className="mt-0.5 break-words text-[11px] text-foreground">
            {typeof value === "object" ? JSON.stringify(value) : String(value)}
          </dd>
        </div>
      ))}
    </dl>
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
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
}) {
  return (
    <label className="space-y-1 text-xs font-medium">
      {label}
      <input
        type={type}
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

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
