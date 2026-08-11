import { queryOptions } from "@tanstack/react-query";
import { appEnv, type AppEnvConfig } from "@/config/env";
import type { ProductionAdminApiOptions } from "./admin-api";
import { createAdminAuthenticatedApi } from "./admin-api";

export const COMMUNICATION_CHANNEL_LABEL = {
  email: "Email",
} as const satisfies Record<string, string>;

export const COMMUNICATION_STATUS_LABEL = {
  queued: "Queued",
  sent: "Sent",
  failed: "Failed",
  cancelled: "Cancelled",
  suppressed: "Suppressed",
  skipped: "Skipped",
} as const satisfies Record<string, string>;

export const COMMUNICATION_TYPE_LABEL = {
  signup_otp: "Signup OTP",
  password_reset: "Password reset",
  employer_verification: "Verification outreach",
  trust_invitation_created: "Trust invitation",
  verification_completed: "Verification completed",
  admin_verification_review_required: "Admin review required",
  admin_verification_quality_review_required: "Admin quality review required",
} as const satisfies Record<string, string>;

export interface AdminCommunicationListParams {
  query?: string;
  status?: string | "all";
  channel?: string | "all";
  templateKey?: string | "all";
  page?: number;
  pageSize?: number;
  createdAfter?: string | null;
  createdBefore?: string | null;
}

export interface AdminCommunicationRelatedObject {
  kind: string;
  publicId: string;
  label?: string | null;
}

export interface AdminCommunicationNotificationSummary {
  id: string;
  eventType: string;
  category: string;
  title: string;
  status: string;
  readAt?: string | null;
  createdAt: string;
}

export interface AdminCommunicationTimelineEvent {
  kind: string;
  occurredAt: string;
  detail: string;
  status?: string | null;
}

export interface AdminCommunicationListItem {
  id: string;
  channel: string;
  eventType: string;
  templateKey: string;
  templateVersion: string;
  status: string;
  recipientMasked: string;
  provider: string;
  providerMessageId?: string | null;
  providerMessageIdDisplay?: string | null;
  subject?: string | null;
  failureReason?: string | null;
  queuedAt: string;
  sentAt?: string | null;
  failedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  retryable: boolean;
  retryPolicy: string;
  relatedObject?: AdminCommunicationRelatedObject | null;
  notification?: AdminCommunicationNotificationSummary | null;
}

export interface AdminCommunicationDetail extends AdminCommunicationListItem {
  payloadSummary: Record<string, unknown>;
  deliveryTimeline: AdminCommunicationTimelineEvent[];
}

export interface AdminCommunicationListResult {
  items: AdminCommunicationListItem[];
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

interface BackendRelatedObject {
  kind: string;
  public_id: string;
  label?: string | null;
}

interface BackendNotificationSummary {
  public_id: string;
  event_type: string;
  category: string;
  title: string;
  status: string;
  read_at?: string | null;
  created_at: string;
}

interface BackendTimelineEvent {
  kind: string;
  occurred_at: string;
  detail: string;
  status?: string | null;
}

interface BackendCommunicationRecord {
  public_id: string;
  channel: string;
  event_type: string;
  template_key: string;
  template_version: string;
  status: string;
  recipient_masked: string;
  provider: string;
  provider_message_id?: string | null;
  provider_message_id_display?: string | null;
  subject?: string | null;
  failure_reason?: string | null;
  queued_at: string;
  sent_at?: string | null;
  failed_at?: string | null;
  created_at: string;
  updated_at: string;
  retryable?: boolean;
  retry_policy?: string;
  related_object?: BackendRelatedObject | null;
  notification?: BackendNotificationSummary | null;
}

interface BackendCommunicationDetailRecord extends BackendCommunicationRecord {
  payload_summary?: Record<string, unknown>;
  delivery_timeline?: BackendTimelineEvent[];
}

interface AdminCommunicationsAdapter {
  list: (params?: AdminCommunicationListParams) => Promise<AdminCommunicationListResult>;
  detail: (id: string) => Promise<AdminCommunicationDetail>;
}

export interface CreateAdminCommunicationsAdapterOptions {
  production?: ProductionAdminApiOptions;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export const communicationKeys = {
  all: () => ["admin", "communications"] as const,
  list: (params: Required<AdminCommunicationListParams>) =>
    [
      ...communicationKeys.all(),
      "list",
      params.query,
      params.status,
      params.channel,
      params.templateKey,
      params.page,
      params.pageSize,
      params.createdAfter,
      params.createdBefore,
    ] as const,
  detail: (id: string) => [...communicationKeys.all(), "detail", id] as const,
};

export function getCommunicationMetrics() {
  return {
    total: 0,
    pending: 0,
    delivered: 0,
    awaitingResponse: 0,
    failed: 0,
    bounced: 0,
    complaints: 0,
    followUpsDueToday: 0,
    failedTotal: 0,
  };
}

export function createAdminCommunicationsAdapter(
  config: AppEnvConfig = appEnv,
  options: CreateAdminCommunicationsAdapterOptions = {},
): AdminCommunicationsAdapter {
  const api = createAdminAuthenticatedApi(config, options.production);

  return {
    async list(params) {
      const normalized = normalizeListParams(params);
      const data = await api.request<BackendPage<BackendCommunicationRecord>>(
        buildCommunicationsListPath(normalized),
      );
      return {
        items: (data.items ?? []).map(mapBackendCommunication),
        total: data.total ?? 0,
        page: data.page ?? normalized.page,
        pageSize: data.page_size ?? normalized.pageSize,
        totalPages: data.total_pages ?? 0,
      };
    },
    async detail(id) {
      const data = await api.request<BackendCommunicationDetailRecord>(
        `/api/v1/admin/communications/${id}`,
      );
      return mapBackendCommunicationDetail(data);
    },
  };
}

export function adminCommunicationListQueryOptions(params?: AdminCommunicationListParams) {
  const adapter = createAdminCommunicationsAdapter();
  const normalized = normalizeListParams(params);
  return queryOptions({
    queryKey: communicationKeys.list(normalized),
    queryFn: async () => adapter.list(normalized),
  });
}

export function adminCommunicationDetailQueryOptions(id: string) {
  const adapter = createAdminCommunicationsAdapter();
  return queryOptions({
    queryKey: communicationKeys.detail(id),
    queryFn: async () => adapter.detail(id),
  });
}

function normalizeListParams(
  params: AdminCommunicationListParams = {},
): Required<AdminCommunicationListParams> {
  return {
    query: params.query?.trim() ?? "",
    status: params.status ?? "all",
    channel: params.channel ?? "all",
    templateKey: params.templateKey ?? "all",
    page: params.page ?? DEFAULT_PAGE,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    createdAfter: params.createdAfter ?? null,
    createdBefore: params.createdBefore ?? null,
  };
}

function buildCommunicationsListPath(params: Required<AdminCommunicationListParams>) {
  const search = new URLSearchParams({
    paginate: "true",
    page: String(params.page),
    page_size: String(params.pageSize),
  });
  if (params.query) search.set("search", params.query);
  if (params.status !== "all") search.set("status", params.status);
  if (params.channel !== "all") search.set("channel", params.channel);
  if (params.templateKey !== "all") search.set("template_key", params.templateKey);
  if (params.createdAfter) search.set("created_after", params.createdAfter);
  if (params.createdBefore) search.set("created_before", params.createdBefore);
  return `/api/v1/admin/communications?${search.toString()}`;
}

function mapBackendCommunication(record: BackendCommunicationRecord): AdminCommunicationListItem {
  return {
    id: record.public_id,
    channel: record.channel,
    eventType: record.event_type,
    templateKey: record.template_key,
    templateVersion: record.template_version,
    status: record.status,
    recipientMasked: record.recipient_masked,
    provider: record.provider,
    providerMessageId: record.provider_message_id ?? null,
    providerMessageIdDisplay: record.provider_message_id_display ?? null,
    subject: record.subject ?? null,
    failureReason: record.failure_reason ?? null,
    queuedAt: record.queued_at,
    sentAt: record.sent_at ?? null,
    failedAt: record.failed_at ?? null,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    retryable: Boolean(record.retryable),
    retryPolicy: record.retry_policy ?? "requires_new_workflow_action",
    relatedObject: record.related_object
      ? {
          kind: record.related_object.kind,
          publicId: record.related_object.public_id,
          label: record.related_object.label ?? null,
        }
      : null,
    notification: record.notification
      ? {
          id: record.notification.public_id,
          eventType: record.notification.event_type,
          category: record.notification.category,
          title: record.notification.title,
          status: record.notification.status,
          readAt: record.notification.read_at ?? null,
          createdAt: record.notification.created_at,
        }
      : null,
  };
}

function mapBackendCommunicationDetail(
  record: BackendCommunicationDetailRecord,
): AdminCommunicationDetail {
  return {
    ...mapBackendCommunication(record),
    payloadSummary: record.payload_summary ?? {},
    deliveryTimeline: (record.delivery_timeline ?? []).map((event) => ({
      kind: event.kind,
      occurredAt: event.occurred_at,
      detail: event.detail,
      status: event.status ?? null,
    })),
  };
}
