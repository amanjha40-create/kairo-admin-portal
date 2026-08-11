import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Bell, TriangleAlert } from "lucide-react";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/features/admin/components/states";
import { WorkspaceSection } from "@/features/admin/components/workspace-section";
import {
  adminNotificationDetailQueryOptions,
  adminNotificationKeys,
  createAdminNotificationsAdapter,
} from "@/features/admin/data/notifications";
import { resolveAdminNotificationTarget } from "@/features/admin/lib/admin-notification-target";
import { formatRelativeTime } from "@/features/admin/lib/format";

export const Route = createFileRoute("/admin/notifications/$notificationId")({
  loader: ({ params }) => ({ notificationId: params.notificationId }),
  head: () => ({
    meta: [
      { title: "Notification detail — Kairo Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminNotificationDetailPage,
});

function AdminNotificationDetailPage() {
  const { notificationId } = Route.useLoaderData();
  const queryClient = useQueryClient();
  const adapter = createAdminNotificationsAdapter();
  const detailQuery = useQuery(adminNotificationDetailQueryOptions(notificationId));

  async function markRead() {
    await adapter.markRead(notificationId);
    await queryClient.invalidateQueries({ queryKey: adminNotificationKeys.all() });
  }

  if (detailQuery.isPending) {
    return (
      <div className="mx-auto max-w-[1000px]">
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  if (detailQuery.isError) {
    if (detailQuery.error.message.toLowerCase().includes("not found")) throw notFound();
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState
          title="Notification unavailable"
          description={detailQuery.error.message}
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

  const detail = detailQuery.data;
  if (!detail) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState title="Notification not found" />
      </div>
    );
  }

  const target = resolveAdminNotificationTarget(detail.metadata, detail.id);

  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-4">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <ol className="flex items-center gap-1">
          <li>
            <Link to="/admin/notifications" className="hover:text-foreground">
              Notifications
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-foreground">{detail.title}</li>
        </ol>
      </nav>

      <header className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Bell aria-hidden className="size-3.5" />
              {detail.eventType}
            </div>
            <h1 className="mt-1 text-lg font-semibold text-foreground">{detail.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{detail.body}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Created {formatRelativeTime(detail.createdAt)}
              {detail.readAt ? ` · read ${formatRelativeTime(detail.readAt)}` : ""}
            </p>
          </div>
          {!detail.readAt ? (
            <button
              type="button"
              onClick={() => void markRead()}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent"
            >
              Mark read
            </button>
          ) : null}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <WorkspaceSection
            title="Delivery history"
            description="Backend-owned notification attempts and audit events."
          >
            <div className="space-y-3">
              {detail.deliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="rounded-md border border-border bg-background p-3 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{delivery.channel}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                      {delivery.status}
                    </span>
                    {delivery.provider ? (
                      <span className="text-muted-foreground">{delivery.provider}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-muted-foreground">
                    {delivery.deliveredAt
                      ? `Delivered ${formatRelativeTime(delivery.deliveredAt)}`
                      : delivery.failedAt
                        ? `Failed ${formatRelativeTime(delivery.failedAt)}`
                        : delivery.dispatchedAt
                          ? `Dispatched ${formatRelativeTime(delivery.dispatchedAt)}`
                          : "No provider timestamp recorded."}
                  </p>
                  {delivery.errorMessage ? (
                    <p className="mt-2 flex items-start gap-1 text-destructive">
                      <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                      <span>{delivery.errorMessage}</span>
                    </p>
                  ) : null}
                </div>
              ))}
              {detail.deliveries.length === 0 ? (
                <EmptyState title="No delivery attempts recorded" />
              ) : null}
            </div>
          </WorkspaceSection>

          <WorkspaceSection
            title="Audit trail"
            description="Notification lifecycle events from the backend."
          >
            <ul className="divide-y divide-border rounded-md border border-border bg-card">
              {detail.history.map((event) => (
                <li key={event.id} className="px-3 py-2">
                  <p className="text-sm font-medium text-foreground">{event.eventType}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatRelativeTime(event.createdAt)}
                    {event.status ? ` · ${event.status}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </WorkspaceSection>
        </div>

        <aside className="flex flex-col gap-4">
          <WorkspaceSection title="Context">
            <dl className="space-y-2 text-xs">
              <MetaRow label="Category" value={detail.category} />
              <MetaRow label="Priority" value={detail.priority} />
              <MetaRow label="Channel" value={detail.channel} />
              <MetaRow label="Template" value={detail.templateKey} />
              <MetaRow label="Recipient" value={detail.recipientEmail ?? "Unavailable"} />
            </dl>
          </WorkspaceSection>

          <WorkspaceSection title="Linked object">
            {target?.kind === "verification" ? (
              <Link
                to="/admin/verifications/$caseId"
                params={{ caseId: target.id }}
                className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:underline"
              >
                Open verification case
              </Link>
            ) : target?.kind === "user" ? (
              <Link
                to="/admin/users/$userId"
                params={{ userId: target.id }}
                className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:underline"
              >
                Open candidate profile
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">No linked Admin object is available.</p>
            )}
          </WorkspaceSection>

          <WorkspaceSection title="Metadata">
            <div className="space-y-2 text-xs text-muted-foreground">
              {Object.entries(detail.metadata).map(([key, value]) => (
                <div key={key}>
                  <p className="font-medium text-foreground">{key}</p>
                  <p>{String(value)}</p>
                </div>
              ))}
              {Object.keys(detail.metadata).length === 0 ? (
                <EmptyState title="No metadata" />
              ) : null}
            </div>
          </WorkspaceSection>
        </aside>
      </div>

      <Link
        to="/admin/notifications"
        className="inline-flex w-fit items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        Back to notifications
      </Link>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground">{value}</dd>
    </div>
  );
}
