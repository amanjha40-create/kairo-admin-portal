import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  ShieldMinus,
  ShieldPlus,
  ShieldX,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdminAccess } from "@/features/admin/auth/admin-access";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/features/admin/components/states";
import { WorkspaceSection } from "@/features/admin/components/workspace-section";
import {
  ADMIN_USER_ACCOUNT_STATUS_LABEL,
  createAdminUsersAdapter,
  userDetailQueryOptions,
  userKeys,
  type AdminUserAccountStatus,
  type AdminUserSession,
  type AdminUserVerificationBreakdown,
} from "@/features/admin/data/users";
import { formatRelativeTime } from "@/features/admin/lib/format";
import {
  submitUserActionMutation,
  submitUserNoteMutation,
} from "@/features/admin/lib/user-mutation-submit";
import { buildTrustSafetyCreateHref } from "@/features/admin/lib/trust-safety";
import { hasPermission } from "@/features/admin/workflow/permissions";
import { ApiError } from "@/lib/api/errors";

export const Route = createFileRoute("/admin/users/$userId")({
  head: () => ({
    meta: [
      { title: "User detail — Kairo Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: UserDetailPage,
});

type ActionDialogState =
  | { kind: "suspend" }
  | { kind: "restore" }
  | { kind: "password-reset" }
  | { kind: "revoke-all" }
  | { kind: "revoke-session"; session: AdminUserSession }
  | null;

function UserDetailPage() {
  const { userId } = Route.useParams();
  const access = useAdminAccess();
  const queryClient = useQueryClient();
  const adapter = useMemo(() => createAdminUsersAdapter(), []);
  const detailQuery = useQuery(userDetailQueryOptions(userId));
  const canCreateRiskInvestigation = hasPermission(access.admin?.permissions ?? [], "risk.create");
  const [noteBody, setNoteBody] = useState("");
  const [dialog, setDialog] = useState<ActionDialogState>(null);
  const [reason, setReason] = useState("");

  const refreshDetail = async () => {
    await queryClient.invalidateQueries({
      queryKey: userKeys.detail(adapter.mode, userId),
    });
  };

  const noteMutation = useMutation({
    mutationFn: async (body: string) => adapter.addNote(userId, body),
    onSuccess: async () => {
      setNoteBody("");
      toast.success("Internal admin note added");
      await refreshDetail();
    },
    onError: (error) => {
      toast.error(resolveActionErrorMessage(error, "The internal note could not be saved."));
    },
  });

  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!dialog) throw new Error("No action selected");
      switch (dialog.kind) {
        case "suspend":
          return adapter.suspendUser(userId, reason.trim());
        case "restore":
          return adapter.restoreUser(userId, reason.trim());
        case "password-reset":
          return adapter.sendPasswordReset(userId);
        case "revoke-all":
          return adapter.revokeAllSessions(userId);
        case "revoke-session":
          return adapter.revokeSession(userId, dialog.session.id);
      }
    },
    onSuccess: async () => {
      toast.success(actionSuccessCopy(dialog));
      setDialog(null);
      setReason("");
      await refreshDetail();
    },
    onError: (error) => {
      toast.error(resolveActionErrorMessage(error, actionFailureCopy(dialog)));
    },
  });

  if (detailQuery.isPending) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <LoadingSkeleton rows={10} />
      </div>
    );
  }

  if (detailQuery.error) {
    const copy = getUserDetailErrorCopy(detailQuery.error);
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState
          title={copy.title}
          description={copy.description}
          action={
            <button
              type="button"
              onClick={() => void detailQuery.refetch()}
              className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90"
            >
              Try again
            </button>
          }
        />
      </div>
    );
  }

  const user = detailQuery.data;
  if (!user) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <EmptyState
          title="Candidate not found"
          description="This candidate may have been removed or the link is incorrect."
          action={
            <Link
              to="/admin/users"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent"
            >
              <ArrowLeft aria-hidden className="size-3" />
              Back to Users
            </Link>
          }
        />
      </div>
    );
  }

  const activeSessions = user.sessions.filter((item) => item.status === "active");

  return (
    <>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
          <ol className="flex items-center gap-1">
            <li>
              <Link to="/admin/users" className="hover:text-foreground hover:underline">
                Users
              </Link>
            </li>
            <li>/</li>
            <li className="font-medium text-foreground">{user.displayName}</li>
          </ol>
        </nav>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-base font-semibold tracking-tight text-foreground">
                {user.displayName}
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">Candidate account {user.id}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <AccountStatusChip status={user.accountStatus} />
                <VerificationChip label="Email verified" ok={user.emailVerified} />
                <VerificationChip label="Phone verified" ok={user.phoneVerified} />
                <VerificationChip label="Onboarding complete" ok={user.onboardingCompleted} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canCreateRiskInvestigation ? (
                <a
                  href={buildTrustSafetyCreateHref("user", user.id)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-accent"
                >
                  <ShieldCheck className="size-3.5" />
                  Create investigation
                </a>
              ) : null}
              {user.capabilities.sendPasswordReset ? (
                <HeaderActionButton
                  label="Send password reset"
                  onClick={() => setDialog({ kind: "password-reset" })}
                  icon={<KeyRound className="size-3.5" />}
                />
              ) : null}
              {user.capabilities.revokeSessions && activeSessions.length > 0 ? (
                <HeaderActionButton
                  label="Revoke all sessions"
                  onClick={() => setDialog({ kind: "revoke-all" })}
                  icon={<ShieldX className="size-3.5" />}
                />
              ) : null}
              {user.capabilities.suspend ? (
                <HeaderActionButton
                  label="Suspend account"
                  onClick={() => setDialog({ kind: "suspend" })}
                  icon={<ShieldMinus className="size-3.5" />}
                  tone="warning"
                />
              ) : null}
              {user.capabilities.restore ? (
                <HeaderActionButton
                  label="Restore account"
                  onClick={() => setDialog({ kind: "restore" })}
                  icon={<ShieldPlus className="size-3.5" />}
                />
              ) : null}
            </div>
          </div>

          {user.deletedAt ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              This account has been tombstoned. Admin can inspect the remaining operational record
              without recovering erased candidate data.
            </div>
          ) : null}

          {user.suspendedAt ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              Suspended {formatRelativeTime(user.suspendedAt)}
              {user.suspensionReason ? ` — ${user.suspensionReason}` : ""}.
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-4">
            <WorkspaceSection
              title="Account"
              description="Canonical candidate identity and account state"
            >
              <div className="grid grid-cols-2 gap-3 text-[11px] md:grid-cols-4">
                <Field icon={<Mail className="size-3" />} label="Email">
                  {user.email}
                </Field>
                <Field icon={<Phone className="size-3" />} label="Phone">
                  {user.phone ?? "Unavailable"}
                </Field>
                <Field label="Profile slug">{user.profileSlug ?? "Unavailable"}</Field>
                <Field label="Candidate type">{humanize(user.candidateType)}</Field>
                <Field label="Created">{formatDateTime(user.createdAt)}</Field>
                <Field label="Updated">{formatRelativeTime(user.updatedAt)}</Field>
                <Field label="Last login">
                  {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : "Unavailable"}
                </Field>
                <Field label="Last active">
                  {user.lastActiveAt ? formatRelativeTime(user.lastActiveAt) : "Unavailable"}
                </Field>
                <Field label="Onboarding state">{humanize(user.onboardingState)}</Field>
                <Field label="Profile completion">{user.profileCompletionPercentage}%</Field>
                <Field label="Role">{user.currentRole ?? "Unavailable"}</Field>
                <Field label="Location">{user.location ?? "Unavailable"}</Field>
              </div>
            </WorkspaceSection>

            <WorkspaceSection
              title="Trust"
              description={
                user.trust.lastCalculatedAt
                  ? `Last calculated ${formatRelativeTime(user.trust.lastCalculatedAt)}`
                  : "Trust score is not currently available."
              }
            >
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Metric label="Overall" value={user.trust.overall ?? "Unavailable"} />
                <Metric label="Status" value={user.trust.status ?? "Unavailable"} />
                <Metric
                  label="Verification completeness"
                  value={`${user.trust.verificationCompletenessPercentage}%`}
                />
                <Metric label="Profile completion" value={`${user.profileCompletionPercentage}%`} />
              </div>
            </WorkspaceSection>

            <WorkspaceSection
              title="Career summary"
              description={`${user.careerSummary.totalItems} canonical record(s)`}
            >
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <Metric label="Employments" value={user.careerSummary.employments} />
                <Metric label="Educations" value={user.careerSummary.educations} />
                <Metric label="Certifications" value={user.careerSummary.certifications} />
                <Metric label="Projects" value={user.careerSummary.projects} />
                <Metric label="User documents" value={user.careerSummary.userDocuments} />
              </div>
            </WorkspaceSection>

            <WorkspaceSection
              title="Verification summary"
              description={`${user.verificationSummary.overall.total} backend-owned verification request(s)`}
            >
              <div className="grid gap-3 md:grid-cols-2">
                <BreakdownCard title="Overall" breakdown={user.verificationSummary.overall} />
                <BreakdownCard
                  title="Employment"
                  breakdown={user.verificationSummary.employments}
                />
                <BreakdownCard title="Education" breakdown={user.verificationSummary.educations} />
                <BreakdownCard
                  title="Certification"
                  breakdown={user.verificationSummary.certifications}
                />
              </div>
            </WorkspaceSection>

            <WorkspaceSection
              title="Verification requests"
              description={`${user.verifications.length} request${user.verifications.length === 1 ? "" : "s"}`}
            >
              {user.verifications.length === 0 ? (
                <EmptyState
                  title="No verification requests"
                  description="This candidate has no linked verification workflow yet."
                />
              ) : (
                <div className="overflow-hidden rounded-md border border-border">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border text-xs">
                      <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">Request</th>
                          <th className="px-3 py-2 font-medium">Type</th>
                          <th className="px-3 py-2 font-medium">Organization</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium">Updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-background">
                        {user.verifications.map((item) => (
                          <tr key={item.id} className="hover:bg-accent/40">
                            <td className="px-3 py-2">
                              <Link
                                to="/admin/verifications/$caseId"
                                params={{ caseId: item.id }}
                                className="text-foreground hover:underline"
                              >
                                {item.linkedRecordLabel}
                              </Link>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {humanize(item.requestType)}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {item.organizationName ?? "Unassigned"}
                            </td>
                            <td className="px-3 py-2">
                              <StatusPill label={humanize(item.status)} />
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {formatRelativeTime(item.updatedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </WorkspaceSection>

            <WorkspaceSection
              title="Security & sessions"
              description={`${user.sessions.length} recorded session${user.sessions.length === 1 ? "" : "s"}`}
            >
              {user.sessions.length === 0 ? (
                <EmptyState
                  title="No sessions recorded"
                  description="Candidate refresh-token sessions will appear here when they are issued."
                />
              ) : (
                <div className="overflow-hidden rounded-md border border-border">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border text-xs">
                      <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">Session</th>
                          <th className="px-3 py-2 font-medium">Created</th>
                          <th className="px-3 py-2 font-medium">Last active</th>
                          <th className="px-3 py-2 font-medium">Expires</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-background">
                        {user.sessions.map((session) => (
                          <tr key={session.id} className="hover:bg-accent/40">
                            <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                              {truncateId(session.id)}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {formatRelativeTime(session.createdAt)}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {formatRelativeTime(session.lastActiveAt)}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {formatRelativeTime(session.expiresAt)}
                            </td>
                            <td className="px-3 py-2">
                              <StatusPill label={humanize(session.status)} />
                            </td>
                            <td className="px-3 py-2">
                              {user.capabilities.revokeSessions && session.status === "active" ? (
                                <button
                                  type="button"
                                  onClick={() => setDialog({ kind: "revoke-session", session })}
                                  className="inline-flex h-7 items-center rounded-md border border-border px-2 text-[11px] font-medium text-foreground hover:bg-accent"
                                >
                                  Revoke
                                </button>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </WorkspaceSection>

            <WorkspaceSection
              title="Internal Admin notes"
              description={`${user.notes.length} note${user.notes.length === 1 ? "" : "s"} visible only to Kairo operators`}
            >
              {user.capabilities.addNote ? (
                <div className="mb-4 rounded-md border border-border bg-background p-3">
                  <label htmlFor="admin-user-note" className="text-xs font-medium text-foreground">
                    Add internal note
                  </label>
                  <textarea
                    id="admin-user-note"
                    value={noteBody}
                    onChange={(event) => setNoteBody(event.target.value)}
                    placeholder={`Add a note as ${access.admin?.name ?? "Kairo Operator"}. Never visible to the candidate.`}
                    className="mt-2 min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                  />
                  <div className="mt-3 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => submitUserNoteMutation(noteMutation, noteBody.trim())}
                      disabled={noteMutation.isPending || noteBody.trim().length === 0}
                      className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {noteMutation.isPending ? "Saving..." : "Add note"}
                    </button>
                  </div>
                </div>
              ) : null}

              {user.notes.length === 0 ? (
                <EmptyState
                  title="No internal notes yet"
                  description="Additive operational notes will appear here when recorded by authorized Admin operators."
                />
              ) : (
                <ol className="space-y-2">
                  {user.notes.map((note) => (
                    <li key={note.id} className="rounded-md border border-border bg-background p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="font-medium text-foreground">
                          {note.authorDisplayName ?? "Kairo Operator"}
                          {note.authorRole ? (
                            <span className="ml-1 text-muted-foreground">
                              ({humanize(note.authorRole)})
                            </span>
                          ) : null}
                        </div>
                        <div className="text-muted-foreground">
                          {formatRelativeTime(note.createdAt)}
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-foreground">{note.body}</p>
                    </li>
                  ))}
                </ol>
              )}
            </WorkspaceSection>

            <WorkspaceSection
              title="Activity & audit"
              description={`${user.activity.length} backend event${user.activity.length === 1 ? "" : "s"}`}
            >
              {user.activity.length === 0 ? (
                <EmptyState
                  title="No recent activity"
                  description="Operational activity will appear here when the backend records it."
                />
              ) : (
                <ol className="relative space-y-2 border-l border-border pl-4">
                  {user.activity.map((event) => (
                    <li key={event.id} className="relative">
                      <span
                        aria-hidden
                        className="absolute -left-[19px] top-1.5 size-2 rounded-full bg-muted-foreground/60 ring-2 ring-background"
                      />
                      <div className="text-xs">
                        <p className="text-foreground">{event.title}</p>
                        {event.detail ? (
                          <p className="mt-0.5 text-muted-foreground">{event.detail}</p>
                        ) : null}
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatRelativeTime(event.occurredAt)}
                          {event.actorDisplayName ? ` • ${event.actorDisplayName}` : ""}
                          {event.actorRole ? ` (${humanize(event.actorRole)})` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </WorkspaceSection>
          </div>

          <aside className="flex flex-col gap-4">
            <WorkspaceSection
              title="Passport"
              description={user.passport.ready ? "Ready" : "Not ready"}
            >
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <Metric label="Active links" value={user.passport.activeLinks} />
                <Metric label="Revoked links" value={user.passport.revokedLinks} />
                <Metric label="Expired links" value={user.passport.expiredLinks} />
                <Metric label="Unique views" value={user.passport.uniqueViews} />
              </div>
              <dl className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                <div className="flex items-center justify-between gap-2">
                  <dt>Total views</dt>
                  <dd className="text-foreground">{user.passport.totalViews}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt>Latest share</dt>
                  <dd className="text-foreground">
                    {user.passport.latestShareCreatedAt
                      ? formatRelativeTime(user.passport.latestShareCreatedAt)
                      : "Unavailable"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt>Last viewed</dt>
                  <dd className="text-foreground">
                    {user.passport.lastViewedAt
                      ? formatRelativeTime(user.passport.lastViewedAt)
                      : "Unavailable"}
                  </dd>
                </div>
              </dl>
            </WorkspaceSection>
          </aside>
        </div>
      </div>

      <AccountActionDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
            setReason("");
          }
        }}
        dialog={dialog}
        userName={user.displayName}
        reason={reason}
        onReasonChange={setReason}
        isSubmitting={actionMutation.isPending}
        onConfirm={() => submitUserActionMutation(actionMutation)}
      />
    </>
  );
}

function HeaderActionButton({
  label,
  onClick,
  icon,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  tone?: "default" | "warning";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex h-8 items-center gap-1 rounded-md border px-3 text-xs font-medium " +
        (tone === "warning"
          ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
          : "border-border bg-background text-foreground hover:bg-accent")
      }
    >
      {icon}
      {label}
    </button>
  );
}

function AccountActionDialog({
  open,
  onOpenChange,
  dialog,
  userName,
  reason,
  onReasonChange,
  isSubmitting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dialog: ActionDialogState;
  userName: string;
  reason: string;
  onReasonChange: (value: string) => void;
  isSubmitting: boolean;
  onConfirm: () => void;
}) {
  const copy = getDialogCopy(dialog, userName);
  const requiresReason = dialog?.kind === "suspend" || dialog?.kind === "restore";
  const canSubmit = !requiresReason || reason.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {requiresReason ? (
          <div className="space-y-2">
            <label htmlFor="account-action-reason" className="text-sm font-medium text-foreground">
              Reason
            </label>
            <textarea
              id="account-action-reason"
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder={copy.reasonPlaceholder}
              className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>
        ) : null}

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting || !canSubmit}
            className="inline-flex h-9 items-center justify-center rounded-md bg-[#0B2545] px-3 text-sm font-medium text-white hover:bg-[#0B2545]/92 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Working..." : copy.confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getDialogCopy(dialog: ActionDialogState, userName: string) {
  switch (dialog?.kind) {
    case "suspend":
      return {
        title: `Suspend ${userName}?`,
        description:
          "This will block new sign-in, invalidate active sessions, and preserve the account audit trail.",
        confirmLabel: "Suspend account",
        reasonPlaceholder: "Explain why this candidate account is being suspended.",
      };
    case "restore":
      return {
        title: `Restore ${userName}?`,
        description:
          "This re-enables future access for the candidate account, but does not automatically restore prior sessions.",
        confirmLabel: "Restore account",
        reasonPlaceholder: "Explain why this candidate account is being restored.",
      };
    case "password-reset":
      return {
        title: `Send password reset to ${userName}?`,
        description:
          "This sends the normal secure password-reset email. Admin never sees the token or the candidate password.",
        confirmLabel: "Send password reset",
        reasonPlaceholder: "",
      };
    case "revoke-all":
      return {
        title: `Revoke all sessions for ${userName}?`,
        description:
          "Every active candidate session will be revoked. The candidate will need to sign in again.",
        confirmLabel: "Revoke all sessions",
        reasonPlaceholder: "",
      };
    case "revoke-session":
      return {
        title: `Revoke this session for ${userName}?`,
        description:
          "Only the selected candidate session will be revoked. Remaining active sessions stay intact.",
        confirmLabel: "Revoke session",
        reasonPlaceholder: "",
      };
    default:
      return {
        title: "Confirm action",
        description: "Review the action before continuing.",
        confirmLabel: "Continue",
        reasonPlaceholder: "",
      };
  }
}

function actionSuccessCopy(dialog: ActionDialogState) {
  switch (dialog?.kind) {
    case "suspend":
      return "Candidate account suspended";
    case "restore":
      return "Candidate account restored";
    case "password-reset":
      return "Password reset email sent";
    case "revoke-all":
      return "All candidate sessions revoked";
    case "revoke-session":
      return "Candidate session revoked";
    default:
      return "Action completed";
  }
}

function actionFailureCopy(dialog: ActionDialogState) {
  switch (dialog?.kind) {
    case "suspend":
      return "The candidate account could not be suspended.";
    case "restore":
      return "The candidate account could not be restored.";
    case "password-reset":
      return "The password reset email could not be sent.";
    case "revoke-all":
      return "Candidate sessions could not be revoked.";
    case "revoke-session":
      return "The candidate session could not be revoked.";
    default:
      return "The requested action could not be completed.";
  }
}

function resolveActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }
  return fallback;
}

function Field({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-xs text-foreground">{children}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

function BreakdownCard({
  title,
  breakdown,
}: {
  title: string;
  breakdown: AdminUserVerificationBreakdown;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {breakdown.total} request{breakdown.total === 1 ? "" : "s"}
      </p>
      {Object.keys(breakdown.statuses).length === 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">No status data yet.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-[11px]">
          {Object.entries(breakdown.statuses).map(([status, total]) => (
            <li key={status} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{humanize(status)}</span>
              <span className="tabular-nums text-foreground">{total}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AccountStatusChip({ status }: { status: AdminUserAccountStatus }) {
  const tone =
    status === "active"
      ? "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60"
      : status === "deleted"
        ? "bg-zinc-100 text-zinc-800 ring-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-200 dark:ring-zinc-700"
        : "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60";
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${tone}`}
    >
      {ADMIN_USER_ACCOUNT_STATUS_LABEL[status]}
    </span>
  );
}

function VerificationChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset " +
        (ok
          ? "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60"
          : "bg-muted text-muted-foreground ring-border")
      }
    >
      {ok ? <ShieldCheck aria-hidden className="size-3" /> : null}
      {label}
    </span>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
      {label}
    </span>
  );
}

function truncateId(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (part) => part.toUpperCase());
}

function getUserDetailErrorCopy(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return {
        title: "Your session expired",
        description: "Sign in again to continue reviewing this candidate account.",
      };
    }
    if (error.status === 403) {
      return {
        title: "Users access is restricted",
        description: "Your account does not have permission to inspect candidate operations.",
      };
    }
    if (error.status === 404) {
      return {
        title: "Candidate not found",
        description: "The backend no longer recognizes this candidate record.",
      };
    }
  }
  return {
    title: "Candidate detail failed to load",
    description: "The Admin candidate detail could not be loaded. Try again shortly.",
  };
}
