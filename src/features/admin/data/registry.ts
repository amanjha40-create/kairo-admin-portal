import { queryOptions } from "@tanstack/react-query";
import { appEnv, type AppEnvConfig } from "@/config/env";
import { ApiError } from "@/lib/api/errors";
import type { ProductionAdminApiOptions } from "./admin-api";
import { createAdminAuthenticatedApi } from "./admin-api";

export type RegistryOrgState = "verified" | "unverified" | "duplicate_review" | "deprecated";

export const REGISTRY_ORG_STATE_LABEL: Record<RegistryOrgState, string> = {
  verified: "Verified in registry",
  unverified: "Unverified",
  duplicate_review: "Duplicate review",
  deprecated: "Deprecated",
};

const REGISTRY_ORG_TYPE_LABELS: Record<string, string> = {
  private_company: "Private company",
  public_company: "Public company",
  non_profit: "Non-profit",
  government: "Government",
  educational_institution: "Educational institution",
  certification_body: "Certification body",
  platform: "Platform",
};

const REGISTRY_CONTACT_STATE_LABELS: Record<string, string> = {
  approved: "Approved",
  unverified: "Unverified",
  bounced: "Bounced",
  inactive: "Inactive",
  rejected: "Rejected",
  needs_review: "Needs review",
};

const REGISTRY_CONTACT_ROLE_LABELS: Record<string, string> = {
  hr: "HR",
  people_ops: "People Operations",
  manager: "Direct manager",
  compliance: "Compliance",
  shared_inbox: "Shared inbox",
  registrar: "Registrar",
  issuer: "Credential issuer",
  other: "Other",
};

export type RegistryOrgType = string;
export type RegistryContactState = string;
export type RegistryContactRole = string;

export interface RegistryContact {
  id: string;
  name: string;
  role: RegistryContactRole;
  jobTitle?: string;
  emailMasked: string;
  phoneMasked?: string;
  state: RegistryContactState;
  confidence?: number;
  bounceCount?: number;
  addedBy: string;
  addedAt: string;
  lastSuccessfulUse?: string;
  notes?: string;
  sessionOnly?: boolean;
}

export interface RegistryActivityEvent {
  id: string;
  at: string;
  kind: string;
  actor: string;
  description: string;
  sessionOnly?: boolean;
}

export interface RegistryDomain {
  id: string;
  domain: string;
  isPrimary: boolean;
  isVerified: boolean;
  sourceType: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegistryAliasItem {
  id: string;
  name: string;
  type: string;
  sourceType: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegistryIdentifier {
  id: string;
  type: string;
  value: string;
  issuingCountry?: string;
  issuingAuthority?: string;
  isPrimary: boolean;
  isVerified: boolean;
  status: string;
  sourceType: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegistryCapability {
  id: string;
  key: string;
  label: string;
  description?: string;
  status: string;
  sourceType: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegistryRelationship {
  id: string;
  direction: string;
  relationshipType: string;
  status: string;
  relatedOrganizationId: string;
  relatedOrganizationName: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegistryVerificationLink {
  id: string;
  requestType: string;
  status: string;
  organizationId?: string;
  organizationName?: string;
  linkedRecordId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegistryLinkedOrganization {
  id: string;
  name: string;
  orgType: string;
  verificationState: string;
  resolutionStatus: string;
  verificationCapabilities: string[];
  domain?: string;
  setupCompletedAt?: string;
  suspendedAt?: string;
  suspensionReason?: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RegistryMergeHistoryEvent {
  id: string;
  direction: string;
  otherOrganizationId: string;
  otherOrganizationName: string;
  mergedByUserId?: string;
  mergeReason?: string;
  createdAt: string;
}

export interface RegistryDuplicateLink {
  id: string;
  label: string;
}

export interface RegistryOrganization {
  id: string;
  canonicalName: string;
  legalName?: string;
  displayName?: string;
  aliases: string[];
  state: RegistryOrgState;
  lifecycleStatus?: string;
  trustStatus?: string;
  orgType: RegistryOrgType;
  domain?: string;
  website?: string;
  country: string;
  headquartersState?: string;
  headquartersCity?: string;
  yearFounded?: number;
  employeesRange?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  contactCount?: number;
  contacts: RegistryContact[];
  activity: RegistryActivityEvent[];
  activeCaseCount: number;
  totalVerifications: number;
  possibleDuplicateIds: string[];
  possibleDuplicateLinks: RegistryDuplicateLink[];
  sessionOnly?: boolean;
  registryFlags: string[];
  aliasItems: RegistryAliasItem[];
  domains: RegistryDomain[];
  identifiers: RegistryIdentifier[];
  capabilities: RegistryCapability[];
  relationships: RegistryRelationship[];
  verificationRequests: RegistryVerificationLink[];
  linkedOrganizations: RegistryLinkedOrganization[];
  mergeHistory: RegistryMergeHistoryEvent[];
  aliasesCount: number;
  identifiersCount: number;
  relationshipCount: number;
  capabilitiesCount: number;
  linkedOrganizationCount: number;
}

export interface RegistryMetrics {
  total: number;
  employers: number;
  institutions: number;
  verified: number;
  unverified: number;
  duplicates: number;
  unresolvedOrganizations: number;
  linkedOrganizations: number;
  contactsApproved: number;
  contactsBounced: number;
}

export interface RegistryListParams {
  query?: string;
  state?: RegistryOrgState | "all";
  organizationType?: string | "all";
  lifecycleStatus?: string | "all";
  trustStatus?: string | "all";
  verificationState?: string | "all";
  page?: number;
  pageSize?: number;
}

export interface RegistryListResult {
  items: RegistryOrganization[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface RegistryDataAdapter {
  mode: "demo" | "production";
  listOrganizations: (params?: RegistryListParams) => Promise<RegistryListResult>;
  getMetrics: () => Promise<RegistryMetrics>;
  getOrganization: (id: string) => Promise<RegistryOrganization | undefined>;
  createOrganization: (payload: RegistryCreatePayload) => Promise<RegistryOrganization>;
  addAlias: (id: string, payload: RegistryAliasCreatePayload) => Promise<RegistryOrganization>;
  addDomain: (id: string, payload: RegistryDomainCreatePayload) => Promise<RegistryOrganization>;
  addIdentifier: (
    id: string,
    payload: RegistryIdentifierCreatePayload,
  ) => Promise<RegistryOrganization>;
  addCapability: (
    id: string,
    payload: RegistryCapabilityCreatePayload,
  ) => Promise<RegistryOrganization>;
  addRelationship: (
    id: string,
    payload: RegistryRelationshipCreatePayload,
  ) => Promise<RegistryOrganization>;
  mergeOrganization: (
    id: string,
    payload: RegistryMergePayload,
  ) => Promise<RegistryMergeHistoryEvent>;
}

export interface RegistryCreatePayload {
  legalName: string;
  displayName?: string;
  organizationType: string;
  country: string;
  stateProvince?: string;
  website?: string;
  lifecycleStatus?: string;
  trustStatus?: string;
  registryConfidenceScore?: number;
}

export interface RegistryAliasCreatePayload {
  aliasName: string;
  aliasType: string;
}

export interface RegistryDomainCreatePayload {
  domain: string;
  isPrimary?: boolean;
  isVerified?: boolean;
}

export interface RegistryIdentifierCreatePayload {
  identifierType: string;
  identifierValue: string;
  issuingCountry?: string;
  issuingAuthority?: string;
  isPrimary?: boolean;
  isVerified?: boolean;
  status?: string;
}

export interface RegistryCapabilityCreatePayload {
  capabilityKey: string;
  displayName?: string;
  description?: string;
  status?: string;
}

export interface RegistryRelationshipCreatePayload {
  childRegistryRecordPublicId: string;
  relationshipType: string;
  status?: string;
}

export interface RegistryMergePayload {
  targetRegistryRecordPublicId: string;
  mergeReason?: string;
}

interface BackendRegistryRecord {
  public_id: string;
  registry_code: string;
  legal_name: string;
  display_name: string | null;
  organization_type: string;
  country: string;
  state_province: string | null;
  website: string | null;
  lifecycle_status: string;
  trust_status: string;
  registry_confidence_score: number | string;
  trust_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  aliases: string[];
  domain: string | null;
  state: string;
  active_case_count: number;
  total_verifications: number;
  aliases_count?: number;
  identifiers_count?: number;
  relationship_count?: number;
  capabilities_count?: number;
  linked_organization_count?: number;
  possible_duplicate_ids?: string[];
  registry_flags?: string[];
}

interface BackendRegistryContact {
  public_id: string;
  name: string | null;
  role: string | null;
  email_masked: string;
  state: string;
  added_by: string;
  added_at: string;
  last_successful_use?: string | null;
}

interface BackendRegistryActivity {
  public_id: string;
  at: string;
  kind: string;
  actor: string;
  description: string;
}

interface BackendRegistryDomain {
  public_id: string;
  domain: string;
  is_primary: boolean;
  is_verified: boolean;
  source_type: string;
  created_at: string;
  updated_at: string;
}

interface BackendRegistryAlias {
  public_id: string;
  alias_name: string;
  alias_type: string;
  source_type: string;
  created_at: string;
  updated_at: string;
}

interface BackendRegistryIdentifier {
  public_id: string;
  identifier_type: string;
  identifier_value: string;
  issuing_country: string | null;
  issuing_authority: string | null;
  is_primary: boolean;
  is_verified: boolean;
  status: string;
  source_type: string;
  created_at: string;
  updated_at: string;
}

interface BackendRegistryCapability {
  public_id: string;
  capability: {
    public_id: string;
    capability_key: string;
    display_name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
  };
  status: string;
  source_type: string;
  created_at: string;
  updated_at: string;
}

interface BackendRegistryRelationship {
  public_id: string;
  direction: string;
  relationship_type: string;
  status: string;
  related_registry_record_public_id: string;
  related_registry_record_name: string;
  created_at: string;
  updated_at: string;
}

interface BackendRegistryVerificationLink {
  public_id: string;
  request_type: string;
  status: string;
  organization_public_id?: string | null;
  organization_name?: string | null;
  linked_record_public_id?: string | null;
  created_at: string;
  updated_at: string;
}

interface BackendRegistryLinkedOrganization {
  public_id: string;
  name: string;
  organization_type: string;
  verification_state: string;
  registry_resolution_status: string;
  verification_capabilities: string[];
  domain?: string | null;
  setup_completed_at?: string | null;
  suspended_at?: string | null;
  suspension_reason?: string | null;
  member_count: number;
  created_at: string;
  updated_at: string;
}

interface BackendRegistryMergeHistoryEvent {
  public_id: string;
  direction: string;
  other_registry_record_public_id: string;
  other_registry_record_name: string;
  merged_by_user_id?: string | null;
  merge_reason?: string | null;
  created_at: string;
}

interface BackendRegistryMergeResponse {
  public_id: string;
  source_registry_record_public_id: string;
  target_registry_record_public_id: string;
  merge_reason?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface BackendRegistryDetail extends BackendRegistryRecord {
  domains: BackendRegistryDomain[];
  alias_items: BackendRegistryAlias[];
  identifiers: BackendRegistryIdentifier[];
  capabilities: BackendRegistryCapability[];
  relationships: BackendRegistryRelationship[];
  verification_requests: BackendRegistryVerificationLink[];
  linked_organizations: BackendRegistryLinkedOrganization[];
  merge_history: BackendRegistryMergeHistoryEvent[];
  contacts: BackendRegistryContact[];
  activity: BackendRegistryActivity[];
}

interface BackendRegistryMetrics {
  total: number;
  employers?: number;
  institutions?: number;
  verified: number;
  unverified: number;
  duplicates: number;
  unresolved_organizations?: number;
  linked_organizations?: number;
  contacts_approved: number;
  contacts_bounced: number;
}

interface BackendPage<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

type DemoRegistryModule = typeof import("@/features/admin/mock-data/registry");

export interface CreateRegistryDataAdapterOptions {
  production?: ProductionAdminApiOptions;
  demoLoader?: (params: RegistryListParams) => Promise<RegistryListResult>;
  demoMetricsLoader?: () => Promise<RegistryMetrics>;
  demoDetailLoader?: (id: string) => Promise<RegistryOrganization | undefined>;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

export const registryKeys = {
  all: () => ["admin", "registry"] as const,
  list: (mode: "demo" | "production", params: Required<RegistryListParams>) =>
    [
      ...registryKeys.all(),
      "list",
      mode,
      params.query,
      params.state,
      params.organizationType,
      params.lifecycleStatus,
      params.trustStatus,
      params.verificationState,
      params.page,
      params.pageSize,
    ] as const,
  metrics: (mode: "demo" | "production") => [...registryKeys.all(), "metrics", mode] as const,
  detail: (mode: "demo" | "production", id: string) =>
    [...registryKeys.all(), "detail", mode, id] as const,
};

export function createRegistryDataAdapter(
  config: AppEnvConfig = appEnv,
  options: CreateRegistryDataAdapterOptions = {},
): RegistryDataAdapter {
  if (config.adminDemoMode) {
    const unsupportedMutation = async () => {
      throw new ApiError({
        code: "configuration",
        message: "Registry mutations are unavailable in Demo Mode.",
      });
    };
    return {
      mode: "demo",
      listOrganizations: (params) =>
        options.demoLoader?.(normalizeRegistryListParams(params)) ?? loadDemoOrganizations(params),
      getMetrics: options.demoMetricsLoader ?? loadDemoMetrics,
      getOrganization: options.demoDetailLoader ?? loadDemoOrganization,
      createOrganization: unsupportedMutation,
      addAlias: unsupportedMutation,
      addDomain: unsupportedMutation,
      addIdentifier: unsupportedMutation,
      addCapability: unsupportedMutation,
      addRelationship: unsupportedMutation,
      mergeOrganization: unsupportedMutation,
    };
  }

  const api = createAdminAuthenticatedApi(config, options.production);

  return {
    mode: "production",
    async listOrganizations(params) {
      const normalized = normalizeRegistryListParams(params);
      const data = await api.request<BackendPage<BackendRegistryRecord>>(
        buildRegistryListPath(normalized),
      );
      return {
        items: data.items.map((item) => mapBackendRecord(item)),
        total: data.total,
        page: data.page,
        pageSize: data.page_size,
        totalPages: data.total_pages,
      };
    },
    async getMetrics() {
      const data = await api.request<BackendRegistryMetrics>(
        "/api/v1/admin/trust-registry/metrics",
      );
      return {
        total: data.total,
        employers: data.employers ?? 0,
        institutions: data.institutions ?? 0,
        verified: data.verified,
        unverified: data.unverified,
        duplicates: data.duplicates,
        unresolvedOrganizations: data.unresolved_organizations ?? 0,
        linkedOrganizations: data.linked_organizations ?? 0,
        contactsApproved: data.contacts_approved,
        contactsBounced: data.contacts_bounced,
      };
    },
    async getOrganization(id) {
      try {
        const detail = await api.request<BackendRegistryDetail>(
          `/api/v1/admin/trust-registry/${id}`,
        );
        return mapBackendDetail(detail);
      } catch (error) {
        if (error instanceof ApiError && error.code === "not_found") {
          return undefined;
        }

        throw error;
      }
    },
    async createOrganization(payload) {
      const created = await api.request<{ public_id: string }>("/api/v1/admin/trust-registry", {
        method: "POST",
        body: {
          legal_name: payload.legalName,
          display_name: payload.displayName ?? null,
          organization_type: payload.organizationType,
          country: payload.country,
          state_province: payload.stateProvince ?? null,
          website: payload.website ?? null,
          lifecycle_status: payload.lifecycleStatus ?? "draft",
          trust_status: payload.trustStatus ?? "unreviewed",
          registry_confidence_score: payload.registryConfidenceScore ?? 0,
          trust_metadata: {},
        },
      });
      return requireRegistryDetail(api, created.public_id);
    },
    async addAlias(id, payload) {
      await api.request(`/api/v1/admin/trust-registry/${id}/aliases`, {
        method: "POST",
        body: {
          alias_name: payload.aliasName,
          alias_type: payload.aliasType,
          source_type: "manual",
          source_metadata: {},
        },
      });
      return requireRegistryDetail(api, id);
    },
    async addDomain(id, payload) {
      await api.request(`/api/v1/admin/trust-registry/${id}/domains`, {
        method: "POST",
        body: {
          domain: payload.domain,
          is_primary: payload.isPrimary ?? false,
          is_verified: payload.isVerified ?? false,
          source_type: "manual",
          source_metadata: {},
        },
      });
      return requireRegistryDetail(api, id);
    },
    async addIdentifier(id, payload) {
      await api.request(`/api/v1/admin/trust-registry/${id}/identifiers`, {
        method: "POST",
        body: {
          identifier_type: payload.identifierType,
          identifier_value: payload.identifierValue,
          issuing_country: payload.issuingCountry ?? null,
          issuing_authority: payload.issuingAuthority ?? null,
          is_primary: payload.isPrimary ?? false,
          is_verified: payload.isVerified ?? false,
          status: payload.status ?? "active",
          source_type: "manual",
          source_metadata: {},
          metadata: {},
        },
      });
      return requireRegistryDetail(api, id);
    },
    async addCapability(id, payload) {
      await api.request(`/api/v1/admin/trust-registry/${id}/capabilities`, {
        method: "POST",
        body: {
          capability_key: payload.capabilityKey,
          display_name: payload.displayName ?? null,
          description: payload.description ?? null,
          status: payload.status ?? "active",
          source_type: "manual",
          source_metadata: {},
        },
      });
      return requireRegistryDetail(api, id);
    },
    async addRelationship(id, payload) {
      await api.request(`/api/v1/admin/trust-registry/${id}/relationships`, {
        method: "POST",
        body: {
          child_registry_record_public_id: payload.childRegistryRecordPublicId,
          relationship_type: payload.relationshipType,
          status: payload.status ?? "active",
          metadata: {},
        },
      });
      return requireRegistryDetail(api, id);
    },
    async mergeOrganization(id, payload) {
      const event = await api.request<BackendRegistryMergeResponse>(
        `/api/v1/admin/trust-registry/${id}/merge`,
        {
          method: "POST",
          body: {
            target_registry_record_public_id: payload.targetRegistryRecordPublicId,
            merge_reason: payload.mergeReason ?? null,
            metadata: {},
          },
        },
      );
      return {
        id: event.public_id,
        direction: "merged_into",
        otherOrganizationId: event.target_registry_record_public_id,
        otherOrganizationName: event.target_registry_record_public_id,
        mergeReason: event.merge_reason ?? undefined,
        createdAt: event.created_at,
      };
    },
  };
}

export function registryListQueryOptions(
  params: RegistryListParams = {},
  config: AppEnvConfig = appEnv,
  options: CreateRegistryDataAdapterOptions = {},
) {
  const adapter = createRegistryDataAdapter(config, options);
  const normalized = normalizeRegistryListParams(params);
  return queryOptions({
    queryKey: registryKeys.list(adapter.mode, normalized),
    queryFn: () => adapter.listOrganizations(normalized),
  });
}

export function registryMetricsQueryOptions(
  config: AppEnvConfig = appEnv,
  options: CreateRegistryDataAdapterOptions = {},
) {
  const adapter = createRegistryDataAdapter(config, options);
  return queryOptions({
    queryKey: registryKeys.metrics(adapter.mode),
    queryFn: () => adapter.getMetrics(),
  });
}

export function registryDetailQueryOptions(
  id: string,
  config: AppEnvConfig = appEnv,
  options: CreateRegistryDataAdapterOptions = {},
) {
  const adapter = createRegistryDataAdapter(config, options);
  return queryOptions({
    queryKey: registryKeys.detail(adapter.mode, id),
    queryFn: () => adapter.getOrganization(id),
  });
}

export function getRegistryOrgTypeLabel(value: string | null | undefined): string {
  return REGISTRY_ORG_TYPE_LABELS[value ?? ""] ?? humanize(value) ?? "Unknown type";
}

export function getRegistryContactStateLabel(value: string | null | undefined): string {
  return REGISTRY_CONTACT_STATE_LABELS[value ?? ""] ?? humanize(value) ?? "Unknown";
}

export function getRegistryContactRoleLabel(value: string | null | undefined): string {
  return REGISTRY_CONTACT_ROLE_LABELS[value ?? ""] ?? humanize(value) ?? "Other";
}

export function getRegistryLifecycleStatusLabel(value: string | null | undefined): string {
  return humanize(value) ?? "Unavailable";
}

export function getRegistryTrustStatusLabel(value: string | null | undefined): string {
  return humanize(value) ?? "Unavailable";
}

function normalizeRegistryListParams(
  params: RegistryListParams = {},
): Required<RegistryListParams> {
  return {
    query: params.query?.trim() ?? "",
    state: params.state ?? "all",
    organizationType: params.organizationType ?? "all",
    lifecycleStatus: params.lifecycleStatus ?? "all",
    trustStatus: params.trustStatus ?? "all",
    verificationState: params.verificationState ?? "all",
    page: params.page && params.page > 0 ? params.page : DEFAULT_PAGE,
    pageSize: params.pageSize && params.pageSize > 0 ? params.pageSize : DEFAULT_PAGE_SIZE,
  };
}

function buildRegistryListPath(params: Required<RegistryListParams>) {
  const search = new URLSearchParams({
    paginate: "true",
    page: String(params.page),
    page_size: String(params.pageSize),
  });

  if (params.query) {
    search.set("search", params.query);
  }

  if (params.state !== "all") {
    search.set("status", params.state);
  }
  if (params.organizationType !== "all") {
    search.set("organization_type", params.organizationType);
  }
  if (params.lifecycleStatus !== "all") {
    search.set("lifecycle_status", params.lifecycleStatus);
  }
  if (params.trustStatus !== "all") {
    search.set("trust_status", params.trustStatus);
  }
  if (params.verificationState !== "all") {
    search.set("verification_state", params.verificationState);
  }

  const base = params.query
    ? "/api/v1/admin/trust-registry/search"
    : "/api/v1/admin/trust-registry";
  return `${base}?${search.toString()}`;
}

async function loadDemoOrganizations(params: RegistryListParams = {}): Promise<RegistryListResult> {
  const normalized = normalizeRegistryListParams(params);
  const mod = await import("@/features/admin/mock-data/registry");
  const filtered = mod.mockRegistryOrganizations.filter((org) => {
    if (normalized.state !== "all" && org.state !== normalized.state) {
      return false;
    }
    if (normalized.organizationType !== "all" && org.orgType !== normalized.organizationType) {
      return false;
    }

    if (!normalized.query) {
      return true;
    }

    const query = normalized.query.toLowerCase();
    return (
      org.canonicalName.toLowerCase().includes(query) ||
      org.domain.toLowerCase().includes(query) ||
      org.country.toLowerCase().includes(query) ||
      org.aliases.some((alias) => alias.toLowerCase().includes(query))
    );
  });
  const start = (normalized.page - 1) * normalized.pageSize;
  const items = filtered
    .slice(start, start + normalized.pageSize)
    .map((org) => mapDemoOrganization(org, mod));

  return {
    items,
    total: filtered.length,
    page: normalized.page,
    pageSize: normalized.pageSize,
    totalPages: Math.max(1, Math.ceil(filtered.length / normalized.pageSize)),
  };
}

async function loadDemoMetrics(): Promise<RegistryMetrics> {
  const mod = await import("@/features/admin/mock-data/registry");
  const metrics = mod.getRegistryMetrics();
  return {
    total: metrics.total,
    employers: 0,
    institutions: 0,
    verified: metrics.verified,
    unverified: metrics.unverified,
    duplicates: metrics.duplicates,
    unresolvedOrganizations: 0,
    linkedOrganizations: 0,
    contactsApproved: metrics.contactsApproved,
    contactsBounced: metrics.contactsBounced,
  };
}

async function loadDemoOrganization(id: string): Promise<RegistryOrganization | undefined> {
  const mod = await import("@/features/admin/mock-data/registry");
  const org = mod.getRegistryOrganization(id);
  return org ? mapDemoOrganization(org, mod) : undefined;
}

function mapDemoOrganization(
  org: DemoRegistryModule["mockRegistryOrganizations"][number],
  mod: DemoRegistryModule,
): RegistryOrganization {
  return {
    ...org,
    lifecycleStatus:
      org.state === "deprecated" ? "archived" : org.state === "verified" ? "active" : "draft",
    trustStatus: org.state === "verified" ? "trusted" : "unreviewed",
    headquartersState: org.headquartersCity,
    contactCount: org.contacts.length,
    aliasItems: [],
    domains: [],
    identifiers: [],
    capabilities: [],
    relationships: [],
    verificationRequests: [],
    linkedOrganizations: [],
    mergeHistory: [],
    aliasesCount: org.aliases.length,
    identifiersCount: 0,
    relationshipCount: 0,
    capabilitiesCount: 0,
    linkedOrganizationCount: 0,
    possibleDuplicateLinks: org.possibleDuplicateIds.map((id) => ({
      id,
      label: mod.getRegistryOrganization(id)?.canonicalName ?? id,
    })),
  };
}

function mapBackendDetail(detail: BackendRegistryDetail): RegistryOrganization {
  const summary = mapBackendRecord(detail);
  return {
    ...summary,
    contactCount: detail.contacts.length,
    aliases: detail.aliases ?? summary.aliases,
    aliasItems: detail.alias_items.map(mapBackendAlias),
    domains: detail.domains.map(mapBackendDomain),
    identifiers: detail.identifiers.map(mapBackendIdentifier),
    capabilities: detail.capabilities.map(mapBackendCapability),
    relationships: detail.relationships.map(mapBackendRelationship),
    verificationRequests: detail.verification_requests.map(mapBackendVerificationLink),
    linkedOrganizations: detail.linked_organizations.map(mapBackendLinkedOrganization),
    mergeHistory: detail.merge_history.map(mapBackendMergeHistoryEvent),
    contacts: detail.contacts.map(mapBackendContact),
    activity: detail.activity.map(mapBackendActivity),
  };
}

function mapBackendRecord(record: BackendRegistryRecord): RegistryOrganization {
  const canonicalName = (record.display_name || record.legal_name).trim();
  const domain = record.domain ?? extractDomain(record.website);
  const possibleDuplicateIds = (record.possible_duplicate_ids ?? []).map((value) => String(value));

  return {
    id: record.public_id,
    canonicalName,
    legalName: record.legal_name,
    displayName: record.display_name ?? undefined,
    aliases: record.aliases ?? [],
    state: normalizeRegistryState(record.state),
    lifecycleStatus: record.lifecycle_status,
    trustStatus: record.trust_status,
    orgType: record.organization_type,
    domain: domain ?? undefined,
    website: record.website ?? undefined,
    country: record.country,
    headquartersState: record.state_province ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    contactCount: undefined,
    contacts: [],
    activity: [],
    activeCaseCount: record.active_case_count,
    totalVerifications: record.total_verifications,
    aliasItems: [],
    domains: [],
    identifiers: [],
    capabilities: [],
    relationships: [],
    verificationRequests: [],
    linkedOrganizations: [],
    mergeHistory: [],
    aliasesCount: record.aliases_count ?? record.aliases?.length ?? 0,
    identifiersCount: record.identifiers_count ?? 0,
    relationshipCount: record.relationship_count ?? 0,
    capabilitiesCount: record.capabilities_count ?? 0,
    linkedOrganizationCount: record.linked_organization_count ?? 0,
    possibleDuplicateIds,
    possibleDuplicateLinks: possibleDuplicateIds.map((id) => ({
      id,
      label: id,
    })),
    registryFlags: (record.registry_flags ?? []).map((flag) => String(flag)),
  };
}

function mapBackendDomain(domain: BackendRegistryDomain): RegistryDomain {
  return {
    id: domain.public_id,
    domain: domain.domain,
    isPrimary: domain.is_primary,
    isVerified: domain.is_verified,
    sourceType: domain.source_type,
    createdAt: domain.created_at,
    updatedAt: domain.updated_at,
  };
}

function mapBackendAlias(alias: BackendRegistryAlias): RegistryAliasItem {
  return {
    id: alias.public_id,
    name: alias.alias_name,
    type: alias.alias_type,
    sourceType: alias.source_type,
    createdAt: alias.created_at,
    updatedAt: alias.updated_at,
  };
}

function mapBackendIdentifier(identifier: BackendRegistryIdentifier): RegistryIdentifier {
  return {
    id: identifier.public_id,
    type: identifier.identifier_type,
    value: identifier.identifier_value,
    issuingCountry: identifier.issuing_country ?? undefined,
    issuingAuthority: identifier.issuing_authority ?? undefined,
    isPrimary: identifier.is_primary,
    isVerified: identifier.is_verified,
    status: identifier.status,
    sourceType: identifier.source_type,
    createdAt: identifier.created_at,
    updatedAt: identifier.updated_at,
  };
}

function mapBackendCapability(capability: BackendRegistryCapability): RegistryCapability {
  return {
    id: capability.public_id,
    key: capability.capability.capability_key,
    label: capability.capability.display_name,
    description: capability.capability.description ?? undefined,
    status: capability.status,
    sourceType: capability.source_type,
    createdAt: capability.created_at,
    updatedAt: capability.updated_at,
  };
}

function mapBackendRelationship(relationship: BackendRegistryRelationship): RegistryRelationship {
  return {
    id: relationship.public_id,
    direction: relationship.direction,
    relationshipType: relationship.relationship_type,
    status: relationship.status,
    relatedOrganizationId: relationship.related_registry_record_public_id,
    relatedOrganizationName: relationship.related_registry_record_name,
    createdAt: relationship.created_at,
    updatedAt: relationship.updated_at,
  };
}

function mapBackendVerificationLink(
  link: BackendRegistryVerificationLink,
): RegistryVerificationLink {
  return {
    id: link.public_id,
    requestType: link.request_type,
    status: link.status,
    organizationId: link.organization_public_id ?? undefined,
    organizationName: link.organization_name ?? undefined,
    linkedRecordId: link.linked_record_public_id ?? undefined,
    createdAt: link.created_at,
    updatedAt: link.updated_at,
  };
}

function mapBackendLinkedOrganization(
  organization: BackendRegistryLinkedOrganization,
): RegistryLinkedOrganization {
  return {
    id: organization.public_id,
    name: organization.name,
    orgType: organization.organization_type,
    verificationState: organization.verification_state,
    resolutionStatus: organization.registry_resolution_status,
    verificationCapabilities: organization.verification_capabilities,
    domain: organization.domain ?? undefined,
    setupCompletedAt: organization.setup_completed_at ?? undefined,
    suspendedAt: organization.suspended_at ?? undefined,
    suspensionReason: organization.suspension_reason ?? undefined,
    memberCount: organization.member_count,
    createdAt: organization.created_at,
    updatedAt: organization.updated_at,
  };
}

function mapBackendMergeHistoryEvent(
  event: BackendRegistryMergeHistoryEvent,
): RegistryMergeHistoryEvent {
  return {
    id: event.public_id,
    direction: event.direction,
    otherOrganizationId: event.other_registry_record_public_id,
    otherOrganizationName: event.other_registry_record_name,
    mergedByUserId: event.merged_by_user_id ?? undefined,
    mergeReason: event.merge_reason ?? undefined,
    createdAt: event.created_at,
  };
}

function mapBackendContact(contact: BackendRegistryContact): RegistryContact {
  return {
    id: contact.public_id,
    name: contact.name?.trim() || "Unknown contact",
    role: contact.role?.trim() || "other",
    emailMasked: contact.email_masked,
    state: contact.state,
    addedBy: contact.added_by,
    addedAt: contact.added_at,
    lastSuccessfulUse: contact.last_successful_use ?? undefined,
  };
}

function mapBackendActivity(activity: BackendRegistryActivity): RegistryActivityEvent {
  return {
    id: activity.public_id,
    at: activity.at,
    kind: activity.kind,
    actor: activity.actor,
    description: activity.description,
  };
}

function normalizeRegistryState(value: string): RegistryOrgState {
  switch (value) {
    case "verified":
    case "unverified":
    case "duplicate_review":
    case "deprecated":
      return value;
    default:
      return "unverified";
  }
}

function extractDomain(website: string | null): string | null {
  if (!website) {
    return null;
  }

  try {
    return new URL(website).hostname;
  } catch {
    return null;
  }
}

function humanize(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function requireRegistryDetail(
  api: ReturnType<typeof createAdminAuthenticatedApi>,
  id: string,
): Promise<RegistryOrganization> {
  const detail = await api.request<BackendRegistryDetail>(`/api/v1/admin/trust-registry/${id}`);
  return mapBackendDetail(detail);
}
