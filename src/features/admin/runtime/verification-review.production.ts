import { queryOptions } from "@tanstack/react-query";
import { appEnv, type AppEnvConfig } from "@/config/env";
import type { ProductionAdminApiOptions } from "@/features/admin/data/admin-api";
import { createAdminAuthenticatedApi } from "@/features/admin/data/admin-api";
import type { Priority, VerificationStatus } from "@/features/admin/data/types";

export type VerificationType =
  "employment" | "education" | "certification" | "identity" | "platform" | "reference";

export type OrganizationStatus = "resolved" | "suggested_match" | "unresolved" | "duplicate_review";

export type SlaState = "within" | "approaching" | "breached";

export type OutreachStatus = "not_started" | "sent" | "bounced" | "responded";

export type AttentionFlag =
  | "document_mismatch"
  | "missing_evidence"
  | "contact_unverified"
  | "possible_duplicate"
  | "email_bounced"
  | "previous_correction"
  | "risk_review_required";

export type Assignee = string;

export const ALL_ASSIGNEES: Assignee[] = ["Unassigned"];

export interface VerificationCase {
  id: string;
  reference: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidateAvatarInitials: string;
  organizationId: string;
  organizationName: string;
  roleOrProgram: string;
  verificationType: VerificationType;
  status: VerificationStatus;
  priority: Priority;
  submittedAt: string;
  updatedAt: string;
  assignedReviewer: Assignee;
  evidenceCount: number;
  organizationStatus: OrganizationStatus;
  slaState: SlaState;
  attentionFlags: AttentionFlag[];
  outreachStatus: OutreachStatus;
  correctionCount: number;
  lastActivitySummary: string;
}

export const VERIFICATION_TYPE_LABEL: Record<VerificationType, string> = {
  employment: "Employment",
  education: "Education",
  certification: "Certification",
  identity: "Identity",
  platform: "Platform",
  reference: "Reference",
};

export const ORGANIZATION_STATUS_LABEL: Record<OrganizationStatus, string> = {
  resolved: "Resolved",
  suggested_match: "Suggested match",
  unresolved: "Unresolved",
  duplicate_review: "Duplicate review",
};

export const SLA_LABEL: Record<SlaState, string> = {
  within: "Within SLA",
  approaching: "Approaching SLA",
  breached: "Breached SLA",
};

export const ATTENTION_FLAG_LABEL: Record<AttentionFlag, string> = {
  document_mismatch: "Document mismatch",
  missing_evidence: "Missing evidence",
  contact_unverified: "Contact unverified",
  possible_duplicate: "Possible duplicate",
  email_bounced: "Email bounced",
  previous_correction: "Previous correction",
  risk_review_required: "Risk review required",
};

export const COMPLETED_STATUSES: VerificationStatus[] = [
  "verified",
  "rejected",
  "unable_to_verify",
];

export type ClaimFieldSource = "candidate" | "kairo_derived" | "verifier_confirmed";

export const CLAIM_SOURCE_LABEL: Record<ClaimFieldSource, string> = {
  candidate: "Provided by candidate",
  kairo_derived: "Matched by Kairo",
  verifier_confirmed: "Confirmed by verifier",
};

export interface ClaimField {
  key: string;
  label: string;
  value: string;
  source: ClaimFieldSource;
  note?: string;
}

export interface VerificationClaim {
  type: VerificationType;
  headline: string;
  createdAt: string;
  claimSource: string;
  fields: ClaimField[];
}

export type EvidenceDocType =
  | "offer_letter"
  | "appointment_letter"
  | "experience_letter"
  | "relieving_letter"
  | "payslip"
  | "employee_id"
  | "bank_statement"
  | "tax_document"
  | "degree_certificate"
  | "mark_sheet"
  | "certification_document"
  | "government_id"
  | "platform_screenshot"
  | "reference_letter"
  | "other";

export const EVIDENCE_DOC_LABEL: Record<EvidenceDocType, string> = {
  offer_letter: "Offer letter",
  appointment_letter: "Appointment letter",
  experience_letter: "Experience letter",
  relieving_letter: "Relieving letter",
  payslip: "Payslip",
  employee_id: "Employee ID",
  bank_statement: "Bank statement",
  tax_document: "Tax document",
  degree_certificate: "Degree certificate",
  mark_sheet: "Mark sheet",
  certification_document: "Certification document",
  government_id: "Government identity document",
  platform_screenshot: "Platform screenshot",
  reference_letter: "Reference letter",
  other: "Other supporting evidence",
};

export type EvidenceProcessingState = "uploaded" | "processing" | "processed" | "failed";
export type EvidenceReviewState =
  "not_reviewed" | "reviewed" | "needs_attention" | "unsupported" | "duplicate";
export type ComparisonResult =
  "match" | "partial_match" | "mismatch" | "not_found" | "not_applicable";

export interface EvidenceComparison {
  field: string;
  claimed: string;
  evidence: string;
  result: ComparisonResult;
}

export interface EvidenceExtraction {
  detectedCandidateName?: string;
  detectedOrganization?: string;
  detectedDates?: string[];
  extractedFields: { label: string; value: string; confidence: number }[];
  mismatchWarnings?: string[];
  reviewerNotes?: string;
  processingDetails?: string;
}

export interface EvidenceItem {
  id: string;
  title: string;
  docType: EvidenceDocType;
  filename: string;
  uploadedAt: string;
  source: "candidate_upload" | "verifier_upload" | "admin_upload";
  fileSizeBytes: number;
  pageCount?: number;
  processingStatus: EvidenceProcessingState;
  reviewStatus: EvidenceReviewState;
  extractionSummary?: string;
  attentionFlags: AttentionFlag[];
  candidateNote?: string;
  extraction?: EvidenceExtraction;
  comparisons?: EvidenceComparison[];
  downloadUrl?: string | null;
}

export interface OrganizationSuggestion {
  id: string;
  name: string;
  domain?: string;
  country?: string;
  confidence: number;
  reason: string;
}

export interface OrganizationResolution {
  candidateEntered: string;
  matched?: {
    id: string;
    canonicalName: string;
    domain?: string;
    website?: string;
    country?: string;
    orgType?: string;
    matchConfidence: number;
    matchReason: string;
    knownChannels: string[];
  };
  state: OrganizationStatus;
  duplicateWarning?: string;
  suggestions: OrganizationSuggestion[];
}

export type ContactState =
  | "unverified"
  | "approved"
  | "previously_successful"
  | "bounced"
  | "inactive"
  | "rejected"
  | "needs_review";

export type ContactSource =
  | "candidate_provided"
  | "organization_registry"
  | "previous_successful_verification"
  | "domain_discovery"
  | "manual_admin_entry";

export const CONTACT_SOURCE_LABEL: Record<ContactSource, string> = {
  candidate_provided: "Candidate provided",
  organization_registry: "Organization registry",
  previous_successful_verification: "Previous successful verification",
  domain_discovery: "Domain discovery",
  manual_admin_entry: "Manual admin entry",
};

export const CONTACT_STATE_LABEL: Record<ContactState, string> = {
  unverified: "Unverified",
  approved: "Approved",
  previously_successful: "Previously successful",
  bounced: "Bounced",
  inactive: "Inactive",
  rejected: "Rejected",
  needs_review: "Needs review",
};

export interface VerificationContact {
  id: string;
  name: string;
  role: string;
  organization: string;
  emailMasked: string;
  phoneMasked?: string;
  source: ContactSource;
  state: ContactState;
  confidence: number;
  lastSuccessfulUse?: string;
  bounceCount: number;
  outreachEligible: boolean;
  internalApprovalStatus: "not_started" | "pending" | "approved" | "rejected";
}

export type CommunicationChannel = "email" | "sms" | "internal" | "webhook";
export type CommunicationState =
  | "prepared"
  | "queued"
  | "sent"
  | "delivered"
  | "opened"
  | "acted"
  | "bounced"
  | "failed"
  | "suppressed";

export const COMMUNICATION_STATE_LABEL: Record<CommunicationState, string> = {
  prepared: "Prepared",
  queued: "Queued",
  sent: "Sent",
  delivered: "Delivered",
  opened: "Opened",
  acted: "Acted",
  bounced: "Bounced",
  failed: "Failed",
  suppressed: "Suppressed",
};

export interface CommunicationEvent {
  id: string;
  channel: CommunicationChannel;
  recipientDisplay: string;
  template: string;
  state: CommunicationState;
  at: string;
  actor: string;
  failureReason?: string;
  relatedContactId?: string;
}

export type CorrectionState =
  "requested" | "viewed" | "in_progress" | "resubmitted" | "resolved" | "closed";

export const CORRECTION_STATE_LABEL: Record<CorrectionState, string> = {
  requested: "Requested",
  viewed: "Viewed",
  in_progress: "In progress",
  resubmitted: "Resubmitted",
  resolved: "Resolved",
  closed: "Closed",
};

export interface CorrectionRequest {
  id: string;
  requestedBy: string;
  requestedAt: string;
  reason: string;
  fields: string[];
  state: CorrectionState;
  candidateResponse?: string;
  respondedAt?: string;
  attachmentsAdded: number;
  reviewOutcome?: string;
}

export type NoteCategory =
  "general" | "evidence" | "organization" | "contact" | "risk" | "decision_preparation";

export const NOTE_CATEGORY_LABEL: Record<NoteCategory, string> = {
  general: "General",
  evidence: "Evidence",
  organization: "Organization",
  contact: "Contact",
  risk: "Risk",
  decision_preparation: "Decision preparation",
};

export interface InternalNote {
  id: string;
  author: string;
  role: string;
  at: string;
  body: string;
  category: NoteCategory;
  sessionOnly?: boolean;
}

export type AttentionFlagState = "open" | "acknowledged" | "resolved";
export type AttentionSeverity = "low" | "medium" | "high";

export interface AttentionFlagRecord {
  id: string;
  flag: AttentionFlag;
  label: string;
  severity: AttentionSeverity;
  reason: string;
  createdAt: string;
  source: "system" | "admin" | "employer" | "candidate";
  state: AttentionFlagState;
}

export interface CandidateCaseSummary {
  candidateId: string;
  name: string;
  email: string;
  phoneMasked: string;
  profileType: string;
  signupAt: string;
  onboardingState: string;
  profileCompletionPct: number;
  trustScore: number;
  trustPassportStatus: "not_issued" | "provisional" | "issued" | "revoked";
  employmentRecordCount: number;
  previousVerificationCount: number;
  lastActiveAt: string;
  accountStatus: "active" | "suspended" | "closed";
  riskFlags: string[];
}

export type TimelineEventKind =
  | "case_created"
  | "candidate_submitted"
  | "evidence_uploaded"
  | "processing_result"
  | "assignment_changed"
  | "priority_changed"
  | "organization_match"
  | "contact_approved"
  | "outreach_event"
  | "correction_requested"
  | "candidate_resubmitted"
  | "internal_note_added"
  | "attention_flag_created"
  | "attention_flag_acknowledged"
  | "employer_response"
  | "decision_prepared";

export type ActorSource = "candidate" | "admin" | "employer" | "system" | "integration";

export interface CaseTimelineEvent {
  id: string;
  kind: TimelineEventKind;
  actor: string;
  actorSource: ActorSource;
  at: string;
  description: string;
  relatedEntity?: string;
  metadata?: Record<string, string | number>;
  sessionOnly?: boolean;
}

export interface CaseStatusMeta {
  description: string;
  stage: string;
  slaTargetHours: number;
  nextExpectedAction: string;
}

export interface VerificationCaseDetail {
  summary: VerificationCase;
  claim: VerificationClaim;
  candidate: CandidateCaseSummary;
  evidence: EvidenceItem[];
  organization: OrganizationResolution;
  contacts: VerificationContact[];
  communications: CommunicationEvent[];
  corrections: CorrectionRequest[];
  notes: InternalNote[];
  flags: AttentionFlagRecord[];
  timeline: CaseTimelineEvent[];
  statusMeta: CaseStatusMeta;
}

interface BackendReviewerSummary {
  user_id: string;
  full_name: string | null;
  email: string;
  role: string;
}

interface BackendVerificationRequestResponse {
  public_id: string;
  employment_id?: string | null;
  organization_public_id?: string | null;
  subject_name: string;
  subject_email: string;
  target_organization_name?: string | null;
  target_organization_email?: string | null;
  request_type: string;
  status: string;
  priority: Priority;
  created_at: string;
  updated_at: string;
  candidate_response?: string | null;
  candidate_response_submitted_at?: string | null;
  accepted_at?: string | null;
  employment_claim?: {
    employer_name?: string | null;
    role?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    employment_type?: string | null;
    work_location_country?: string | null;
    work_location_region?: string | null;
  } | null;
  evidence_summary?: {
    total_items: number;
  } | null;
  assigned_reviewer?: BackendReviewerSummary | null;
  organization_summary?: {
    public_id: string;
    name: string;
    organization_type: string;
    verification_state: string;
  } | null;
  review_status?: string | null;
}

interface BackendAdminReviewQueueResponse {
  items: BackendVerificationRequestResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  offset: number;
  limit: number;
}

interface BackendAdminReviewEvidenceResponse {
  public_id: string;
  evidence_type: string;
  field_key: string;
  value?: Record<string, unknown> | null;
  status: string;
  created_at: string;
  updated_at: string;
  document_type?: string | null;
  original_filename?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  upload_status?: string | null;
}

interface BackendAdminVerificationContactResponse {
  public_id: string;
  contact_name?: string | null;
  contact_email: string;
  contact_role?: string | null;
  contact_type: string;
  candidate_note?: string | null;
  review_status: string;
  review_notes?: string | null;
  reviewed_by_user_id?: string | null;
  reviewed_at?: string | null;
  superseded_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface BackendAdminReviewCycleResponse {
  public_id: string;
  review_round: number;
  review_status: string;
  assigned_reviewer_user_id?: string | null;
  assigned_by_user_id?: string | null;
  assigned_at?: string | null;
  decision_by_user_id?: string | null;
  decision_at?: string | null;
  decision_summary?: string | null;
  created_at: string;
  updated_at: string;
}

interface BackendVerificationRequestCorrectionResponse {
  public_id: string;
  evidence_public_id?: string | null;
  field_key: string;
  request_text: string;
  guidance: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
}

interface BackendAdminReviewInternalNoteResponse {
  public_id: string;
  review_public_id: string;
  author_user_id?: string | null;
  body: string;
  note_type: string;
  visibility: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface BackendAdminReviewDetailResponse {
  request: BackendVerificationRequestResponse;
  employer_verification_public_id?: string | null;
  employment?: {
    id: string;
    subject_full_name: string;
    subject_email?: string | null;
    employer_legal_name: string;
    employer_trade_name?: string | null;
    job_title: string;
    employment_type: string;
    start_date: string;
    end_date?: string | null;
    work_location_country?: string | null;
    work_location_region?: string | null;
    verification_status: string;
    submitted_at?: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  verification_contact?: BackendAdminVerificationContactResponse | null;
  verification_contact_history?: BackendAdminVerificationContactResponse[];
  evidence: BackendAdminReviewEvidenceResponse[];
  reviews: BackendAdminReviewCycleResponse[];
  open_corrections: BackendVerificationRequestCorrectionResponse[];
  internal_notes?: BackendAdminReviewInternalNoteResponse[];
  organization_resolution?: {
    status: string;
    organization_public_id?: string | null;
    organization_name?: string | null;
  };
  registry_resolution?: {
    status: string;
    registry_record_public_id?: string | null;
    registry_code?: string | null;
    registry_name?: string | null;
    resolution_method?: string | null;
    resolution_confidence?: number | null;
    resolution_metadata: Record<string, unknown>;
  };
}

interface BackendTimelineEvent {
  public_id: string;
  event_type: string;
  event_source: string;
  actor_user_id?: string | null;
  actor_display_name?: string | null;
  previous_status?: string | null;
  new_status?: string | null;
  message?: string | null;
  metadata_payload?: Record<string, unknown> | null;
  created_at: string;
}

interface BackendTimelineResponse {
  timeline: {
    items: BackendTimelineEvent[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

interface BackendEvidenceDownloadResponse {
  evidence_public_id: string;
  download_url: string;
  expires_in_seconds: number;
}

interface BackendWorkflowEnvelope {
  request: BackendVerificationRequestResponse;
  review: BackendAdminReviewCycleResponse;
}

export interface VerificationReviewAdapter {
  mode: "demo" | "production";
  listCases: () => Promise<VerificationCase[]>;
  getCaseDetail: (caseId: string) => Promise<VerificationCaseDetail | undefined>;
  getEvidenceDownloadUrl: (caseId: string, evidenceId: string) => Promise<string | null>;
  assignCase: (caseId: string, assigneeUserId: string) => Promise<void>;
  addNote: (caseId: string, body: string) => Promise<void>;
  changePriority: (caseId: string, priority: Priority) => Promise<void>;
  requestCorrections: (
    caseId: string,
    payload: {
      corrections: Array<{
        evidence_public_id?: string;
        field_key: string;
        request_text: string;
        guidance?: Record<string, unknown>;
      }>;
    },
  ) => Promise<void>;
  approveCase: (caseId: string, decisionSummary: string) => Promise<void>;
  rejectCase: (caseId: string, decisionSummary: string) => Promise<void>;
  markUnableToVerify: (caseId: string, decisionSummary: string) => Promise<void>;
  recordClarificationResponse: (caseId: string, response: string) => Promise<void>;
}

export interface CreateVerificationReviewAdapterOptions {
  production?: ProductionAdminApiOptions;
}

export const verificationReviewKeys = {
  all: () => ["admin", "verification-review"] as const,
  list: (mode: "demo" | "production") => [...verificationReviewKeys.all(), "list", mode] as const,
  detail: (mode: "demo" | "production", caseId: string) =>
    [...verificationReviewKeys.all(), "detail", mode, caseId] as const,
};

export function createVerificationReviewAdapter(
  config: AppEnvConfig = appEnv,
  options: CreateVerificationReviewAdapterOptions = {},
): VerificationReviewAdapter {
  const api = createAdminAuthenticatedApi(config, options.production);

  return {
    mode: "production",
    async listCases() {
      const data = await api.request<BackendAdminReviewQueueResponse>(
        "/api/v1/admin/verification-requests/queue?page=1&page_size=250",
      );
      return data.items.map(mapQueueItemToCase);
    },
    async getCaseDetail(caseId) {
      const detail = await api.request<BackendAdminReviewDetailResponse>(
        `/api/v1/admin/verification-requests/${caseId}`,
      );
      const timeline = await api.request<BackendTimelineResponse>(
        `/api/v1/admin/verification-requests/${caseId}/timeline?page=1&page_size=250`,
      );
      return mapDetailResponse(detail, timeline.timeline.items);
    },
    async getEvidenceDownloadUrl(caseId, evidenceId) {
      const data = await api.request<BackendEvidenceDownloadResponse>(
        `/api/v1/admin/verification-requests/${caseId}/evidence/${evidenceId}/download-url`,
      );
      return data.download_url ?? null;
    },
    async assignCase(caseId, assigneeUserId) {
      await api.request<BackendWorkflowEnvelope>(
        `/api/v1/admin/verification-requests/${caseId}/assign`,
        {
          method: "POST",
          body: {
            assignee_user_id: assigneeUserId,
          },
        },
      );
    },
    async addNote(caseId, body) {
      await api.request(`/api/v1/admin/verification-requests/${caseId}/notes`, {
        method: "POST",
        body: {
          body,
          note_type: "review_note",
          visibility: "internal",
          metadata: {},
        },
      });
    },
    async changePriority(caseId, priority) {
      await api.request(`/api/v1/admin/verification-requests/${caseId}/priority`, {
        method: "POST",
        body: { priority },
      });
    },
    async requestCorrections(caseId, payload) {
      await api.request(`/api/v1/admin/verification-requests/${caseId}/request-corrections`, {
        method: "POST",
        body: payload,
      });
    },
    async approveCase(caseId, decisionSummary) {
      await api.request(`/api/v1/admin/verification-requests/${caseId}/approve`, {
        method: "POST",
        body: { decision_summary: decisionSummary },
      });
    },
    async rejectCase(caseId, decisionSummary) {
      await api.request(`/api/v1/admin/verification-requests/${caseId}/reject`, {
        method: "POST",
        body: { decision_summary: decisionSummary },
      });
    },
    async markUnableToVerify(caseId, decisionSummary) {
      await api.request(`/api/v1/admin/verification-requests/${caseId}/unable-to-verify`, {
        method: "POST",
        body: { decision_summary: decisionSummary },
      });
    },
    async recordClarificationResponse(caseId, response) {
      await api.request(
        `/api/v1/admin/verification-requests/${caseId}/record-clarification-response`,
        {
          method: "POST",
          body: { response },
        },
      );
    },
  };
}

export function verificationQueueQueryOptions(
  config: AppEnvConfig = appEnv,
  options: CreateVerificationReviewAdapterOptions = {},
) {
  const adapter = createVerificationReviewAdapter(config, options);
  return queryOptions({
    queryKey: verificationReviewKeys.list(adapter.mode),
    queryFn: () => adapter.listCases(),
  });
}

export function verificationCaseDetailQueryOptions(
  caseId: string,
  config: AppEnvConfig = appEnv,
  options: CreateVerificationReviewAdapterOptions = {},
) {
  const adapter = createVerificationReviewAdapter(config, options);
  return queryOptions({
    queryKey: verificationReviewKeys.detail(adapter.mode, caseId),
    queryFn: () => adapter.getCaseDetail(caseId),
  });
}

function mapQueueItemToCase(item: BackendVerificationRequestResponse): VerificationCase {
  const verificationType = mapVerificationType(item.request_type);
  const organizationName =
    item.organization_summary?.name ??
    item.target_organization_name ??
    item.employment_claim?.employer_name ??
    "Organization pending";
  const submittedAt = item.accepted_at ?? item.candidate_response_submitted_at ?? item.created_at;

  return {
    id: item.public_id,
    reference: buildCaseReference(item.public_id),
    candidateId: item.subject_email.toLowerCase(),
    candidateName: item.subject_name,
    candidateEmail: item.subject_email,
    candidateAvatarInitials: initialsFor(item.subject_name, item.subject_email),
    organizationId:
      item.organization_public_id ?? item.organization_summary?.public_id ?? item.public_id,
    organizationName,
    roleOrProgram: item.employment_claim?.role ?? VERIFICATION_TYPE_LABEL[verificationType],
    verificationType,
    status: mapBackendStatus(item.status),
    priority: item.priority ?? "normal",
    submittedAt,
    updatedAt: item.updated_at,
    assignedReviewer: formatAssignee(item.assigned_reviewer),
    evidenceCount: item.evidence_summary?.total_items ?? 0,
    organizationStatus: mapOrganizationStatus(item),
    slaState: deriveSlaState(submittedAt),
    attentionFlags: deriveAttentionFlags(item),
    outreachStatus: deriveOutreachStatus(item.status),
    correctionCount: item.status === "awaiting_subject_corrections" ? 1 : 0,
    lastActivitySummary: summarizeCaseActivity(item),
  };
}

function mapDetailResponse(
  detail: BackendAdminReviewDetailResponse,
  timelineItems: BackendTimelineEvent[],
): VerificationCaseDetail {
  const summary = mapQueueItemToCase(detail.request);
  const claim = mapClaim(detail);
  const latestContact =
    detail.verification_contact ?? detail.verification_contact_history?.[0] ?? null;
  const evidence = detail.evidence.map((item) => mapEvidence(item, claim.fields));
  const timeline = timelineItems.map(mapTimelineEvent);
  const corrections = detail.open_corrections.map((item) => mapCorrection(item, claim.fields));
  const notes = (detail.internal_notes ?? []).map((note) => ({
    id: note.public_id,
    author: note.author_user_id ? "Kairo reviewer" : "System",
    role: "Reviewer",
    at: note.created_at,
    body: note.body,
    category: "general" as NoteCategory,
  }));

  return {
    summary,
    claim,
    candidate: {
      candidateId: summary.candidateId,
      name: summary.candidateName,
      email: summary.candidateEmail,
      phoneMasked: "Hidden",
      profileType: summary.verificationType === "identity" ? "Individual" : "Professional",
      signupAt: detail.request.created_at,
      onboardingState: "Complete",
      profileCompletionPct: 100,
      trustScore: 0,
      trustPassportStatus: "not_issued",
      employmentRecordCount: detail.employment ? 1 : 0,
      previousVerificationCount: 0,
      lastActiveAt: detail.request.updated_at,
      accountStatus: "active",
      riskFlags: [],
    },
    evidence,
    organization: {
      candidateEntered:
        detail.request.target_organization_name ??
        detail.request.employment_claim?.employer_name ??
        summary.organizationName,
      matched:
        detail.organization_resolution?.organization_public_id &&
        detail.organization_resolution.organization_name
          ? {
              id: detail.organization_resolution.organization_public_id,
              canonicalName: detail.organization_resolution.organization_name,
              matchConfidence: 1,
              matchReason: "Resolved by backend review workflow",
              knownChannels: [],
            }
          : undefined,
      state:
        detail.organization_resolution?.status === "resolved"
          ? "resolved"
          : mapOrganizationStatus(detail.request),
      suggestions: [],
    },
    contacts: latestContact ? [mapContact(latestContact, summary.organizationName)] : [],
    communications: [],
    corrections,
    notes,
    flags: deriveFlagRecords(summary.attentionFlags, detail.request.created_at),
    timeline,
    statusMeta: buildStatusMeta(summary.status),
  };
}

function mapClaim(detail: BackendAdminReviewDetailResponse): VerificationClaim {
  const requestType = mapVerificationType(detail.request.request_type);
  const employment = detail.employment;
  const employmentClaim = detail.request.employment_claim;

  if (requestType === "employment") {
    const employerName =
      employment?.employer_legal_name ??
      detail.request.target_organization_name ??
      employmentClaim?.employer_name ??
      "Organization pending";
    const role = employment?.job_title ?? employmentClaim?.role ?? "Employment verification";
    const fields: ClaimField[] = [
      {
        key: "candidate",
        label: "Candidate name",
        value: detail.request.subject_name,
        source: "candidate",
      },
      {
        key: "org",
        label: "Organization",
        value: employerName,
        source: "kairo_derived",
      },
      {
        key: "role",
        label: "Role / title",
        value: role,
        source: "candidate",
      },
    ];

    if (employment?.start_date ?? employmentClaim?.start_date) {
      fields.push({
        key: "startDate",
        label: "Start date",
        value: String(employment?.start_date ?? employmentClaim?.start_date),
        source: "candidate",
      });
    }
    if (employment?.end_date ?? employmentClaim?.end_date) {
      fields.push({
        key: "endDate",
        label: "End date",
        value: String(employment?.end_date ?? employmentClaim?.end_date),
        source: "candidate",
      });
    }

    return {
      type: "employment",
      headline: `${role} at ${employerName}`,
      createdAt: detail.request.created_at,
      claimSource: "Shared backend verification request",
      fields,
    };
  }

  return {
    type: requestType,
    headline: summaryLabelForType(requestType),
    createdAt: detail.request.created_at,
    claimSource: "Shared backend verification request",
    fields: [
      {
        key: "candidate",
        label: "Candidate name",
        value: detail.request.subject_name,
        source: "candidate",
      },
    ],
  };
}

function mapEvidence(item: BackendAdminReviewEvidenceResponse, fields: ClaimField[]): EvidenceItem {
  const matchingField = fields.find((field) => field.key === item.field_key);
  const downloadUrl = null;

  return {
    id: item.public_id,
    title: matchingField?.label ?? prettifyFieldKey(item.field_key),
    docType: mapEvidenceDocType(item.document_type ?? item.evidence_type),
    filename: item.original_filename ?? `${item.public_id}.pdf`,
    uploadedAt: item.created_at,
    source: "candidate_upload",
    fileSizeBytes: item.file_size ?? 0,
    processingStatus: mapProcessingStatus(item.upload_status),
    reviewStatus: mapEvidenceReviewStatus(item.status),
    extractionSummary: item.value ? JSON.stringify(item.value) : undefined,
    attentionFlags:
      mapEvidenceReviewStatus(item.status) === "needs_attention" ? ["document_mismatch"] : [],
    downloadUrl,
    extraction:
      item.value && Object.keys(item.value).length > 0
        ? {
            extractedFields: Object.entries(item.value).map(([key, value]) => ({
              label: prettifyFieldKey(key),
              value: String(value),
              confidence: 1,
            })),
          }
        : undefined,
  };
}

function mapCorrection(
  item: BackendVerificationRequestCorrectionResponse,
  fields: ClaimField[],
): CorrectionRequest {
  return {
    id: item.public_id,
    requestedBy: "Kairo reviewer",
    requestedAt: item.created_at,
    reason: item.request_text,
    fields: [
      fields.find((field) => field.key === item.field_key)?.label ??
        prettifyFieldKey(item.field_key),
    ],
    state: mapCorrectionState(item.status),
    candidateResponse: undefined,
    attachmentsAdded: item.evidence_public_id ? 1 : 0,
  };
}

function mapContact(
  contact: BackendAdminVerificationContactResponse,
  organizationName: string,
): VerificationContact {
  const state = mapContactState(contact.review_status);
  return {
    id: contact.public_id,
    name: contact.contact_name ?? "Verification contact",
    role: contact.contact_role ?? prettifyFieldKey(contact.contact_type),
    organization: organizationName,
    emailMasked: maskEmail(contact.contact_email),
    source: "candidate_provided",
    state,
    confidence: state === "approved" ? 1 : 0.7,
    bounceCount: 0,
    outreachEligible: state === "approved",
    internalApprovalStatus:
      state === "approved" ? "approved" : state === "rejected" ? "rejected" : "pending",
  };
}

function mapTimelineEvent(event: BackendTimelineEvent): CaseTimelineEvent {
  return {
    id: event.public_id,
    kind: mapTimelineKind(event.event_type),
    actor: event.actor_display_name ?? prettifyActorSource(event.event_source),
    actorSource: mapActorSource(event.event_source),
    at: event.created_at,
    description:
      event.message ??
      buildTimelineDescription(event.event_type, event.previous_status, event.new_status),
    metadata: narrowTimelineMetadata(event.metadata_payload),
  };
}

function buildCaseReference(publicId: string): string {
  return `KVR-${publicId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function initialsFor(name: string, email: string): string {
  const source = name.trim() || email.trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "KA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function mapVerificationType(value: string): VerificationType {
  switch (value) {
    case "education":
    case "certification":
    case "identity":
    case "platform":
    case "reference":
      return value;
    default:
      return "employment";
  }
}

export function mapBackendStatus(status: string): VerificationStatus {
  switch (status) {
    case "awaiting_subject_corrections":
      return "corrections_requested";
    case "pending_admin_re_review":
      return "resubmitted";
    case "pending_organization_resolution":
      return "awaiting_organization";
    case "approved_for_organization_verification":
    case "pending_organization_acceptance":
    case "in_progress":
      return "awaiting_employer";
    case "awaiting_information":
      return "clarification_requested";
    case "verified":
      return "verified";
    case "rejected":
      return "rejected";
    case "cancelled":
    case "expired":
      return "unable_to_verify";
    default:
      return "pending_review";
  }
}

function deriveSlaState(submittedAt: string): SlaState {
  const ageHours = Math.max(0, (Date.now() - new Date(submittedAt).getTime()) / 3_600_000);
  if (ageHours >= 72) return "breached";
  if (ageHours >= 48) return "approaching";
  return "within";
}

function mapOrganizationStatus(item: BackendVerificationRequestResponse): OrganizationStatus {
  const state = item.organization_summary?.verification_state ?? "";
  if (state === "verified" || item.organization_public_id) return "resolved";
  return item.status === "pending_organization_resolution" ? "unresolved" : "resolved";
}

function deriveAttentionFlags(item: BackendVerificationRequestResponse): AttentionFlag[] {
  const flags = new Set<AttentionFlag>();
  if ((item.evidence_summary?.total_items ?? 0) === 0) flags.add("missing_evidence");
  if (item.status === "awaiting_subject_corrections" || item.status === "pending_admin_re_review") {
    flags.add("previous_correction");
  }
  if (item.review_status?.includes("contact")) flags.add("contact_unverified");
  if (item.status === "pending_organization_resolution") flags.add("possible_duplicate");
  return [...flags];
}

function deriveOutreachStatus(status: string): OutreachStatus {
  if (status === "in_progress" || status === "pending_organization_acceptance") return "sent";
  return "not_started";
}

function summarizeCaseActivity(item: BackendVerificationRequestResponse): string {
  switch (item.status) {
    case "awaiting_subject_corrections":
      return "Correction requested from candidate";
    case "pending_admin_re_review":
      return "Candidate resubmitted information";
    case "pending_organization_resolution":
      return "Organization resolution required";
    case "approved_for_organization_verification":
    case "pending_organization_acceptance":
    case "in_progress":
      return "Employer verification is in progress";
    case "verified":
      return "Verification completed";
    case "rejected":
      return "Verification rejected";
    default:
      return "Awaiting admin review";
  }
}

function buildStatusMeta(status: VerificationStatus): CaseStatusMeta {
  const nextByStatus: Record<VerificationStatus, string> = {
    pending_review: "Admin must review evidence.",
    corrections_requested: "Candidate must submit corrections.",
    resubmitted: "Admin must review the resubmission.",
    awaiting_organization: "Organization resolution is required.",
    awaiting_employer: "Employer verification is in progress.",
    clarification_requested: "Clarification response is pending.",
    verified: "Case is complete.",
    rejected: "Case is complete.",
    failed_outreach: "Outreach requires attention.",
    unable_to_verify: "Case is complete.",
  };

  return {
    description: nextByStatus[status],
    stage: VERIFICATION_TYPE_LABEL.employment,
    slaTargetHours: 72,
    nextExpectedAction: nextByStatus[status],
  };
}

function deriveFlagRecords(flags: AttentionFlag[], createdAt: string): AttentionFlagRecord[] {
  return flags.map((flag, index) => ({
    id: `${flag}-${index}`,
    flag,
    label: ATTENTION_FLAG_LABEL[flag],
    severity: flag === "document_mismatch" ? "high" : "medium",
    reason: ATTENTION_FLAG_LABEL[flag],
    createdAt,
    source: "system",
    state: "open",
  }));
}

function mapEvidenceDocType(value: string): EvidenceDocType {
  if (value in EVIDENCE_DOC_LABEL) {
    return value as EvidenceDocType;
  }
  return "other";
}

function mapProcessingStatus(value?: string | null): EvidenceProcessingState {
  switch (value) {
    case "processing":
      return "processing";
    case "failed":
      return "failed";
    case "complete":
    case "processed":
      return "processed";
    default:
      return "uploaded";
  }
}

function mapEvidenceReviewStatus(value: string): EvidenceReviewState {
  switch (value) {
    case "approved":
      return "reviewed";
    case "changes_requested":
    case "rejected":
      return "needs_attention";
    default:
      return "not_reviewed";
  }
}

function mapCorrectionState(value: string): CorrectionState {
  switch (value) {
    case "resolved":
      return "resolved";
    case "closed":
      return "closed";
    default:
      return "requested";
  }
}

function mapContactState(value: string): ContactState {
  switch (value) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "changes_requested":
      return "needs_review";
    default:
      return "unverified";
  }
}

function mapTimelineKind(value: string): TimelineEventKind {
  if (value.includes("assign")) return "assignment_changed";
  if (value.includes("priority")) return "priority_changed";
  if (value.includes("correction")) return "correction_requested";
  if (value.includes("clarification")) return "candidate_resubmitted";
  if (value.includes("approve") || value.includes("reject") || value.includes("unable")) {
    return "decision_prepared";
  }
  if (value.includes("contact")) return "contact_approved";
  if (value.includes("note")) return "internal_note_added";
  return "case_created";
}

function mapActorSource(value: string): ActorSource {
  switch (value) {
    case "subject":
      return "candidate";
    case "organization":
      return "employer";
    case "system":
      return "system";
    case "integration":
      return "integration";
    default:
      return "admin";
  }
}

function buildTimelineDescription(
  eventType: string,
  previousStatus?: string | null,
  nextStatus?: string | null,
): string {
  if (previousStatus && nextStatus) {
    return `${prettifyFieldKey(eventType)}: ${prettifyFieldKey(previousStatus)} to ${prettifyFieldKey(nextStatus)}.`;
  }
  return prettifyFieldKey(eventType);
}

function narrowTimelineMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, string | number> | undefined {
  if (!metadata) return undefined;
  const next: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === "string" || typeof value === "number") {
      next[key] = value;
    }
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

function formatAssignee(reviewer?: BackendReviewerSummary | null): string {
  return reviewer?.full_name?.trim() || reviewer?.email || "Unassigned";
}

function prettifyFieldKey(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function prettifyActorSource(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function maskEmail(value: string): string {
  const [local, domain = ""] = value.split("@");
  if (!local) return value;
  return `${local.slice(0, 2)}•••@${domain}`;
}

function summaryLabelForType(type: VerificationType): string {
  return VERIFICATION_TYPE_LABEL[type];
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
};
