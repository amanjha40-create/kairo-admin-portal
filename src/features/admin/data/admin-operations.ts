import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { appEnv, type AppEnvConfig } from "@/config/env";
import {
  createAdminAuthenticatedApi,
  type ProductionAdminApiOptions,
} from "@/features/admin/data/admin-api";

export type CandidateClaimStatus = "admin_created_unclaimed" | "activation_pending" | "claimed";
export type ProvenanceSource =
  "admin_entered" | "cv_extracted" | "candidate_confirmed" | "source_verified";
export type CourtCheckStatus =
  "pending" | "no_match_found" | "match_found" | "review_required" | "unable_to_complete";
export type InPersonVerificationType = "identity_observation" | "document_observation";
export type InPersonVerificationResult =
  "observed_consistent" | "discrepancy" | "unable_to_complete";

export interface ManagedCandidate {
  candidateId: string;
  fullName?: string;
  emailMasked: string;
  phoneMasked?: string;
  claimStatus: CandidateClaimStatus;
  passwordConfigured: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  activationExpiresAt?: string;
  activationLastSentAt?: string;
  createdAt: string;
}

export interface CandidateActivation {
  candidateId: string;
  claimStatus: CandidateClaimStatus;
  emailMasked: string;
  expiresAt: string;
  lastSentAt: string;
  resendAvailableAt: string;
  deliveryState: "queued" | "failed";
}

export interface CreateCandidateInput {
  fullName: string;
  email: string;
  phone?: string;
  headline?: string;
  location?: string;
  idempotencyKey: string;
}

export interface ProfileMutationInput {
  fullName?: string;
  phone?: string;
  currentRole?: string;
  industry?: string;
  yearsOfExperience?: number;
  location?: string;
  locationCity?: string;
  locationRegion?: string;
  locationCountry?: string;
  headline?: string;
  bio?: string;
  source: Extract<ProvenanceSource, "admin_entered" | "cv_extracted">;
}

export interface ProfileMutationResult {
  candidateId: string;
  claimStatus: CandidateClaimStatus;
  updatedFields: string[];
  provenanceSource: ProvenanceSource;
  candidateConfirmationRequired: boolean;
}

export type CareerClaimType =
  "employment" | "education" | "internship" | "freelance" | "certification";

export interface CareerMutationResult {
  candidateId: string;
  claimType: CareerClaimType;
  recordId: string;
  updatedFields: string[];
  provenanceSource: ProvenanceSource;
  verificationStatus: string;
}

export interface ResumeProcessReceipt {
  resumeId: string;
  jobId: string;
  status: string;
}

export interface ResumeParsedResult {
  resumeId: string;
  jobId: string;
  schemaVersion: string;
  status: string;
  structuredResult: Record<string, unknown>;
  warnings: string[];
}

export interface ResumeReviewItem {
  id: string;
  claimType: string;
  sourceClaimId: string;
  originalPayload: Record<string, unknown>;
  editedPayload: Record<string, unknown>;
  selected: boolean;
  reviewStatus: string;
  duplicateStatus: string;
  duplicateCandidates: Array<Record<string, unknown>>;
  conflictWarnings: string[];
  importAction: ResumeImportAction;
  targetRecordId?: string;
  importedRecordType?: string;
  importedRecordId?: string;
  sourceReference?: string;
  confidence?: number;
  version: number;
}

export type ResumeImportAction = "create_new" | "skip" | "link_existing" | "update_existing";

export interface ResumeReviewSession {
  id: string;
  resumeId: string;
  parsedResultId: string;
  status: string;
  schemaVersion: string;
  version: number;
  items: ResumeReviewItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ResumeReviewPlanItem {
  itemId: string;
  claimType: string;
  action: string;
  targetModel?: string;
  duplicateStatus: string;
  targetRecordId?: string;
  fieldsToCreate: string[];
  fieldsIgnored: string[];
  blockers: string[];
  warnings: string[];
  verifiedRecordProtected: boolean;
}

export interface ResumeReviewPlan {
  sessionId: string;
  ready: boolean;
  version: number;
  items: ResumeReviewPlanItem[];
}

export interface ResumeImportBatch {
  id: string;
  reviewSessionId: string;
  status: string;
  totalCount: number;
  importedCount: number;
  linkedCount: number;
  skippedCount: number;
  failedCount: number;
  blockedCount: number;
  incompleteCount: number;
  results: Array<{
    reviewItemId: string;
    outcome: string;
    recordType?: string;
    recordId?: string;
    sanitizedErrorCode?: string;
    warnings: string[];
  }>;
}

export interface OrganizationProvisioningResult {
  organizationPublicId: string;
  name: string;
  organizationType: string;
  lifecycleState: "awaiting_first_hr_claim";
  verificationState: string;
  setupCompleted: false;
  ownerMembershipPresent: false;
  createdAt: string;
}

export interface FirstHrInvitation {
  invitationPublicId: string;
  organizationPublicId: string;
  inviteeEmailMasked: string;
  role: "owner";
  status: string;
  expiresAt: string;
  lastSentAt: string;
  acceptancePath: "/team-invitations/accept?token={opaque_token}";
}

export interface FirstHrInvitationStatus {
  invitationPublicId: string;
  inviteeEmailMasked: string;
  status: string;
  effectiveStatus: string;
  expiresAt?: string;
  lastSentAt?: string;
  deliveryFailedAt?: string;
}

export interface OrganizationProvisioningStatus {
  organizationPublicId: string;
  memberPresent: boolean;
  ownerMembershipPresent: boolean;
  firstHrInvitation?: FirstHrInvitationStatus;
}

export type FirstHrInvitationAction = "invite" | "resend" | "none";

export function getFirstHrInvitationAction(
  provisioning?: OrganizationProvisioningStatus,
  canonicalStateKnown = true,
): FirstHrInvitationAction {
  if (!canonicalStateKnown || !provisioning || provisioning.memberPresent) return "none";
  return provisioning.firstHrInvitation?.status === "pending" ? "resend" : "invite";
}

export function isAdminManagedEvidenceOwner(
  linkedCandidateId?: string,
  managedCandidate?: ManagedCandidate,
) {
  return Boolean(linkedCandidateId && managedCandidate?.candidateId === linkedCandidateId);
}

export interface AdminOperationsPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface EvidenceReceipt {
  documentId: string;
  originalFilename: string;
  contentType: string;
  byteSize: number;
  verificationStatus: string;
}

export interface CourtCheckInput {
  status: CourtCheckStatus;
  searchedAt?: string;
  jurisdiction: string;
  coverage: string;
  searchPeriod?: string;
  source: string;
  finding?: string;
  remarks?: string;
  limitations: string;
  evidenceDocumentIds: string[];
  idempotencyKey: string;
}

export interface CourtCheck {
  publicId: string;
  organizationPublicId: string;
  personPublicId: string;
  status: CourtCheckStatus;
  searchedAt?: string;
  jurisdiction: string;
  coverage: string;
  searchPeriod?: string;
  source: string;
  finding?: string;
  remarks?: string;
  limitations: string;
  reviewerUserId?: string;
  evidenceDocumentIds: string[];
  finalizedAt?: string;
  createdAt: string;
  updatedAt: string;
  semanticNotice: string;
}

export interface CourtCheckUpdateInput extends Partial<
  Omit<CourtCheckInput, "idempotencyKey" | "searchedAt" | "searchPeriod" | "finding" | "remarks">
> {
  searchedAt?: string | null;
  searchPeriod?: string | null;
  finding?: string | null;
  remarks?: string | null;
}

export function getCourtNullableFieldChanges(
  current: CourtCheck,
  draft: {
    searchedAt: string;
    searchPeriod: string;
    finding: string;
    remarks: string;
  },
): Pick<CourtCheckUpdateInput, "searchedAt" | "searchPeriod" | "finding" | "remarks"> {
  const changes: Pick<
    CourtCheckUpdateInput,
    "searchedAt" | "searchPeriod" | "finding" | "remarks"
  > = {};
  const nextSearchedAt = draft.searchedAt ? new Date(draft.searchedAt).toISOString() : null;
  const currentSearchedAt = current.searchedAt ? new Date(current.searchedAt).toISOString() : null;
  if (nextSearchedAt !== currentSearchedAt) changes.searchedAt = nextSearchedAt;

  for (const key of ["searchPeriod", "finding", "remarks"] as const) {
    const next = draft[key].trim() || null;
    const previous = current[key]?.trim() || null;
    if (next !== previous) changes[key] = next;
  }
  return changes;
}

export interface InPersonVerificationInput {
  verificationType: InPersonVerificationType;
  performedAt: string;
  personMet?: string;
  relationship?: string;
  result: InPersonVerificationResult;
  notes?: string;
  evidenceDocumentIds: string[];
  idempotencyKey: string;
}

export interface InPersonVerificationReceipt {
  publicId: string;
  organizationPublicId: string;
  personPublicId: string;
  verificationType: InPersonVerificationType;
  method: "in_person";
  performedAt: string;
  performedByUserId: string;
  personMet?: string;
  relationship?: string;
  result: InPersonVerificationResult;
  notes?: string;
  evidenceDocumentIds: string[];
  changesCanonicalVerificationStatus: false;
  permanentAddressCheckCredit: 0;
  createdAt: string;
}

export type VerificationReportStatus = "INTERIM" | "FINAL";
export type VerificationReportCheckStatus =
  | "CONFIRMED"
  | "DETAILS_MATCHED"
  | "DISCREPANCY"
  | "PENDING"
  | "AWAITING_RESPONSE"
  | "UNABLE_TO_VERIFY"
  | "REJECTED"
  | "NOT_ORDERED";

export interface AdminVerificationReport {
  schemaVersion: "hr_verification_report_v1";
  header: {
    personName: string;
    role?: string;
    personId: string;
    initiatedAt?: string;
    requestedByOrganization: string;
    maskedEmail?: string;
    maskedPhone?: string;
    consentAt?: string;
    trustScore?: number;
    reportUpdatedAt: string;
    reportStatus: VerificationReportStatus;
  };
  checkSummaries: Array<{
    check: string;
    status: VerificationReportCheckStatus;
    updatedAt?: string;
    displayText: string;
  }>;
  identity: Array<{
    declaredValues: Record<string, string | null>;
    verifiedValues: Record<string, string | null>;
    source?: string;
    reviewedAt?: string;
    evidenceId?: string;
    status: VerificationReportCheckStatus;
    remarks?: string;
  }>;
  employment: Array<{
    organization: string;
    maskedEmployeeId?: string;
    declaredTitle?: string;
    confirmedTitle?: string;
    declaredStartDate?: string;
    declaredEndDate?: string;
    confirmedStartDate?: string;
    confirmedEndDate?: string;
    employmentType?: string;
    confirmedBy?: string;
    source?: string;
    receivedAt?: string;
    evidenceId?: string;
    reviewer?: string;
    remarks?: string;
    status: VerificationReportCheckStatus;
  }>;
  education: Array<{
    qualification?: string;
    institution?: string;
    university?: string;
    completionYear?: number;
    declaredValues: Record<string, string | null>;
    confirmedValues: Record<string, string | null>;
    source?: string;
    confirmationDate?: string;
    evidenceId?: string;
    status: VerificationReportCheckStatus;
  }>;
  references: Array<{
    name?: string;
    titleOrRelationship?: string;
    organization?: string;
    knownFor?: string;
    requestDate?: string;
    followUpDates: string[];
    responseDate?: string;
    status: VerificationReportCheckStatus;
    strengths?: string;
    developmentAreas?: string;
    rehireResponse?: string;
    comments?: string;
    evidenceId?: string;
  }>;
  address: Array<{
    declaredAddress?: string;
    verificationMethod?: string;
    verifiedAt?: string;
    status: VerificationReportCheckStatus;
    scope?: string;
    physicalVisitPerformed: boolean;
    evidenceId?: string;
  }>;
  courtSearch: Array<{
    safeSubjectDisplay?: string;
    scope?: string;
    searchPeriod?: string;
    searchedAt?: string;
    source?: string;
    finding?: string;
    evidenceId?: string;
    reviewer?: string;
    remarks?: string;
    limitations?: string;
    status: VerificationReportCheckStatus;
  }>;
  openItems: Array<{
    code: string;
    check: string;
    displayText: string;
    requestPublicId?: string;
  }>;
  hrReviewRequired: boolean;
}

interface BackendManagedCandidate {
  candidate_id: string;
  full_name: string | null;
  email_masked: string;
  phone_masked: string | null;
  claim_status: CandidateClaimStatus;
  password_configured: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  activation_expires_at: string | null;
  activation_last_sent_at: string | null;
  created_at: string;
}

interface BackendActivation {
  candidate_id: string;
  claim_status: CandidateClaimStatus;
  email_masked: string;
  expires_at: string;
  last_sent_at: string;
  resend_available_at: string;
  delivery_state: "queued" | "failed";
}

interface BackendReviewItem {
  id: string;
  claim_type: string;
  source_claim_id: string;
  original_payload: Record<string, unknown>;
  edited_payload: Record<string, unknown>;
  selected: boolean;
  review_status: string;
  duplicate_status: string;
  duplicate_candidates: Array<Record<string, unknown>>;
  conflict_warnings: string[];
  import_action: ResumeImportAction;
  target_record_id: string | null;
  imported_record_type: string | null;
  imported_record_id: string | null;
  source_reference: string | null;
  confidence: number | null;
  version: number;
}

interface BackendReviewSession {
  id: string;
  resume_id: string;
  parsed_result_id: string;
  status: string;
  schema_version: string;
  version: number;
  items: BackendReviewItem[];
  created_at: string;
  updated_at: string;
}

interface BackendCourtCheck {
  public_id: string;
  organization_public_id: string;
  person_public_id: string;
  status: CourtCheckStatus;
  searched_at: string | null;
  jurisdiction: string;
  coverage: string;
  search_period: string | null;
  source: string;
  finding: string | null;
  remarks: string | null;
  limitations: string;
  reviewer_user_id: string | null;
  evidence_document_ids: string[];
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
  semantic_notice: string;
}

interface BackendPage<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface BackendInPersonVerification {
  public_id: string;
  organization_public_id: string;
  person_public_id: string;
  verification_type: InPersonVerificationType;
  method: "in_person";
  performed_at: string;
  performed_by_user_id: string;
  person_met: string | null;
  relationship: string | null;
  result: InPersonVerificationResult;
  notes: string | null;
  evidence_document_ids: string[];
  changes_canonical_verification_status: false;
  permanent_address_check_credit: 0;
  created_at: string;
}

interface BackendOrganizationProvisioningStatus {
  organization_public_id: string;
  member_present: boolean;
  owner_membership_present: boolean;
  first_hr_invitation: {
    invitation_public_id: string;
    invitee_email_masked: string;
    status: string;
    effective_status: string;
    expires_at: string | null;
    last_sent_at: string | null;
    delivery_failed_at: string | null;
  } | null;
}

interface BackendVerificationReport {
  schema_version: "hr_verification_report_v1";
  header: {
    person_name: string;
    role: string | null;
    person_id: string;
    initiated_at: string | null;
    requested_by_organization: string;
    masked_email: string | null;
    masked_phone: string | null;
    consent_at: string | null;
    trust_score: number | null;
    report_updated_at: string;
    report_status: VerificationReportStatus;
  };
  check_summaries: Array<{
    check: string;
    status: VerificationReportCheckStatus;
    updated_at: string | null;
    display_text: string;
  }>;
  identity: Array<{
    declared_values: Record<string, string | null>;
    verified_values: Record<string, string | null>;
    source: string | null;
    reviewed_at: string | null;
    evidence_id: string | null;
    status: VerificationReportCheckStatus;
    remarks: string | null;
  }>;
  employment: Array<{
    organization: string;
    masked_employee_id: string | null;
    declared_title: string | null;
    confirmed_title: string | null;
    declared_start_date: string | null;
    declared_end_date: string | null;
    confirmed_start_date: string | null;
    confirmed_end_date: string | null;
    employment_type: string | null;
    confirmed_by: string | null;
    source: string | null;
    received_at: string | null;
    evidence_id: string | null;
    reviewer: string | null;
    remarks: string | null;
    status: VerificationReportCheckStatus;
  }>;
  education: Array<{
    qualification: string | null;
    institution: string | null;
    university: string | null;
    completion_year: number | null;
    declared_values: Record<string, string | null>;
    confirmed_values: Record<string, string | null>;
    source: string | null;
    confirmation_date: string | null;
    evidence_id: string | null;
    status: VerificationReportCheckStatus;
  }>;
  references: Array<{
    name: string | null;
    title_or_relationship: string | null;
    organization: string | null;
    known_for: string | null;
    request_date: string | null;
    follow_up_dates: string[];
    response_date: string | null;
    status: VerificationReportCheckStatus;
    strengths: string | null;
    development_areas: string | null;
    rehire_response: string | null;
    comments: string | null;
    evidence_id: string | null;
  }>;
  address: Array<{
    declared_address: string | null;
    verification_method: string | null;
    verified_at: string | null;
    status: VerificationReportCheckStatus;
    scope: string | null;
    physical_visit_performed: boolean;
    evidence_id: string | null;
  }>;
  court_search: Array<{
    safe_subject_display: string | null;
    scope: string | null;
    search_period: string | null;
    searched_at: string | null;
    source: string | null;
    finding: string | null;
    evidence_id: string | null;
    reviewer: string | null;
    remarks: string | null;
    limitations: string | null;
    status: VerificationReportCheckStatus;
  }>;
  open_items: Array<{
    code: string;
    check: string;
    display_text: string;
    request_public_id: string | null;
  }>;
  hr_review_required: boolean;
  metadata?: Record<string, unknown>;
}

export interface AdminOperationsAdapter {
  createCandidate: (input: CreateCandidateInput) => Promise<ManagedCandidate>;
  getCandidate: (candidateId: string) => Promise<ManagedCandidate>;
  sendActivation: (candidateId: string) => Promise<CandidateActivation>;
  resendActivation: (candidateId: string) => Promise<CandidateActivation>;
  updateProfile: (
    candidateId: string,
    input: ProfileMutationInput,
  ) => Promise<ProfileMutationResult>;
  mutateCareer: (
    candidateId: string,
    input: {
      claimType: CareerClaimType;
      payload: Record<string, unknown>;
      source: "admin_entered" | "cv_extracted";
    },
    recordId?: string,
  ) => Promise<CareerMutationResult>;
  uploadResume: (candidateId: string, file: File) => Promise<ResumeProcessReceipt>;
  getParsedResume: (candidateId: string, resumeId: string) => Promise<ResumeParsedResult>;
  createResumeReview: (candidateId: string, resumeId: string) => Promise<ResumeReviewSession>;
  updateReviewItem: (
    candidateId: string,
    reviewId: string,
    itemId: string,
    input: {
      expectedVersion: number;
      selected?: boolean;
      editedPayload?: Record<string, unknown>;
      importAction?: ResumeImportAction;
      targetRecordId?: string;
      confirmDistinctRole?: boolean;
    },
  ) => Promise<ResumeReviewItem>;
  validateReview: (
    candidateId: string,
    reviewId: string,
    version: number,
  ) => Promise<ResumeReviewPlan>;
  importReview: (
    candidateId: string,
    reviewId: string,
    version: number,
    idempotencyKey: string,
  ) => Promise<ResumeImportBatch>;
  createOrganization: (input: {
    name: string;
    organizationType: string;
    website?: string;
    industry?: string;
    location?: string;
    workEmail?: string;
    domain?: string;
    organizationSize?: string;
    idempotencyKey: string;
  }) => Promise<OrganizationProvisioningResult>;
  inviteFirstHr: (
    organizationId: string,
    input: { fullName: string; email: string },
  ) => Promise<FirstHrInvitation>;
  resendFirstHr: (
    organizationId: string,
    invitationId: string,
    input: { fullName: string; email: string },
  ) => Promise<FirstHrInvitation>;
  getOrganizationProvisioning: (organizationId: string) => Promise<OrganizationProvisioningStatus>;
  uploadEvidence: (candidateId: string, file: File) => Promise<EvidenceReceipt>;
  listCourtChecks: (
    organizationId: string,
    personId: string,
    page?: number,
    pageSize?: number,
  ) => Promise<AdminOperationsPage<CourtCheck>>;
  getCourtCheck: (
    organizationId: string,
    personId: string,
    checkId: string,
    signal?: AbortSignal,
  ) => Promise<CourtCheck>;
  createCourtCheck: (
    organizationId: string,
    personId: string,
    input: CourtCheckInput,
  ) => Promise<CourtCheck>;
  updateCourtCheck: (
    organizationId: string,
    personId: string,
    checkId: string,
    input: CourtCheckUpdateInput,
  ) => Promise<CourtCheck>;
  finalizeCourtCheck: (
    organizationId: string,
    personId: string,
    checkId: string,
  ) => Promise<CourtCheck>;
  recordInPerson: (
    organizationId: string,
    personId: string,
    input: InPersonVerificationInput,
  ) => Promise<InPersonVerificationReceipt>;
  listInPersonVerifications: (
    organizationId: string,
    personId: string,
    page?: number,
    pageSize?: number,
  ) => Promise<AdminOperationsPage<InPersonVerificationReceipt>>;
  getInPersonVerification: (
    organizationId: string,
    personId: string,
    recordId: string,
  ) => Promise<InPersonVerificationReceipt>;
  getVerificationReport: (
    organizationId: string,
    personId: string,
  ) => Promise<AdminVerificationReport>;
}

export const adminOperationsKeys = {
  all: () => ["admin", "operations-v1-1"] as const,
  candidate: (candidateId: string) =>
    [...adminOperationsKeys.all(), "candidate", candidateId] as const,
  provisioning: (organizationId: string) =>
    [...adminOperationsKeys.all(), "provisioning", organizationId] as const,
  courtList: (organizationId: string, personId: string, page = 1, pageSize = 100) =>
    [
      ...adminOperationsKeys.all(),
      "court",
      organizationId,
      personId,
      "list",
      page,
      pageSize,
    ] as const,
  courtDetail: (organizationId: string, personId: string, checkId: string) =>
    [...adminOperationsKeys.all(), "court", organizationId, personId, "detail", checkId] as const,
  inPersonList: (organizationId: string, personId: string, page = 1, pageSize = 100) =>
    [
      ...adminOperationsKeys.all(),
      "in-person",
      organizationId,
      personId,
      "list",
      page,
      pageSize,
    ] as const,
  inPersonDetail: (organizationId: string, personId: string, recordId: string) =>
    [
      ...adminOperationsKeys.all(),
      "in-person",
      organizationId,
      personId,
      "detail",
      recordId,
    ] as const,
  verificationReport: (organizationId: string, personId: string) =>
    [...adminOperationsKeys.all(), "verification-report", organizationId, personId] as const,
};

export function createAdminOperationsAdapter(
  config: AppEnvConfig = appEnv,
  options: ProductionAdminApiOptions = {},
): AdminOperationsAdapter {
  const api = createAdminAuthenticatedApi(config, options);
  const uploadFetch = options.fetchImpl ?? fetch;

  const candidatePath = (candidateId: string) =>
    `/api/v1/admin/operations/candidates/${encodeURIComponent(candidateId)}`;
  const organizationPersonPath = (organizationId: string, personId: string) =>
    `/api/v1/admin/operations/organizations/${encodeURIComponent(organizationId)}/people/${encodeURIComponent(personId)}`;

  return {
    async createCandidate(input) {
      return mapCandidate(
        await api.request<BackendManagedCandidate>("/api/v1/admin/operations/candidates", {
          method: "POST",
          body: {
            full_name: input.fullName,
            email: input.email,
            ...(input.phone ? { phone: input.phone } : {}),
            ...(input.headline ? { headline: input.headline } : {}),
            ...(input.location ? { location: input.location } : {}),
            idempotency_key: input.idempotencyKey,
          },
        }),
      );
    },
    async getCandidate(candidateId) {
      return mapCandidate(await api.request<BackendManagedCandidate>(candidatePath(candidateId)));
    },
    async sendActivation(candidateId) {
      return mapActivation(
        await api.request<BackendActivation>(`${candidatePath(candidateId)}/activation`, {
          method: "POST",
        }),
      );
    },
    async resendActivation(candidateId) {
      return mapActivation(
        await api.request<BackendActivation>(`${candidatePath(candidateId)}/activation/resend`, {
          method: "POST",
        }),
      );
    },
    async updateProfile(candidateId, input) {
      const response = await api.request<{
        candidate_id: string;
        claim_status: CandidateClaimStatus;
        updated_fields: string[];
        provenance_source: ProvenanceSource;
        candidate_confirmation_required: boolean;
      }>(`${candidatePath(candidateId)}/profile`, {
        method: "PATCH",
        body: toSnakeProfile(input),
      });
      return {
        candidateId: response.candidate_id,
        claimStatus: response.claim_status,
        updatedFields: response.updated_fields,
        provenanceSource: response.provenance_source,
        candidateConfirmationRequired: response.candidate_confirmation_required,
      };
    },
    async mutateCareer(candidateId, input, recordId) {
      const response = await api.request<{
        candidate_id: string;
        claim_type: CareerClaimType;
        record_id: string;
        updated_fields: string[];
        provenance_source: ProvenanceSource;
        verification_status: string;
      }>(
        `${candidatePath(candidateId)}/career${recordId ? `/${encodeURIComponent(recordId)}` : ""}`,
        {
          method: recordId ? "PATCH" : "POST",
          body: {
            claim_type: input.claimType,
            payload: input.payload,
            source: input.source,
          },
        },
      );
      return {
        candidateId: response.candidate_id,
        claimType: response.claim_type,
        recordId: response.record_id,
        updatedFields: response.updated_fields,
        provenanceSource: response.provenance_source,
        verificationStatus: response.verification_status,
      };
    },
    async uploadResume(candidateId, file) {
      const intent = await api.request<{
        resume_id: string;
        upload_url: string;
        expires_in: number;
        object_key: string;
      }>(`${candidatePath(candidateId)}/resumes/upload-intent`, {
        method: "POST",
        body: {
          original_filename: file.name,
          content_type: file.type,
          byte_size: file.size,
          consent_version: "admin-assisted-profile-v1",
        },
      });
      await putPresigned(uploadFetch, intent.upload_url, file, { "content-type": file.type });
      const checksum = await sha256(file);
      await api.request(
        `${candidatePath(candidateId)}/resumes/${encodeURIComponent(intent.resume_id)}/complete-upload`,
        {
          method: "POST",
          body: { checksum_sha256: checksum },
        },
      );
      const receipt = await api.request<{ resume_id: string; job_id: string; status: string }>(
        `${candidatePath(candidateId)}/resumes/${encodeURIComponent(intent.resume_id)}/process`,
        { method: "POST" },
      );
      return { resumeId: receipt.resume_id, jobId: receipt.job_id, status: receipt.status };
    },
    async getParsedResume(candidateId, resumeId) {
      const response = await api.request<{
        resume_id: string;
        job_id: string;
        schema_version: string;
        status: string;
        structured_result: Record<string, unknown>;
        warnings: string[];
      }>(`${candidatePath(candidateId)}/resumes/${encodeURIComponent(resumeId)}/parsed-result`);
      return {
        resumeId: response.resume_id,
        jobId: response.job_id,
        schemaVersion: response.schema_version,
        status: response.status,
        structuredResult: response.structured_result,
        warnings: response.warnings,
      };
    },
    async createResumeReview(candidateId, resumeId) {
      return mapReviewSession(
        await api.request<BackendReviewSession>(
          `${candidatePath(candidateId)}/resumes/${encodeURIComponent(resumeId)}/review-session`,
          { method: "POST" },
        ),
      );
    },
    async updateReviewItem(candidateId, reviewId, itemId, input) {
      return mapReviewItem(
        await api.request<BackendReviewItem>(
          `${candidatePath(candidateId)}/resume-reviews/${encodeURIComponent(reviewId)}/items/${encodeURIComponent(itemId)}`,
          {
            method: "PATCH",
            body: {
              expected_version: input.expectedVersion,
              ...(input.selected !== undefined ? { selected: input.selected } : {}),
              ...(input.editedPayload ? { edited_payload: input.editedPayload } : {}),
              ...(input.importAction ? { import_action: input.importAction } : {}),
              ...(input.targetRecordId ? { target_record_id: input.targetRecordId } : {}),
              confirm_distinct_role: input.confirmDistinctRole ?? false,
            },
          },
        ),
      );
    },
    async validateReview(candidateId, reviewId, version) {
      const response = await api.request<{
        session_id: string;
        ready: boolean;
        version: number;
        items: Array<{
          item_id: string;
          claim_type: string;
          action: string;
          target_model: string | null;
          duplicate_status: string;
          target_record_id: string | null;
          fields_to_create: string[];
          fields_ignored: string[];
          blockers: string[];
          warnings: string[];
          verified_record_protected: boolean;
        }>;
      }>(`${candidatePath(candidateId)}/resume-reviews/${encodeURIComponent(reviewId)}/validate`, {
        method: "POST",
        body: { expected_version: version },
      });
      return {
        sessionId: response.session_id,
        ready: response.ready,
        version: response.version,
        items: response.items.map((item) => ({
          itemId: item.item_id,
          claimType: item.claim_type,
          action: item.action,
          targetModel: item.target_model ?? undefined,
          duplicateStatus: item.duplicate_status,
          targetRecordId: item.target_record_id ?? undefined,
          fieldsToCreate: item.fields_to_create,
          fieldsIgnored: item.fields_ignored,
          blockers: item.blockers,
          warnings: item.warnings,
          verifiedRecordProtected: item.verified_record_protected,
        })),
      };
    },
    async importReview(candidateId, reviewId, version, idempotencyKey) {
      const response = await api.request<{
        id: string;
        review_session_id: string;
        status: string;
        total_count: number;
        imported_count: number;
        linked_count: number;
        skipped_count: number;
        failed_count: number;
        blocked_count: number;
        incomplete_count: number;
        results: Array<{
          review_item_id: string;
          outcome: string;
          record_type: string | null;
          record_id: string | null;
          sanitized_error_code: string | null;
          warnings: string[];
        }>;
      }>(`${candidatePath(candidateId)}/resume-reviews/${encodeURIComponent(reviewId)}/import`, {
        method: "POST",
        body: { expected_version: version, idempotency_key: idempotencyKey, confirmed: true },
      });
      return {
        id: response.id,
        reviewSessionId: response.review_session_id,
        status: response.status,
        totalCount: response.total_count,
        importedCount: response.imported_count,
        linkedCount: response.linked_count,
        skippedCount: response.skipped_count,
        failedCount: response.failed_count,
        blockedCount: response.blocked_count,
        incompleteCount: response.incomplete_count,
        results: response.results.map((item) => ({
          reviewItemId: item.review_item_id,
          outcome: item.outcome,
          recordType: item.record_type ?? undefined,
          recordId: item.record_id ?? undefined,
          sanitizedErrorCode: item.sanitized_error_code ?? undefined,
          warnings: item.warnings,
        })),
      };
    },
    async createOrganization(input) {
      const response = await api.request<{
        organization_public_id: string;
        name: string;
        organization_type: string;
        lifecycle_state: "awaiting_first_hr_claim";
        verification_state: string;
        setup_completed: false;
        owner_membership_present: false;
        created_at: string;
      }>("/api/v1/admin/operations/organizations", {
        method: "POST",
        body: {
          name: input.name,
          organization_type: input.organizationType,
          ...(input.website ? { website: input.website } : {}),
          ...(input.industry ? { industry: input.industry } : {}),
          ...(input.location ? { location: input.location } : {}),
          ...(input.workEmail ? { work_email: input.workEmail } : {}),
          ...(input.domain ? { domain: input.domain } : {}),
          ...(input.organizationSize ? { organization_size: input.organizationSize } : {}),
          idempotency_key: input.idempotencyKey,
        },
      });
      return {
        organizationPublicId: response.organization_public_id,
        name: response.name,
        organizationType: response.organization_type,
        lifecycleState: response.lifecycle_state,
        verificationState: response.verification_state,
        setupCompleted: response.setup_completed,
        ownerMembershipPresent: response.owner_membership_present,
        createdAt: response.created_at,
      };
    },
    async inviteFirstHr(organizationId, input) {
      return mapFirstHr(
        await api.request(
          `${`/api/v1/admin/operations/organizations/${encodeURIComponent(organizationId)}`}/first-hr-invitations`,
          {
            method: "POST",
            body: { full_name: input.fullName, email: input.email, role: "owner" },
          },
        ),
      );
    },
    async resendFirstHr(organizationId, invitationId, input) {
      return mapFirstHr(
        await api.request(
          `/api/v1/admin/operations/organizations/${encodeURIComponent(organizationId)}/first-hr-invitations/${encodeURIComponent(invitationId)}/resend`,
          {
            method: "POST",
            body: { full_name: input.fullName, email: input.email, role: "owner" },
          },
        ),
      );
    },
    async getOrganizationProvisioning(organizationId) {
      return mapOrganizationProvisioning(
        await api.request<BackendOrganizationProvisioningStatus>(
          `/api/v1/admin/operations/organizations/${encodeURIComponent(organizationId)}/provisioning`,
        ),
      );
    },
    async uploadEvidence(candidateId, file) {
      const intent = await api.request<{
        document_id: string;
        upload_url: string;
        headers_required: Record<string, string>;
      }>(`${candidatePath(candidateId)}/evidence/upload-intent`, {
        method: "POST",
        body: {
          document_type: "other",
          original_filename: file.name,
          content_type: file.type,
          byte_size: file.size,
        },
      });
      await putPresigned(uploadFetch, intent.upload_url, file, intent.headers_required);
      const checksum = await sha256(file);
      const response = await api.request<{
        id: string;
        original_filename: string;
        content_type: string;
        byte_size: number;
        verification_status: string;
      }>(
        `${candidatePath(candidateId)}/evidence/${encodeURIComponent(intent.document_id)}/complete-upload`,
        {
          method: "POST",
          body: { checksum_sha256: checksum },
        },
      );
      return {
        documentId: response.id,
        originalFilename: response.original_filename,
        contentType: response.content_type,
        byteSize: response.byte_size,
        verificationStatus: response.verification_status,
      };
    },
    async listCourtChecks(organizationId, personId, page = 1, pageSize = 100) {
      const response = await api.request<BackendPage<BackendCourtCheck>>(
        `${organizationPersonPath(organizationId, personId)}/court-checks?${pageQuery(page, pageSize)}`,
      );
      return mapOperationsPage(response, mapCourt);
    },
    async getCourtCheck(organizationId, personId, checkId, signal) {
      return mapCourt(
        await api.request<BackendCourtCheck>(
          `${organizationPersonPath(organizationId, personId)}/court-checks/${encodeURIComponent(checkId)}`,
          { signal },
        ),
      );
    },
    async createCourtCheck(organizationId, personId, input) {
      return mapCourt(
        await api.request<BackendCourtCheck>(
          `${organizationPersonPath(organizationId, personId)}/court-checks`,
          {
            method: "POST",
            body: toSnakeCourt(input),
          },
        ),
      );
    },
    async updateCourtCheck(organizationId, personId, checkId, input) {
      return mapCourt(
        await api.request<BackendCourtCheck>(
          `${organizationPersonPath(organizationId, personId)}/court-checks/${encodeURIComponent(checkId)}`,
          { method: "PATCH", body: toSnakeCourtUpdate(input) },
        ),
      );
    },
    async finalizeCourtCheck(organizationId, personId, checkId) {
      return mapCourt(
        await api.request<BackendCourtCheck>(
          `${organizationPersonPath(organizationId, personId)}/court-checks/${encodeURIComponent(checkId)}/finalize`,
          { method: "POST" },
        ),
      );
    },
    async listInPersonVerifications(organizationId, personId, page = 1, pageSize = 100) {
      const response = await api.request<BackendPage<BackendInPersonVerification>>(
        `${organizationPersonPath(organizationId, personId)}/in-person-verifications?${pageQuery(page, pageSize)}`,
      );
      return mapOperationsPage(response, mapInPerson);
    },
    async getInPersonVerification(organizationId, personId, recordId) {
      return mapInPerson(
        await api.request<BackendInPersonVerification>(
          `${organizationPersonPath(organizationId, personId)}/in-person-verifications/${encodeURIComponent(recordId)}`,
        ),
      );
    },
    async recordInPerson(organizationId, personId, input) {
      return mapInPerson(
        await api.request<BackendInPersonVerification>(
          `${organizationPersonPath(organizationId, personId)}/in-person-verifications`,
          {
            method: "POST",
            body: {
              verification_type: input.verificationType,
              performed_at: input.performedAt,
              ...(input.personMet ? { person_met: input.personMet } : {}),
              ...(input.relationship ? { relationship: input.relationship } : {}),
              result: input.result,
              ...(input.notes ? { notes: input.notes } : {}),
              evidence_document_ids: input.evidenceDocumentIds,
              idempotency_key: input.idempotencyKey,
            },
          },
        ),
      );
    },
    async getVerificationReport(organizationId, personId) {
      return mapVerificationReport(
        await api.request<BackendVerificationReport>(
          `/api/v1/admin/organizations/${encodeURIComponent(organizationId)}/people/${encodeURIComponent(personId)}/verification-report`,
        ),
      );
    },
  };
}

export function managedCandidateQueryOptions(
  candidateId: string,
  config: AppEnvConfig = appEnv,
  options: ProductionAdminApiOptions = {},
) {
  return queryOptions({
    queryKey: adminOperationsKeys.candidate(candidateId),
    queryFn: () => createAdminOperationsAdapter(config, options).getCandidate(candidateId),
    retry: false,
  });
}

export function organizationProvisioningQueryOptions(
  organizationId: string,
  config: AppEnvConfig = appEnv,
  options: ProductionAdminApiOptions = {},
) {
  return queryOptions({
    queryKey: adminOperationsKeys.provisioning(organizationId),
    queryFn: () =>
      createAdminOperationsAdapter(config, options).getOrganizationProvisioning(organizationId),
    retry: false,
  });
}

export async function rehydrateOrganizationProvisioning(
  queryClient: QueryClient,
  organizationId: string,
  config: AppEnvConfig = appEnv,
  options: ProductionAdminApiOptions = {},
) {
  const query = organizationProvisioningQueryOptions(organizationId, config, options);
  await queryClient.invalidateQueries({ queryKey: query.queryKey, refetchType: "none" });
  return queryClient.fetchQuery(query);
}

export function courtReceiptsQueryOptions(
  organizationId: string,
  personId: string,
  page = 1,
  pageSize = 100,
  config: AppEnvConfig = appEnv,
  options: ProductionAdminApiOptions = {},
) {
  return queryOptions({
    queryKey: adminOperationsKeys.courtList(organizationId, personId, page, pageSize),
    queryFn: () =>
      createAdminOperationsAdapter(config, options).listCourtChecks(
        organizationId,
        personId,
        page,
        pageSize,
      ),
    retry: false,
  });
}

export function courtReceiptQueryOptions(
  organizationId: string,
  personId: string,
  checkId: string,
  config: AppEnvConfig = appEnv,
  options: ProductionAdminApiOptions = {},
) {
  return queryOptions({
    queryKey: adminOperationsKeys.courtDetail(organizationId, personId, checkId),
    queryFn: ({ signal }) =>
      createAdminOperationsAdapter(config, options).getCourtCheck(
        organizationId,
        personId,
        checkId,
        signal,
      ),
    retry: false,
  });
}

export async function refreshCourtReceiptCache(
  queryClient: QueryClient,
  organizationId: string,
  personId: string,
  checkId: string,
  config: AppEnvConfig = appEnv,
  options: ProductionAdminApiOptions = {},
) {
  const listKey = adminOperationsKeys.courtList(organizationId, personId);
  const detail = courtReceiptQueryOptions(organizationId, personId, checkId, config, options);
  await queryClient.cancelQueries({ queryKey: detail.queryKey, exact: true });
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: listKey }),
    queryClient.invalidateQueries({ queryKey: detail.queryKey, refetchType: "none" }),
  ]);
  return queryClient.fetchQuery(detail);
}

export function inPersonReceiptsQueryOptions(
  organizationId: string,
  personId: string,
  page = 1,
  pageSize = 100,
  config: AppEnvConfig = appEnv,
  options: ProductionAdminApiOptions = {},
) {
  return queryOptions({
    queryKey: adminOperationsKeys.inPersonList(organizationId, personId, page, pageSize),
    queryFn: () =>
      createAdminOperationsAdapter(config, options).listInPersonVerifications(
        organizationId,
        personId,
        page,
        pageSize,
      ),
    retry: false,
  });
}

export function inPersonReceiptQueryOptions(
  organizationId: string,
  personId: string,
  recordId: string,
  config: AppEnvConfig = appEnv,
  options: ProductionAdminApiOptions = {},
) {
  return queryOptions({
    queryKey: adminOperationsKeys.inPersonDetail(organizationId, personId, recordId),
    queryFn: () =>
      createAdminOperationsAdapter(config, options).getInPersonVerification(
        organizationId,
        personId,
        recordId,
      ),
    retry: false,
  });
}

export function adminVerificationReportQueryOptions(
  organizationId: string,
  personId: string,
  config: AppEnvConfig = appEnv,
  options: ProductionAdminApiOptions = {},
) {
  return queryOptions({
    queryKey: adminOperationsKeys.verificationReport(organizationId, personId),
    queryFn: () =>
      createAdminOperationsAdapter(config, options).getVerificationReport(organizationId, personId),
    retry: false,
  });
}

function mapCandidate(response: BackendManagedCandidate): ManagedCandidate {
  return {
    candidateId: response.candidate_id,
    fullName: response.full_name ?? undefined,
    emailMasked: response.email_masked,
    phoneMasked: response.phone_masked ?? undefined,
    claimStatus: response.claim_status,
    passwordConfigured: response.password_configured,
    emailVerified: response.email_verified,
    phoneVerified: response.phone_verified,
    activationExpiresAt: response.activation_expires_at ?? undefined,
    activationLastSentAt: response.activation_last_sent_at ?? undefined,
    createdAt: response.created_at,
  };
}

function mapActivation(response: BackendActivation): CandidateActivation {
  return {
    candidateId: response.candidate_id,
    claimStatus: response.claim_status,
    emailMasked: response.email_masked,
    expiresAt: response.expires_at,
    lastSentAt: response.last_sent_at,
    resendAvailableAt: response.resend_available_at,
    deliveryState: response.delivery_state,
  };
}

function mapReviewItem(item: BackendReviewItem): ResumeReviewItem {
  return {
    id: item.id,
    claimType: item.claim_type,
    sourceClaimId: item.source_claim_id,
    originalPayload: item.original_payload,
    editedPayload: item.edited_payload,
    selected: item.selected,
    reviewStatus: item.review_status,
    duplicateStatus: item.duplicate_status,
    duplicateCandidates: item.duplicate_candidates,
    conflictWarnings: item.conflict_warnings,
    importAction: item.import_action,
    targetRecordId: item.target_record_id ?? undefined,
    importedRecordType: item.imported_record_type ?? undefined,
    importedRecordId: item.imported_record_id ?? undefined,
    sourceReference: item.source_reference ?? undefined,
    confidence: item.confidence ?? undefined,
    version: item.version,
  };
}

function mapReviewSession(response: BackendReviewSession): ResumeReviewSession {
  return {
    id: response.id,
    resumeId: response.resume_id,
    parsedResultId: response.parsed_result_id,
    status: response.status,
    schemaVersion: response.schema_version,
    version: response.version,
    items: response.items.map(mapReviewItem),
    createdAt: response.created_at,
    updatedAt: response.updated_at,
  };
}

function mapFirstHr(response: unknown): FirstHrInvitation {
  const item = response as {
    invitation_public_id: string;
    organization_public_id: string;
    invitee_email_masked: string;
    role: "owner";
    status: string;
    expires_at: string;
    last_sent_at: string;
    acceptance_path: "/team-invitations/accept?token={opaque_token}";
  };
  return {
    invitationPublicId: item.invitation_public_id,
    organizationPublicId: item.organization_public_id,
    inviteeEmailMasked: item.invitee_email_masked,
    role: item.role,
    status: item.status,
    expiresAt: item.expires_at,
    lastSentAt: item.last_sent_at,
    acceptancePath: item.acceptance_path,
  };
}

function mapOrganizationProvisioning(
  response: BackendOrganizationProvisioningStatus,
): OrganizationProvisioningStatus {
  const invitation = response.first_hr_invitation;
  return {
    organizationPublicId: response.organization_public_id,
    memberPresent: response.member_present,
    ownerMembershipPresent: response.owner_membership_present,
    firstHrInvitation: invitation
      ? {
          invitationPublicId: invitation.invitation_public_id,
          inviteeEmailMasked: invitation.invitee_email_masked,
          status: invitation.status,
          effectiveStatus: invitation.effective_status,
          expiresAt: invitation.expires_at ?? undefined,
          lastSentAt: invitation.last_sent_at ?? undefined,
          deliveryFailedAt: invitation.delivery_failed_at ?? undefined,
        }
      : undefined,
  };
}

function mapOperationsPage<TBackend, TItem>(
  response: BackendPage<TBackend>,
  mapItem: (item: TBackend) => TItem,
): AdminOperationsPage<TItem> {
  return {
    items: response.items.map(mapItem),
    total: response.total,
    page: response.page,
    pageSize: response.page_size,
    totalPages: response.total_pages,
  };
}

function mapCourt(response: BackendCourtCheck): CourtCheck {
  return {
    publicId: response.public_id,
    organizationPublicId: response.organization_public_id,
    personPublicId: response.person_public_id,
    status: response.status,
    searchedAt: response.searched_at ?? undefined,
    jurisdiction: response.jurisdiction,
    coverage: response.coverage,
    searchPeriod: response.search_period ?? undefined,
    source: response.source,
    finding: response.finding ?? undefined,
    remarks: response.remarks ?? undefined,
    limitations: response.limitations,
    reviewerUserId: response.reviewer_user_id ?? undefined,
    evidenceDocumentIds: response.evidence_document_ids,
    finalizedAt: response.finalized_at ?? undefined,
    createdAt: response.created_at,
    updatedAt: response.updated_at,
    semanticNotice: response.semantic_notice,
  };
}

function mapInPerson(response: BackendInPersonVerification): InPersonVerificationReceipt {
  return {
    publicId: response.public_id,
    organizationPublicId: response.organization_public_id,
    personPublicId: response.person_public_id,
    verificationType: response.verification_type,
    method: response.method,
    performedAt: response.performed_at,
    performedByUserId: response.performed_by_user_id,
    personMet: response.person_met ?? undefined,
    relationship: response.relationship ?? undefined,
    result: response.result,
    notes: response.notes ?? undefined,
    evidenceDocumentIds: response.evidence_document_ids,
    changesCanonicalVerificationStatus: response.changes_canonical_verification_status,
    permanentAddressCheckCredit: response.permanent_address_check_credit,
    createdAt: response.created_at,
  };
}

function mapVerificationReport(response: BackendVerificationReport): AdminVerificationReport {
  return {
    schemaVersion: response.schema_version,
    header: {
      personName: response.header.person_name,
      role: response.header.role ?? undefined,
      personId: response.header.person_id,
      initiatedAt: response.header.initiated_at ?? undefined,
      requestedByOrganization: response.header.requested_by_organization,
      maskedEmail: response.header.masked_email ?? undefined,
      maskedPhone: response.header.masked_phone ?? undefined,
      consentAt: response.header.consent_at ?? undefined,
      trustScore: response.header.trust_score ?? undefined,
      reportUpdatedAt: response.header.report_updated_at,
      reportStatus: response.header.report_status,
    },
    checkSummaries: response.check_summaries.map((item) => ({
      check: item.check,
      status: item.status,
      updatedAt: item.updated_at ?? undefined,
      displayText: item.display_text,
    })),
    identity: response.identity.map((item) => ({
      declaredValues: item.declared_values,
      verifiedValues: item.verified_values,
      source: item.source ?? undefined,
      reviewedAt: item.reviewed_at ?? undefined,
      evidenceId: item.evidence_id ?? undefined,
      status: item.status,
      remarks: item.remarks ?? undefined,
    })),
    employment: response.employment.map((item) => ({
      organization: item.organization,
      maskedEmployeeId: item.masked_employee_id ?? undefined,
      declaredTitle: item.declared_title ?? undefined,
      confirmedTitle: item.confirmed_title ?? undefined,
      declaredStartDate: item.declared_start_date ?? undefined,
      declaredEndDate: item.declared_end_date ?? undefined,
      confirmedStartDate: item.confirmed_start_date ?? undefined,
      confirmedEndDate: item.confirmed_end_date ?? undefined,
      employmentType: item.employment_type ?? undefined,
      confirmedBy: item.confirmed_by ?? undefined,
      source: item.source ?? undefined,
      receivedAt: item.received_at ?? undefined,
      evidenceId: item.evidence_id ?? undefined,
      reviewer: item.reviewer ?? undefined,
      remarks: item.remarks ?? undefined,
      status: item.status,
    })),
    education: response.education.map((item) => ({
      qualification: item.qualification ?? undefined,
      institution: item.institution ?? undefined,
      university: item.university ?? undefined,
      completionYear: item.completion_year ?? undefined,
      declaredValues: item.declared_values,
      confirmedValues: item.confirmed_values,
      source: item.source ?? undefined,
      confirmationDate: item.confirmation_date ?? undefined,
      evidenceId: item.evidence_id ?? undefined,
      status: item.status,
    })),
    references: response.references.map((item) => ({
      name: item.name ?? undefined,
      titleOrRelationship: item.title_or_relationship ?? undefined,
      organization: item.organization ?? undefined,
      knownFor: item.known_for ?? undefined,
      requestDate: item.request_date ?? undefined,
      followUpDates: item.follow_up_dates,
      responseDate: item.response_date ?? undefined,
      status: item.status,
      strengths: item.strengths ?? undefined,
      developmentAreas: item.development_areas ?? undefined,
      rehireResponse: item.rehire_response ?? undefined,
      comments: item.comments ?? undefined,
      evidenceId: item.evidence_id ?? undefined,
    })),
    address: response.address.map((item) => ({
      declaredAddress: item.declared_address ?? undefined,
      verificationMethod: item.verification_method ?? undefined,
      verifiedAt: item.verified_at ?? undefined,
      status: item.status,
      scope: item.scope ?? undefined,
      physicalVisitPerformed: item.physical_visit_performed,
      evidenceId: item.evidence_id ?? undefined,
    })),
    courtSearch: response.court_search.map((item) => ({
      safeSubjectDisplay: item.safe_subject_display ?? undefined,
      scope: item.scope ?? undefined,
      searchPeriod: item.search_period ?? undefined,
      searchedAt: item.searched_at ?? undefined,
      source: item.source ?? undefined,
      finding: item.finding ?? undefined,
      evidenceId: item.evidence_id ?? undefined,
      reviewer: item.reviewer ?? undefined,
      remarks: item.remarks ?? undefined,
      limitations: item.limitations ?? undefined,
      status: item.status,
    })),
    openItems: response.open_items.map((item) => ({
      code: item.code,
      check: item.check,
      displayText: item.display_text,
      requestPublicId: item.request_public_id ?? undefined,
    })),
    hrReviewRequired: response.hr_review_required,
  };
}

function pageQuery(page: number, pageSize: number) {
  return new URLSearchParams({ page: String(page), page_size: String(pageSize) }).toString();
}

function toSnakeProfile(input: ProfileMutationInput) {
  return {
    ...(input.fullName ? { full_name: input.fullName } : {}),
    ...(input.phone ? { phone: input.phone } : {}),
    ...(input.currentRole ? { current_role: input.currentRole } : {}),
    ...(input.industry ? { industry: input.industry } : {}),
    ...(input.yearsOfExperience !== undefined
      ? { years_of_experience: input.yearsOfExperience }
      : {}),
    ...(input.location ? { location: input.location } : {}),
    ...(input.locationCity ? { location_city: input.locationCity } : {}),
    ...(input.locationRegion ? { location_region: input.locationRegion } : {}),
    ...(input.locationCountry ? { location_country: input.locationCountry } : {}),
    ...(input.headline ? { headline: input.headline } : {}),
    ...(input.bio ? { bio: input.bio } : {}),
    source: input.source,
  };
}

function toSnakeCourt(input: Partial<CourtCheckInput>) {
  return {
    ...(input.status ? { status: input.status } : {}),
    ...(input.searchedAt ? { searched_at: input.searchedAt } : {}),
    ...(input.jurisdiction ? { jurisdiction: input.jurisdiction } : {}),
    ...(input.coverage ? { coverage: input.coverage } : {}),
    ...(input.searchPeriod ? { search_period: input.searchPeriod } : {}),
    ...(input.source ? { source: input.source } : {}),
    ...(input.finding ? { finding: input.finding } : {}),
    ...(input.remarks ? { remarks: input.remarks } : {}),
    ...(input.limitations ? { limitations: input.limitations } : {}),
    ...(input.evidenceDocumentIds ? { evidence_document_ids: input.evidenceDocumentIds } : {}),
    ...(input.idempotencyKey ? { idempotency_key: input.idempotencyKey } : {}),
  };
}

function toSnakeCourtUpdate(input: CourtCheckUpdateInput) {
  const { searchedAt, searchPeriod, finding, remarks, ...nonNullable } = input;
  const { idempotency_key: _ignored, ...serialized } = toSnakeCourt(nonNullable);
  const body: Record<string, unknown> = serialized;
  if ("searchedAt" in input) body.searched_at = searchedAt ?? null;
  if ("searchPeriod" in input) body.search_period = searchPeriod ?? null;
  if ("finding" in input) body.finding = finding ?? null;
  if ("remarks" in input) body.remarks = remarks ?? null;
  return body;
}

const EVIDENCE_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function validateEvidenceFile(file: File) {
  if (!EVIDENCE_CONTENT_TYPES.has(file.type.toLowerCase())) {
    return "Evidence must be PDF, JPEG, PNG, or WebP.";
  }
  if (file.size <= 0) return "Evidence file cannot be empty.";
  if (file.size > 50 * 1024 * 1024) return "Evidence cannot exceed 50 MiB.";
  if (!file.name.trim() || /[\\/]/.test(file.name)) return "Evidence must have a safe file name.";
  return null;
}

async function putPresigned(
  fetchImpl: typeof fetch,
  url: string,
  file: File,
  requiredHeaders: Record<string, string>,
) {
  const response = await fetchImpl(url, {
    method: "PUT",
    headers: requiredHeaders,
    body: file,
  });
  if (!response.ok) throw new Error("The selected file could not be uploaded to secure storage.");
}

async function sha256(file: File) {
  const bytes = await file.arrayBuffer();
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
