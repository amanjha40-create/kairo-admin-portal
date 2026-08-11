import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import {
  adminNotificationInboxQueryOptions,
  adminNotificationKeys,
  adminNotificationUnreadCountQueryOptions,
  createAdminNotificationsAdapter,
} from "@/features/admin/data/notifications";
import { resolveAdminNotificationTarget } from "@/features/admin/lib/admin-notification-target";
import { formatRelativeTime } from "@/features/admin/lib/format";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AdminNotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const adapter = createAdminNotificationsAdapter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const unreadQuery = useQuery(adminNotificationUnreadCountQueryOptions());
  const inboxQuery = useQuery(adminNotificationInboxQueryOptions({ page: 1, pageSize: 5 }));

  const unreadCount = unreadQuery.data?.unreadCount ?? 0;
  const items = inboxQuery.data?.items ?? [];

  async function refreshNotificationQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminNotificationKeys.unreadCount() }),
      queryClient.invalidateQueries({ queryKey: adminNotificationKeys.all() }),
    ]);
  }

  async function markAllRead() {
    setBusyId("all");
    try {
      await adapter.markAllRead();
      await refreshNotificationQueries();
    } finally {
      setBusyId(null);
    }
  }

  async function openNotification(notificationId: string, metadata: Record<string, unknown>) {
    setBusyId(notificationId);
    try {
      await adapter.markRead(notificationId);
      await refreshNotificationQueries();
    } finally {
      setBusyId(null);
    }

    const target = resolveAdminNotificationTarget(metadata, notificationId);
    if (!target) return;
    if (target.kind === "verification") {
      navigate({ to: "/admin/verifications/$caseId", params: { caseId: target.id } });
      return;
    }
    if (target.kind === "user") {
      navigate({ to: "/admin/users/$userId", params: { userId: target.id } });
      return;
    }
    navigate({ to: "/admin/notifications/$notificationId", params: { notificationId: target.id } });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell aria-hidden className="size-4" />
        {unreadCount > 0 ? (
          <span
            className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white"
            aria-hidden
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Notifications</span>
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={unreadCount === 0 || busyId === "all"}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck aria-hidden className="size-3.5" />
            Mark all read
          </button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {inboxQuery.isPending ? (
          <div className="px-3 py-4 text-xs text-muted-foreground">Loading notifications…</div>
        ) : inboxQuery.isError ? (
          <div className="px-3 py-4 text-xs text-destructive">
            Notifications are unavailable right now.
          </div>
        ) : items.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground">No admin notifications yet.</div>
        ) : (
          items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onSelect={(event) => {
                event.preventDefault();
                void openNotification(item.id, item.metadata);
              }}
              className="cursor-pointer items-start gap-2 py-2"
            >
              <span
                className={`mt-1 size-2 rounded-full ${item.readAt ? "bg-muted-foreground/40" : "bg-rose-500"}`}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-foreground">
                  {item.title}
                </span>
                <span className="mt-0.5 block line-clamp-2 text-[11px] text-muted-foreground">
                  {item.body}
                </span>
                <span className="mt-1 block text-[10px] text-muted-foreground">
                  {formatRelativeTime(item.createdAt)}
                  {busyId === item.id ? " · updating…" : ""}
                </span>
              </span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            navigate({ to: "/admin/notifications" });
          }}
          className="cursor-pointer text-xs font-medium"
        >
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
