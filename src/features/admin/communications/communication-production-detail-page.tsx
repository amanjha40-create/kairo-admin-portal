import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, RotateCw, TriangleAlert } from "lucide-react";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/features/admin/components/states";
import { WorkspaceSection } from "@/features/admin/components/workspace-section";
import {
  adminCommunicationDetailQueryOptions,
  communicationKeys,
  COMMUNICATION_STATUS_LABEL,
  COMMUNICATION_TYPE_LABEL,
  createAdminCommunicationsAdapter,
} from "@/features/admin/data/communications.production";
import { formatRelativeTime } from "@/features/admin/lib/format";
import { useAdminAccess } from "@/features/admin/auth/admin-access";
import { hasPermission } from "@/features/admin/workflow/permissions";

const COMMUNICATION_STATUS_TEXT = COMMUNICATION_STATUS_LABEL as Record<string, string>;
const COMMUNICATION_TYPE_TEXT = COMMUNICATION_TYPE_LABEL as Record<string, string>;

export function CommunicationProductionDetailPage({
  communicationId,
}: {
  communicationId: string;
}) {
  const queryClient = useQueryClient();
  const access = useAdminAccess();
  const adapter = createAdminCommunicationsAdapter();
  const [resendError, setResendError] = useState<string | null>(null);
  const canResend = hasPermission(access.admin?.permissions ?? [], "communications.failure.review");
  const detailQuery = useQuery(adminCommunicationDetailQueryOptions(communicationId));
  const resendMutation = useMutation({
    mutationFn: async () => adapter.resend(communicationId),
    onSuccess: async (detail) => {
      setResendError(null);
      queryClient.setQueryData(communicationKeys.detail(communicationId), detail);
      queryClient.setQueryData(communicationKeys.detail(detail.id), detail);
      await queryClient.invalidateQueries({ queryKey: communicationKeys.all() });
    },
    onError: (error) => {
      setResendError(error instanceof Error ? error.message : "Resend failed.");
    },
  });

  if (detailQuery.isPending) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  if (detailQuery.isError) {
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState
          title="Communication unavailable"
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
        <EmptyState title="Communication not found" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-4">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <ol className="flex items-center gap-1">
          <li>
            <Link to="/admin/communications" className="hover:text-foreground">
              Communications
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-foreground">{detail.id}</li>
        </ol>
      </nav>

      <header className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail aria-hidden className="size-3.5" />
              {COMMUNICATION_TYPE_TEXT[detail.eventType] ?? detail.eventType}
            </div>
            <h1 className="mt-1 text-lg font-semibold text-foreground">
              {detail.subject ?? detail.templateKey}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {detail.recipientMasked} · queued {formatRelativeTime(detail.queuedAt)}
            </p>
          </div>
          <span className="inline-flex rounded border border-border bg-muted px-2 py-1 text-xs text-muted-foreground">
            {COMMUNICATION_STATUS_TEXT[detail.status] ?? detail.status}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!canResend || !detail.retryable || resendMutation.isPending}
            title={!canResend ? "Your role cannot resend communications." : undefined}
            onClick={() => {
              if (!window.confirm("Resend this communication and create a new delivery attempt?")) {
                return;
              }
              resendMutation.mutate();
            }}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCw aria-hidden className="size-3.5" />
            {resendMutation.isPending ? "Resending…" : "Resend communication"}
          </button>
          <span className="text-xs text-muted-foreground">
            Resend policy: {formatPolicy(detail.retryPolicy)}
          </span>
        </div>
        {resendError ? <p className="mt-2 text-sm text-destructive">{resendError}</p> : null}
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <WorkspaceSection
            title="Delivery timeline"
            description="Provider and notification audit timestamps recorded by the backend."
          >
            <ul className="divide-y divide-border rounded-md border border-border bg-card">
              {detail.deliveryTimeline.map((event, index) => (
                <li key={`${event.kind}-${index}`} className="px-3 py-3">
                  <p className="text-sm font-medium text-foreground">{event.kind}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatRelativeTime(event.occurredAt)}
                    {event.status ? ` · ${event.status}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{event.detail}</p>
                </li>
              ))}
            </ul>
          </WorkspaceSection>

          <WorkspaceSection
            title="Delivery attempts"
            description="Every canonical delivery attempt recorded for this notification chain."
          >
            {detail.deliveryAttempts.length === 0 ? (
              <EmptyState title="No delivery attempts recorded" />
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border bg-card">
                {detail.deliveryAttempts.map((attempt) => (
                  <li key={attempt.notificationDeliveryId} className="px-3 py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        Attempt {attempt.attemptCount || 1}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {attempt.communicationId
                          ? `Communication ${attempt.communicationId}`
                          : "No email log"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {attempt.provider ?? "Unknown provider"} · {attempt.status}
                      {attempt.providerMessageIdDisplay
                        ? ` · ${attempt.providerMessageIdDisplay}`
                        : ""}
                    </p>
                    {attempt.errorMessage ? (
                      <p className="mt-2 text-xs text-destructive">{attempt.errorMessage}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </WorkspaceSection>

          <WorkspaceSection
            title="Audit history"
            description="Backend-owned notification and resend history."
          >
            {detail.auditHistory.length === 0 ? (
              <EmptyState title="No audit history recorded" />
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border bg-card">
                {detail.auditHistory.map((event) => (
                  <li key={event.id} className="px-3 py-3">
                    <p className="text-sm font-medium text-foreground">{event.eventType}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatRelativeTime(event.createdAt)}
                      {event.status ? ` · ${event.status}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </WorkspaceSection>

          <WorkspaceSection
            title="Safe payload summary"
            description="Sanitized backend metadata only. No OTPs, reset tokens, or provider secrets."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(detail.payloadSummary).map(([key, value]) => (
                <div key={key} className="rounded-md border border-border bg-card p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{key}</p>
                  <p className="mt-1 break-words text-sm text-foreground">{String(value)}</p>
                </div>
              ))}
              {Object.keys(detail.payloadSummary).length === 0 ? (
                <EmptyState title="No additional safe payload fields" />
              ) : null}
            </div>
          </WorkspaceSection>
        </div>

        <aside className="flex flex-col gap-4">
          <WorkspaceSection title="Context">
            <dl className="space-y-2 text-xs">
              <MetaRow label="Provider" value={detail.provider} />
              <MetaRow label="Template" value={detail.templateKey} />
              <MetaRow
                label="Provider message ID"
                value={detail.providerMessageIdDisplay ?? "Unavailable"}
              />
              <MetaRow label="Resend policy" value={formatPolicy(detail.retryPolicy)} />
            </dl>
          </WorkspaceSection>

          <WorkspaceSection title="Related object">
            {detail.relatedObject?.kind === "verification_request" ? (
              <Link
                to="/admin/verifications/$caseId"
                params={{ caseId: detail.relatedObject.publicId }}
                className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:underline"
              >
                Open verification case
              </Link>
            ) : detail.notification ? (
              <Link
                to="/admin/notifications/$notificationId"
                params={{ notificationId: detail.notification.id }}
                className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:underline"
              >
                Open notification detail
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">No linked Admin route is available.</p>
            )}
          </WorkspaceSection>

          {detail.failureReason ? (
            <WorkspaceSection title="Failure state">
              <p className="flex items-start gap-1 text-sm text-destructive">
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>{detail.failureReason}</span>
              </p>
            </WorkspaceSection>
          ) : null}
        </aside>
      </div>

      <Link
        to="/admin/communications"
        className="inline-flex w-fit items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        Back to communications
      </Link>
    </div>
  );
}

function formatPolicy(value: string) {
  return value.replaceAll("_", " ");
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-foreground">{value}</dd>
    </div>
  );
}
