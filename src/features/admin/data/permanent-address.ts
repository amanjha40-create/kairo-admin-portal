import { queryOptions } from "@tanstack/react-query";
import { appEnv, type AppEnvConfig } from "@/config/env";
import { ApiError } from "@/lib/api/errors";
import {
  createAdminAuthenticatedApi,
  type ProductionAdminApiOptions,
} from "@/features/admin/data/admin-api";

export interface PermanentAddressSummary {
  candidateId: string;
  addressVersionId: string | null;
  addressVersion: number | null;
  overallStatus: string;
  documentStatus: string;
  successfulLocationChecks: number;
  requiredLocationChecks: 3;
  todayComplete: boolean;
  separateDaysRequired: true;
  cycleExpiresAt: string | null;
  manualReviewStatus: string | null;
  pendingManualReviewTargetAvailable: boolean;
  manualLocationApprovalEligible: boolean;
  activeTargetSource:
    "provider_geocode" | "onsite_confirmation" | "onsite_confirmation_manual_review" | null;
  currentAttemptState: string | null;
}

export interface PermanentAddressDiscovery {
  items: PermanentAddressSummary[];
  nextOffset: number | null;
}

export interface ClaimedPermanentAddress {
  addressLine1: string;
  addressLine2: string | null;
  locality: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: "IN";
}

export interface PermanentAddressDocument {
  present: boolean;
  documentId: string | null;
  documentType: string | null;
  uploadState: string | null;
  reviewState: string;
  uploadedAt: string | null;
  issuedOn: string | null;
  reviewedAt: string | null;
  previewAvailable: boolean;
  contentPath: string | null;
}

export interface PermanentAddressVersion {
  addressVersionId: string;
  addressVersion: number;
  current: boolean;
  createdAt: string;
  invalidatedAt: string | null;
}

export interface PermanentAddressAuditEvent {
  action: string;
  at: string;
}

export interface ManualLocationComparison {
  countryMatch: boolean | null;
  stateMatch: boolean | null;
  cityMatch: boolean | null;
  postalCodeMatch: boolean | null;
  providerPostalCodePresent: boolean | null;
  reversePlaceType: string | null;
  reverseEstimatedPointAddress: boolean | null;
  reversePrecisionSupported: boolean | null;
  streetMatch: boolean | null;
  streetDecisionReason: string | null;
  addressNumberState: string | null;
}

export interface ManualLocationHistory {
  sessionId: string;
  attemptedAt: string;
  automaticResult: string;
  manualReviewStatus: string | null;
}

export interface ManualLocationResolution {
  outcome: string;
  reviewedAt: string;
  reviewerId: string;
  auditEventId: string;
  idempotencyKey: string;
}

export interface ManualLocationDetail {
  candidateId: string;
  addressVersionId: string;
  sessionId: string;
  attemptedAt: string;
  manualReviewStatus: string | null;
  addressVersion: number;
  currentAddressVersion: boolean;
  pendingTargetAvailable: boolean;
  approvalEligible: boolean;
  gpsQuality: string;
  acceptedSampleCount: number | null;
  accuracyM: number | null;
  candidateCount: number;
  candidateComparisons: ManualLocationComparison[];
  automaticResult: string;
  automaticFailureReason: string | null;
  documentStatus: string;
  priorAttemptCount: number;
  history: ManualLocationHistory[];
  resolutions: ManualLocationResolution[];
}

export interface PermanentAddressDetail {
  permanentAddress: PermanentAddressSummary;
  claimedAddress: ClaimedPermanentAddress | null;
  document: PermanentAddressDocument;
  latestAttempt: ManualLocationDetail | null;
  versions: PermanentAddressVersion[];
  audit: PermanentAddressAuditEvent[];
}

export interface AddressDocumentReviewDetail {
  addressVersionId: string;
  candidateId: string;
  candidateName: string;
  addressVersion: number;
  claimedAddress: ClaimedPermanentAddress;
  documentId: string;
  documentType: string;
  documentStatus: string;
  uploadState: string;
  uploadedAt: string | null;
  issuedOn: string | null;
  expiresAt: string | null;
  contentPath: string;
  reviews: Array<{
    outcome: string;
    reviewedBy: string;
    reviewedAt: string;
    documentId: string;
  }>;
  audit: PermanentAddressAuditEvent[];
}

export type AddressDocumentDecisionOutcome =
  "APPROVE_MATCHING" | "REJECT" | "REQUEST_CORRECTION" | "REQUEST_DIFFERENT_DOCUMENT";

export interface AddressDocumentDecisionInput {
  documentId: string;
  idempotencyKey: string;
  outcome: AddressDocumentDecisionOutcome;
  inspectedDocument: true;
  candidateIdentityMatches?: boolean;
  documentAcceptable?: boolean;
  addressMatches?: boolean;
}

export type ManualLocationOutcome =
  | "APPROVE_ONSITE_LOCATION"
  | "REJECT_ONSITE_LOCATION"
  | "REQUEST_ADDRESS_CORRECTION"
  | "REQUEST_ADDITIONAL_EVIDENCE";

interface BackendAddressSummary {
  candidate_id: string;
  address_version_id: string | null;
  address_version: number | null;
  overall_status: string;
  document_status: string;
  successful_location_checks: number;
  required_location_checks: 3;
  today_complete: boolean;
  separate_days_required: true;
  cycle_expires_at: string | null;
  manual_review_status: string | null;
  pending_manual_review_target_available: boolean;
  manual_location_approval_eligible: boolean;
  active_target_source: PermanentAddressSummary["activeTargetSource"];
  current_attempt_state: string | null;
}

interface BackendClaimedAddress {
  address_line_1: string;
  address_line_2: string | null;
  locality: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: "IN";
}

interface BackendManualComparison {
  country_match: boolean | null;
  state_match: boolean | null;
  city_match: boolean | null;
  postal_code_match: boolean | null;
  provider_postal_code_present: boolean | null;
  reverse_place_type: string | null;
  reverse_estimated_point_address: boolean | null;
  reverse_precision_supported: boolean | null;
  street_match: boolean | null;
  street_decision_reason: string | null;
  address_number_state: string | null;
}

interface BackendManualLocationDetail {
  candidate_id: string;
  address_version_id: string;
  session_id: string;
  attempted_at: string;
  manual_review_status: string | null;
  address_version: number;
  current_address_version: boolean;
  pending_target_available: boolean;
  approval_eligible: boolean;
  gps_quality: string;
  accepted_sample_count: number | null;
  accuracy_m: number | null;
  candidate_count: number;
  candidate_comparisons: BackendManualComparison[];
  automatic_result: string;
  automatic_failure_reason: string | null;
  document_status: string;
  prior_attempt_count: number;
  history: Array<{
    session_id: string;
    attempted_at: string;
    automatic_result: string;
    manual_review_status: string | null;
  }>;
  resolutions: Array<{
    outcome: string;
    reviewed_at: string;
    reviewer_id: string;
    audit_event_id: string;
    idempotency_key: string;
  }>;
}

interface BackendAddressDetail {
  permanent_address: BackendAddressSummary;
  claimed_address: BackendClaimedAddress | null;
  document: {
    present: boolean;
    document_id: string | null;
    document_type: string | null;
    upload_state: string | null;
    review_state: string;
    uploaded_at: string | null;
    issued_on: string | null;
    reviewed_at: string | null;
    preview_available: boolean;
    content_path: string | null;
  };
  latest_attempt: BackendManualLocationDetail | null;
  versions: Array<{
    address_version_id: string;
    address_version: number;
    current: boolean;
    created_at: string;
    invalidated_at: string | null;
  }>;
  audit: Array<{ action: string; at: string }>;
}

interface BackendDocumentReviewDetail {
  address_version_id: string;
  candidate_id: string;
  candidate_name: string;
  address_version: number;
  claimed_address: BackendClaimedAddress;
  document_id: string;
  document_type: string;
  document_status: string;
  upload_state: string;
  uploaded_at: string | null;
  issued_on: string | null;
  expires_at: string | null;
  content_path: string;
  reviews: Array<{
    outcome: string;
    reviewed_by: string;
    reviewed_at: string;
    document_id: string;
  }>;
  audit: Array<{ action: string; at: string }>;
}

export interface PermanentAddressAdapter {
  mode: "production" | "demo";
  listReviews: (params?: {
    limit?: number;
    offset?: number;
    candidateId?: string;
  }) => Promise<PermanentAddressDiscovery>;
  getCandidate: (candidateId: string, addressVersionId?: string) => Promise<PermanentAddressDetail>;
  getDocumentReview: (versionId: string) => Promise<AddressDocumentReviewDetail>;
  getDocumentContent: (contentPath: string) => Promise<Blob>;
  decideDocument: (
    versionId: string,
    input: AddressDocumentDecisionInput,
  ) => Promise<{ documentStatus: string; reviewedAt: string }>;
  getManualLocation: (versionId: string, sessionId: string) => Promise<ManualLocationDetail>;
  resolveManualLocation: (
    versionId: string,
    sessionId: string,
    input: { candidateId: string; idempotencyKey: string; outcome: ManualLocationOutcome },
  ) => Promise<ManualLocationResolution>;
}

export const permanentAddressKeys = {
  all: () => ["admin", "permanent-address"] as const,
  list: (params: { limit: number; offset: number; candidateId?: string }) =>
    [...permanentAddressKeys.all(), "list", params] as const,
  detail: (candidateId: string, addressVersionId?: string) =>
    [...permanentAddressKeys.all(), "detail", candidateId, addressVersionId ?? "current"] as const,
  document: (versionId: string) => [...permanentAddressKeys.all(), "document", versionId] as const,
  location: (versionId: string, sessionId: string) =>
    [...permanentAddressKeys.all(), "location", versionId, sessionId] as const,
};

export function createPermanentAddressAdapter(
  config: AppEnvConfig = appEnv,
  options: ProductionAdminApiOptions = {},
): PermanentAddressAdapter {
  if (config.adminDemoMode) {
    const unavailable = async (): Promise<never> => {
      throw new ApiError({
        code: "configuration",
        message: "Permanent Address review requires the live Admin backend contract.",
      });
    };
    return {
      mode: "demo",
      listReviews: unavailable,
      getCandidate: unavailable,
      getDocumentReview: unavailable,
      getDocumentContent: unavailable,
      decideDocument: unavailable,
      getManualLocation: unavailable,
      resolveManualLocation: unavailable,
    };
  }

  const api = createAdminAuthenticatedApi(config, options);
  return {
    mode: "production",
    async listReviews(params = {}) {
      const limit = Math.min(50, Math.max(1, params.limit ?? 20));
      const offset = Math.max(0, params.offset ?? 0);
      const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (params.candidateId?.trim()) query.set("candidate_id", params.candidateId.trim());
      const response = await api.request<{
        items: BackendAddressSummary[];
        next_offset: number | null;
      }>(`/api/v1/permanent-address/admin/reviews?${query.toString()}`);
      return {
        items: response.items.map(mapSummary),
        nextOffset: response.next_offset,
      };
    },
    async getCandidate(candidateId, addressVersionId) {
      const suffix = addressVersionId
        ? `?address_version_id=${encodeURIComponent(addressVersionId)}`
        : "";
      const response = await api.request<BackendAddressDetail>(
        `/api/v1/permanent-address/admin/candidates/${encodeURIComponent(candidateId)}${suffix}`,
      );
      return mapDetail(response);
    },
    async getDocumentReview(versionId) {
      const response = await api.request<BackendDocumentReviewDetail>(
        `/api/v1/permanent-address/document-reviews/${encodeURIComponent(versionId)}`,
      );
      return mapDocumentReview(response);
    },
    async getDocumentContent(contentPath) {
      if (!isPermanentAddressContentPath(contentPath)) {
        throw new ApiError({
          code: "validation",
          message: "The protected document preview path is invalid.",
        });
      }
      return api.requestBlob(contentPath);
    },
    async decideDocument(versionId, input) {
      const response = await api.request<{ document_status: string; reviewed_at: string }>(
        `/api/v1/permanent-address/document-reviews/${encodeURIComponent(versionId)}/decision`,
        {
          method: "POST",
          body: {
            document_id: input.documentId,
            idempotency_key: input.idempotencyKey,
            outcome: input.outcome,
            inspected_document: input.inspectedDocument,
            candidate_identity_matches: input.candidateIdentityMatches ?? false,
            document_acceptable: input.documentAcceptable ?? false,
            address_matches: input.addressMatches ?? false,
          },
        },
      );
      return { documentStatus: response.document_status, reviewedAt: response.reviewed_at };
    },
    async getManualLocation(versionId, sessionId) {
      const response = await api.request<BackendManualLocationDetail>(
        `/api/v1/permanent-address/location-reviews/${encodeURIComponent(versionId)}/sessions/${encodeURIComponent(sessionId)}`,
      );
      return mapManualLocation(response);
    },
    async resolveManualLocation(versionId, sessionId, input) {
      const response = await api.request<{
        outcome: string;
        reviewed_at: string;
        reviewer_id: string;
        audit_event_id: string;
        idempotency_key: string;
      }>(
        `/api/v1/permanent-address/location-reviews/${encodeURIComponent(versionId)}/sessions/${encodeURIComponent(sessionId)}/resolution`,
        {
          method: "POST",
          body: {
            candidate_id: input.candidateId,
            idempotency_key: input.idempotencyKey,
            outcome: input.outcome,
          },
        },
      );
      return {
        outcome: response.outcome,
        reviewedAt: response.reviewed_at,
        reviewerId: response.reviewer_id,
        auditEventId: response.audit_event_id,
        idempotencyKey: response.idempotency_key,
      };
    },
  };
}

export function permanentAddressListQueryOptions(params: {
  limit?: number;
  offset?: number;
  candidateId?: string;
}) {
  const normalized = {
    limit: Math.min(50, Math.max(1, params.limit ?? 20)),
    offset: Math.max(0, params.offset ?? 0),
    candidateId: params.candidateId?.trim() || undefined,
  };
  const adapter = createPermanentAddressAdapter();
  return queryOptions({
    queryKey: permanentAddressKeys.list(normalized),
    queryFn: () => adapter.listReviews(normalized),
  });
}

export function permanentAddressDetailQueryOptions(candidateId: string, addressVersionId?: string) {
  const adapter = createPermanentAddressAdapter();
  return queryOptions({
    queryKey: permanentAddressKeys.detail(candidateId, addressVersionId),
    queryFn: () => adapter.getCandidate(candidateId, addressVersionId),
  });
}

export function permanentAddressDocumentQueryOptions(versionId: string) {
  const adapter = createPermanentAddressAdapter();
  return queryOptions({
    queryKey: permanentAddressKeys.document(versionId),
    queryFn: () => adapter.getDocumentReview(versionId),
  });
}

export function permanentAddressLocationQueryOptions(versionId: string, sessionId: string) {
  const adapter = createPermanentAddressAdapter();
  return queryOptions({
    queryKey: permanentAddressKeys.location(versionId, sessionId),
    queryFn: () => adapter.getManualLocation(versionId, sessionId),
  });
}

export function isPermanentAddressContentPath(path: string): boolean {
  return /^\/api\/v1\/permanent-address\/reviews\/[0-9a-f-]{36}\/content$/i.test(path);
}

function mapSummary(value: BackendAddressSummary): PermanentAddressSummary {
  return {
    candidateId: value.candidate_id,
    addressVersionId: value.address_version_id,
    addressVersion: value.address_version,
    overallStatus: value.overall_status,
    documentStatus: value.document_status,
    successfulLocationChecks: value.successful_location_checks,
    requiredLocationChecks: value.required_location_checks,
    todayComplete: value.today_complete,
    separateDaysRequired: value.separate_days_required,
    cycleExpiresAt: value.cycle_expires_at,
    manualReviewStatus: value.manual_review_status,
    pendingManualReviewTargetAvailable: value.pending_manual_review_target_available,
    manualLocationApprovalEligible: value.manual_location_approval_eligible,
    activeTargetSource: value.active_target_source,
    currentAttemptState: value.current_attempt_state,
  };
}

function mapClaimedAddress(value: BackendClaimedAddress): ClaimedPermanentAddress {
  return {
    addressLine1: value.address_line_1,
    addressLine2: value.address_line_2,
    locality: value.locality,
    city: value.city,
    state: value.state,
    postalCode: value.postal_code,
    country: value.country,
  };
}

function mapDetail(value: BackendAddressDetail): PermanentAddressDetail {
  return {
    permanentAddress: mapSummary(value.permanent_address),
    claimedAddress: value.claimed_address ? mapClaimedAddress(value.claimed_address) : null,
    document: {
      present: value.document.present,
      documentId: value.document.document_id,
      documentType: value.document.document_type,
      uploadState: value.document.upload_state,
      reviewState: value.document.review_state,
      uploadedAt: value.document.uploaded_at,
      issuedOn: value.document.issued_on,
      reviewedAt: value.document.reviewed_at,
      previewAvailable: value.document.preview_available,
      contentPath: value.document.content_path,
    },
    latestAttempt: value.latest_attempt ? mapManualLocation(value.latest_attempt) : null,
    versions: value.versions.map((version) => ({
      addressVersionId: version.address_version_id,
      addressVersion: version.address_version,
      current: version.current,
      createdAt: version.created_at,
      invalidatedAt: version.invalidated_at,
    })),
    audit: value.audit.map((event) => ({ action: event.action, at: event.at })),
  };
}

function mapManualLocation(value: BackendManualLocationDetail): ManualLocationDetail {
  return {
    candidateId: value.candidate_id,
    addressVersionId: value.address_version_id,
    sessionId: value.session_id,
    attemptedAt: value.attempted_at,
    manualReviewStatus: value.manual_review_status,
    addressVersion: value.address_version,
    currentAddressVersion: value.current_address_version,
    pendingTargetAvailable: value.pending_target_available,
    approvalEligible: value.approval_eligible,
    gpsQuality: value.gps_quality,
    acceptedSampleCount: value.accepted_sample_count,
    accuracyM: value.accuracy_m,
    candidateCount: value.candidate_count,
    candidateComparisons: value.candidate_comparisons.map((comparison) => ({
      countryMatch: comparison.country_match,
      stateMatch: comparison.state_match,
      cityMatch: comparison.city_match,
      postalCodeMatch: comparison.postal_code_match,
      providerPostalCodePresent: comparison.provider_postal_code_present,
      reversePlaceType: comparison.reverse_place_type,
      reverseEstimatedPointAddress: comparison.reverse_estimated_point_address,
      reversePrecisionSupported: comparison.reverse_precision_supported,
      streetMatch: comparison.street_match,
      streetDecisionReason: comparison.street_decision_reason,
      addressNumberState: comparison.address_number_state,
    })),
    automaticResult: value.automatic_result,
    automaticFailureReason: value.automatic_failure_reason,
    documentStatus: value.document_status,
    priorAttemptCount: value.prior_attempt_count,
    history: value.history.map((item) => ({
      sessionId: item.session_id,
      attemptedAt: item.attempted_at,
      automaticResult: item.automatic_result,
      manualReviewStatus: item.manual_review_status,
    })),
    resolutions: value.resolutions.map((item) => ({
      outcome: item.outcome,
      reviewedAt: item.reviewed_at,
      reviewerId: item.reviewer_id,
      auditEventId: item.audit_event_id,
      idempotencyKey: item.idempotency_key,
    })),
  };
}

function mapDocumentReview(value: BackendDocumentReviewDetail): AddressDocumentReviewDetail {
  return {
    addressVersionId: value.address_version_id,
    candidateId: value.candidate_id,
    candidateName: value.candidate_name,
    addressVersion: value.address_version,
    claimedAddress: mapClaimedAddress(value.claimed_address),
    documentId: value.document_id,
    documentType: value.document_type,
    documentStatus: value.document_status,
    uploadState: value.upload_state,
    uploadedAt: value.uploaded_at,
    issuedOn: value.issued_on,
    expiresAt: value.expires_at,
    contentPath: value.content_path,
    reviews: value.reviews.map((review) => ({
      outcome: review.outcome,
      reviewedBy: review.reviewed_by,
      reviewedAt: review.reviewed_at,
      documentId: review.document_id,
    })),
    audit: value.audit.map((event) => ({ action: event.action, at: event.at })),
  };
}
