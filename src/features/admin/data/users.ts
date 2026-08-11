import { queryOptions } from "@tanstack/react-query";
import { appEnv, type AppEnvConfig } from "@/config/env";
import { DEMO_MODE_BUILD_ENABLED } from "@/features/admin/controlled-pilot";
import type { ProductionAdminApiOptions } from "./admin-api";
import { createAdminAuthenticatedApi } from "./admin-api";

export type AdminUserAccountStatus = "active" | "inactive" | "deleted";
export type UserAccountStatus =
  "active" | "pending" | "disabled" | "suspended" | "deletion_requested";
export type UserAttentionKind =
  | "risk"
  | "onboarding_blocked"
  | "failed_outreach"
  | "documents_missing"
  | "email_bounce"
  | "identity_review";
export interface UserActivityEvent {
  id: string;
  at: string;
  kind: string;
  summary: string;
  sessionOnly?: boolean;
  actor?: string;
}
export type AdminUserSortBy = "created_at" | "updated_at" | "full_name" | "email";
export type SortOrder = "asc" | "desc";

export const ADMIN_USER_ACCOUNT_STATUS_LABEL: Record<AdminUserAccountStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  deleted: "Deleted",
};

export interface AdminUserListParams {
  query?: string;
  status?: AdminUserAccountStatus | "all";
  page?: number;
  pageSize?: number;
  sortBy?: AdminUserSortBy;
  sortOrder?: SortOrder;
}

export interface AdminUserListItem {
  id: string;
  displayName: string;
  maskedEmail: string;
  accountStatus: AdminUserAccountStatus;
  createdAt: string;
  lastRelevantActivityAt?: string | null;
  profileCompletionPercentage: number;
  trustScoreOverall?: number | null;
  trustScoreStatus?: string | null;
  activeVerificationCount: number;
  completedVerificationCount: number;
  careerRecordCount: number;
  activePassportShareCount: number;
  deletedAt?: string | null;
}

export interface AdminUserListResult {
  items: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminUserTrustSummary {
  overall?: number | null;
  status?: string | null;
  verificationCompletenessPercentage: number;
  lastCalculatedAt?: string | null;
}

export interface AdminUserCareerSummary {
  totalItems: number;
  employments: number;
  educations: number;
  internships: number;
  freelance: number;
  gigPlatforms: number;
  portfolio: number;
  certifications: number;
  skills: number;
  projects: number;
  userDocuments: number;
}

export interface AdminUserVerificationBreakdown {
  total: number;
  statuses: Record<string, number>;
}

export interface AdminUserVerificationSummary {
  overall: AdminUserVerificationBreakdown;
  employments: AdminUserVerificationBreakdown;
  educations: AdminUserVerificationBreakdown;
  certifications: AdminUserVerificationBreakdown;
}

export interface AdminUserVerificationItem {
  id: string;
  requestType: string;
  status: string;
  organizationId?: string | null;
  organizationName?: string | null;
  linkedRecordLabel: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserPassportSummary {
  ready: boolean;
  activeLinks: number;
  revokedLinks: number;
  expiredLinks: number;
  totalViews: number;
  uniqueViews: number;
  latestShareCreatedAt?: string | null;
  lastViewedAt?: string | null;
}

export interface AdminUserActivityEvent {
  id: string;
  occurredAt: string;
  kind: string;
  title: string;
  detail?: string | null;
}

export interface AdminUserDetail {
  id: string;
  displayName: string;
  accountStatus: AdminUserAccountStatus;
  email: string;
  maskedEmail: string;
  phone?: string | null;
  maskedPhone?: string | null;
  headline?: string | null;
  currentRole?: string | null;
  location?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  onboardingCompleted: boolean;
  profileCompletionPercentage: number;
  trust: AdminUserTrustSummary;
  careerSummary: AdminUserCareerSummary;
  verificationSummary: AdminUserVerificationSummary;
  verifications: AdminUserVerificationItem[];
  passport: AdminUserPassportSummary;
  activity: AdminUserActivityEvent[];
}

interface BackendPage<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface BackendUserListRecord {
  public_id: string;
  display_name: string;
  masked_email: string;
  account_status: string;
  created_at: string;
  last_relevant_activity_at?: string | null;
  profile_completion_percentage?: number;
  trust_score_overall?: number | null;
  trust_score_status?: string | null;
  active_verification_count?: number;
  completed_verification_count?: number;
  career_record_count?: number;
  active_passport_share_count?: number;
  deleted_at?: string | null;
}

interface BackendVerificationBreakdown {
  total?: number;
  statuses?: Record<string, number>;
}

interface BackendUserDetailRecord {
  public_id: string;
  display_name: string;
  account_status: string;
  email: string;
  masked_email: string;
  phone?: string | null;
  masked_phone?: string | null;
  headline?: string | null;
  current_role?: string | null;
  location?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  email_verified?: boolean;
  phone_verified?: boolean;
  onboarding_completed?: boolean;
  profile_completion_percentage?: number;
  trust?: {
    overall?: number | null;
    status?: string | null;
    verification_completeness_percentage?: number;
    last_calculated_at?: string | null;
  };
  career_summary?: {
    total_items?: number;
    employments?: number;
    educations?: number;
    internships?: number;
    freelance?: number;
    gig_platforms?: number;
    portfolio?: number;
    certifications?: number;
    skills?: number;
    projects?: number;
    user_documents?: number;
  };
  verification_summary?: {
    overall?: BackendVerificationBreakdown;
    employments?: BackendVerificationBreakdown;
    educations?: BackendVerificationBreakdown;
    certifications?: BackendVerificationBreakdown;
  };
  verifications?: Array<{
    public_id: string;
    request_type: string;
    status: string;
    organization_public_id?: string | null;
    organization_name?: string | null;
    linked_record_label: string;
    created_at: string;
    updated_at: string;
  }>;
  passport?: {
    ready?: boolean;
    active_links?: number;
    revoked_links?: number;
    expired_links?: number;
    total_views?: number;
    unique_views?: number;
    latest_share_created_at?: string | null;
    last_viewed_at?: string | null;
  };
  activity?: Array<{
    public_id: string;
    occurred_at: string;
    kind: string;
    title: string;
    detail?: string | null;
  }>;
}

type DemoUsersModule = typeof import("@/features/admin/mock-data/users");
type DemoVerificationModule = typeof import("@/features/admin/mock-data/verification-cases");

interface AdminUsersDataAdapter {
  mode: "demo" | "production";
  listUsers: (params?: AdminUserListParams) => Promise<AdminUserListResult>;
  getUser: (id: string) => Promise<AdminUserDetail | undefined>;
}

export interface CreateAdminUsersAdapterOptions {
  production?: ProductionAdminApiOptions;
  demoListLoader?: (params: Required<AdminUserListParams>) => Promise<AdminUserListResult>;
  demoDetailLoader?: (id: string) => Promise<AdminUserDetail | undefined>;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SORT_BY: AdminUserSortBy = "created_at";
const DEFAULT_SORT_ORDER: SortOrder = "desc";

export const userKeys = {
  all: () => ["admin", "users"] as const,
  list: (mode: "demo" | "production", params: Required<AdminUserListParams>) =>
    [
      ...userKeys.all(),
      "list",
      mode,
      params.query,
      params.status,
      params.page,
      params.pageSize,
      params.sortBy,
      params.sortOrder,
    ] as const,
  detail: (mode: "demo" | "production", id: string) =>
    [...userKeys.all(), "detail", mode, id] as const,
};

export function listUsers() {
  return [];
}

export function createAdminUsersAdapter(
  config: AppEnvConfig = appEnv,
  options: CreateAdminUsersAdapterOptions = {},
): AdminUsersDataAdapter {
  if (config.adminDemoMode) {
    return {
      mode: "demo",
      listUsers: (params) =>
        options.demoListLoader?.(normalizeListParams(params)) ?? loadDemoUsers(params),
      getUser: (id) => options.demoDetailLoader?.(id) ?? loadDemoUser(id),
    };
  }

  const api = createAdminAuthenticatedApi(config, options.production);

  return {
    mode: "production",
    async listUsers(params) {
      const normalized = normalizeListParams(params);
      const data = await api.request<BackendPage<BackendUserListRecord>>(
        buildUsersListPath(normalized),
      );
      return {
        items: (data.items ?? []).map(mapBackendListItem),
        total: data.total ?? 0,
        page: data.page ?? normalized.page,
        pageSize: data.page_size ?? normalized.pageSize,
        totalPages: data.total_pages ?? 0,
      };
    },
    async getUser(id) {
      const data = await api.request<BackendUserDetailRecord>(`/api/v1/admin/users/${id}`);
      return mapBackendDetail(data);
    },
  };
}

export function userListQueryOptions(params?: AdminUserListParams) {
  const adapter = createAdminUsersAdapter();
  const normalized = normalizeListParams(params);
  return queryOptions({
    queryKey: userKeys.list(adapter.mode, normalized),
    queryFn: async () => adapter.listUsers(normalized),
  });
}

export function userDetailQueryOptions(id: string) {
  const adapter = createAdminUsersAdapter();
  return queryOptions({
    queryKey: userKeys.detail(adapter.mode, id),
    queryFn: async () => adapter.getUser(id),
  });
}

function normalizeListParams(params: AdminUserListParams = {}): Required<AdminUserListParams> {
  return {
    query: params.query?.trim() ?? "",
    status: params.status ?? "all",
    page: params.page ?? DEFAULT_PAGE,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    sortBy: params.sortBy ?? DEFAULT_SORT_BY,
    sortOrder: params.sortOrder ?? DEFAULT_SORT_ORDER,
  };
}

function buildUsersListPath(params: Required<AdminUserListParams>) {
  const search = new URLSearchParams({
    paginate: "true",
    page: String(params.page),
    page_size: String(params.pageSize),
    sort_by: params.sortBy,
    sort_order: params.sortOrder,
  });
  if (params.query) search.set("search", params.query);
  if (params.status !== "all") search.set("status", params.status);
  return `/api/v1/admin/users?${search.toString()}`;
}

function normalizeAccountStatus(value: string | null | undefined): AdminUserAccountStatus {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "deleted") return "deleted";
  if (normalized === "inactive" || normalized === "disabled" || normalized === "suspended") {
    return "inactive";
  }
  return "active";
}

function mapBackendListItem(record: BackendUserListRecord): AdminUserListItem {
  return {
    id: record.public_id,
    displayName: record.display_name,
    maskedEmail: record.masked_email,
    accountStatus: normalizeAccountStatus(record.account_status),
    createdAt: record.created_at,
    lastRelevantActivityAt: record.last_relevant_activity_at ?? null,
    profileCompletionPercentage: record.profile_completion_percentage ?? 0,
    trustScoreOverall: record.trust_score_overall ?? null,
    trustScoreStatus: record.trust_score_status ?? null,
    activeVerificationCount: record.active_verification_count ?? 0,
    completedVerificationCount: record.completed_verification_count ?? 0,
    careerRecordCount: record.career_record_count ?? 0,
    activePassportShareCount: record.active_passport_share_count ?? 0,
    deletedAt: record.deleted_at ?? null,
  };
}

function mapBackendBreakdown(
  breakdown?: BackendVerificationBreakdown | null,
): AdminUserVerificationBreakdown {
  return {
    total: breakdown?.total ?? 0,
    statuses: breakdown?.statuses ?? {},
  };
}

function mapBackendDetail(record: BackendUserDetailRecord): AdminUserDetail {
  return {
    id: record.public_id,
    displayName: record.display_name,
    accountStatus: normalizeAccountStatus(record.account_status),
    email: record.email,
    maskedEmail: record.masked_email,
    phone: record.phone ?? null,
    maskedPhone: record.masked_phone ?? null,
    headline: record.headline ?? null,
    currentRole: record.current_role ?? null,
    location: record.location ?? null,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    deletedAt: record.deleted_at ?? null,
    emailVerified: Boolean(record.email_verified),
    phoneVerified: Boolean(record.phone_verified),
    onboardingCompleted: Boolean(record.onboarding_completed),
    profileCompletionPercentage: record.profile_completion_percentage ?? 0,
    trust: {
      overall: record.trust?.overall ?? null,
      status: record.trust?.status ?? null,
      verificationCompletenessPercentage: record.trust?.verification_completeness_percentage ?? 0,
      lastCalculatedAt: record.trust?.last_calculated_at ?? null,
    },
    careerSummary: {
      totalItems: record.career_summary?.total_items ?? 0,
      employments: record.career_summary?.employments ?? 0,
      educations: record.career_summary?.educations ?? 0,
      internships: record.career_summary?.internships ?? 0,
      freelance: record.career_summary?.freelance ?? 0,
      gigPlatforms: record.career_summary?.gig_platforms ?? 0,
      portfolio: record.career_summary?.portfolio ?? 0,
      certifications: record.career_summary?.certifications ?? 0,
      skills: record.career_summary?.skills ?? 0,
      projects: record.career_summary?.projects ?? 0,
      userDocuments: record.career_summary?.user_documents ?? 0,
    },
    verificationSummary: {
      overall: mapBackendBreakdown(record.verification_summary?.overall),
      employments: mapBackendBreakdown(record.verification_summary?.employments),
      educations: mapBackendBreakdown(record.verification_summary?.educations),
      certifications: mapBackendBreakdown(record.verification_summary?.certifications),
    },
    verifications: (record.verifications ?? []).map((item) => ({
      id: item.public_id,
      requestType: item.request_type,
      status: item.status,
      organizationId: item.organization_public_id ?? null,
      organizationName: item.organization_name ?? null,
      linkedRecordLabel: item.linked_record_label,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    })),
    passport: {
      ready: Boolean(record.passport?.ready),
      activeLinks: record.passport?.active_links ?? 0,
      revokedLinks: record.passport?.revoked_links ?? 0,
      expiredLinks: record.passport?.expired_links ?? 0,
      totalViews: record.passport?.total_views ?? 0,
      uniqueViews: record.passport?.unique_views ?? 0,
      latestShareCreatedAt: record.passport?.latest_share_created_at ?? null,
      lastViewedAt: record.passport?.last_viewed_at ?? null,
    },
    activity: (record.activity ?? []).map((event) => ({
      id: event.public_id,
      occurredAt: event.occurred_at,
      kind: event.kind,
      title: event.title,
      detail: event.detail ?? null,
    })),
  };
}

async function loadDemoUsers(params?: AdminUserListParams): Promise<AdminUserListResult> {
  const normalized = normalizeListParams(params);
  const [usersModule, verificationModule] = await loadDemoModules();
  const items = usersModule.mockUsers
    .map((user) => mapDemoUserListItem(user, verificationModule.mockVerificationCases))
    .filter((user) => {
      if (normalized.status !== "all" && user.accountStatus !== normalized.status) return false;
      if (!normalized.query) return true;
      const haystack = `${user.displayName} ${user.maskedEmail} ${user.id}`.toLowerCase();
      return haystack.includes(normalized.query.toLowerCase());
    })
    .sort((left, right) => compareListItems(left, right, normalized.sortBy, normalized.sortOrder));

  const start = (normalized.page - 1) * normalized.pageSize;
  const pageItems = items.slice(start, start + normalized.pageSize);
  return {
    items: pageItems,
    total: items.length,
    page: normalized.page,
    pageSize: normalized.pageSize,
    totalPages: items.length === 0 ? 0 : Math.ceil(items.length / normalized.pageSize),
  };
}

async function loadDemoUser(id: string): Promise<AdminUserDetail | undefined> {
  const [usersModule, verificationModule] = await loadDemoModules();
  const user = usersModule.getUser(id);
  if (!user) return undefined;

  const userCases = verificationModule.mockVerificationCases.filter(
    (item) => item.candidateId === id,
  );
  const breakdown = buildDemoVerificationSummary(userCases);
  const careerSummary = buildDemoCareerSummary(user);
  return {
    id: user.id,
    displayName: user.fullName,
    accountStatus: mapDemoAccountStatus(user.accountStatus),
    email: user.email,
    maskedEmail: maskEmail(user.email),
    phone: user.phone,
    maskedPhone: maskPhone(user.phone),
    headline: undefined,
    currentRole: user.employer ?? undefined,
    location: user.location,
    createdAt: user.joinedAt,
    updatedAt: user.lastActiveAt,
    deletedAt: null,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    onboardingCompleted: user.onboarding.state === "completed",
    profileCompletionPercentage: user.onboarding.profileCompletionPct,
    trust: {
      overall: user.trustScore.current,
      status: user.trustScore.band,
      verificationCompletenessPercentage:
        user.trustScore.verifiedSignals + user.trustScore.pendingSignals > 0
          ? Math.round(
              (user.trustScore.verifiedSignals * 100) /
                (user.trustScore.verifiedSignals + user.trustScore.pendingSignals),
            )
          : 0,
      lastCalculatedAt: user.trustScore.lastRecalculatedAt,
    },
    careerSummary,
    verificationSummary: breakdown,
    verifications: userCases.map((item) => ({
      id: item.id,
      requestType: item.verificationType,
      status: item.status,
      organizationId: item.organizationId,
      organizationName: item.organizationName,
      linkedRecordLabel: item.roleOrProgram,
      createdAt: item.submittedAt,
      updatedAt: item.updatedAt,
    })),
    passport: {
      ready: user.passport.status === "active",
      activeLinks: user.shares.filter((share) => share.status === "active").length,
      revokedLinks: user.shares.filter((share) => share.status === "revoked").length,
      expiredLinks: user.shares.filter((share) => share.status === "expired").length,
      totalViews: user.shares.reduce((sum, share) => sum + share.viewCount, 0),
      uniqueViews: user.shares.reduce((sum, share) => sum + Math.min(share.viewCount, 1), 0),
      latestShareCreatedAt: user.shares[0]?.createdAt ?? null,
      lastViewedAt: user.shares.find((share) => share.lastViewedAt)?.lastViewedAt ?? null,
    },
    activity: user.activity.map((item) => ({
      id: item.id,
      occurredAt: item.at,
      kind: item.kind,
      title: humanize(item.kind),
      detail: item.summary,
    })),
  };
}

function compareListItems(
  left: AdminUserListItem,
  right: AdminUserListItem,
  sortBy: AdminUserSortBy,
  sortOrder: SortOrder,
) {
  const sign = sortOrder === "asc" ? 1 : -1;
  const values: Record<AdminUserSortBy, string> = {
    created_at: left.createdAt,
    updated_at: left.lastRelevantActivityAt ?? left.createdAt,
    full_name: left.displayName,
    email: left.maskedEmail,
  };
  const otherValues: Record<AdminUserSortBy, string> = {
    created_at: right.createdAt,
    updated_at: right.lastRelevantActivityAt ?? right.createdAt,
    full_name: right.displayName,
    email: right.maskedEmail,
  };
  return values[sortBy].localeCompare(otherValues[sortBy]) * sign;
}

function mapDemoUserListItem(
  user: DemoUsersModule["mockUsers"][number],
  cases: DemoVerificationModule["mockVerificationCases"],
): AdminUserListItem {
  const userCases = cases.filter((item) => item.candidateId === user.id);
  const completedVerificationCount = userCases.filter((item) =>
    ["verified", "rejected", "unable_to_verify"].includes(item.status),
  ).length;
  return {
    id: user.id,
    displayName: user.fullName,
    maskedEmail: maskEmail(user.email),
    accountStatus: mapDemoAccountStatus(user.accountStatus),
    createdAt: user.joinedAt,
    lastRelevantActivityAt: user.lastActiveAt,
    profileCompletionPercentage: user.onboarding.profileCompletionPct,
    trustScoreOverall: user.trustScore.current,
    trustScoreStatus: user.trustScore.band,
    activeVerificationCount: userCases.length - completedVerificationCount,
    completedVerificationCount,
    careerRecordCount: user.careerRecords.length,
    activePassportShareCount: user.shares.filter((share) => share.status === "active").length,
    deletedAt: null,
  };
}

function buildDemoCareerSummary(
  user: DemoUsersModule["mockUsers"][number],
): AdminUserCareerSummary {
  const byKind = user.careerRecords.reduce<Record<string, number>>((acc, item) => {
    acc[item.kind] = (acc[item.kind] ?? 0) + 1;
    return acc;
  }, {});
  return {
    totalItems: user.careerRecords.length,
    employments: byKind.employment ?? 0,
    educations: byKind.education ?? 0,
    internships: byKind.internship ?? 0,
    freelance: byKind.freelance ?? 0,
    gigPlatforms: byKind.gig ?? 0,
    portfolio: 0,
    certifications: byKind.certification ?? 0,
    skills: 0,
    projects: byKind.project ?? 0,
    userDocuments: user.documents.length,
  };
}

function buildDemoVerificationSummary(
  cases: DemoVerificationModule["mockVerificationCases"],
): AdminUserVerificationSummary {
  const statuses = cases.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});
  const byType = (requestType: string): AdminUserVerificationBreakdown => {
    const filtered = cases.filter((item) => item.verificationType === requestType);
    return {
      total: filtered.length,
      statuses: filtered.reduce<Record<string, number>>((acc, item) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1;
        return acc;
      }, {}),
    };
  };
  return {
    overall: {
      total: cases.length,
      statuses,
    },
    employments: byType("employment"),
    educations: byType("education"),
    certifications: byType("certification"),
  };
}

function mapDemoAccountStatus(value: DemoUsersModule["mockUsers"][number]["accountStatus"]) {
  if (value === "active") return "active";
  return "inactive";
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (part) => part.toUpperCase());
}

function maskEmail(value: string) {
  const [local, domain] = value.split("@");
  if (!domain) return value;
  const shown = local.slice(0, 2);
  return `${shown}${"*".repeat(Math.max(local.length - shown.length, 0))}@${domain}`;
}

function maskPhone(value: string | null | undefined) {
  if (!value) return null;
  if (value.length <= 4) return value;
  return `${value.slice(0, 3)} ${"•".repeat(Math.max(value.length - 5, 0))}${value.slice(-2)}`;
}

async function loadDemoModules() {
  if (!DEMO_MODE_BUILD_ENABLED) {
    throw new Error("Demo users are unavailable when the demo build is disabled.");
  }
  const usersModule = await import("@/features/admin/mock-data/users");
  const verificationModule = await import("@/features/admin/mock-data/verification-cases");
  return [usersModule, verificationModule] as const;
}
