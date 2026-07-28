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
  contacts: RegistryContact[];
  activity: RegistryActivityEvent[];
  activeCaseCount: number;
  totalVerifications: number;
  possibleDuplicateIds: string[];
  possibleDuplicateLinks: RegistryDuplicateLink[];
  sessionOnly?: boolean;
  registryFlags: string[];
}

export interface RegistryMetrics {
  total: number;
  verified: number;
  unverified: number;
  duplicates: number;
  contactsApproved: number;
  contactsBounced: number;
}

export interface RegistryListParams {
  query?: string;
  state?: RegistryOrgState | "all";
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

interface BackendRegistryDetail extends BackendRegistryRecord {
  contacts: BackendRegistryContact[];
  activity: BackendRegistryActivity[];
}

interface BackendRegistryMetrics {
  total: number;
  verified: number;
  unverified: number;
  duplicates: number;
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
    return {
      mode: "demo",
      listOrganizations: (params) =>
        options.demoLoader?.(normalizeRegistryListParams(params)) ?? loadDemoOrganizations(params),
      getMetrics: options.demoMetricsLoader ?? loadDemoMetrics,
      getOrganization: options.demoDetailLoader ?? loadDemoOrganization,
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
        verified: data.verified,
        unverified: data.unverified,
        duplicates: data.duplicates,
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
    verified: metrics.verified,
    unverified: metrics.unverified,
    duplicates: metrics.duplicates,
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
    contacts: [],
    activity: [],
    activeCaseCount: record.active_case_count,
    totalVerifications: record.total_verifications,
    possibleDuplicateIds,
    possibleDuplicateLinks: possibleDuplicateIds.map((id) => ({
      id,
      label: id,
    })),
    registryFlags: (record.registry_flags ?? []).map((flag) => String(flag)),
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
