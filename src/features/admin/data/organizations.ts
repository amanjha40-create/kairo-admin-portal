import { queryOptions } from "@tanstack/react-query";
import { appEnv, type AppEnvConfig } from "@/config/env";
import {
  createAdminAuthenticatedApi,
  type ProductionAdminApiOptions,
} from "@/features/admin/data/admin-api";
import { ApiError } from "@/lib/api/errors";

export interface CompanySearchParams {
  search?: string;
  status?: string;
  organizationType?: string;
  page?: number;
  pageSize?: number;
}

export interface CompanyDirectoryItem {
  id: string;
  name: string;
  domain?: string;
  organizationType: string;
  accountStatus: string;
  verificationState: string;
  isWorkspaceCustomer: boolean;
  peopleCount: number;
  requestCount: number;
  verifiedCount: number;
  pendingCount: number;
  inProgressCount: number;
  needsAttentionCount: number;
  teamSize: number;
  updatedAt: string;
}

export interface CompanyDetail {
  id: string;
  name: string;
  domain?: string;
  website?: string;
  organizationType: string;
  industry?: string;
  location?: string;
  organizationSize?: string;
  accountStatus: string;
  verificationState: string;
  onboardingStatus: string;
  isWorkspaceCustomer: boolean;
  primaryOwnerName?: string;
  primaryOwnerEmailMasked?: string;
  teamSize: number;
  peopleCount: number;
  registryRecordId?: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt?: string;
}

export interface CompanyOverview {
  peopleCount: number;
  verificationTotal: number;
  verifiedCount: number;
  pendingCount: number;
  inProgressCount: number;
  needsAttentionCount: number;
  cancelledCount: number;
  withdrawnCount: number;
  completionRate?: number;
  completionRateNumerator: number;
  completionRateDenominator: number;
  statusCounts: Record<string, number>;
  typeCounts: Record<string, number>;
}

export interface CompanyPersonItem {
  id: string;
  linkedUserId?: string;
  displayName: string;
  emailMasked?: string;
  relationship: string;
  lifecycleStatus: string;
  verificationRequestCount: number;
  verifiedCount: number;
  pendingCount: number;
  lastActivityAt?: string;
}

export interface CompanyVerificationItem {
  id: string;
  organizationPersonId?: string;
  candidateName: string;
  candidateEmailMasked: string;
  requestType: string;
  requestedBy?: string;
  createdAt: string;
  status: string;
  completedAt?: string;
  updatedAt: string;
}

export interface CompanyTeamItem {
  id: string;
  userId: string;
  displayName: string;
  emailMasked: string;
  role: string;
  status: string;
  joinedAt: string;
  lastActivityAt?: string;
}

export interface CompanyActivityItem {
  id: string;
  occurredAt: string;
  eventType: string;
  source: string;
  actorName?: string;
  actorRole?: string;
  subjectId?: string;
  previousStatus?: string;
  newStatus?: string;
}

export interface CompanyPeopleParams {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface CompanyVerificationParams extends CompanyPeopleParams {
  verificationType?: string;
  createdAfter?: string;
  createdBefore?: string;
}

export interface CompanyPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface BackendPage<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface BackendCompanyItem {
  public_id: string;
  name: string;
  domain: string | null;
  organization_type: string;
  account_status: string;
  verification_state: string;
  is_workspace_customer: boolean;
  people_count: number;
  request_count: number;
  verified_count: number;
  pending_count: number;
  in_progress_count: number;
  needs_attention_count: number;
  team_size: number;
  updated_at: string;
}

interface BackendCompanyDetail {
  public_id: string;
  name: string;
  domain: string | null;
  website: string | null;
  organization_type: string;
  industry: string | null;
  location: string | null;
  organization_size: string | null;
  account_status: string;
  verification_state: string;
  onboarding_status: string;
  is_workspace_customer: boolean;
  primary_owner_name: string | null;
  primary_owner_email_masked: string | null;
  team_size: number;
  people_count: number;
  registry_record_public_id: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string | null;
}

interface BackendCompanyOverview {
  people_count: number;
  verification_total: number;
  verified_count: number;
  pending_count: number;
  in_progress_count: number;
  needs_attention_count: number;
  cancelled_count: number;
  withdrawn_count: number;
  completion_rate: number | null;
  completion_rate_numerator: number;
  completion_rate_denominator: number;
  status_counts: Record<string, number>;
  type_counts: Record<string, number>;
}

interface BackendCompanyPerson {
  public_id: string;
  linked_user_public_id: string | null;
  display_name: string;
  email_masked: string | null;
  relationship: string;
  lifecycle_status: string;
  verification_request_count: number;
  verified_count: number;
  pending_count: number;
  last_activity_at: string | null;
}

interface BackendCompanyVerification {
  public_id: string;
  organization_person_public_id: string | null;
  candidate_name: string;
  candidate_email_masked: string;
  request_type: string;
  requested_by: string | null;
  created_at: string;
  status: string;
  completed_at: string | null;
  updated_at: string;
}

interface BackendCompanyTeamMember {
  public_id: string;
  user_public_id: string;
  display_name: string;
  email_masked: string;
  role: string;
  status: string;
  joined_at: string;
  last_activity_at: string | null;
}

interface BackendCompanyActivity {
  public_id: string;
  occurred_at: string;
  event_type: string;
  source: string;
  actor_name: string | null;
  actor_role: string | null;
  subject_public_id: string | null;
  previous_status: string | null;
  new_status: string | null;
}

export interface Company360DataAdapter {
  mode: "demo" | "production";
  searchCompanies: (params?: CompanySearchParams) => Promise<CompanyPage<CompanyDirectoryItem>>;
  getCompany: (id: string) => Promise<CompanyDetail>;
  getOverview: (id: string) => Promise<CompanyOverview>;
  listPeople: (id: string, params?: CompanyPeopleParams) => Promise<CompanyPage<CompanyPersonItem>>;
  listVerifications: (
    id: string,
    params?: CompanyVerificationParams,
  ) => Promise<CompanyPage<CompanyVerificationItem>>;
  listTeam: (id: string, params?: CompanyPeopleParams) => Promise<CompanyPage<CompanyTeamItem>>;
  listActivity: (
    id: string,
    params?: CompanyPeopleParams,
  ) => Promise<CompanyPage<CompanyActivityItem>>;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export const company360Keys = {
  all: () => ["admin", "company-360"] as const,
  directory: (params: Required<CompanySearchParams>) =>
    [...company360Keys.all(), "directory", params] as const,
  detail: (id: string) => [...company360Keys.all(), "detail", id] as const,
  overview: (id: string) => [...company360Keys.all(), "overview", id] as const,
  people: (id: string, params: Required<CompanyPeopleParams>) =>
    [...company360Keys.all(), "people", id, params] as const,
  verifications: (id: string, params: Required<CompanyVerificationParams>) =>
    [...company360Keys.all(), "verifications", id, params] as const,
  team: (id: string, params: Required<CompanyPeopleParams>) =>
    [...company360Keys.all(), "team", id, params] as const,
  activity: (id: string, params: Required<CompanyPeopleParams>) =>
    [...company360Keys.all(), "activity", id, params] as const,
};

export function createCompany360DataAdapter(
  config: AppEnvConfig = appEnv,
  options: ProductionAdminApiOptions = {},
): Company360DataAdapter {
  if (config.adminDemoMode) {
    const unavailable = async (): Promise<never> => {
      throw new ApiError({
        code: "configuration",
        message: "Company 360 uses live backend organization data and is unavailable in Demo Mode.",
      });
    };
    return {
      mode: "demo",
      searchCompanies: unavailable,
      getCompany: unavailable,
      getOverview: unavailable,
      listPeople: unavailable,
      listVerifications: unavailable,
      listTeam: unavailable,
      listActivity: unavailable,
    };
  }

  const api = createAdminAuthenticatedApi(config, options);
  return {
    mode: "production",
    async searchCompanies(params) {
      const normalized = normalizeSearchParams(params);
      const response = await api.request<BackendPage<BackendCompanyItem>>(
        buildCompanySearchPath(normalized),
      );
      return mapPage(response, mapCompanyItem);
    },
    async getCompany(id) {
      const item = await api.request<BackendCompanyDetail>(
        `/api/v1/admin/organizations/${encodeURIComponent(id)}`,
      );
      return mapCompanyDetail(item);
    },
    async getOverview(id) {
      const item = await api.request<BackendCompanyOverview>(
        `/api/v1/admin/organizations/${encodeURIComponent(id)}/overview`,
      );
      return {
        peopleCount: item.people_count,
        verificationTotal: item.verification_total,
        verifiedCount: item.verified_count,
        pendingCount: item.pending_count,
        inProgressCount: item.in_progress_count,
        needsAttentionCount: item.needs_attention_count,
        cancelledCount: item.cancelled_count,
        withdrawnCount: item.withdrawn_count,
        completionRate: item.completion_rate ?? undefined,
        completionRateNumerator: item.completion_rate_numerator,
        completionRateDenominator: item.completion_rate_denominator,
        statusCounts: item.status_counts,
        typeCounts: item.type_counts,
      };
    },
    async listPeople(id, params) {
      const normalized = normalizeListParams(params);
      const response = await api.request<BackendPage<BackendCompanyPerson>>(
        buildCompanySectionPath(id, "people", normalized),
      );
      return mapPage(response, mapPerson);
    },
    async listVerifications(id, params) {
      const normalized = normalizeVerificationParams(params);
      const response = await api.request<BackendPage<BackendCompanyVerification>>(
        buildCompanySectionPath(id, "verifications", normalized),
      );
      return mapPage(response, mapVerification);
    },
    async listTeam(id, params) {
      const normalized = normalizeListParams(params);
      const response = await api.request<BackendPage<BackendCompanyTeamMember>>(
        buildCompanySectionPath(id, "team", normalized),
      );
      return mapPage(response, mapTeamMember);
    },
    async listActivity(id, params) {
      const normalized = normalizeListParams(params);
      const response = await api.request<BackendPage<BackendCompanyActivity>>(
        buildCompanySectionPath(id, "activity", normalized),
      );
      return mapPage(response, mapActivity);
    },
  };
}

export function companyDirectoryQueryOptions(
  params: CompanySearchParams = {},
  config: AppEnvConfig = appEnv,
  options: ProductionAdminApiOptions = {},
) {
  const normalized = normalizeSearchParams(params);
  const adapter = createCompany360DataAdapter(config, options);
  return queryOptions({
    queryKey: company360Keys.directory(normalized),
    queryFn: () => adapter.searchCompanies(normalized),
  });
}

export function companyDetailQueryOptions(
  id: string,
  config: AppEnvConfig = appEnv,
  options: ProductionAdminApiOptions = {},
) {
  return queryOptions({
    queryKey: company360Keys.detail(id),
    queryFn: () => createCompany360DataAdapter(config, options).getCompany(id),
  });
}

export function companyOverviewQueryOptions(
  id: string,
  config: AppEnvConfig = appEnv,
  options: ProductionAdminApiOptions = {},
) {
  return queryOptions({
    queryKey: company360Keys.overview(id),
    queryFn: () => createCompany360DataAdapter(config, options).getOverview(id),
  });
}

export function companyPeopleQueryOptions(
  id: string,
  params: CompanyPeopleParams = {},
  config: AppEnvConfig = appEnv,
  options: ProductionAdminApiOptions = {},
) {
  const normalized = normalizeListParams(params);
  return queryOptions({
    queryKey: company360Keys.people(id, normalized),
    queryFn: () => createCompany360DataAdapter(config, options).listPeople(id, normalized),
  });
}

export function companyVerificationsQueryOptions(
  id: string,
  params: CompanyVerificationParams = {},
  config: AppEnvConfig = appEnv,
  options: ProductionAdminApiOptions = {},
) {
  const normalized = normalizeVerificationParams(params);
  return queryOptions({
    queryKey: company360Keys.verifications(id, normalized),
    queryFn: () => createCompany360DataAdapter(config, options).listVerifications(id, normalized),
  });
}

export function companyTeamQueryOptions(
  id: string,
  params: CompanyPeopleParams = {},
  config: AppEnvConfig = appEnv,
  options: ProductionAdminApiOptions = {},
) {
  const normalized = normalizeListParams(params);
  return queryOptions({
    queryKey: company360Keys.team(id, normalized),
    queryFn: () => createCompany360DataAdapter(config, options).listTeam(id, normalized),
  });
}

export function companyActivityQueryOptions(
  id: string,
  params: CompanyPeopleParams = {},
  config: AppEnvConfig = appEnv,
  options: ProductionAdminApiOptions = {},
) {
  const normalized = normalizeListParams(params);
  return queryOptions({
    queryKey: company360Keys.activity(id, normalized),
    queryFn: () => createCompany360DataAdapter(config, options).listActivity(id, normalized),
  });
}

export function buildCompanySearchPath(params: Required<CompanySearchParams>): string {
  const query = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.pageSize),
  });
  if (params.search.trim()) query.set("search", params.search.trim());
  if (params.status !== "all") query.set("status", params.status);
  if (params.organizationType !== "all") {
    query.set("organization_type", params.organizationType);
  }
  return `/api/v1/admin/organizations?${query.toString()}`;
}

function buildCompanySectionPath(
  id: string,
  section: "people" | "verifications" | "team" | "activity",
  params: Required<CompanyPeopleParams> | Required<CompanyVerificationParams>,
): string {
  const query = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.pageSize),
  });
  if (params.search.trim()) query.set("search", params.search.trim());
  if (params.status !== "all") query.set("status", params.status);
  if ("verificationType" in params && params.verificationType !== "all") {
    query.set("verification_type", params.verificationType);
  }
  if ("createdAfter" in params && params.createdAfter) {
    query.set("created_after", params.createdAfter);
  }
  if ("createdBefore" in params && params.createdBefore) {
    query.set("created_before", params.createdBefore);
  }
  return `/api/v1/admin/organizations/${encodeURIComponent(id)}/${section}?${query.toString()}`;
}

function normalizeSearchParams(params: CompanySearchParams = {}): Required<CompanySearchParams> {
  return {
    search: params.search ?? "",
    status: params.status ?? "all",
    organizationType: params.organizationType ?? "all",
    page: params.page ?? DEFAULT_PAGE,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
  };
}

function normalizeListParams(params: CompanyPeopleParams = {}): Required<CompanyPeopleParams> {
  return {
    search: params.search ?? "",
    status: params.status ?? "all",
    page: params.page ?? DEFAULT_PAGE,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
  };
}

function normalizeVerificationParams(
  params: CompanyVerificationParams = {},
): Required<CompanyVerificationParams> {
  return {
    ...normalizeListParams(params),
    verificationType: params.verificationType ?? "all",
    createdAfter: params.createdAfter ?? "",
    createdBefore: params.createdBefore ?? "",
  };
}

function mapPage<TBackend, TFrontend>(
  response: BackendPage<TBackend>,
  mapper: (item: TBackend) => TFrontend,
): CompanyPage<TFrontend> {
  return {
    items: response.items.map(mapper),
    total: response.total,
    page: response.page,
    pageSize: response.page_size,
    totalPages: response.total_pages,
  };
}

function mapCompanyItem(item: BackendCompanyItem): CompanyDirectoryItem {
  return {
    id: item.public_id,
    name: item.name,
    domain: item.domain ?? undefined,
    organizationType: item.organization_type,
    accountStatus: item.account_status,
    verificationState: item.verification_state,
    isWorkspaceCustomer: item.is_workspace_customer,
    peopleCount: item.people_count,
    requestCount: item.request_count,
    verifiedCount: item.verified_count,
    pendingCount: item.pending_count,
    inProgressCount: item.in_progress_count,
    needsAttentionCount: item.needs_attention_count,
    teamSize: item.team_size,
    updatedAt: item.updated_at,
  };
}

function mapCompanyDetail(item: BackendCompanyDetail): CompanyDetail {
  return {
    id: item.public_id,
    name: item.name,
    domain: item.domain ?? undefined,
    website: item.website ?? undefined,
    organizationType: item.organization_type,
    industry: item.industry ?? undefined,
    location: item.location ?? undefined,
    organizationSize: item.organization_size ?? undefined,
    accountStatus: item.account_status,
    verificationState: item.verification_state,
    onboardingStatus: item.onboarding_status,
    isWorkspaceCustomer: item.is_workspace_customer,
    primaryOwnerName: item.primary_owner_name ?? undefined,
    primaryOwnerEmailMasked: item.primary_owner_email_masked ?? undefined,
    teamSize: item.team_size,
    peopleCount: item.people_count,
    registryRecordId: item.registry_record_public_id ?? undefined,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    lastActivityAt: item.last_activity_at ?? undefined,
  };
}

function mapPerson(item: BackendCompanyPerson): CompanyPersonItem {
  return {
    id: item.public_id,
    linkedUserId: item.linked_user_public_id ?? undefined,
    displayName: item.display_name,
    emailMasked: item.email_masked ?? undefined,
    relationship: item.relationship,
    lifecycleStatus: item.lifecycle_status,
    verificationRequestCount: item.verification_request_count,
    verifiedCount: item.verified_count,
    pendingCount: item.pending_count,
    lastActivityAt: item.last_activity_at ?? undefined,
  };
}

function mapVerification(item: BackendCompanyVerification): CompanyVerificationItem {
  return {
    id: item.public_id,
    organizationPersonId: item.organization_person_public_id ?? undefined,
    candidateName: item.candidate_name,
    candidateEmailMasked: item.candidate_email_masked,
    requestType: item.request_type,
    requestedBy: item.requested_by ?? undefined,
    createdAt: item.created_at,
    status: item.status,
    completedAt: item.completed_at ?? undefined,
    updatedAt: item.updated_at,
  };
}

function mapTeamMember(item: BackendCompanyTeamMember): CompanyTeamItem {
  return {
    id: item.public_id,
    userId: item.user_public_id,
    displayName: item.display_name,
    emailMasked: item.email_masked,
    role: item.role,
    status: item.status,
    joinedAt: item.joined_at,
    lastActivityAt: item.last_activity_at ?? undefined,
  };
}

function mapActivity(item: BackendCompanyActivity): CompanyActivityItem {
  return {
    id: item.public_id,
    occurredAt: item.occurred_at,
    eventType: item.event_type,
    source: item.source,
    actorName: item.actor_name ?? undefined,
    actorRole: item.actor_role ?? undefined,
    subjectId: item.subject_public_id ?? undefined,
    previousStatus: item.previous_status ?? undefined,
    newStatus: item.new_status ?? undefined,
  };
}
