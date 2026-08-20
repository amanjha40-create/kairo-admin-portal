import { queryOptions } from "@tanstack/react-query";
import { appEnv, type AppEnvConfig } from "@/config/env";
import type { ProductionAdminApiOptions } from "./admin-api";
import { createAdminAuthenticatedApi } from "./admin-api";

export interface AdminNotificationInboxItem {
  id: string;
  category: string;
  eventType: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
  status: string;
  channel: string;
  priority: string;
}

export interface AdminNotificationInboxResult {
  items: AdminNotificationInboxItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminNotificationUnreadCount {
  unreadCount: number;
}

export interface AdminNotificationDetail {
  id: string;
  notificationType: string;
  eventType: string;
  category: string;
  title: string;
  body: string;
  priority: string;
  status: string;
  recipientEmail?: string | null;
  channel: string;
  templateKey: string;
  templateVersion: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  sentAt?: string | null;
  failedAt?: string | null;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deliveries: Array<{
    id: string;
    channel: string;
    status: string;
    provider?: string | null;
    providerMessageId?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    dispatchedAt?: string | null;
    deliveredAt?: string | null;
    failedAt?: string | null;
  }>;
  history: Array<{
    id: string;
    actorUserId?: string | null;
    eventType: string;
    status?: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>;
}

export interface AdminNotificationListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  readState?: "all" | "read" | "unread";
  eventType?: string | "all";
}

interface BackendPage<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface BackendInboxRecord {
  public_id: string;
  category: string;
  event_type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  channel: string;
  priority: string;
}

interface BackendUnreadCount {
  unread_count: number;
}

interface BackendNotificationDetail {
  public_id: string;
  notification_type: string;
  event_type: string;
  category: string;
  title: string;
  body: string;
  priority: string;
  status: string;
  recipient_email?: string | null;
  channel: string;
  template_key: string;
  template_version: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  sent_at?: string | null;
  failed_at?: string | null;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
  deliveries?: Array<{
    public_id: string;
    channel: string;
    status: string;
    provider?: string | null;
    provider_message_id?: string | null;
    error_code?: string | null;
    error_message?: string | null;
    dispatched_at?: string | null;
    delivered_at?: string | null;
    failed_at?: string | null;
  }>;
  history?: Array<{
    public_id: string;
    actor_user_id?: string | null;
    event_type: string;
    status?: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
}

interface AdminNotificationsAdapter {
  listInbox: (params?: AdminNotificationListParams) => Promise<AdminNotificationInboxResult>;
  unreadCount: () => Promise<AdminNotificationUnreadCount>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  detail: (id: string) => Promise<AdminNotificationDetail>;
}

export interface CreateAdminNotificationsAdapterOptions {
  production?: ProductionAdminApiOptions;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export const adminNotificationKeys = {
  all: () => ["admin", "notifications"] as const,
  inbox: (params: Required<AdminNotificationListParams>) =>
    [
      ...adminNotificationKeys.all(),
      "inbox",
      params.page,
      params.pageSize,
      params.search,
      params.readState,
      params.eventType,
    ] as const,
  unreadCount: () => [...adminNotificationKeys.all(), "unread-count"] as const,
  detail: (id: string) => [...adminNotificationKeys.all(), "detail", id] as const,
};

export function createAdminNotificationsAdapter(
  config: AppEnvConfig = appEnv,
  options: CreateAdminNotificationsAdapterOptions = {},
): AdminNotificationsAdapter {
  const api = createAdminAuthenticatedApi(config, options.production);

  return {
    async listInbox(params) {
      const normalized = normalizeListParams(params);
      const data = await api.request<BackendPage<BackendInboxRecord>>(buildInboxPath(normalized));
      return {
        items: (data.items ?? []).map(mapInboxRecord),
        total: data.total ?? 0,
        page: data.page ?? normalized.page,
        pageSize: data.page_size ?? normalized.pageSize,
        totalPages: data.total_pages ?? 0,
      };
    },
    async unreadCount() {
      const data = await api.request<BackendUnreadCount>(
        "/api/v1/admin/notifications/unread-count",
      );
      return { unreadCount: data.unread_count ?? 0 };
    },
    async markRead(id) {
      await api.request<null>(`/api/v1/admin/notifications/${id}/read`, { method: "POST" });
    },
    async markAllRead() {
      await api.request<null>("/api/v1/admin/notifications/read-all", { method: "POST" });
    },
    async detail(id) {
      const data = await api.request<BackendNotificationDetail>(
        `/api/v1/admin/notifications/${id}`,
      );
      return mapDetailRecord(data);
    },
  };
}

export function adminNotificationInboxQueryOptions(params?: AdminNotificationListParams) {
  const adapter = createAdminNotificationsAdapter();
  const normalized = normalizeListParams(params);
  return queryOptions({
    queryKey: adminNotificationKeys.inbox(normalized),
    queryFn: async () => adapter.listInbox(normalized),
  });
}

export function adminNotificationUnreadCountQueryOptions() {
  const adapter = createAdminNotificationsAdapter();
  return queryOptions({
    queryKey: adminNotificationKeys.unreadCount(),
    queryFn: async () => adapter.unreadCount(),
  });
}

export function adminNotificationDetailQueryOptions(id: string) {
  const adapter = createAdminNotificationsAdapter();
  return queryOptions({
    queryKey: adminNotificationKeys.detail(id),
    queryFn: async () => adapter.detail(id),
  });
}

function normalizeListParams(
  params: AdminNotificationListParams = {},
): Required<AdminNotificationListParams> {
  return {
    page: params.page ?? DEFAULT_PAGE,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    search: params.search?.trim() ?? "",
    readState: params.readState ?? "all",
    eventType: params.eventType ?? "all",
  };
}

function buildInboxPath(params: Required<AdminNotificationListParams>) {
  const search = new URLSearchParams({
    paginate: "true",
    page: String(params.page),
    page_size: String(params.pageSize),
  });
  if (params.search) search.set("search", params.search);
  if (params.readState === "unread") search.set("unread", "true");
  if (params.readState === "read") search.set("unread", "false");
  if (params.eventType !== "all") search.set("event_type", params.eventType);
  return `/api/v1/admin/notifications/inbox?${search.toString()}`;
}

function mapInboxRecord(record: BackendInboxRecord): AdminNotificationInboxItem {
  return {
    id: record.public_id,
    category: record.category,
    eventType: record.event_type,
    title: record.title,
    body: record.body,
    metadata: record.metadata ?? {},
    readAt: record.read_at ?? null,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    status: record.status,
    channel: record.channel,
    priority: record.priority,
  };
}

function mapDetailRecord(record: BackendNotificationDetail): AdminNotificationDetail {
  return {
    id: record.public_id,
    notificationType: record.notification_type,
    eventType: record.event_type,
    category: record.category,
    title: record.title,
    body: record.body,
    priority: record.priority,
    status: record.status,
    recipientEmail: record.recipient_email ?? null,
    channel: record.channel,
    templateKey: record.template_key,
    templateVersion: record.template_version,
    payload: record.payload ?? {},
    metadata: record.metadata ?? {},
    sentAt: record.sent_at ?? null,
    failedAt: record.failed_at ?? null,
    readAt: record.read_at ?? null,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    deliveries: (record.deliveries ?? []).map((delivery) => ({
      id: delivery.public_id,
      channel: delivery.channel,
      status: delivery.status,
      provider: delivery.provider ?? null,
      providerMessageId: delivery.provider_message_id ?? null,
      errorCode: delivery.error_code ?? null,
      errorMessage: delivery.error_message ?? null,
      dispatchedAt: delivery.dispatched_at ?? null,
      deliveredAt: delivery.delivered_at ?? null,
      failedAt: delivery.failed_at ?? null,
    })),
    history: (record.history ?? []).map((event) => ({
      id: event.public_id,
      actorUserId: event.actor_user_id ?? null,
      eventType: event.event_type,
      status: event.status ?? null,
      metadata: event.metadata ?? {},
      createdAt: event.created_at,
    })),
  };
}
