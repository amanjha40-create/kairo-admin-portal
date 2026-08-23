import { useEffect, useMemo, useState } from "react";
import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkspaceSection } from "@/features/admin/components/workspace-section";
import { AdminSearchField } from "@/features/admin/components/search-field";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PermissionDeniedState,
} from "@/features/admin/components/states";
import { TablePagination } from "@/features/admin/components/table-pagination";
import {
  adminAdministratorDetailQueryOptions,
  adminAdministratorsQueryOptions,
  adminAuditQueryOptions,
  adminInvitationsQueryOptions,
  adminRolesQueryOptions,
  adminSettingsKeys,
  adminSettingsMeQueryOptions,
  adminSettingsNotificationsQueryOptions,
  adminSettingsSessionsQueryOptions,
  createAdminSettingsAdapter,
  type AdminAccessInvitation,
  type AdminAdministratorSummary,
} from "@/features/admin/data/settings";
import { formatRelativeTime } from "@/features/admin/lib/format";
import { ApiError } from "@/lib/api/errors";

const adapter = createAdminSettingsAdapter();

export function AdminSettingsProductionPage() {
  const queryClient = useQueryClient();
  const meQuery = useQuery(adminSettingsMeQueryOptions(adapter));
  const sessionsQuery = useQuery(adminSettingsSessionsQueryOptions(adapter));
  const notificationsQuery = useQuery(adminSettingsNotificationsQueryOptions(adapter));

  const [fullName, setFullName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [adminQuery, setAdminQuery] = useState("");
  const [adminStatus, setAdminStatus] = useState("all");
  const [adminPage, setAdminPage] = useState(1);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);

  const [auditQuery, setAuditQuery] = useState("");
  const [auditPage, setAuditPage] = useState(1);

  const [inviteStatus, setInviteStatus] = useState("all");
  const [invitePage, setInvitePage] = useState(1);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("support");

  const administratorsQuery = useQuery(
    adminAdministratorsQueryOptions(
      {
        query: adminQuery,
        status: adminStatus,
        page: adminPage,
        pageSize: 10,
      },
      adapter,
    ),
  );
  const selectedAdministratorQuery = useQuery({
    ...adminAdministratorDetailQueryOptions(selectedAdminId ?? "", adapter),
    enabled: Boolean(selectedAdminId),
  });
  const rolesQuery = useQuery(adminRolesQueryOptions(adapter));
  const auditQueryResult = useQuery(
    adminAuditQueryOptions(
      {
        query: auditQuery,
        page: auditPage,
        pageSize: 10,
      },
      adapter,
    ),
  );
  const invitationsQuery = useQuery(
    adminInvitationsQueryOptions(
      {
        status: inviteStatus,
        page: invitePage,
        pageSize: 10,
      },
      adapter,
    ),
  );

  useEffect(() => {
    if (meQuery.data) {
      setFullName(meQuery.data.fullName ?? "");
    }
  }, [meQuery.data]);

  useEffect(() => {
    if (!selectedAdminId && administratorsQuery.data?.items[0]) {
      setSelectedAdminId(administratorsQuery.data.items[0].id);
    }
  }, [administratorsQuery.data?.items, selectedAdminId]);

  const permissions = meQuery.data?.permissions ?? [];
  const canReadAdminAccess = permissions.includes("admin_access_read");
  const canInviteAdminAccess = permissions.includes("admin_access_invite");
  const canDeactivateAdminAccess = permissions.includes("admin_access_deactivate");
  const canRestoreAdminAccess = permissions.includes("admin_access_restore");
  const canReadAdminAudit = permissions.includes("admin_access_audit_read");

  const updateMeMutation = useMutation({
    mutationFn: () => adapter.updateMe(fullName),
    onSuccess: (data) => {
      queryClient.setQueryData(adminSettingsKeys.me(), data);
      toast.success("Profile updated");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Profile could not be updated."));
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      adapter.changePassword(currentPassword, newPassword).then((message) => ({ message })),
    onSuccess: ({ message }) => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(message);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Password could not be changed."));
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => adapter.revokeSession(sessionId),
    onSuccess: (sessions) => {
      queryClient.setQueryData(adminSettingsKeys.sessions(), sessions);
      toast.success("Session revoked");
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Session could not be revoked.")),
  });

  const revokeOtherSessionsMutation = useMutation({
    mutationFn: () => adapter.revokeOtherSessions(),
    onSuccess: (sessions) => {
      queryClient.setQueryData(adminSettingsKeys.sessions(), sessions);
      toast.success("Other sessions revoked");
    },
    onError: (error) =>
      toast.error(extractErrorMessage(error, "Other sessions could not be revoked.")),
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: (categories: Array<{ key: string; enabled: boolean }>) =>
      adapter.updateNotifications(categories),
    onSuccess: (categories) => {
      queryClient.setQueryData(adminSettingsKeys.notifications(), categories);
      toast.success("Notification preferences updated");
    },
    onError: (error) =>
      toast.error(extractErrorMessage(error, "Notification preferences could not be updated.")),
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ id, roleKey }: { id: string; roleKey: string }) =>
      adapter.changeAdministratorRole(id, roleKey),
    onSuccess: (detail) => {
      void invalidateAdminQueries(queryClient, detail.id);
      toast.success("Admin role updated");
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Role could not be changed.")),
  });

  const deactivateMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adapter.deactivateAdministrator(id, reason),
    onSuccess: (detail) => {
      void invalidateAdminQueries(queryClient, detail.id);
      toast.success("Admin access deactivated");
    },
    onError: (error) =>
      toast.error(extractErrorMessage(error, "Admin access could not be deactivated.")),
  });

  const restoreMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adapter.restoreAdministrator(id, reason),
    onSuccess: (detail) => {
      void invalidateAdminQueries(queryClient, detail.id);
      toast.success("Admin access restored");
    },
    onError: (error) =>
      toast.error(extractErrorMessage(error, "Admin access could not be restored.")),
  });

  const createInvitationMutation = useMutation({
    mutationFn: () => adapter.createInvitation(inviteEmail, inviteRole),
    onSuccess: () => {
      setInviteEmail("");
      void queryClient.invalidateQueries({ queryKey: adminSettingsKeys.invitations({}) });
      toast.success("Admin invitation created");
    },
    onError: (error) =>
      toast.error(extractErrorMessage(error, "Admin invitation could not be created.")),
  });

  const revokeInvitationMutation = useMutation({
    mutationFn: (id: string) => adapter.revokeInvitation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminSettingsKeys.invitations({}) });
      toast.success("Invitation revoked");
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Invitation could not be revoked.")),
  });

  const resendInvitationMutation = useMutation({
    mutationFn: (id: string) => adapter.resendInvitation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminSettingsKeys.invitations({}) });
      toast.success("Invitation resent");
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Invitation could not be resent.")),
  });

  const notificationDraft = useMemo(
    () => notificationsQuery.data?.map((item) => ({ key: item.key, enabled: item.enabled })) ?? [],
    [notificationsQuery.data],
  );

  const currentAdministrator = selectedAdministratorQuery.data;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Backend-owned Admin identity, security, access administration, sanctioned roles, and
          access-history truth.
        </p>
      </header>

      <Tabs defaultValue="account" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
          <TabsTrigger value="account">My Account</TabsTrigger>
          <TabsTrigger value="security">Security & Sessions</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="administrators">Administrators</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="audit">Access History</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-4">
          {meQuery.isPending ? (
            <LoadingSkeleton rows={6} />
          ) : meQuery.isError ? (
            <ErrorState
              title="Settings could not be loaded"
              description={extractErrorMessage(meQuery.error, "Try again shortly.")}
            />
          ) : meQuery.data ? (
            <>
              <WorkspaceSection title="Identity" description="Backend-owned Admin profile data.">
                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Display name</span>
                    <input
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                  <div className="grid gap-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Login email</span>
                    <div className="rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground">
                      {meQuery.data.email}
                    </div>
                  </div>
                  <StatLine label="Role" value={meQuery.data.roleLabel} />
                  <StatLine label="Account status" value={titleCase(meQuery.data.accountStatus)} />
                  <StatLine
                    label="Email verification"
                    value={meQuery.data.emailVerified ? "Verified" : "Pending"}
                  />
                  <StatLine label="Joined" value={formatTimestamp(meQuery.data.joinedAt)} />
                  <StatLine
                    label="Last sign-in"
                    value={
                      meQuery.data.lastSignInAt
                        ? formatTimestamp(meQuery.data.lastSignInAt)
                        : "Unavailable"
                    }
                  />
                  <StatLine
                    label="Last activity"
                    value={
                      meQuery.data.lastActivityAt
                        ? formatTimestamp(meQuery.data.lastActivityAt)
                        : "Unavailable"
                    }
                  />
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    disabled={!fullName.trim() || updateMeMutation.isPending}
                    onClick={() => updateMeMutation.mutate()}
                    className="inline-flex h-9 items-center rounded-md bg-[#0B2545] px-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Save profile
                  </button>
                </div>
              </WorkspaceSection>

              <WorkspaceSection
                title="Admin access"
                description="Effective backend permissions for this signed-in Admin account."
              >
                <div className="flex flex-wrap gap-2">
                  {meQuery.data.permissions.map((permission) => (
                    <span
                      key={permission}
                      className="inline-flex rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] text-foreground"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </WorkspaceSection>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <WorkspaceSection
            title="Password"
            description="Change your Admin password using the shared backend auth flow."
          >
            <div className="grid gap-3 lg:grid-cols-3">
              <InputField
                label="Current password"
                type="password"
                value={currentPassword}
                onChange={setCurrentPassword}
              />
              <InputField
                label="New password"
                type="password"
                value={newPassword}
                onChange={setNewPassword}
              />
              <InputField
                label="Confirm new password"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
              />
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Password changes immediately affect future Admin sign-in and preserve backend auth
                truth.
              </p>
              <button
                type="button"
                disabled={
                  !currentPassword ||
                  !newPassword ||
                  newPassword !== confirmPassword ||
                  changePasswordMutation.isPending
                }
                onClick={() => changePasswordMutation.mutate()}
                className="inline-flex h-9 items-center rounded-md bg-[#0B2545] px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                Change password
              </button>
            </div>
          </WorkspaceSection>

          <WorkspaceSection
            title="Sessions"
            description="Session-family truth for the signed-in Admin account."
            action={
              <button
                type="button"
                disabled={revokeOtherSessionsMutation.isPending}
                onClick={() => revokeOtherSessionsMutation.mutate()}
                className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
              >
                Revoke other sessions
              </button>
            }
          >
            {sessionsQuery.isPending ? (
              <LoadingSkeleton rows={5} />
            ) : sessionsQuery.isError ? (
              <ErrorState
                title="Sessions could not be loaded"
                description={extractErrorMessage(sessionsQuery.error, "Try again shortly.")}
              />
            ) : sessionsQuery.data?.length ? (
              <div className="space-y-3">
                {sessionsQuery.data.map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-col gap-2 rounded-md border border-border bg-background px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {session.current ? "Current session" : "Admin session"}
                        </span>
                        <StatusPill status={session.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Started {formatTimestamp(session.createdAt)}. Last active{" "}
                        {formatRelativeTime(session.lastActiveAt)}. Expires{" "}
                        {formatTimestamp(session.expiresAt)}.
                      </p>
                    </div>
                    {session.current ? (
                      <span className="text-xs text-muted-foreground">
                        This browser session cannot be revoked here.
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={revokeSessionMutation.isPending}
                        onClick={() => revokeSessionMutation.mutate(session.id)}
                        className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No sessions recorded"
                description="Admin refresh-token families will appear here once they are issued."
              />
            )}
          </WorkspaceSection>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <WorkspaceSection
            title="Notification preferences"
            description="Operational Admin preferences backed by the shared notification-preference store."
          >
            {notificationsQuery.isPending ? (
              <LoadingSkeleton rows={5} />
            ) : notificationsQuery.isError ? (
              <ErrorState
                title="Notification preferences could not be loaded"
                description={extractErrorMessage(notificationsQuery.error, "Try again shortly.")}
              />
            ) : notificationsQuery.data?.length ? (
              <div className="space-y-3">
                {notificationsQuery.data.map((item) => (
                  <label
                    key={item.key}
                    className="flex items-start justify-between gap-3 rounded-md border border-border bg-background px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={item.required ? true : item.enabled}
                      disabled={item.required || updateNotificationsMutation.isPending}
                      onChange={(event) => {
                        const next = notificationDraft.map((entry) =>
                          entry.key === item.key
                            ? { ...entry, enabled: event.target.checked }
                            : entry,
                        );
                        queryClient.setQueryData(
                          adminSettingsKeys.notifications(),
                          notificationsQuery.data.map((entry) =>
                            entry.key === item.key
                              ? { ...entry, enabled: event.target.checked }
                              : entry,
                          ),
                        );
                        updateNotificationsMutation.mutate(next);
                      }}
                      className="mt-1 size-4 rounded border-border accent-foreground"
                    />
                  </label>
                ))}
              </div>
            ) : (
              <EmptyState title="No notification categories" />
            )}
          </WorkspaceSection>
        </TabsContent>

        <TabsContent value="administrators" className="space-y-4">
          {!canReadAdminAccess ? (
            <PermissionDeniedState
              title="Administrator directory unavailable"
              description="Your current Admin role can manage its own account settings but cannot inspect internal Admin access."
            />
          ) : (
            <>
              <WorkspaceSection
                title="Administrator directory"
                description="Only accounts with backend-owned internal Admin access appear here."
                action={
                  <div className="flex items-center gap-2">
                    <div className="w-64">
                      <AdminSearchField
                        value={adminQuery}
                        onChange={(value) => {
                          setAdminQuery(value);
                          setAdminPage(1);
                        }}
                        placeholder="Search internal admins"
                      />
                    </div>
                    {canInviteAdminAccess ? (
                      <button
                        type="button"
                        onClick={() => createInvitationMutation.mutate()}
                        disabled={!inviteEmail.trim() || createInvitationMutation.isPending}
                        className="inline-flex h-8 items-center gap-1 rounded-md bg-[#0B2545] px-3 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        <UserPlus className="size-3.5" /> Invite
                      </button>
                    ) : null}
                  </div>
                }
              >
                {canInviteAdminAccess ? (
                  <div className="mb-3 grid gap-2 rounded-md border border-dashed border-border bg-muted/30 p-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <InputField
                      label="Invite Admin by email"
                      value={inviteEmail}
                      onChange={setInviteEmail}
                      placeholder="admin@example.com"
                    />
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Sanctioned role</span>
                      <select
                        value={inviteRole}
                        onChange={(event) => setInviteRole(event.target.value)}
                        className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {rolesQuery.data?.map((role) => (
                          <option key={role.key} value={role.key}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}

                {administratorsQuery.isPending ? (
                  <LoadingSkeleton rows={6} />
                ) : administratorsQuery.isError ? (
                  <ErrorState
                    title="Administrator directory could not be loaded"
                    description={extractErrorMessage(
                      administratorsQuery.error,
                      "Try again shortly.",
                    )}
                  />
                ) : administratorsQuery.data?.items.length ? (
                  <div className="overflow-hidden rounded-md border border-border">
                    <table className="min-w-full divide-y divide-border text-sm">
                      <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">Administrator</th>
                          <th className="px-3 py-2 font-medium">Role</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium">Joined</th>
                          <th className="px-3 py-2 font-medium">Last activity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-background">
                        {administratorsQuery.data.items.map((administrator) => (
                          <tr
                            key={administrator.id}
                            className="cursor-pointer hover:bg-accent/40"
                            onClick={() => setSelectedAdminId(administrator.id)}
                          >
                            <td className="px-3 py-2">
                              <p className="font-medium text-foreground">
                                {administrator.fullName ?? "Unnamed admin"}
                              </p>
                              <p className="text-xs text-muted-foreground">{administrator.email}</p>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {administrator.roleLabel}
                            </td>
                            <td className="px-3 py-2">
                              <StatusPill status={administrator.accountStatus} />
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {formatTimestamp(administrator.joinedAt)}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {administrator.lastActivityAt
                                ? formatRelativeTime(administrator.lastActivityAt)
                                : "Unavailable"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <TablePagination
                      page={administratorsQuery.data.page}
                      pageSize={administratorsQuery.data.pageSize}
                      total={administratorsQuery.data.total}
                      onPageChange={setAdminPage}
                      onPageSizeChange={() => {}}
                      pageSizeOptions={[10]}
                    />
                  </div>
                ) : (
                  <EmptyState
                    title="No internal admins found"
                    description="Only backend-authoritative Admin/staff accounts are listed here."
                  />
                )}
              </WorkspaceSection>

              {currentAdministrator ? (
                <WorkspaceSection
                  title="Administrator detail"
                  description={`Role, session, and access-history truth for ${currentAdministrator.email}.`}
                >
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <StatLine
                          label="Name"
                          value={currentAdministrator.fullName ?? "Unnamed admin"}
                        />
                        <StatLine label="Email" value={currentAdministrator.email} />
                        <StatLine
                          label="Status"
                          value={titleCase(currentAdministrator.accountStatus)}
                        />
                        <StatLine
                          label="Email verified"
                          value={currentAdministrator.emailVerified ? "Verified" : "Pending"}
                        />
                      </div>

                      <div className="rounded-md border border-border bg-background p-3">
                        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Sanctioned role</span>
                          <select
                            value={currentAdministrator.roleKey}
                            disabled={
                              !currentAdministrator.capabilities.canChangeRole ||
                              changeRoleMutation.isPending
                            }
                            onChange={(event) =>
                              changeRoleMutation.mutate({
                                id: currentAdministrator.id,
                                roleKey: event.target.value,
                              })
                            }
                            className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            {rolesQuery.data?.map((role) => (
                              <option key={role.key} value={role.key}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="rounded-md border border-border bg-background p-3">
                        <p className="text-sm font-medium text-foreground">Recent sessions</p>
                        <div className="mt-3 space-y-2">
                          {currentAdministrator.sessions.length ? (
                            currentAdministrator.sessions.map((session) => (
                              <div
                                key={session.id}
                                className="flex items-center justify-between gap-2 rounded border border-border px-3 py-2"
                              >
                                <div>
                                  <p className="text-xs font-medium text-foreground">
                                    {session.current ? "Current admin session" : "Admin session"}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {formatTimestamp(session.createdAt)} ·{" "}
                                    {formatRelativeTime(session.lastActiveAt)}
                                  </p>
                                </div>
                                <StatusPill status={session.status} />
                              </div>
                            ))
                          ) : (
                            <EmptyState
                              title="No sessions recorded"
                              description="Session families will appear here when this Admin account signs in."
                            />
                          )}
                        </div>
                      </div>

                      <div className="rounded-md border border-border bg-background p-3">
                        <p className="text-sm font-medium text-foreground">Access history</p>
                        <div className="mt-3 space-y-2">
                          {currentAdministrator.accessHistory.length ? (
                            currentAdministrator.accessHistory.map((event) => (
                              <div
                                key={event.id}
                                className="rounded border border-border px-3 py-2"
                              >
                                <p className="text-xs font-medium text-foreground">
                                  {event.summary}
                                </p>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                  {event.actorDisplayName ?? "Unknown"} ·{" "}
                                  {formatTimestamp(event.createdAt)}
                                </p>
                              </div>
                            ))
                          ) : (
                            <EmptyState title="No access history recorded" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
                      <p className="text-sm font-medium text-foreground">Allowed actions</p>
                      <ActionButton
                        disabled={
                          !currentAdministrator.capabilities.canDeactivate ||
                          !canDeactivateAdminAccess
                        }
                        label="Deactivate admin access"
                        onClick={() =>
                          deactivateMutation.mutate({
                            id: currentAdministrator.id,
                            reason: "Admin access deactivated through the internal directory.",
                          })
                        }
                      />
                      <ActionButton
                        disabled={
                          !currentAdministrator.capabilities.canRestore || !canRestoreAdminAccess
                        }
                        label="Restore admin access"
                        onClick={() =>
                          restoreMutation.mutate({
                            id: currentAdministrator.id,
                            reason: "Admin access restored through the internal directory.",
                          })
                        }
                      />
                      <div className="rounded-md border border-dashed border-border bg-background p-3">
                        <p className="text-xs font-medium text-foreground">Canonical permissions</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {currentAdministrator.permissions.map((permission) => (
                            <span
                              key={permission}
                              className="inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] text-foreground"
                            >
                              {permission}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </WorkspaceSection>
              ) : administratorsQuery.data?.items.length ? (
                <LoadingSkeleton rows={4} />
              ) : null}

              <WorkspaceSection
                title="Pending invitations"
                description="Single-use Admin invitation records. Raw tokens are never returned by the Admin API."
              >
                <div className="mb-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInviteStatus("all");
                      setInvitePage(1);
                    }}
                    className={filterButtonClass(inviteStatus === "all")}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInviteStatus("pending");
                      setInvitePage(1);
                    }}
                    className={filterButtonClass(inviteStatus === "pending")}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInviteStatus("accepted");
                      setInvitePage(1);
                    }}
                    className={filterButtonClass(inviteStatus === "accepted")}
                  >
                    Accepted
                  </button>
                </div>
                {invitationsQuery.isPending ? (
                  <LoadingSkeleton rows={4} />
                ) : invitationsQuery.isError ? (
                  <ErrorState
                    title="Invitations could not be loaded"
                    description={extractErrorMessage(invitationsQuery.error, "Try again shortly.")}
                  />
                ) : invitationsQuery.data?.items.length ? (
                  <div className="space-y-2">
                    {invitationsQuery.data.items.map((invitation) => (
                      <InvitationRow
                        key={invitation.id}
                        invitation={invitation}
                        canInvite={canInviteAdminAccess}
                        onRevoke={() => revokeInvitationMutation.mutate(invitation.id)}
                        onResend={() => resendInvitationMutation.mutate(invitation.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No Admin invitations"
                    description="Pending, accepted, expired, and revoked invitation records will appear here."
                  />
                )}
              </WorkspaceSection>
            </>
          )}
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          {!canReadAdminAccess ? (
            <PermissionDeniedState />
          ) : rolesQuery.isPending ? (
            <LoadingSkeleton rows={5} />
          ) : rolesQuery.isError ? (
            <ErrorState
              title="Roles could not be loaded"
              description={extractErrorMessage(rolesQuery.error, "Try again shortly.")}
            />
          ) : (
            <WorkspaceSection
              title="Sanctioned roles"
              description="Backend-owned role definitions. Permission design is read-only here."
            >
              <div className="space-y-3">
                {rolesQuery.data?.map((role) => (
                  <div key={role.key} className="rounded-md border border-border bg-background p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{role.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{role.description}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] text-foreground">
                        <Shield className="size-3" /> {role.permissions.length} permissions
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {role.permissions.map((permission) => (
                        <span
                          key={permission}
                          className="inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] text-foreground"
                        >
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </WorkspaceSection>
          )}
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          {!canReadAdminAudit ? (
            <PermissionDeniedState />
          ) : (
            <WorkspaceSection
              title="Access history"
              description="Sensitive Admin-access changes with backend-owned actor and subject truth."
              action={
                <div className="w-64">
                  <AdminSearchField
                    value={auditQuery}
                    onChange={(value) => {
                      setAuditQuery(value);
                      setAuditPage(1);
                    }}
                    placeholder="Search actor, subject, action"
                  />
                </div>
              }
            >
              {auditQueryResult.isPending ? (
                <LoadingSkeleton rows={5} />
              ) : auditQueryResult.isError ? (
                <ErrorState
                  title="Access history could not be loaded"
                  description={extractErrorMessage(auditQueryResult.error, "Try again shortly.")}
                />
              ) : auditQueryResult.data?.items.length ? (
                <div className="overflow-hidden rounded-md border border-border">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Action</th>
                        <th className="px-3 py-2 font-medium">Actor</th>
                        <th className="px-3 py-2 font-medium">Subject</th>
                        <th className="px-3 py-2 font-medium">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-background">
                      {auditQueryResult.data.items.map((event) => (
                        <tr key={event.id}>
                          <td className="px-3 py-2">
                            <p className="font-medium text-foreground">{event.summary}</p>
                            <p className="text-xs text-muted-foreground">{event.action}</p>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {event.actorDisplayName ?? "Unknown"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {event.subjectEmail ?? "Unavailable"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {formatTimestamp(event.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <TablePagination
                    page={auditQueryResult.data.page}
                    pageSize={auditQueryResult.data.pageSize}
                    total={auditQueryResult.data.total}
                    onPageChange={setAuditPage}
                    onPageSizeChange={() => {}}
                    pageSizeOptions={[10]}
                  />
                </div>
              ) : (
                <EmptyState title="No admin access history recorded" />
              )}
            </WorkspaceSection>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : status === "suspended" || status === "revoked"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-border bg-muted text-foreground";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${tone}`}>
      {titleCase(status)}
    </span>
  );
}

function ActionButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function InvitationRow({
  invitation,
  canInvite,
  onRevoke,
  onResend,
}: {
  invitation: AdminAccessInvitation;
  canInvite: boolean;
  onRevoke: () => void;
  onResend: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-background px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">{invitation.email}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {invitation.roleLabel} · {titleCase(invitation.status)} · created{" "}
          {formatTimestamp(invitation.createdAt)}
        </p>
      </div>
      {canInvite && invitation.status === "pending" ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onResend}
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
          >
            Resend
          </button>
          <button
            type="button"
            onClick={onRevoke}
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
          >
            Revoke
          </button>
        </div>
      ) : null}
    </div>
  );
}

function formatTimestamp(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function filterButtonClass(active: boolean) {
  return (
    "h-7 rounded-md border px-2 text-[11px] font-medium " +
    (active
      ? "border-foreground bg-foreground text-background"
      : "border-border bg-background text-foreground hover:bg-accent")
  );
}

function extractErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

async function invalidateAdminQueries(queryClient: QueryClient, administratorId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: adminSettingsKeys.administrators({}) }),
    queryClient.invalidateQueries({ queryKey: adminSettingsKeys.administrator(administratorId) }),
    queryClient.invalidateQueries({ queryKey: adminSettingsKeys.audit({}) }),
  ]);
}
