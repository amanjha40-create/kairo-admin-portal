import { queryOptions } from "@tanstack/react-query";
import { appEnv, type AppEnvConfig } from "@/config/env";
import type { ProductionAdminApiOptions } from "./admin-api";
import { createAdminAuthenticatedApi } from "./admin-api";

export type AdminAccountStatus = "active" | "suspended" | "deleted";

export interface AdminSettingsMe {
  id: string;
  fullName: string | null;
  email: string;
  roleKey: string;
  roleLabel: string;
  accountStatus: AdminAccountStatus;
  permissions: string[];
  emailVerified: boolean;
  joinedAt: string;
  lastSignInAt?: string | null;
  lastActivityAt?: string | null;
}

export interface AdminSettingsSession {
  id: string;
  createdAt: string;
  expiresAt: string;
  lastActiveAt: string;
  current: boolean;
  status: "active" | "expired" | "revoked";
  revokedAt?: string | null;
}

export interface AdminSettingsNotificationCategory {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  required: boolean;
  eventTypes: string[];
}

export interface AdminAdministratorSummary {
  id: string;
  fullName: string | null;
  email: string;
  roleKey: string;
  roleLabel: string;
  accountStatus: AdminAccountStatus;
  emailVerified: boolean;
  joinedAt: string;
  lastSignInAt?: string | null;
  lastActivityAt?: string | null;
}

export interface AdminAccessAuditEvent {
  id: string;
  actorUserId?: string | null;
  actorDisplayName?: string | null;
  actorRole?: string | null;
  subjectUserId?: string | null;
  subjectEmail?: string | null;
  action: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AdminAdministratorCapabilities {
  canChangeRole: boolean;
  canDeactivate: boolean;
  canRestore: boolean;
}

export interface AdminAdministratorDetail extends AdminAdministratorSummary {
  permissions: string[];
  sessions: AdminSettingsSession[];
  accessHistory: AdminAccessAuditEvent[];
  capabilities: AdminAdministratorCapabilities;
  isCurrentActor: boolean;
}

export interface AdminRoleDefinition {
  key: string;
  label: string;
  description: string;
  permissions: string[];
  assignable: boolean;
}

export interface AdminAccessInvitation {
  id: string;
  email: string;
  roleKey: string;
  roleLabel: string;
  status: string;
  invitedByDisplayName?: string | null;
  acceptedByDisplayName?: string | null;
  createdAt: string;
  expiresAt: string;
  sentAt?: string | null;
  acceptedAt?: string | null;
  revokedAt?: string | null;
  resendCount: number;
}

interface BackendPage<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface BackendSettingsMeRecord {
  id: string;
  full_name: string | null;
  email: string;
  role_key: string;
  role_label: string;
  account_status: AdminAccountStatus;
  permissions: string[];
  email_verified: boolean;
  joined_at: string;
  last_sign_in_at?: string | null;
  last_activity_at?: string | null;
}

interface BackendSessionRecord {
  id: string;
  created_at: string;
  expires_at: string;
  last_active_at: string;
  current: boolean;
  status: "active" | "expired" | "revoked";
  revoked_at?: string | null;
}

interface BackendNotificationCategoryRecord {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  required: boolean;
  event_types: string[];
}

interface BackendNotificationsResponse {
  categories: BackendNotificationCategoryRecord[];
}

interface BackendAdministratorSummaryRecord {
  id: string;
  full_name: string | null;
  email: string;
  role_key: string;
  role_label: string;
  account_status: AdminAccountStatus;
  email_verified: boolean;
  joined_at: string;
  last_sign_in_at?: string | null;
  last_activity_at?: string | null;
}

interface BackendAuditRecord {
  id: string;
  actor_user_id?: string | null;
  actor_display_name?: string | null;
  actor_role?: string | null;
  subject_user_id?: string | null;
  subject_email?: string | null;
  action: string;
  summary: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

interface BackendAdministratorDetailRecord extends BackendAdministratorSummaryRecord {
  permissions: string[];
  sessions: BackendSessionRecord[];
  access_history: BackendAuditRecord[];
  capabilities: {
    can_change_role: boolean;
    can_deactivate: boolean;
    can_restore: boolean;
  };
  is_current_actor: boolean;
}

interface BackendRoleRecord {
  key: string;
  label: string;
  description: string;
  permissions: string[];
  assignable: boolean;
}

interface BackendInvitationRecord {
  id: string;
  email: string;
  role_key: string;
  role_label: string;
  status: string;
  invited_by_display_name?: string | null;
  accepted_by_display_name?: string | null;
  created_at: string;
  expires_at: string;
  sent_at?: string | null;
  accepted_at?: string | null;
  revoked_at?: string | null;
  resend_count: number;
}

export interface AdminListParams {
  query?: string;
  role?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminSettingsAdapter {
  getMe: () => Promise<AdminSettingsMe>;
  updateMe: (fullName: string) => Promise<AdminSettingsMe>;
  listSessions: () => Promise<AdminSettingsSession[]>;
  revokeSession: (sessionId: string) => Promise<AdminSettingsSession[]>;
  revokeOtherSessions: () => Promise<AdminSettingsSession[]>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<string>;
  getNotifications: () => Promise<AdminSettingsNotificationCategory[]>;
  updateNotifications: (
    categories: Array<{ key: string; enabled: boolean }>,
  ) => Promise<AdminSettingsNotificationCategory[]>;
  listAdministrators: (params?: AdminListParams) => Promise<{
    items: AdminAdministratorSummary[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>;
  getAdministrator: (id: string) => Promise<AdminAdministratorDetail>;
  changeAdministratorRole: (id: string, roleKey: string) => Promise<AdminAdministratorDetail>;
  deactivateAdministrator: (id: string, reason: string) => Promise<AdminAdministratorDetail>;
  restoreAdministrator: (id: string, reason?: string) => Promise<AdminAdministratorDetail>;
  listRoles: () => Promise<AdminRoleDefinition[]>;
  listAudit: (params?: AdminListParams) => Promise<{
    items: AdminAccessAuditEvent[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>;
  listInvitations: (params?: AdminListParams) => Promise<{
    items: AdminAccessInvitation[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>;
  createInvitation: (email: string, roleKey: string) => Promise<AdminAccessInvitation>;
  revokeInvitation: (id: string) => Promise<AdminAccessInvitation>;
  resendInvitation: (id: string) => Promise<AdminAccessInvitation>;
}

export function createAdminSettingsAdapter(
  config: AppEnvConfig = appEnv,
  options: { production?: ProductionAdminApiOptions } = {},
): AdminSettingsAdapter {
  const api = createAdminAuthenticatedApi(config, options.production);

  return {
    async getMe() {
      return mapSettingsMe(await api.request<BackendSettingsMeRecord>("/api/v1/admin/settings/me"));
    },
    async updateMe(fullName) {
      return mapSettingsMe(
        await api.request<BackendSettingsMeRecord>("/api/v1/admin/settings/me", {
          method: "PATCH",
          body: { full_name: fullName },
        }),
      );
    },
    async listSessions() {
      const data = await api.request<BackendSessionRecord[]>("/api/v1/admin/settings/sessions");
      return data.map(mapSession);
    },
    async revokeSession(sessionId) {
      const data = await api.request<BackendSessionRecord[]>(
        `/api/v1/admin/settings/sessions/${sessionId}/revoke`,
        { method: "POST" },
      );
      return data.map(mapSession);
    },
    async revokeOtherSessions() {
      const data = await api.request<BackendSessionRecord[]>(
        "/api/v1/admin/settings/sessions/revoke-others",
        { method: "POST" },
      );
      return data.map(mapSession);
    },
    async changePassword(currentPassword, newPassword) {
      const data = await api.request<{ message?: string }>("/api/v1/auth/change-password", {
        method: "POST",
        body: {
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: newPassword,
        },
      });
      return data.message ?? "Password updated.";
    },
    async getNotifications() {
      const data = await api.request<BackendNotificationsResponse>(
        "/api/v1/admin/settings/notifications",
      );
      return data.categories.map(mapNotificationCategory);
    },
    async updateNotifications(categories) {
      const data = await api.request<BackendNotificationsResponse>(
        "/api/v1/admin/settings/notifications",
        {
          method: "PATCH",
          body: {
            categories: categories.map((item) => ({ key: item.key, enabled: item.enabled })),
          },
        },
      );
      return data.categories.map(mapNotificationCategory);
    },
    async listAdministrators(params = {}) {
      const data = await api.request<BackendPage<BackendAdministratorSummaryRecord>>(
        buildPageUrl("/api/v1/admin/administrators", params),
      );
      return mapPage(data, mapAdministratorSummary);
    },
    async getAdministrator(id) {
      return mapAdministratorDetail(
        await api.request<BackendAdministratorDetailRecord>(`/api/v1/admin/administrators/${id}`),
      );
    },
    async changeAdministratorRole(id, roleKey) {
      return mapAdministratorDetail(
        await api.request<BackendAdministratorDetailRecord>(
          `/api/v1/admin/administrators/${id}/role`,
          {
            method: "PATCH",
            body: { role_key: roleKey },
          },
        ),
      );
    },
    async deactivateAdministrator(id, reason) {
      return mapAdministratorDetail(
        await api.request<BackendAdministratorDetailRecord>(
          `/api/v1/admin/administrators/${id}/deactivate`,
          {
            method: "POST",
            body: { reason },
          },
        ),
      );
    },
    async restoreAdministrator(id, reason) {
      return mapAdministratorDetail(
        await api.request<BackendAdministratorDetailRecord>(
          `/api/v1/admin/administrators/${id}/restore`,
          {
            method: "POST",
            body: { reason },
          },
        ),
      );
    },
    async listRoles() {
      const data = await api.request<BackendRoleRecord[]>("/api/v1/admin/roles");
      return data.map((item) => ({
        key: item.key,
        label: item.label,
        description: item.description,
        permissions: item.permissions,
        assignable: item.assignable,
      }));
    },
    async listAudit(params = {}) {
      const data = await api.request<BackendPage<BackendAuditRecord>>(
        buildPageUrl("/api/v1/admin/administration/audit", params),
      );
      return mapPage(data, mapAudit);
    },
    async listInvitations(params = {}) {
      const data = await api.request<BackendPage<BackendInvitationRecord>>(
        buildPageUrl("/api/v1/admin/administrator-invitations", params),
      );
      return mapPage(data, mapInvitation);
    },
    async createInvitation(email, roleKey) {
      return mapInvitation(
        await api.request<BackendInvitationRecord>("/api/v1/admin/administrator-invitations", {
          method: "POST",
          body: { email, role_key: roleKey },
        }),
      );
    },
    async revokeInvitation(id) {
      return mapInvitation(
        await api.request<BackendInvitationRecord>(
          `/api/v1/admin/administrator-invitations/${id}/revoke`,
          { method: "POST" },
        ),
      );
    },
    async resendInvitation(id) {
      return mapInvitation(
        await api.request<BackendInvitationRecord>(
          `/api/v1/admin/administrator-invitations/${id}/resend`,
          { method: "POST" },
        ),
      );
    },
  };
}

export const adminSettingsKeys = {
  me: () => ["admin", "settings", "me"] as const,
  sessions: () => ["admin", "settings", "sessions"] as const,
  notifications: () => ["admin", "settings", "notifications"] as const,
  administrators: (params: AdminListParams) =>
    ["admin", "settings", "administrators", params] as const,
  administrator: (id: string) => ["admin", "settings", "administrator", id] as const,
  roles: () => ["admin", "settings", "roles"] as const,
  audit: (params: AdminListParams) => ["admin", "settings", "audit", params] as const,
  invitations: (params: AdminListParams) => ["admin", "settings", "invitations", params] as const,
};

export function adminSettingsMeQueryOptions(adapter = createAdminSettingsAdapter()) {
  return queryOptions({
    queryKey: adminSettingsKeys.me(),
    queryFn: () => adapter.getMe(),
  });
}

export function adminSettingsSessionsQueryOptions(adapter = createAdminSettingsAdapter()) {
  return queryOptions({
    queryKey: adminSettingsKeys.sessions(),
    queryFn: () => adapter.listSessions(),
  });
}

export function adminSettingsNotificationsQueryOptions(adapter = createAdminSettingsAdapter()) {
  return queryOptions({
    queryKey: adminSettingsKeys.notifications(),
    queryFn: () => adapter.getNotifications(),
  });
}

export function adminAdministratorsQueryOptions(
  params: AdminListParams,
  adapter = createAdminSettingsAdapter(),
) {
  return queryOptions({
    queryKey: adminSettingsKeys.administrators(params),
    queryFn: () => adapter.listAdministrators(params),
  });
}

export function adminAdministratorDetailQueryOptions(
  id: string,
  adapter = createAdminSettingsAdapter(),
) {
  return queryOptions({
    queryKey: adminSettingsKeys.administrator(id),
    queryFn: () => adapter.getAdministrator(id),
  });
}

export function adminRolesQueryOptions(adapter = createAdminSettingsAdapter()) {
  return queryOptions({
    queryKey: adminSettingsKeys.roles(),
    queryFn: () => adapter.listRoles(),
  });
}

export function adminAuditQueryOptions(
  params: AdminListParams,
  adapter = createAdminSettingsAdapter(),
) {
  return queryOptions({
    queryKey: adminSettingsKeys.audit(params),
    queryFn: () => adapter.listAudit(params),
  });
}

export function adminInvitationsQueryOptions(
  params: AdminListParams,
  adapter = createAdminSettingsAdapter(),
) {
  return queryOptions({
    queryKey: adminSettingsKeys.invitations(params),
    queryFn: () => adapter.listInvitations(params),
  });
}

function buildPageUrl(path: string, params: AdminListParams) {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  search.set("page_size", String(params.pageSize ?? 10));
  if (params.query?.trim()) search.set("search", params.query.trim());
  if (params.role && params.role !== "all") search.set("role", params.role);
  if (params.status && params.status !== "all") search.set("status", params.status);
  return `${path}?${search.toString()}`;
}

function mapSettingsMe(record: BackendSettingsMeRecord): AdminSettingsMe {
  return {
    id: record.id,
    fullName: record.full_name,
    email: record.email,
    roleKey: record.role_key,
    roleLabel: record.role_label,
    accountStatus: record.account_status,
    permissions: record.permissions,
    emailVerified: record.email_verified,
    joinedAt: record.joined_at,
    lastSignInAt: record.last_sign_in_at ?? null,
    lastActivityAt: record.last_activity_at ?? null,
  };
}

function mapSession(record: BackendSessionRecord): AdminSettingsSession {
  return {
    id: record.id,
    createdAt: record.created_at,
    expiresAt: record.expires_at,
    lastActiveAt: record.last_active_at,
    current: record.current,
    status: record.status,
    revokedAt: record.revoked_at ?? null,
  };
}

function mapNotificationCategory(
  record: BackendNotificationCategoryRecord,
): AdminSettingsNotificationCategory {
  return {
    key: record.key,
    label: record.label,
    description: record.description,
    enabled: record.enabled,
    required: record.required,
    eventTypes: record.event_types,
  };
}

function mapAdministratorSummary(
  record: BackendAdministratorSummaryRecord,
): AdminAdministratorSummary {
  return {
    id: record.id,
    fullName: record.full_name,
    email: record.email,
    roleKey: record.role_key,
    roleLabel: record.role_label,
    accountStatus: record.account_status,
    emailVerified: record.email_verified,
    joinedAt: record.joined_at,
    lastSignInAt: record.last_sign_in_at ?? null,
    lastActivityAt: record.last_activity_at ?? null,
  };
}

function mapAudit(record: BackendAuditRecord): AdminAccessAuditEvent {
  return {
    id: record.id,
    actorUserId: record.actor_user_id ?? null,
    actorDisplayName: record.actor_display_name ?? null,
    actorRole: record.actor_role ?? null,
    subjectUserId: record.subject_user_id ?? null,
    subjectEmail: record.subject_email ?? null,
    action: record.action,
    summary: record.summary,
    metadata: record.metadata ?? {},
    createdAt: record.created_at,
  };
}

function mapAdministratorDetail(
  record: BackendAdministratorDetailRecord,
): AdminAdministratorDetail {
  return {
    ...mapAdministratorSummary(record),
    permissions: record.permissions,
    sessions: record.sessions.map(mapSession),
    accessHistory: record.access_history.map(mapAudit),
    capabilities: {
      canChangeRole: record.capabilities.can_change_role,
      canDeactivate: record.capabilities.can_deactivate,
      canRestore: record.capabilities.can_restore,
    },
    isCurrentActor: record.is_current_actor,
  };
}

function mapInvitation(record: BackendInvitationRecord): AdminAccessInvitation {
  return {
    id: record.id,
    email: record.email,
    roleKey: record.role_key,
    roleLabel: record.role_label,
    status: record.status,
    invitedByDisplayName: record.invited_by_display_name ?? null,
    acceptedByDisplayName: record.accepted_by_display_name ?? null,
    createdAt: record.created_at,
    expiresAt: record.expires_at,
    sentAt: record.sent_at ?? null,
    acceptedAt: record.accepted_at ?? null,
    revokedAt: record.revoked_at ?? null,
    resendCount: record.resend_count,
  };
}

function mapPage<TRecord, TValue>(data: BackendPage<TRecord>, mapItem: (item: TRecord) => TValue) {
  return {
    items: data.items.map(mapItem),
    total: data.total,
    page: data.page,
    pageSize: data.page_size,
    totalPages: data.total_pages,
  };
}
