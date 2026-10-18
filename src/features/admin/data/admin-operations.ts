import { queryOptions } from "@tanstack/react-query";
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
  uploadEvidence: (candidateId: string, file: File) => Promise<EvidenceReceipt>;
  createCourtCheck: (
    organizationId: string,
    personId: string,
    input: CourtCheckInput,
  ) => Promise<CourtCheck>;
  updateCourtCheck: (
    organizationId: string,
    personId: string,
    checkId: string,
    input: Partial<Omit<CourtCheckInput, "idempotencyKey">>,
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
}

export const adminOperationsKeys = {
  all: () => ["admin", "operations-v1-1"] as const,
  candidate: (candidateId: string) =>
    [...adminOperationsKeys.all(), "candidate", candidateId] as const,
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
    async recordInPerson(organizationId, personId, input) {
      const response = await api.request<{
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
      }>(`${organizationPersonPath(organizationId, personId)}/in-person-verifications`, {
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
      });
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

function toSnakeCourtUpdate(input: Partial<Omit<CourtCheckInput, "idempotencyKey">>) {
  const { idempotency_key: _ignored, ...body } = toSnakeCourt(input);
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
