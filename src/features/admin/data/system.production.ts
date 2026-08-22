import { queryOptions } from "@tanstack/react-query";
import { appEnv, type AppEnvConfig } from "@/config/env";
import type { ProductionAdminApiOptions } from "./admin-api";
import { createAdminAuthenticatedApi } from "./admin-api";

export const SYSTEM_HEALTH_LABEL = {
  healthy: "Healthy",
  degraded: "Degraded",
  unavailable: "Unavailable",
  unknown: "Unknown",
} as const satisfies Record<string, string>;

export const SYSTEM_INCIDENT_SEVERITY_LABEL = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
} as const satisfies Record<string, string>;

export const SYSTEM_INCIDENT_STATUS_LABEL = {
  open: "Open",
  monitoring: "Monitoring",
  resolved: "Resolved",
} as const satisfies Record<string, string>;

export type AdminSystemHealthState = keyof typeof SYSTEM_HEALTH_LABEL;
export type AdminSystemIncidentSeverity = keyof typeof SYSTEM_INCIDENT_SEVERITY_LABEL;
export type AdminSystemIncidentStatus = keyof typeof SYSTEM_INCIDENT_STATUS_LABEL;

export interface AdminSystemDependencyStatus {
  key: string;
  name: string;
  status: AdminSystemHealthState;
  checkedAt: string;
  critical: boolean;
  latencyMs?: number | null;
  reason?: string | null;
}

export interface AdminSystemStatus {
  overallStatus: AdminSystemHealthState;
  checkedAt: string;
  dependencies: AdminSystemDependencyStatus[];
}

export interface AdminSystemRuntime {
  environment: string;
  applicationName: string;
  applicationVersion: string;
  apiVersionPrefix: string;
  runtimeStartedAt: string;
  checkedAt: string;
  pythonVersion: string;
  jobBackend: string;
  resumeProcessingEnabled: boolean;
  emailBackend: string;
  emailSendEnabled: boolean;
  phoneOtpBackend: string;
  release: {
    gitSha?: string | null;
    buildId?: string | null;
    deployedAt?: string | null;
  };
  migration: {
    currentRevision?: string | null;
    expectedRevision?: string | null;
    matchesExpected: boolean;
    multipleHeads: boolean;
  };
}

export interface AdminSystemWorkload {
  key: string;
  name: string;
  status: AdminSystemHealthState;
  pending: number;
  processing: number;
  succeededRecent: number;
  failed: number;
  retryable: number;
  oldestPendingAt?: string | null;
  latestSuccessAt?: string | null;
  latestFailureAt?: string | null;
  note?: string | null;
}

export interface AdminSystemFailureItem {
  kind: string;
  publicId: string;
  category: string;
  subjectReference: string;
  title: string;
  status: string;
  firstFailureAt: string;
  latestFailureAt: string;
  retryCount: number;
  safeError?: string | null;
  retrySupported: boolean;
  retryReference?: string | null;
}

export interface AdminSystemActivityItem {
  kind: string;
  publicId: string;
  occurredAt: string;
  title: string;
  detail?: string | null;
  status?: string | null;
  actorUserId?: string | null;
  subjectType?: string | null;
  subjectPublicId?: string | null;
}

export interface AdminSystemIncidentEvent {
  publicId: string;
  actorUserId?: string | null;
  eventType: string;
  detail?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AdminSystemIncidentListItem {
  publicId: string;
  title: string;
  summary: string;
  category: string;
  severity: AdminSystemIncidentSeverity;
  status: AdminSystemIncidentStatus;
  source: string;
  openedAt: string;
  resolvedAt?: string | null;
  createdByUserId?: string | null;
  resolvedByUserId?: string | null;
  referenceType?: string | null;
  referencePublicId?: string | null;
  updatedAt: string;
}

export interface AdminSystemIncidentDetail extends AdminSystemIncidentListItem {
  history: AdminSystemIncidentEvent[];
}

export interface AdminSystemIncidentListParams {
  status?: AdminSystemIncidentStatus | "all";
  severity?: AdminSystemIncidentSeverity | "all";
  category?: string | "all";
  page?: number;
  pageSize?: number;
}

export interface AdminSystemIncidentListResult {
  items: AdminSystemIncidentListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminSystemActivityParams {
  page?: number;
  pageSize?: number;
}

export interface AdminSystemActivityResult {
  items: AdminSystemActivityItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminSystemCreateIncidentPayload {
  title: string;
  summary: string;
  category: string;
  severity: AdminSystemIncidentSeverity;
  referenceType?: string | null;
  referencePublicId?: string | null;
}

export interface AdminSystemUpdateIncidentPayload {
  title?: string;
  summary?: string;
  category?: string;
  severity?: AdminSystemIncidentSeverity;
  status?: Exclude<AdminSystemIncidentStatus, "resolved">;
}

export interface AdminSystemResolveIncidentPayload {
  reason: string;
}

export interface AdminSystemRetryResult {
  operation: string;
  referencePublicId: string;
  subjectPublicId?: string | null;
  message: string;
}

interface BackendPage<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface BackendSystemStatus {
  overall_status: string;
  checked_at: string;
  dependencies: Array<{
    key: string;
    name: string;
    status: string;
    checked_at: string;
    critical: boolean;
    latency_ms?: number | null;
    reason?: string | null;
  }>;
}

interface BackendSystemRuntime {
  environment: string;
  application_name: string;
  application_version: string;
  api_version_prefix: string;
  runtime_started_at: string;
  checked_at: string;
  python_version: string;
  job_backend: string;
  resume_processing_enabled: boolean;
  email_backend: string;
  email_send_enabled: boolean;
  phone_otp_backend: string;
  release: {
    git_sha?: string | null;
    build_id?: string | null;
    deployed_at?: string | null;
  };
  migration: {
    current_revision?: string | null;
    expected_revision?: string | null;
    matches_expected: boolean;
    multiple_heads: boolean;
  };
}

interface BackendSystemWorkloads {
  generated_at: string;
  workloads: Array<{
    key: string;
    name: string;
    status: string;
    pending: number;
    processing: number;
    succeeded_recent: number;
    failed: number;
    retryable: number;
    oldest_pending_at?: string | null;
    latest_success_at?: string | null;
    latest_failure_at?: string | null;
    note?: string | null;
  }>;
}

interface BackendSystemFailures {
  generated_at: string;
  items: Array<{
    kind: string;
    public_id: string;
    category: string;
    subject_reference: string;
    title: string;
    status: string;
    first_failure_at: string;
    latest_failure_at: string;
    retry_count: number;
    safe_error?: string | null;
    retry_supported: boolean;
    retry_reference?: string | null;
  }>;
}

interface BackendSystemActivityItem {
  kind: string;
  public_id: string;
  occurred_at: string;
  title: string;
  detail?: string | null;
  status?: string | null;
  actor_user_id?: string | null;
  subject_type?: string | null;
  subject_public_id?: string | null;
}

interface BackendSystemIncidentItem {
  public_id: string;
  title: string;
  summary: string;
  category: string;
  severity: string;
  status: string;
  source: string;
  opened_at: string;
  resolved_at?: string | null;
  created_by_user_id?: string | null;
  resolved_by_user_id?: string | null;
  reference_type?: string | null;
  reference_public_id?: string | null;
  updated_at: string;
}

interface BackendSystemIncidentDetail extends BackendSystemIncidentItem {
  history: Array<{
    public_id: string;
    actor_user_id?: string | null;
    event_type: string;
    detail?: string | null;
    metadata?: Record<string, unknown>;
    created_at: string;
  }>;
}

interface BackendSystemRetryResult {
  operation: string;
  reference_public_id: string;
  subject_public_id?: string | null;
  message: string;
}

interface AdminSystemAdapter {
  status: () => Promise<AdminSystemStatus>;
  runtime: () => Promise<AdminSystemRuntime>;
  workloads: () => Promise<AdminSystemWorkload[]>;
  failures: () => Promise<AdminSystemFailureItem[]>;
  activity: (params?: AdminSystemActivityParams) => Promise<AdminSystemActivityResult>;
  incidents: (params?: AdminSystemIncidentListParams) => Promise<AdminSystemIncidentListResult>;
  incident: (publicId: string) => Promise<AdminSystemIncidentDetail>;
  createIncident: (payload: AdminSystemCreateIncidentPayload) => Promise<AdminSystemIncidentDetail>;
  updateIncident: (
    publicId: string,
    payload: AdminSystemUpdateIncidentPayload,
  ) => Promise<AdminSystemIncidentDetail>;
  resolveIncident: (
    publicId: string,
    payload: AdminSystemResolveIncidentPayload,
  ) => Promise<AdminSystemIncidentDetail>;
  retryCommunicationFailure: (publicId: string) => Promise<AdminSystemRetryResult>;
}

export interface CreateAdminSystemAdapterOptions {
  production?: ProductionAdminApiOptions;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

export const adminSystemKeys = {
  all: () => ["admin", "system-operations"] as const,
  status: () => [...adminSystemKeys.all(), "status"] as const,
  runtime: () => [...adminSystemKeys.all(), "runtime"] as const,
  workloads: () => [...adminSystemKeys.all(), "workloads"] as const,
  failures: () => [...adminSystemKeys.all(), "failures"] as const,
  activity: (params: Required<AdminSystemActivityParams>) =>
    [...adminSystemKeys.all(), "activity", params.page, params.pageSize] as const,
  incidents: (params: Required<AdminSystemIncidentListParams>) =>
    [
      ...adminSystemKeys.all(),
      "incidents",
      params.status,
      params.severity,
      params.category,
      params.page,
      params.pageSize,
    ] as const,
  incident: (publicId: string) => [...adminSystemKeys.all(), "incident", publicId] as const,
};

export function createAdminSystemAdapter(
  config: AppEnvConfig = appEnv,
  options: CreateAdminSystemAdapterOptions = {},
): AdminSystemAdapter {
  const api = createAdminAuthenticatedApi(config, options.production);

  return {
    async status() {
      const response = await api.request<BackendSystemStatus>("/api/v1/admin/system/status");
      return {
        overallStatus: toHealthState(response.overall_status),
        checkedAt: response.checked_at,
        dependencies: response.dependencies.map((item) => ({
          key: item.key,
          name: item.name,
          status: toHealthState(item.status),
          checkedAt: item.checked_at,
          critical: item.critical,
          latencyMs: item.latency_ms ?? null,
          reason: item.reason ?? null,
        })),
      };
    },
    async runtime() {
      const response = await api.request<BackendSystemRuntime>("/api/v1/admin/system/runtime");
      return {
        environment: response.environment,
        applicationName: response.application_name,
        applicationVersion: response.application_version,
        apiVersionPrefix: response.api_version_prefix,
        runtimeStartedAt: response.runtime_started_at,
        checkedAt: response.checked_at,
        pythonVersion: response.python_version,
        jobBackend: response.job_backend,
        resumeProcessingEnabled: response.resume_processing_enabled,
        emailBackend: response.email_backend,
        emailSendEnabled: response.email_send_enabled,
        phoneOtpBackend: response.phone_otp_backend,
        release: {
          gitSha: response.release.git_sha ?? null,
          buildId: response.release.build_id ?? null,
          deployedAt: response.release.deployed_at ?? null,
        },
        migration: {
          currentRevision: response.migration.current_revision ?? null,
          expectedRevision: response.migration.expected_revision ?? null,
          matchesExpected: response.migration.matches_expected,
          multipleHeads: response.migration.multiple_heads,
        },
      };
    },
    async workloads() {
      const response = await api.request<BackendSystemWorkloads>("/api/v1/admin/system/workloads");
      return response.workloads.map((item) => ({
        key: item.key,
        name: item.name,
        status: toHealthState(item.status),
        pending: item.pending,
        processing: item.processing,
        succeededRecent: item.succeeded_recent,
        failed: item.failed,
        retryable: item.retryable,
        oldestPendingAt: item.oldest_pending_at ?? null,
        latestSuccessAt: item.latest_success_at ?? null,
        latestFailureAt: item.latest_failure_at ?? null,
        note: item.note ?? null,
      }));
    },
    async failures() {
      const response = await api.request<BackendSystemFailures>("/api/v1/admin/system/failures");
      return response.items.map((item) => ({
        kind: item.kind,
        publicId: item.public_id,
        category: item.category,
        subjectReference: item.subject_reference,
        title: item.title,
        status: item.status,
        firstFailureAt: item.first_failure_at,
        latestFailureAt: item.latest_failure_at,
        retryCount: item.retry_count,
        safeError: item.safe_error ?? null,
        retrySupported: item.retry_supported,
        retryReference: item.retry_reference ?? null,
      }));
    },
    async activity(params) {
      const normalized = normalizeActivityParams(params);
      const search = new URLSearchParams({
        page: String(normalized.page),
        page_size: String(normalized.pageSize),
      });
      const response = await api.request<BackendPage<BackendSystemActivityItem>>(
        `/api/v1/admin/system/activity?${search.toString()}`,
      );
      return {
        items: response.items.map((item) => ({
          kind: item.kind,
          publicId: item.public_id,
          occurredAt: item.occurred_at,
          title: item.title,
          detail: item.detail ?? null,
          status: item.status ?? null,
          actorUserId: item.actor_user_id ?? null,
          subjectType: item.subject_type ?? null,
          subjectPublicId: item.subject_public_id ?? null,
        })),
        total: response.total,
        page: response.page,
        pageSize: response.page_size,
        totalPages: response.total_pages,
      };
    },
    async incidents(params) {
      const normalized = normalizeIncidentParams(params);
      const search = new URLSearchParams({
        page: String(normalized.page),
        page_size: String(normalized.pageSize),
      });
      if (normalized.status !== "all") search.set("status", normalized.status);
      if (normalized.severity !== "all") search.set("severity", normalized.severity);
      if (normalized.category !== "all") search.set("category", normalized.category);

      const response = await api.request<BackendPage<BackendSystemIncidentItem>>(
        `/api/v1/admin/system/incidents?${search.toString()}`,
      );
      return {
        items: response.items.map(mapIncidentListItem),
        total: response.total,
        page: response.page,
        pageSize: response.page_size,
        totalPages: response.total_pages,
      };
    },
    async incident(publicId) {
      const response = await api.request<BackendSystemIncidentDetail>(
        `/api/v1/admin/system/incidents/${publicId}`,
      );
      return {
        ...mapIncidentListItem(response),
        history: (response.history ?? []).map((item) => ({
          publicId: item.public_id,
          actorUserId: item.actor_user_id ?? null,
          eventType: item.event_type,
          detail: item.detail ?? null,
          metadata: item.metadata ?? {},
          createdAt: item.created_at,
        })),
      };
    },
    createIncident: async (payload) => {
      const response = await api.request<BackendSystemIncidentDetail>(
        "/api/v1/admin/system/incidents",
        {
          method: "POST",
          body: {
            title: payload.title,
            summary: payload.summary,
            category: payload.category,
            severity: payload.severity,
            reference_type: payload.referenceType ?? null,
            reference_public_id: payload.referencePublicId ?? null,
          },
        },
      );
      return {
        ...mapIncidentListItem(response),
        history: (response.history ?? []).map((item) => ({
          publicId: item.public_id,
          actorUserId: item.actor_user_id ?? null,
          eventType: item.event_type,
          detail: item.detail ?? null,
          metadata: item.metadata ?? {},
          createdAt: item.created_at,
        })),
      };
    },
    updateIncident: async (publicId, payload) => {
      const response = await api.request<BackendSystemIncidentDetail>(
        `/api/v1/admin/system/incidents/${publicId}`,
        {
          method: "PATCH",
          body: {
            ...(payload.title ? { title: payload.title } : {}),
            ...(payload.summary ? { summary: payload.summary } : {}),
            ...(payload.category ? { category: payload.category } : {}),
            ...(payload.severity ? { severity: payload.severity } : {}),
            ...(payload.status ? { status: payload.status } : {}),
          },
        },
      );
      return {
        ...mapIncidentListItem(response),
        history: (response.history ?? []).map((item) => ({
          publicId: item.public_id,
          actorUserId: item.actor_user_id ?? null,
          eventType: item.event_type,
          detail: item.detail ?? null,
          metadata: item.metadata ?? {},
          createdAt: item.created_at,
        })),
      };
    },
    resolveIncident: async (publicId, payload) => {
      const response = await api.request<BackendSystemIncidentDetail>(
        `/api/v1/admin/system/incidents/${publicId}/resolve`,
        {
          method: "POST",
          body: payload,
        },
      );
      return {
        ...mapIncidentListItem(response),
        history: (response.history ?? []).map((item) => ({
          publicId: item.public_id,
          actorUserId: item.actor_user_id ?? null,
          eventType: item.event_type,
          detail: item.detail ?? null,
          metadata: item.metadata ?? {},
          createdAt: item.created_at,
        })),
      };
    },
    async retryCommunicationFailure(publicId) {
      const response = await api.request<BackendSystemRetryResult>(
        `/api/v1/admin/system/retries/communications/${publicId}`,
        { method: "POST" },
      );
      return {
        operation: response.operation,
        referencePublicId: response.reference_public_id,
        subjectPublicId: response.subject_public_id ?? null,
        message: response.message,
      };
    },
  };
}

export function adminSystemStatusQueryOptions() {
  const adapter = createAdminSystemAdapter();
  return queryOptions({
    queryKey: adminSystemKeys.status(),
    queryFn: () => adapter.status(),
  });
}

export function adminSystemRuntimeQueryOptions() {
  const adapter = createAdminSystemAdapter();
  return queryOptions({
    queryKey: adminSystemKeys.runtime(),
    queryFn: () => adapter.runtime(),
  });
}

export function adminSystemWorkloadsQueryOptions() {
  const adapter = createAdminSystemAdapter();
  return queryOptions({
    queryKey: adminSystemKeys.workloads(),
    queryFn: () => adapter.workloads(),
  });
}

export function adminSystemFailuresQueryOptions() {
  const adapter = createAdminSystemAdapter();
  return queryOptions({
    queryKey: adminSystemKeys.failures(),
    queryFn: () => adapter.failures(),
  });
}

export function adminSystemActivityQueryOptions(params: AdminSystemActivityParams = {}) {
  const adapter = createAdminSystemAdapter();
  const normalized = normalizeActivityParams(params);
  return queryOptions({
    queryKey: adminSystemKeys.activity(normalized),
    queryFn: () => adapter.activity(normalized),
  });
}

export function adminSystemIncidentsQueryOptions(params: AdminSystemIncidentListParams = {}) {
  const adapter = createAdminSystemAdapter();
  const normalized = normalizeIncidentParams(params);
  return queryOptions({
    queryKey: adminSystemKeys.incidents(normalized),
    queryFn: () => adapter.incidents(normalized),
  });
}

export function adminSystemIncidentDetailQueryOptions(publicId: string | null | undefined) {
  const adapter = createAdminSystemAdapter();
  return queryOptions({
    queryKey: adminSystemKeys.incident(publicId ?? "missing"),
    queryFn: () => {
      if (!publicId) {
        throw new Error("System incident ID is required.");
      }
      return adapter.incident(publicId);
    },
    enabled: Boolean(publicId),
  });
}

function normalizeActivityParams(
  params: AdminSystemActivityParams = {},
): Required<AdminSystemActivityParams> {
  return {
    page: params.page ?? DEFAULT_PAGE,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
  };
}

function normalizeIncidentParams(
  params: AdminSystemIncidentListParams = {},
): Required<AdminSystemIncidentListParams> {
  return {
    status: params.status ?? "all",
    severity: params.severity ?? "all",
    category: params.category?.trim() ? params.category.trim() : "all",
    page: params.page ?? DEFAULT_PAGE,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
  };
}

function mapIncidentListItem(item: BackendSystemIncidentItem): AdminSystemIncidentListItem {
  return {
    publicId: item.public_id,
    title: item.title,
    summary: item.summary,
    category: item.category,
    severity: toIncidentSeverity(item.severity),
    status: toIncidentStatus(item.status),
    source: item.source,
    openedAt: item.opened_at,
    resolvedAt: item.resolved_at ?? null,
    createdByUserId: item.created_by_user_id ?? null,
    resolvedByUserId: item.resolved_by_user_id ?? null,
    referenceType: item.reference_type ?? null,
    referencePublicId: item.reference_public_id ?? null,
    updatedAt: item.updated_at,
  };
}

function toHealthState(value: string): AdminSystemHealthState {
  if (
    value === "healthy" ||
    value === "degraded" ||
    value === "unavailable" ||
    value === "unknown"
  ) {
    return value;
  }
  return "unknown";
}

function toIncidentSeverity(value: string): AdminSystemIncidentSeverity {
  if (value === "low" || value === "medium" || value === "high" || value === "critical") {
    return value;
  }
  return "medium";
}

function toIncidentStatus(value: string): AdminSystemIncidentStatus {
  if (value === "open" || value === "monitoring" || value === "resolved") {
    return value;
  }
  return "open";
}
