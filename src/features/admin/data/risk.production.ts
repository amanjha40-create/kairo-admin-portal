import { queryOptions } from "@tanstack/react-query";
import { appEnv, type AppEnvConfig } from "@/config/env";
import type { ProductionAdminApiOptions } from "./admin-api";
import { createAdminAuthenticatedApi } from "./admin-api";

export const TRUST_SAFETY_STATUS_LABEL = {
  open: "Open",
  in_review: "In review",
  awaiting_information: "Awaiting information",
  resolved: "Resolved",
  dismissed: "Dismissed",
} as const satisfies Record<string, string>;

export const TRUST_SAFETY_SEVERITY_LABEL = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
} as const satisfies Record<string, string>;

export const TRUST_SAFETY_SUBJECT_TYPE_LABEL = {
  user: "User",
  verification_request: "Verification",
  trust_registry_record: "Registry",
} as const satisfies Record<string, string>;

export type AdminRiskStatus = keyof typeof TRUST_SAFETY_STATUS_LABEL;
export type AdminRiskSeverity = keyof typeof TRUST_SAFETY_SEVERITY_LABEL;
export type AdminRiskSubjectType = keyof typeof TRUST_SAFETY_SUBJECT_TYPE_LABEL;
export type AdminRiskSignalStatus = "active" | "resolved";
export type AdminRiskWorkflowStatus = Exclude<AdminRiskStatus, "resolved" | "dismissed">;

export interface AdminRiskListParams {
  query?: string;
  status?: AdminRiskStatus | "all";
  severity?: AdminRiskSeverity | "all";
  subjectType?: AdminRiskSubjectType | "all";
  subjectPublicId?: string | null;
  assigneeUserId?: string | null;
  page?: number;
  pageSize?: number;
}

export interface AdminRiskAssignee {
  userId: string;
  fullName?: string | null;
  email: string;
  role: string;
}

export interface AdminRiskSignal {
  id: string;
  signalType: string;
  subjectType: AdminRiskSubjectType;
  subjectPublicId: string;
  severity: AdminRiskSeverity;
  source: string;
  summary: string;
  metadata: Record<string, unknown>;
  status: AdminRiskSignalStatus;
  detectedAt: string;
  resolvedAt?: string | null;
  investigationId?: string | null;
}

export interface AdminRiskNote {
  id: string;
  authorUserId?: string | null;
  authorDisplayName?: string | null;
  body: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AdminRiskEvent {
  id: string;
  actorUserId?: string | null;
  actorDisplayName?: string | null;
  eventType: string;
  detail?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AdminRiskUserContext {
  id: string;
  displayName: string;
  accountStatus: string;
  trustStatus?: string | null;
  trustScore?: number | null;
  verificationTotal: number;
}

export interface AdminRiskVerificationContext {
  id: string;
  status: string;
  subjectName: string;
  requestType: string;
  candidateUserId?: string | null;
  organizationPublicId?: string | null;
  organizationName?: string | null;
  registryRecordPublicId?: string | null;
  registryName?: string | null;
  evidenceCount: number;
  timelineCount: number;
}

export interface AdminRiskRegistryContext {
  id: string;
  legalName: string;
  displayName?: string | null;
  lifecycleStatus: string;
  trustStatus: string;
  linkedOrganizationCount: number;
  verificationCount: number;
}

export interface AdminRiskSubjectContext {
  user?: AdminRiskUserContext | null;
  verification?: AdminRiskVerificationContext | null;
  registry?: AdminRiskRegistryContext | null;
}

export interface AdminRiskInvestigationListItem {
  id: string;
  title: string;
  summary: string;
  status: AdminRiskStatus;
  severity: AdminRiskSeverity;
  subjectType: AdminRiskSubjectType;
  subjectPublicId: string;
  subjectLabel: string;
  primarySignalSummary?: string | null;
  assignee?: AdminRiskAssignee | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRiskInvestigationDetail extends AdminRiskInvestigationListItem {
  createdByUserId?: string | null;
  resolvedByUserId?: string | null;
  resolvedAt?: string | null;
  resolutionReason?: string | null;
  dismissedAt?: string | null;
  dismissedByUserId?: string | null;
  dismissalReason?: string | null;
  signals: AdminRiskSignal[];
  notes: AdminRiskNote[];
  timeline: AdminRiskEvent[];
  subjectContext: AdminRiskSubjectContext;
}

export interface AdminRiskSummary {
  openInvestigations: number;
  highOrCriticalInvestigations: number;
  unassignedInvestigations: number;
  activeSignals: number;
}

export interface AdminRiskListResult {
  items: AdminRiskInvestigationListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminRiskCreatePayload {
  subjectType: AdminRiskSubjectType;
  subjectPublicId: string;
  summary: string;
  severity: AdminRiskSeverity;
  signalType?: string;
  title?: string;
}

interface BackendPage<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface BackendAssignee {
  user_id: string;
  full_name?: string | null;
  email: string;
  role: string;
}

interface BackendSignal {
  public_id: string;
  signal_type: string;
  subject_type: string;
  subject_public_id: string;
  severity: string;
  source: string;
  summary: string;
  metadata: Record<string, unknown>;
  status: string;
  detected_at: string;
  resolved_at?: string | null;
  investigation_public_id?: string | null;
}

interface BackendNote {
  public_id: string;
  author_user_id?: string | null;
  author_display_name?: string | null;
  body: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface BackendEvent {
  public_id: string;
  actor_user_id?: string | null;
  actor_display_name?: string | null;
  event_type: string;
  detail?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface BackendSubjectContext {
  user?: {
    public_id?: string;
    id?: string;
    display_name: string;
    account_status: string;
    trust_summary?: {
      status?: string | null;
      overall_score?: number | null;
    } | null;
    verification_summary?: {
      total?: number;
    } | null;
  } | null;
  verification?: {
    request: {
      public_id: string;
      status: string;
      subject_name: string;
      request_type: string;
      subject_user_id?: string | null;
    };
    evidence: unknown[];
    organization_resolution?: {
      organization_public_id?: string | null;
      organization_name?: string | null;
    } | null;
    registry_resolution?: {
      registry_record_public_id?: string | null;
      registry_name?: string | null;
    } | null;
  } | null;
  verification_timeline?: {
    timeline?: {
      items?: unknown[];
    } | null;
  } | null;
  registry?: {
    public_id: string;
    legal_name: string;
    display_name?: string | null;
    lifecycle_status: string;
    trust_status: string;
    linked_organizations?: unknown[];
    verification_requests?: unknown[];
  } | null;
}

interface BackendInvestigationListItem {
  public_id: string;
  title: string;
  summary: string;
  status: string;
  severity: string;
  subject_type: string;
  subject_public_id: string;
  subject_label: string;
  primary_signal_summary?: string | null;
  assignee?: BackendAssignee | null;
  created_at: string;
  updated_at: string;
}

interface BackendInvestigationDetail extends BackendInvestigationListItem {
  created_by_user_id?: string | null;
  resolved_by_user_id?: string | null;
  resolved_at?: string | null;
  resolution_reason?: string | null;
  dismissed_at?: string | null;
  dismissed_by_user_id?: string | null;
  dismissal_reason?: string | null;
  signals: BackendSignal[];
  notes: BackendNote[];
  timeline: BackendEvent[];
  subject_context: BackendSubjectContext;
}

interface BackendSummary {
  open_investigations: number;
  high_or_critical_investigations: number;
  unassigned_investigations: number;
  active_signals: number;
}

interface AdminRiskAdapter {
  list: (params?: AdminRiskListParams) => Promise<AdminRiskListResult>;
  detail: (id: string) => Promise<AdminRiskInvestigationDetail>;
  summary: () => Promise<AdminRiskSummary>;
  create: (payload: AdminRiskCreatePayload) => Promise<AdminRiskInvestigationDetail>;
  assign: (id: string, assigneeUserId: string) => Promise<AdminRiskInvestigationDetail>;
  updateSeverity: (
    id: string,
    severity: AdminRiskCreatePayload["severity"],
  ) => Promise<AdminRiskInvestigationDetail>;
  addNote: (id: string, body: string) => Promise<AdminRiskNote>;
  updateStatus: (
    id: string,
    status: AdminRiskWorkflowStatus,
    reason?: string,
  ) => Promise<AdminRiskInvestigationDetail>;
  resolve: (id: string, reason: string) => Promise<AdminRiskInvestigationDetail>;
  dismiss: (id: string, reason: string) => Promise<AdminRiskInvestigationDetail>;
  listAssignees: () => Promise<AdminRiskAssignee[]>;
}

export interface CreateAdminRiskAdapterOptions {
  production?: ProductionAdminApiOptions;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export const riskKeys = {
  all: () => ["admin", "risk"] as const,
  summary: () => [...riskKeys.all(), "summary"] as const,
  list: (params: Required<AdminRiskListParams>) =>
    [
      ...riskKeys.all(),
      "list",
      params.query,
      params.status,
      params.severity,
      params.subjectType,
      params.subjectPublicId,
      params.assigneeUserId,
      params.page,
      params.pageSize,
    ] as const,
  detail: (id: string) => [...riskKeys.all(), "detail", id] as const,
  assignees: () => [...riskKeys.all(), "assignees"] as const,
};

export function createAdminRiskAdapter(
  config: AppEnvConfig = appEnv,
  options: CreateAdminRiskAdapterOptions = {},
): AdminRiskAdapter {
  const api = createAdminAuthenticatedApi(config, options.production);

  return {
    async list(params = {}) {
      const normalized = normalizeListParams(params);
      const query = buildQuery({
        q: normalized.query,
        status: normalized.status !== "all" ? normalized.status : undefined,
        severity: normalized.severity !== "all" ? normalized.severity : undefined,
        subject_type: normalized.subjectType !== "all" ? normalized.subjectType : undefined,
        subject_public_id: normalized.subjectPublicId ?? undefined,
        assignee_user_id: normalized.assigneeUserId ?? undefined,
        page: String(normalized.page),
        page_size: String(normalized.pageSize),
        sort_by: "updated_at",
        sort_dir: "desc",
      });
      const response = await api.request<BackendPage<BackendInvestigationListItem>>(
        `/api/v1/admin/trust-safety/investigations${query}`,
      );
      return {
        items: response.items.map(mapListItem),
        total: response.total,
        page: response.page,
        pageSize: response.page_size,
        totalPages: response.total_pages,
      };
    },
    async detail(id) {
      return mapDetail(
        await api.request<BackendInvestigationDetail>(
          `/api/v1/admin/trust-safety/investigations/${id}`,
        ),
      );
    },
    async summary() {
      const response = await api.request<BackendSummary>("/api/v1/admin/trust-safety/summary");
      return {
        openInvestigations: response.open_investigations,
        highOrCriticalInvestigations: response.high_or_critical_investigations,
        unassignedInvestigations: response.unassigned_investigations,
        activeSignals: response.active_signals,
      };
    },
    async create(payload) {
      return mapDetail(
        await api.request<BackendInvestigationDetail>("/api/v1/admin/trust-safety/investigations", {
          method: "POST",
          body: {
            subject_type: payload.subjectType,
            subject_public_id: payload.subjectPublicId,
            summary: payload.summary,
            severity: payload.severity,
            signal_type: payload.signalType ?? "manual_review",
            title: payload.title,
          },
        }),
      );
    },
    async assign(id, assigneeUserId) {
      return mapDetail(
        await api.request<BackendInvestigationDetail>(
          `/api/v1/admin/trust-safety/investigations/${id}/assign`,
          {
            method: "POST",
            body: { assignee_user_id: assigneeUserId },
          },
        ),
      );
    },
    async updateSeverity(id, severity) {
      return mapDetail(
        await api.request<BackendInvestigationDetail>(
          `/api/v1/admin/trust-safety/investigations/${id}/severity`,
          {
            method: "POST",
            body: { severity },
          },
        ),
      );
    },
    async addNote(id, body) {
      const response = await api.request<BackendNote>(
        `/api/v1/admin/trust-safety/investigations/${id}/notes`,
        {
          method: "POST",
          body: { body },
        },
      );
      return mapNote(response);
    },
    async updateStatus(id, status, reason) {
      return mapDetail(
        await api.request<BackendInvestigationDetail>(
          `/api/v1/admin/trust-safety/investigations/${id}/status`,
          {
            method: "POST",
            body: { status, reason },
          },
        ),
      );
    },
    async resolve(id, reason) {
      return mapDetail(
        await api.request<BackendInvestigationDetail>(
          `/api/v1/admin/trust-safety/investigations/${id}/resolve`,
          {
            method: "POST",
            body: { reason },
          },
        ),
      );
    },
    async dismiss(id, reason) {
      return mapDetail(
        await api.request<BackendInvestigationDetail>(
          `/api/v1/admin/trust-safety/investigations/${id}/dismiss`,
          {
            method: "POST",
            body: { reason },
          },
        ),
      );
    },
    async listAssignees() {
      const response = await api.request<{
        items: Array<{
          user_id: string;
          full_name?: string | null;
          email: string;
          role: string;
        }>;
      }>("/api/v1/admin/trust-safety/assignees?page=1&page_size=100");
      return response.items.map((item) => ({
        userId: item.user_id,
        fullName: item.full_name ?? null,
        email: item.email,
        role: item.role,
      }));
    },
  };
}

export function riskSummaryQueryOptions() {
  const adapter = createAdminRiskAdapter(appEnv);
  return queryOptions({
    queryKey: riskKeys.summary(),
    queryFn: () => adapter.summary(),
  });
}

export function riskInvestigationsQueryOptions(params: AdminRiskListParams = {}) {
  const adapter = createAdminRiskAdapter(appEnv);
  const normalized = normalizeListParams(params);
  return queryOptions({
    queryKey: riskKeys.list(normalized),
    queryFn: () => adapter.list(normalized),
  });
}

export function riskInvestigationDetailQueryOptions(id: string) {
  const adapter = createAdminRiskAdapter(appEnv);
  return queryOptions({
    queryKey: riskKeys.detail(id),
    queryFn: () => adapter.detail(id),
  });
}

function normalizeListParams(params: AdminRiskListParams): Required<AdminRiskListParams> {
  return {
    query: params.query?.trim() ?? "",
    status: params.status ?? "all",
    severity: params.severity ?? "all",
    subjectType: params.subjectType ?? "all",
    subjectPublicId: params.subjectPublicId ?? null,
    assigneeUserId: params.assigneeUserId ?? null,
    page: params.page ?? DEFAULT_PAGE,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
  };
}

function buildQuery(values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

function mapListItem(item: BackendInvestigationListItem): AdminRiskInvestigationListItem {
  return {
    id: item.public_id,
    title: item.title,
    summary: item.summary,
    status: item.status as AdminRiskStatus,
    severity: item.severity as AdminRiskSeverity,
    subjectType: item.subject_type as AdminRiskSubjectType,
    subjectPublicId: item.subject_public_id,
    subjectLabel: item.subject_label,
    primarySignalSummary: item.primary_signal_summary ?? null,
    assignee: item.assignee ? mapAssignee(item.assignee) : null,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function mapDetail(item: BackendInvestigationDetail): AdminRiskInvestigationDetail {
  return {
    ...mapListItem(item),
    createdByUserId: item.created_by_user_id ?? null,
    resolvedByUserId: item.resolved_by_user_id ?? null,
    resolvedAt: item.resolved_at ?? null,
    resolutionReason: item.resolution_reason ?? null,
    dismissedAt: item.dismissed_at ?? null,
    dismissedByUserId: item.dismissed_by_user_id ?? null,
    dismissalReason: item.dismissal_reason ?? null,
    signals: item.signals.map(mapSignal),
    notes: item.notes.map(mapNote),
    timeline: item.timeline.map(mapEvent),
    subjectContext: mapSubjectContext(item.subject_context),
  };
}

function mapAssignee(item: BackendAssignee): AdminRiskAssignee {
  return {
    userId: item.user_id,
    fullName: item.full_name ?? null,
    email: item.email,
    role: item.role,
  };
}

function mapSignal(item: BackendSignal): AdminRiskSignal {
  return {
    id: item.public_id,
    signalType: item.signal_type,
    subjectType: item.subject_type as AdminRiskSubjectType,
    subjectPublicId: item.subject_public_id,
    severity: item.severity as AdminRiskSeverity,
    source: item.source,
    summary: item.summary,
    metadata: item.metadata ?? {},
    status: item.status as AdminRiskSignalStatus,
    detectedAt: item.detected_at,
    resolvedAt: item.resolved_at ?? null,
    investigationId: item.investigation_public_id ?? null,
  };
}

function mapNote(item: BackendNote): AdminRiskNote {
  return {
    id: item.public_id,
    authorUserId: item.author_user_id ?? null,
    authorDisplayName: item.author_display_name ?? null,
    body: item.body,
    metadata: item.metadata ?? {},
    createdAt: item.created_at,
  };
}

function mapEvent(item: BackendEvent): AdminRiskEvent {
  return {
    id: item.public_id,
    actorUserId: item.actor_user_id ?? null,
    actorDisplayName: item.actor_display_name ?? null,
    eventType: item.event_type,
    detail: item.detail ?? null,
    metadata: item.metadata ?? {},
    createdAt: item.created_at,
  };
}

function mapSubjectContext(context: BackendSubjectContext): AdminRiskSubjectContext {
  return {
    user: context.user
      ? {
          id: context.user.public_id ?? context.user.id ?? "",
          displayName: context.user.display_name,
          accountStatus: context.user.account_status,
          trustStatus: context.user.trust_summary?.status ?? null,
          trustScore: context.user.trust_summary?.overall_score ?? null,
          verificationTotal: context.user.verification_summary?.total ?? 0,
        }
      : null,
    verification: context.verification
      ? {
          id: context.verification.request.public_id,
          status: context.verification.request.status,
          subjectName: context.verification.request.subject_name,
          requestType: context.verification.request.request_type,
          candidateUserId: context.verification.request.subject_user_id ?? null,
          organizationPublicId:
            context.verification.organization_resolution?.organization_public_id ?? null,
          organizationName: context.verification.organization_resolution?.organization_name ?? null,
          registryRecordPublicId:
            context.verification.registry_resolution?.registry_record_public_id ?? null,
          registryName: context.verification.registry_resolution?.registry_name ?? null,
          evidenceCount: context.verification.evidence?.length ?? 0,
          timelineCount: context.verification_timeline?.timeline?.items?.length ?? 0,
        }
      : null,
    registry: context.registry
      ? {
          id: context.registry.public_id,
          legalName: context.registry.legal_name,
          displayName: context.registry.display_name ?? null,
          lifecycleStatus: context.registry.lifecycle_status,
          trustStatus: context.registry.trust_status,
          linkedOrganizationCount: context.registry.linked_organizations?.length ?? 0,
          verificationCount: context.registry.verification_requests?.length ?? 0,
        }
      : null,
  };
}
