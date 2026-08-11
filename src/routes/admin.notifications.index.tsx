import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/features/admin/components/states";
import { TablePagination } from "@/features/admin/components/table-pagination";
import { WorkspaceSection } from "@/features/admin/components/workspace-section";
import {
  adminNotificationInboxQueryOptions,
  adminNotificationKeys,
  createAdminNotificationsAdapter,
} from "@/features/admin/data/notifications";
import { resolveAdminNotificationTarget } from "@/features/admin/lib/admin-notification-target";
import { formatRelativeTime } from "@/features/admin/lib/format";

export const Route = createFileRoute("/admin/notifications/")({
  head: () => ({
    meta: [
      { title: "Notifications — Kairo Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminNotificationsPage,
});

function AdminNotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const adapter = createAdminNotificationsAdapter();
  const search = Route.useSearch() as { page?: number; pageSize?: number };
  const page = Number(search.page ?? 1);
  const pageSize = Number(search.pageSize ?? 20);
  const inboxQuery = useQuery(adminNotificationInboxQueryOptions({ page, pageSize }));

  async function markAllRead() {
    await adapter.markAllRead();
    await queryClient.invalidateQueries({ queryKey: adminNotificationKeys.all() });
  }

  if (inboxQuery.isPending) {
    return (
      <div className="mx-auto max-w-[1200px]">
        <LoadingSkeleton rows={8} />
      </div>
    );
  }

  if (inboxQuery.isError) {
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState
          title="Notifications unavailable"
          description={inboxQuery.error.message}
          action={
            <button
              type="button"
              onClick={() => void inboxQuery.refetch()}
              className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90"
            >
              Try again
            </button>
          }
        />
      </div>
    );
  }

  const result = inboxQuery.data;
  if (!result || result.total === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          title="No notifications yet"
          description="Admin review and quality-review notifications will appear here as the backend records them."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Notifications</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Your backend-owned Admin inbox for verification actions and other operational alerts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void markAllRead()}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent"
        >
          <CheckCheck aria-hidden className="size-3.5" />
          Mark all read
        </button>
      </header>

      <WorkspaceSection
        title="Inbox"
        description={`${result.total} notification${result.total === 1 ? "" : "s"} recorded for your Admin account.`}
      >
        <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
          {result.items.map((item) => {
            const target = resolveAdminNotificationTarget(item.metadata, item.id);
            return (
              <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                <span
                  className={`mt-1 size-2 rounded-full ${item.readAt ? "bg-muted-foreground/40" : "bg-rose-500"}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-medium text-foreground">{item.title}</h2>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {item.channel}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatRelativeTime(item.createdAt)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {target?.kind === "verification" ? (
                    <Link
                      to="/admin/verifications/$caseId"
                      params={{ caseId: target.id }}
                      className="text-xs font-medium text-foreground hover:underline"
                    >
                      Open case
                    </Link>
                  ) : target?.kind === "user" ? (
                    <Link
                      to="/admin/users/$userId"
                      params={{ userId: target.id }}
                      className="text-xs font-medium text-foreground hover:underline"
                    >
                      Open user
                    </Link>
                  ) : (
                    <Link
                      to="/admin/notifications/$notificationId"
                      params={{ notificationId: item.id }}
                      className="text-xs font-medium text-foreground hover:underline"
                    >
                      View details
                    </Link>
                  )}
                  {!item.readAt ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-rose-600">
                      <Bell aria-hidden className="size-3" />
                      Unread
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4">
          <TablePagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            onPageChange={(nextPage) => {
              navigate({
                to: "/admin/notifications",
                search: { page: nextPage, pageSize },
              });
            }}
            onPageSizeChange={(nextPageSize) => {
              navigate({
                to: "/admin/notifications",
                search: { page: 1, pageSize: nextPageSize },
              });
            }}
          />
        </div>
      </WorkspaceSection>
    </div>
  );
}
