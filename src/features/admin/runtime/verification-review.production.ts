import { queryOptions } from "@tanstack/react-query";
import { appEnv, type AppEnvConfig } from "@/config/env";
import type { ProductionAdminApiOptions } from "@/features/admin/data/admin-api";
import { createAdminAuthenticatedApi } from "@/features/admin/data/admin-api";
import type { Priority, VerificationStatus } from "@/features/admin/data/types";
import {
  COMPLETED_VERIFICATION_STATUSES,
  getWorkflowOwnerLabel,
  isVerificationStatus,
} from "@/features/admin/lib/verification-status";

export type VerificationType =
  "employment" | "education" | "certification" | "identity" | "platform" | "reference" | "unknown";

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

export interface ReviewerOption {
  id: string;
  label: string;
  email: string;
  role: string;
}

export interface OrganizationSearchResult {
  id: string;
  name: string;
  organizationType: string;
  registryRecordId?: string | null;
  registryResolutionStatus: string;
}

export interface VerificationCase {
  id: string;
  reference: string;
  candidateId: string | null;
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
  assignedReviewerId?: string | null;
  linkedRecordLabel: string;
  verifierContactLabel: string;
  evidenceStatusLabel: string;
  evidenceCount: number;
  organizationStatus: OrganizationStatus;
  slaState: SlaState;
  attentionFlags: AttentionFlag[];
  outreachStatus: OutreachStatus;
  correctionCount: number;
  lastActivitySummary: string;
  workflowOwner: string;
}

export const VERIFICATION_TYPE_LABEL: Record<VerificationType, string> = {
  employment: "Employment",
  education: "Education",
  certification: "Certification",
  identity: "Identity",
  platform: "Platform",
  reference: "Reference",
  unknown: "Professional record",
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

export const COMPLETED_STATUSES: VerificationStatus[] = COMPLETED_VERIFICATION_STATUSES;

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

export interface LinkedVerificationRecord {
  type: "employment" | "education";
  publicId: string;
  label: string;
  canonicalStatus?: string;
}

export interface CandidateConsentSummary {
  fields: string[];
  evidenceScope: string[];
  candidateResponse?: string | null;
  submittedAt?: string | null;
}

export interface ReviewCycleSummary {
  id: string;
  round: number;
  status: string;
  assignedReviewer: string;
  assignedReviewerId?: string | null;
  assignedAt?: string | null;
  decidedAt?: string | null;
  decisionSummary?: string | null;
}

export interface VerificationRoutingContext {
  workflowOwner: string;
  originType?: string | null;
  targetOrganizationEmail?: string | null;
  routingConfidence?: number | null;
  organizationResolutionStatus?: string | null;
  registryResolutionStatus?: string | null;
  registryRecordId?: string | null;
  registryName?: string | null;
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
  fileSizeBytes?: number;
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
  email?: string;
  phoneMasked?: string;
  contactType?: string;
  candidateNote?: string;
  reviewNotes?: string;
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
  candidateId: string | null;
  name: string;
  email: string;
  phoneMasked?: string;
  profileType?: string;
  signupAt?: string;
  onboardingState?: string;
  profileCompletionPct?: number;
  trustScore?: number;
  trustPassportStatus?: "not_issued" | "provisional" | "issued" | "revoked";
  employmentRecordCount?: number;
  previousVerificationCount?: number;
  lastActiveAt?: string;
  accountStatus?: "active" | "suspended" | "closed";
  riskFlags?: string[];
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
  linkedRecord?: LinkedVerificationRecord;
  consent: CandidateConsentSummary;
  reviewCycles: ReviewCycleSummary[];
  routingContext: VerificationRoutingContext;
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
  verifierResponse?: {
    status: string;
    maskedRecipient: string;
    deliveryStatus: string;
    updatedAt: string;
  };
}

interface BackendReviewerSummary {
  user_id: string;
  full_name: string | null;
  email: string;
  role: string;
}

interface BackendVerificationRequestResponse {
  public_id: string;
  candidate_user_public_id?: string | null;
  employment_id?: string | null;
  education_id?: string | null;
  origin_type?: string | null;
  organization_public_id?: string | null;
  trust_invitation_public_id?: string | null;
  subject_name: string;
  subject_email: string;
  target_organization_name?: string | null;
  target_organization_email?: string | null;
  request_type: string;
  status: string;
  priority: Priority;
  due_date?: string | null;
  trust_context?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  candidate_response?: string | null;
  candidate_response_submitted_at?: string | null;
  accepted_at?: string | null;
  consented_fields?: string[];
  consented_evidence_scope?: string[];
  target_organization_metadata?: Record<string, unknown>;
  employment_claim?: {
    employer_name?: string | null;
    role?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    employment_type?: string | null;
    work_location_country?: string | null;
    work_location_region?: string | null;
  } | null;
  education_claim?: {
    institution_name?: string | null;
    degree?: string | null;
    field_of_study?: string | null;
    start_date?: string | null;
    end_date?: string | null;
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
  is_assigned_to_current_user?: boolean | null;
  organization_internal_note?: string | null;
  contact_review_status?: string | null;
  organization_resolution_status?: string | null;
  registry_resolution_status?: string | null;
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
    verification_method?: string | null;
    verification_status: string;
    submitted_at?: string | null;
    reviewed_at?: string | null;
    verified_at?: string | null;
    assigned_reviewer_user_id?: string | null;
    assigned_at?: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  education?: {
    id: string;
    user_id: string;
    institution_name: string;
    degree?: string | null;
    field_of_study?: string | null;
    education_level?: string | null;
    grade?: string | null;
    start_date?: string | null;
    start_date_precision?: string | null;
    end_date?: string | null;
    end_date_precision?: string | null;
    is_currently_studying: boolean;
    verification_status: string;
    submitted_at?: string | null;
    reviewed_at?: string | null;
    verified_at?: string | null;
    reviewed_by_user_id?: string | null;
    reviewer_note?: string | null;
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
  actor_email?: string | null;
  previous_status?: string | null;
  new_status?: string | null;
  message?: string | null;
  metadata_payload?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
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

interface BackendAdminEmployerVerificationResponse {
  employer_verification: {
    public_id: string;
    status: string;
    masked_recipient: string;
    delivery_status: string;
    created_at: string;
    updated_at: string;
  };
}

interface BackendAdminReviewerResponse {
  user_id: string;
  full_name: string | null;
  email: string;
  role: string;
}

interface BackendAdminReviewerPage {
  items: BackendAdminReviewerResponse[];
}

interface BackendAdminOrganizationSearchItem {
  public_id: string;
  name: string;
  organization_type: string;
  verification_capabilities: string[];
  registry_record_public_id?: string | null;
  registry_resolution_status: string;
}

interface BackendAdminOrganizationSearchPage {
  items: BackendAdminOrganizationSearchItem[];
}

interface BackendTrustRegistryResolutionResponse {
  verification_request_public_id: string;
  registry_record_public_id?: string | null;
  resolution_state: string;
  resolution_method?: string | null;
  resolution_confidence?: number | null;
  resolution_metadata: Record<string, unknown>;
}

interface BackendWorkflowEnvelope {
  request: BackendVerificationRequestResponse;
  review: BackendAdminReviewCycleResponse;
}

export interface VerificationQueueFilters {
  statuses?: VerificationStatus[];
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface VerificationQueuePage {
  items: VerificationCase[];
  total: number;
  page: number;
  pageSize: number;
}

export interface VerificationReviewAdapter {
  mode: "demo" | "production";
  listCases: () => Promise<VerificationCase[]>;
  getCaseDetail: (caseId: string) => Promise<VerificationCaseDetail | undefined>;
  getEvidenceDownloadUrl: (caseId: string, evidenceId: string) => Promise<string | null>;
  listReviewers: (search?: string) => Promise<ReviewerOption[]>;
  searchOrganizations: (search: string) => Promise<OrganizationSearchResult[]>;
  assignCase: (caseId: string, assigneeUserId: string) => Promise<void>;
  addNote: (caseId: string, body: string, category: NoteCategory) => Promise<void>;
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
  finalizeCase: (
    caseId: string,
    payload: { outcome: "verified" | "rejected" | "unable_to_verify"; decisionSummary: string },
  ) => Promise<void>;
  directConfirm: (
    caseId: string,
    payload: {
      confirmationMethod: "phone" | "email" | "video_call" | "in_person" | "other";
      confirmedBy: string;
      verifierRole: string;
      contactDetailUsed: string;
      confirmationOutcome: "details_confirmed" | "details_confirmed_with_discrepancy";
      internalNote: string;
    },
  ) => Promise<void>;
  reviewContact: (
    caseId: string,
    payload: { reviewStatus: "approved" | "changes_requested"; reviewNotes?: string },
  ) => Promise<void>;
  resolveOrganization: (caseId: string, organizationPublicId: string) => Promise<void>;
  resolveRegistry: (caseId: string, registryRecordPublicId: string) => Promise<void>;
  createRegistryRecord: (
    caseId: string,
    payload: {
      legalName: string;
      displayName?: string;
      organizationType: string;
      country: string;
      stateProvince?: string;
      website?: string;
      note?: string;
      resolutionConfidence?: number;
    },
  ) => Promise<void>;
  deferRegistryResolution: (caseId: string, note?: string) => Promise<void>;
  cancelCase: (caseId: string, decisionSummary: string) => Promise<void>;
  returnToVerifier: (caseId: string, decisionSummary: string) => Promise<void>;
  recordClarificationResponse: (caseId: string, response: string) => Promise<void>;
}

export interface CreateVerificationReviewAdapterOptions {
  production?: ProductionAdminApiOptions;
}

export const verificationReviewKeys = {
  all: () => ["admin", "verification-review"] as const,
  list: (mode: "demo" | "production") => [...verificationReviewKeys.all(), "list", mode] as const,
  page: (mode: "demo" | "production", filters: VerificationQueueFilters) =>
    [...verificationReviewKeys.all(), "page", mode, filters] as const,
  detail: (mode: "demo" | "production", caseId: string) =>
    [...verificationReviewKeys.all(), "detail", mode, caseId] as const,
};

function normalizeQueueFilters(filters: VerificationQueueFilters = {}) {
  return {
    page: filters.page && filters.page > 0 ? filters.page : 1,
    pageSize: filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 100,
    search: filters.search?.trim() || undefined,
    status:
      filters.statuses && filters.statuses.length > 0 ? filters.statuses.join(",") : undefined,
  };
}

function buildQueuePath(filters: VerificationQueueFilters = {}) {
  const normalized = normalizeQueueFilters(filters);
  const params = new URLSearchParams({
    page: String(normalized.page),
    page_size: String(normalized.pageSize),
  });

  if (normalized.search) {
    params.set("search", normalized.search);
  }

  if (normalized.status) {
    params.set("status", normalized.status);
  }

  return `/api/v1/admin/verification-requests/queue?${params.toString()}`;
}

async function fetchVerificationQueuePage(
  api: ReturnType<typeof createAdminAuthenticatedApi>,
  filters: VerificationQueueFilters = {},
): Promise<VerificationQueuePage> {
  const normalized = normalizeQueueFilters(filters);
  const data = await api.request<BackendAdminReviewQueueResponse>(buildQueuePath(filters));

  return {
    items: data.items.map(mapQueueItemToCase),
    total: data.total ?? data.items.length,
    page: data.page ?? normalized.page,
    pageSize: data.page_size ?? normalized.pageSize,
  };
}

async function fetchFullTimeline(
  api: ReturnType<typeof createAdminAuthenticatedApi>,
  caseId: string,
): Promise<BackendTimelineEvent[]> {
  const items: BackendTimelineEvent[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await api.request<BackendTimelineResponse>(
      `/api/v1/admin/verification-requests/${caseId}/timeline?page=${page}&page_size=100`,
    );
    items.push(...response.timeline.items);
    totalPages = response.timeline.total_pages;
    page += 1;
  } while (page <= totalPages);

  return items;
}

export function createVerificationReviewAdapter(
  config: AppEnvConfig = appEnv,
  options: CreateVerificationReviewAdapterOptions = {},
): VerificationReviewAdapter {
  const api = createAdminAuthenticatedApi(config, options.production);

  return {
    mode: "production",
    async listCases() {
      return (await fetchVerificationQueuePage(api)).items;
    },
    async getCaseDetail(caseId) {
      const detail = await api.request<BackendAdminReviewDetailResponse>(
        `/api/v1/admin/verification-requests/${caseId}`,
      );
      const timelineItems = await fetchFullTimeline(api, caseId);
      const employerVerification = detail.employer_verification_public_id
        ? await api.request<BackendAdminEmployerVerificationResponse>(
            `/api/v1/admin/employer-verifications/${detail.employer_verification_public_id}`,
          )
        : null;
      return mapDetailResponse(
        detail,
        timelineItems,
        employerVerification?.employer_verification ?? null,
      );
    },
    async getEvidenceDownloadUrl(caseId, evidenceId) {
      const data = await api.request<BackendEvidenceDownloadResponse>(
        `/api/v1/admin/verification-requests/${caseId}/evidence/${evidenceId}/download-url`,
      );
      return data.download_url ?? null;
    },
    async listReviewers(search) {
      const query = search
        ? `?search=${encodeURIComponent(search)}&page_size=100`
        : "?page_size=100";
      const data = await api.request<BackendAdminReviewerPage>(
        `/api/v1/admin/verification-reviewers${query}`,
      );
      return data.items.map((item) => ({
        id: item.user_id,
        label: item.full_name?.trim() || item.email,
        email: item.email,
        role: item.role,
      }));
    },
    async searchOrganizations(search) {
      const data = await api.request<BackendAdminOrganizationSearchPage>(
        `/api/v1/admin/organizations/search?search=${encodeURIComponent(search)}&page_size=20`,
      );
      return data.items.map((item) => ({
        id: item.public_id,
        name: item.name,
        organizationType: item.organization_type,
        registryRecordId: item.registry_record_public_id ?? null,
        registryResolutionStatus: item.registry_resolution_status,
      }));
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
    async addNote(caseId, body, category) {
      await api.request(`/api/v1/admin/verification-requests/${caseId}/notes`, {
        method: "POST",
        body: {
          body,
          note_type: "review_note",
          visibility: "internal",
          metadata: { category },
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
    async finalizeCase(caseId, payload) {
      await api.request(`/api/v1/admin/verification-requests/${caseId}/finalize`, {
        method: "POST",
        body: {
          outcome: payload.outcome,
          decision_summary: payload.decisionSummary,
        },
      });
    },
    async directConfirm(caseId, payload) {
      await api.request(`/api/v1/admin/verification-requests/${caseId}/direct-confirmation`, {
        method: "POST",
        body: {
          confirmation_method: payload.confirmationMethod,
          confirmed_by: payload.confirmedBy,
          verifier_role: payload.verifierRole,
          contact_detail_used: payload.contactDetailUsed,
          confirmation_outcome: payload.confirmationOutcome,
          internal_note: payload.internalNote,
        },
      });
    },
    async reviewContact(caseId, payload) {
      await api.request(
        `/api/v1/admin/verification-requests/${caseId}/verification-contact/review`,
        {
          method: "POST",
          body: {
            review_status: payload.reviewStatus,
            review_notes: payload.reviewNotes ?? null,
          },
        },
      );
    },
    async resolveOrganization(caseId, organizationPublicId) {
      await api.request(`/api/v1/admin/verification-requests/${caseId}/resolve-organization`, {
        method: "POST",
        body: { organization_public_id: organizationPublicId },
      });
    },
    async resolveRegistry(caseId, registryRecordPublicId) {
      await api.request<BackendTrustRegistryResolutionResponse>(
        `/api/v1/admin/verification-requests/${caseId}/resolve-registry`,
        {
          method: "POST",
          body: {
            registry_record_public_id: registryRecordPublicId,
          },
        },
      );
    },
    async createRegistryRecord(caseId, payload) {
      await api.request<BackendTrustRegistryResolutionResponse>(
        `/api/v1/admin/verification-requests/${caseId}/create-registry-record`,
        {
          method: "POST",
          body: {
            record: {
              legal_name: payload.legalName,
              display_name: payload.displayName?.trim() || null,
              organization_type: payload.organizationType,
              country: payload.country,
              state_province: payload.stateProvince?.trim() || null,
              website: payload.website?.trim() || null,
            },
            resolution_confidence: payload.resolutionConfidence ?? null,
            resolution_metadata: payload.note?.trim() ? { note: payload.note.trim() } : {},
          },
        },
      );
    },
    async deferRegistryResolution(caseId, note) {
      await api.request<BackendTrustRegistryResolutionResponse>(
        `/api/v1/admin/verification-requests/${caseId}/defer-registry-resolution`,
        {
          method: "POST",
          body: {
            resolution_metadata: note ? { note } : {},
          },
        },
      );
    },
    async cancelCase(caseId, decisionSummary) {
      await api.request(`/api/v1/admin/verification-requests/${caseId}/cancel`, {
        method: "POST",
        body: { decision_summary: decisionSummary },
      });
    },
    async returnToVerifier(caseId, decisionSummary) {
      await api.request(`/api/v1/admin/verification-requests/${caseId}/return-to-verifier`, {
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

export function verificationQueuePageQueryOptions(
  filters: VerificationQueueFilters = {},
  config: AppEnvConfig = appEnv,
  options: CreateVerificationReviewAdapterOptions = {},
) {
  const api = createAdminAuthenticatedApi(config, options.production);
  return queryOptions({
    queryKey: verificationReviewKeys.page("production", filters),
    queryFn: () => fetchVerificationQueuePage(api, filters),
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

export function getCandidateProfileRoute(candidateUserPublicId: string | null | undefined): {
  to: "/admin/users/$userId";
  params: { userId: string };
} | null {
  if (!candidateUserPublicId) {
    return null;
  }
  return {
    to: "/admin/users/$userId",
    params: { userId: candidateUserPublicId },
  };
}

function mapQueueItemToCase(item: BackendVerificationRequestResponse): VerificationCase {
  const verificationType = mapVerificationType(item.request_type);
  const organizationName =
    item.organization_summary?.name ??
    item.target_organization_name ??
    item.employment_claim?.employer_name ??
    item.education_claim?.institution_name ??
    "Organization pending";
  const submittedAt = item.accepted_at ?? item.candidate_response_submitted_at ?? item.created_at;
  const roleOrProgram =
    item.employment_claim?.role ??
    item.education_claim?.degree ??
    VERIFICATION_TYPE_LABEL[verificationType];
  const status = mapBackendStatus(item.status);

  return {
    id: item.public_id,
    reference: buildCaseReference(item.public_id),
    candidateId: item.candidate_user_public_id ?? null,
    candidateName: item.subject_name,
    candidateEmail: item.subject_email,
    candidateAvatarInitials: initialsFor(item.subject_name, item.subject_email),
    organizationId:
      item.organization_public_id ?? item.organization_summary?.public_id ?? item.public_id,
    organizationName,
    roleOrProgram,
    verificationType,
    status,
    priority: item.priority ?? "normal",
    submittedAt,
    updatedAt: item.updated_at,
    assignedReviewer: formatAssignee(item.assigned_reviewer),
    assignedReviewerId: item.assigned_reviewer?.user_id ?? null,
    linkedRecordLabel: formatLinkedRecordLabel(
      verificationType,
      item.employment_id ?? item.education_id ?? null,
    ),
    verifierContactLabel: item.target_organization_email
      ? maskEmail(item.target_organization_email)
      : "Pending contact selection",
    evidenceStatusLabel: formatEvidenceStatusLabel(item.evidence_summary?.total_items ?? 0),
    evidenceCount: item.evidence_summary?.total_items ?? 0,
    organizationStatus: mapOrganizationStatus(item),
    slaState: deriveSlaState(submittedAt),
    attentionFlags: deriveAttentionFlags(item),
    outreachStatus: deriveOutreachStatus(item.status),
    correctionCount: item.status === "awaiting_subject_corrections" ? 1 : 0,
    lastActivitySummary: summarizeCaseActivity(item),
    workflowOwner: getWorkflowOwnerLabel(status),
  };
}

function mapDetailResponse(
  detail: BackendAdminReviewDetailResponse,
  timelineItems: BackendTimelineEvent[],
  employerVerification?: BackendAdminEmployerVerificationResponse["employer_verification"] | null,
): VerificationCaseDetail {
  const summary = mapQueueItemToCase(detail.request);
  const latestAssignedReview = getLatestAssignedReview(detail.reviews);
  const authoritativeOrganizationStatus = mapDetailOrganizationStatus(detail);
  const resolvedOrganization = getResolvedOrganization(detail);
  const claim = mapClaim(detail);
  const linkedRecord = mapLinkedRecord(detail);
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
    category: resolveNoteCategory(note),
  }));

  return {
    summary: {
      ...summary,
      assignedReviewerId:
        summary.assignedReviewerId ?? latestAssignedReview?.assigned_reviewer_user_id,
      organizationStatus: authoritativeOrganizationStatus,
    },
    claim,
    linkedRecord,
    consent: {
      fields: detail.request.consented_fields ?? [],
      evidenceScope: detail.request.consented_evidence_scope ?? [],
      candidateResponse: detail.request.candidate_response,
      submittedAt: detail.request.candidate_response_submitted_at,
    },
    reviewCycles: detail.reviews.map(mapReviewCycle),
    routingContext: {
      workflowOwner: summary.workflowOwner,
      originType: detail.request.origin_type ?? null,
      targetOrganizationEmail:
        detail.request.target_organization_email ??
        detail.request.target_organization_metadata?.organization_email?.toString() ??
        null,
      routingConfidence: extractRoutingConfidence(
        detail.request.target_organization_metadata,
        detail.request.trust_context,
        detail.registry_resolution?.resolution_metadata,
      ),
      organizationResolutionStatus:
        detail.organization_resolution?.status ??
        detail.request.organization_resolution_status ??
        null,
      registryResolutionStatus:
        detail.registry_resolution?.status ?? detail.request.registry_resolution_status ?? null,
      registryRecordId: detail.registry_resolution?.registry_record_public_id ?? null,
      registryName: detail.registry_resolution?.registry_name ?? null,
    },
    candidate: {
      candidateId: summary.candidateId,
      name: summary.candidateName,
      email: summary.candidateEmail,
    },
    evidence,
    organization: {
      candidateEntered:
        detail.request.target_organization_name ??
        detail.request.employment_claim?.employer_name ??
        summary.organizationName,
      matched: resolvedOrganization,
      state: authoritativeOrganizationStatus,
      suggestions: [],
    },
    contacts: latestContact ? [mapContact(latestContact, summary.organizationName)] : [],
    communications: [],
    corrections,
    notes,
    flags: deriveFlagRecords(summary.attentionFlags, detail.request.created_at),
    timeline,
    statusMeta: buildStatusMeta(
      summary.status,
      linkedRecord?.type ?? detail.request.request_type ?? summary.verificationType,
    ),
    verifierResponse: employerVerification
      ? {
          status: employerVerification.status,
          maskedRecipient: employerVerification.masked_recipient,
          deliveryStatus: employerVerification.delivery_status,
          updatedAt: employerVerification.updated_at,
        }
      : undefined,
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
      "Not supplied";
    const role = employment?.job_title ?? employmentClaim?.role ?? "Not supplied";
    const fields: ClaimField[] = [
      {
        key: "candidate",
        label: "Candidate name",
        value: detail.request.subject_name,
        source: "candidate",
      },
      {
        key: "verificationType",
        label: "Verification type",
        value: "Employment",
        source: "kairo_derived",
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

    if (employment?.id) {
      fields.push({
        key: "employmentRecordId",
        label: "Employment record ID",
        value: employment.id,
        source: "candidate",
      });
    }
    if (employment?.employer_trade_name && employment.employer_trade_name !== employerName) {
      fields.push({
        key: "tradeName",
        label: "Employer trade name",
        value: employment.employer_trade_name,
        source: "candidate",
      });
    }
    if (employment?.employment_type ?? employmentClaim?.employment_type) {
      fields.push({
        key: "employmentType",
        label: "Employment type",
        value: String(employment?.employment_type ?? employmentClaim?.employment_type),
        source: "candidate",
      });
    }
    const workLocation = [
      employment?.work_location_region ?? employmentClaim?.work_location_region,
      employment?.work_location_country ?? employmentClaim?.work_location_country,
    ]
      .filter(Boolean)
      .join(", ");
    if (workLocation) {
      fields.push({
        key: "workLocation",
        label: "Work location",
        value: workLocation,
        source: "candidate",
      });
    }

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
    if (employment?.verification_status) {
      fields.push({
        key: "employmentStatus",
        label: "Employment status",
        value: employment.verification_status,
        source: "candidate",
      });
    }
    if (employment?.verification_method) {
      fields.push({
        key: "verificationMethod",
        label: "Canonical verification method",
        value: employment.verification_method,
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

  if (requestType === "education") {
    const education = detail.education;
    const educationClaim = detail.request.education_claim;
    const institutionName =
      education?.institution_name ??
      detail.request.target_organization_name ??
      educationClaim?.institution_name ??
      "Not supplied";
    const degree = education?.degree ?? educationClaim?.degree ?? "Not supplied";
    const fields: ClaimField[] = [
      {
        key: "candidate",
        label: "Candidate name",
        value: detail.request.subject_name,
        source: "candidate",
      },
      {
        key: "verificationType",
        label: "Verification type",
        value: "Education",
        source: "kairo_derived",
      },
      {
        key: "institution",
        label: "Institution",
        value: institutionName,
        source: "candidate",
      },
      {
        key: "degree",
        label: "Degree",
        value: degree,
        source: "candidate",
      },
    ];

    if (education?.id) {
      fields.push({
        key: "educationRecordId",
        label: "Education record ID",
        value: education.id,
        source: "candidate",
      });
    }
    if (education?.education_level) {
      fields.push({
        key: "educationLevel",
        label: "Education level",
        value: education.education_level,
        source: "candidate",
      });
    }
    if (education?.grade) {
      fields.push({
        key: "grade",
        label: "Grade",
        value: education.grade,
        source: "candidate",
      });
    }

    if (education?.field_of_study ?? educationClaim?.field_of_study) {
      fields.push({
        key: "fieldOfStudy",
        label: "Field of study",
        value: String(education?.field_of_study ?? educationClaim?.field_of_study),
        source: "candidate",
      });
    }
    if (education?.start_date ?? educationClaim?.start_date) {
      fields.push({
        key: "startDate",
        label: education?.start_date_precision
          ? `Start date (${education.start_date_precision})`
          : "Start date",
        value: String(education?.start_date ?? educationClaim?.start_date),
        source: "candidate",
      });
    }
    if (education?.end_date ?? educationClaim?.end_date) {
      fields.push({
        key: "endDate",
        label: education?.end_date_precision
          ? `End date (${education.end_date_precision})`
          : "End date",
        value: String(education?.end_date ?? educationClaim?.end_date),
        source: "candidate",
      });
    }
    if (education) {
      fields.push({
        key: "currentlyStudying",
        label: "Currently studying",
        value: education.is_currently_studying ? "Yes" : "No",
        source: "candidate",
      });
      fields.push({
        key: "educationStatus",
        label: "Education status",
        value: education.verification_status,
        source: "candidate",
      });
    }

    return {
      type: "education",
      headline: `${degree} at ${institutionName}`,
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
    filename: item.original_filename ?? "Filename unavailable",
    uploadedAt: item.created_at,
    source: "candidate_upload",
    fileSizeBytes: item.file_size ?? undefined,
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
    emailMasked: contact.contact_email,
    email: contact.contact_email,
    contactType: contact.contact_type,
    candidateNote: contact.candidate_note ?? undefined,
    reviewNotes: contact.review_notes ?? undefined,
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
  const metadata = event.metadata ?? event.metadata_payload;
  return {
    id: event.public_id,
    kind: mapTimelineKind(event.event_type),
    actor: event.actor_display_name ?? event.actor_email ?? prettifyActorSource(event.event_source),
    actorSource: mapActorSource(event.event_source),
    at: event.created_at,
    description:
      event.message ??
      buildTimelineDescription(event.event_type, event.previous_status, event.new_status, metadata),
    metadata: narrowTimelineMetadata(metadata),
  };
}

function buildCaseReference(publicId: string): string {
  return `KVR-${publicId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function formatLinkedRecordLabel(
  verificationType: VerificationType,
  publicId: string | null,
): string {
  const prefix = verificationType === "education" ? "Education" : "Employment";
  return publicId ? `${prefix} · ${publicId.slice(0, 8)}` : `${prefix} · Pending link`;
}

function formatEvidenceStatusLabel(count: number): string {
  if (count <= 0) return "Missing evidence";
  return `${count} item${count === 1 ? "" : "s"} attached`;
}

function mapLinkedRecord(
  detail: BackendAdminReviewDetailResponse,
): LinkedVerificationRecord | undefined {
  if (detail.request.employment_id) {
    return {
      type: "employment",
      publicId: detail.request.employment_id,
      label: formatLinkedRecordLabel("employment", detail.request.employment_id),
      canonicalStatus: detail.employment?.verification_status,
    };
  }

  if (detail.request.education_id) {
    return {
      type: "education",
      publicId: detail.request.education_id,
      label: formatLinkedRecordLabel("education", detail.request.education_id),
      canonicalStatus: detail.education?.verification_status,
    };
  }

  return undefined;
}

function mapReviewCycle(review: BackendAdminReviewCycleResponse): ReviewCycleSummary {
  return {
    id: review.public_id,
    round: review.review_round,
    status: review.review_status,
    assignedReviewer: review.assigned_reviewer_user_id ?? "Unassigned",
    assignedReviewerId: review.assigned_reviewer_user_id ?? null,
    assignedAt: review.assigned_at,
    decidedAt: review.decision_at,
    decisionSummary: review.decision_summary,
  };
}

function resolveNoteCategory(note: BackendAdminReviewInternalNoteResponse): NoteCategory {
  const value =
    typeof note.metadata?.category === "string"
      ? note.metadata.category
      : note.note_type === "review_note"
        ? "general"
        : note.note_type;

  return isNoteCategory(value) ? value : "general";
}

function isNoteCategory(value: unknown): value is NoteCategory {
  return (
    value === "general" ||
    value === "evidence" ||
    value === "organization" ||
    value === "contact" ||
    value === "risk" ||
    value === "decision_preparation"
  );
}

function getLatestAssignedReview(
  reviews: BackendAdminReviewCycleResponse[],
): BackendAdminReviewCycleResponse | undefined {
  return reviews
    .filter((review) => Boolean(review.assigned_reviewer_user_id))
    .sort(
      (left, right) =>
        new Date(right.assigned_at ?? right.updated_at ?? right.created_at).getTime() -
        new Date(left.assigned_at ?? left.updated_at ?? left.created_at).getTime(),
    )[0];
}

function mapDetailOrganizationStatus(detail: BackendAdminReviewDetailResponse): OrganizationStatus {
  const resolutionStatus =
    detail.organization_resolution?.status ?? detail.request.organization_resolution_status;
  if (resolutionStatus === "unresolved") return "unresolved";
  if (resolutionStatus === "suggested_match") return "suggested_match";
  if (resolutionStatus === "duplicate_review") return "duplicate_review";
  if (resolutionStatus === "resolved") return "resolved";
  return mapOrganizationStatus(detail.request);
}

function getResolvedOrganization(
  detail: BackendAdminReviewDetailResponse,
): VerificationCaseDetail["organization"]["matched"] {
  if (mapDetailOrganizationStatus(detail) !== "resolved") return undefined;

  const organizationId =
    detail.organization_resolution?.organization_public_id ??
    detail.request.organization_public_id ??
    detail.request.organization_summary?.public_id;
  const canonicalName =
    detail.organization_resolution?.organization_name ??
    detail.request.organization_summary?.name ??
    detail.request.target_organization_name ??
    detail.request.employment_claim?.employer_name ??
    null;

  if (!organizationId && !canonicalName) return undefined;

  return {
    id: organizationId ?? canonicalName ?? detail.request.public_id,
    canonicalName: canonicalName ?? "Resolved organization",
    matchConfidence: 1,
    matchReason: "Resolved by backend review workflow",
    knownChannels: [],
  };
}

function extractRoutingConfidence(
  ...sources: Array<Record<string, unknown> | undefined | null>
): number | null {
  const candidateKeys = [
    "routing_confidence",
    "match_confidence",
    "confidence",
    "organization_match_confidence",
  ];

  for (const source of sources) {
    if (!source) continue;
    for (const key of candidateKeys) {
      const value = source[key];
      const numeric = typeof value === "number" ? value : Number(value);
      if (Number.isFinite(numeric)) {
        return numeric <= 1 ? numeric * 100 : numeric;
      }
    }
  }

  return null;
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
    case "employment":
    case "education":
    case "certification":
    case "identity":
    case "platform":
    case "reference":
      return value;
    default:
      return "unknown";
  }
}

export function mapBackendStatus(status: string): VerificationStatus {
  return isVerificationStatus(status) ? status : "pending_admin_review";
}

function deriveSlaState(submittedAt: string): SlaState {
  const ageHours = Math.max(0, (Date.now() - new Date(submittedAt).getTime()) / 3_600_000);
  if (ageHours >= 72) return "breached";
  if (ageHours >= 48) return "approaching";
  return "within";
}

function mapOrganizationStatus(item: BackendVerificationRequestResponse): OrganizationStatus {
  const resolutionStatus = item.organization_resolution_status ?? "";
  if (resolutionStatus === "unresolved" || item.status === "pending_organization_resolution") {
    return "unresolved";
  }
  const state = item.organization_summary?.verification_state ?? "";
  if (state === "verified" || item.organization_public_id) return "resolved";
  return "resolved";
}

function deriveAttentionFlags(item: BackendVerificationRequestResponse): AttentionFlag[] {
  const flags = new Set<AttentionFlag>();
  if ((item.evidence_summary?.total_items ?? 0) === 0) flags.add("missing_evidence");
  if (item.status === "awaiting_subject_corrections" || item.status === "pending_admin_re_review") {
    flags.add("previous_correction");
  }
  if ((item.contact_review_status ?? item.review_status ?? "").includes("contact")) {
    flags.add("contact_unverified");
  }
  if (item.status === "pending_organization_resolution") flags.add("possible_duplicate");
  return [...flags];
}

function deriveOutreachStatus(status: string): OutreachStatus {
  if (status === "pending_admin_quality_review") return "responded";
  if (
    status === "approved_for_organization_verification" ||
    status === "pending_organization_acceptance" ||
    status === "in_progress" ||
    status === "awaiting_information"
  ) {
    return "sent";
  }
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
      return "Approved for dispatch";
    case "pending_organization_acceptance":
      return "Waiting for verifier to accept";
    case "in_progress":
      return "Verifier review is in progress";
    case "awaiting_information":
      return "Clarification is pending from verifier or candidate";
    case "pending_admin_quality_review":
      return "Verifier responded and awaits final review";
    case "verified":
      return "Verification finalized as verified";
    case "rejected":
      return "Verification finalized as rejected";
    case "unable_to_verify":
      return "Verification finalized as unable to verify";
    case "cancelled":
      return "Verification request was cancelled";
    case "expired":
      return "Verification request expired";
    default:
      return "Awaiting admin review";
  }
}

function resolveVerificationStageLabel(verificationType: string | null | undefined): string {
  switch (verificationType) {
    case "employment":
      return VERIFICATION_TYPE_LABEL.employment;
    case "education":
      return VERIFICATION_TYPE_LABEL.education;
    case "certification":
      return VERIFICATION_TYPE_LABEL.certification;
    case "identity":
      return VERIFICATION_TYPE_LABEL.identity;
    case "platform":
      return VERIFICATION_TYPE_LABEL.platform;
    case "reference":
      return VERIFICATION_TYPE_LABEL.reference;
    default:
      return VERIFICATION_TYPE_LABEL.unknown;
  }
}

function buildStatusMeta(
  status: VerificationStatus,
  verificationType: string | null | undefined,
): CaseStatusMeta {
  const nextByStatus: Record<VerificationStatus, string> = {
    draft: "Request is not yet ready for admin review.",
    pending_subject_acceptance: "Candidate must accept the request.",
    accepted: "Candidate has accepted the request.",
    pending_subject_submission: "Candidate must submit their verification evidence.",
    pending_admin_review: "Admin must review the submitted request before dispatch.",
    awaiting_subject_corrections: "Candidate must submit corrections.",
    pending_admin_re_review: "Admin must review the corrected submission.",
    approved_for_organization_verification: "Request has been approved for dispatch.",
    pending_organization_resolution: "Admin must resolve the target organization or institution.",
    pending_organization_acceptance: "Verifier has not accepted the request yet.",
    in_progress: "Verifier response is pending.",
    awaiting_information: "Clarification is still outstanding.",
    pending_admin_quality_review: "Admin must complete final quality review.",
    verified: "Case is complete.",
    rejected: "Case is complete.",
    unable_to_verify: "Case is complete.",
    cancelled: "Case is complete.",
    expired: "Case is complete.",
  };

  return {
    description: nextByStatus[status],
    stage: resolveVerificationStageLabel(verificationType),
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
  metadata?: Record<string, unknown> | null,
): string {
  if (eventType === "verification_request_manual_direct_confirmation") {
    const method =
      typeof metadata?.confirmation_method === "string"
        ? prettifyFieldKey(metadata.confirmation_method)
        : "Direct confirmation";
    const confirmedBy =
      typeof metadata?.confirmed_by === "string" ? ` with ${metadata.confirmed_by}` : "";
    return `Verified via direct confirmation (${method})${confirmedBy}.`;
  }
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
