import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Search } from "lucide-react";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/features/admin/components/states";
import { TablePagination } from "@/features/admin/components/table-pagination";
import { WorkspaceSection } from "@/features/admin/components/workspace-section";
import {
  adminCommunicationListQueryOptions,
  COMMUNICATION_STATUS_LABEL,
  COMMUNICATION_TYPE_LABEL,
} from "@/features/admin/data/communications.production";
import { formatRelativeTime } from "@/features/admin/lib/format";

const COMMUNICATION_STATUS_TEXT = COMMUNICATION_STATUS_LABEL as Record<string, string>;
const COMMUNICATION_TYPE_TEXT = COMMUNICATION_TYPE_LABEL as Record<string, string>;

const STATUS_OPTIONS = ["all", "queued", "sent", "failed", "cancelled", "suppressed", "skipped"];
const CHANNEL_OPTIONS = ["all", "email"];
const PROVIDER_OPTIONS = ["all", "brevo"];
const TEMPLATE_OPTIONS = [
  "all",
  "signup_otp",
  "password_reset",
  "employer_verification",
  "trust_invitation_created",
  "verification_completed",
  "admin_verification_review_required",
  "admin_verification_quality_review_required",
];

export function CommunicationsProductionPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [channel, setChannel] = useState("all");
  const [provider, setProvider] = useState("all");
  const [templateKey, setTemplateKey] = useState("all");
  const [dateWindow, setDateWindow] = useState<"any" | "24h" | "7d" | "30d">("any");
  const [relatedCandidateId, setRelatedCandidateId] = useState("");
  const [relatedVerificationId, setRelatedVerificationId] = useState("");
  const [relatedOrganizationId, setRelatedOrganizationId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const createdAfter =
    dateWindow === "any"
      ? null
      : new Date(
          Date.now() -
            (dateWindow === "24h" ? 1 : dateWindow === "7d" ? 7 : 30) * 24 * 60 * 60 * 1000,
        ).toISOString();

  const listQuery = useQuery(
    adminCommunicationListQueryOptions({
      query,
      status,
      channel,
      provider,
      templateKey,
      page,
      pageSize,
      createdAfter,
      relatedCandidateId: relatedCandidateId || null,
      relatedVerificationId: relatedVerificationId || null,
      relatedOrganizationId: relatedOrganizationId || null,
    }),
  );

  if (listQuery.isPending) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <LoadingSkeleton rows={8} />
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState
          title="Communications unavailable"
          description={listQuery.error.message}
          action={
            <button
              type="button"
              onClick={() => void listQuery.refetch()}
              className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90"
            >
              Try again
            </button>
          }
        />
      </div>
    );
  }

  const result = listQuery.data;
  if (!result) return null;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Communications</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Backend-owned transactional delivery history for operational troubleshooting. No mock
          data, no campaign tooling, and no provider secrets.
        </p>
      </header>

      <WorkspaceSection
        title="Operational delivery history"
        description={`${result.total} communication record${result.total === 1 ? "" : "s"} returned by the shared backend.`}
      >
        <div className="mb-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_repeat(4,180px)]">
          <label className="relative block">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search recipient, template, provider message ID"
              className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              aria-label="Search communications"
            />
          </label>

          <Select
            value={status}
            onChange={(next) => {
              setStatus(next);
              setPage(1);
            }}
            label="Status"
            options={STATUS_OPTIONS}
          />
          <Select
            value={channel}
            onChange={(next) => {
              setChannel(next);
              setPage(1);
            }}
            label="Channel"
            options={CHANNEL_OPTIONS}
          />
          <Select
            value={provider}
            onChange={(next) => {
              setProvider(next);
              setPage(1);
            }}
            label="Provider"
            options={PROVIDER_OPTIONS}
          />
          <Select
            value={templateKey}
            onChange={(next) => {
              setTemplateKey(next);
              setPage(1);
            }}
            label="Event"
            options={TEMPLATE_OPTIONS}
          />
          <Select
            value={dateWindow}
            onChange={(next) => {
              setDateWindow(next as "any" | "24h" | "7d" | "30d");
              setPage(1);
            }}
            label="Date window"
            options={["any", "24h", "7d", "30d"]}
          />
        </div>

        <div className="mb-3 grid gap-3 lg:grid-cols-3">
          <InlineInput
            label="Candidate public ID"
            value={relatedCandidateId}
            onChange={(next) => {
              setRelatedCandidateId(next);
              setPage(1);
            }}
            placeholder="Filter candidate-linked communications"
          />
          <InlineInput
            label="Verification public ID"
            value={relatedVerificationId}
            onChange={(next) => {
              setRelatedVerificationId(next);
              setPage(1);
            }}
            placeholder="Filter verification-linked communications"
          />
          <InlineInput
            label="Organization public ID"
            value={relatedOrganizationId}
            onChange={(next) => {
              setRelatedOrganizationId(next);
              setPage(1);
            }}
            placeholder="Filter organization-linked communications"
          />
        </div>

        {result.total === 0 ? (
          <EmptyState
            title="No communications match"
            description="Try clearing the filters or waiting for the next backend delivery record."
          />
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-xs">
                <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">When</th>
                    <th className="px-3 py-2 font-medium">Event</th>
                    <th className="px-3 py-2 font-medium">Recipient</th>
                    <th className="px-3 py-2 font-medium">Provider</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Related object</th>
                    <th className="px-3 py-2 font-medium">Failure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {result.items.map((item) => (
                    <tr key={item.id} className="hover:bg-accent/40">
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatRelativeTime(item.queuedAt)}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          to="/admin/communications/$communicationId"
                          params={{ communicationId: item.id }}
                          className="flex flex-col text-foreground hover:underline"
                        >
                          <span className="font-medium">
                            {COMMUNICATION_TYPE_TEXT[item.eventType] ?? item.eventType}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {item.subject ?? item.templateKey}
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{item.recipientMasked}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        <div>{item.provider}</div>
                        {item.providerMessageIdDisplay ? (
                          <div className="font-mono text-[10px]">
                            {item.providerMessageIdDisplay}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {item.relatedObject?.kind === "verification_request" ? (
                          <Link
                            to="/admin/verifications/$caseId"
                            params={{ caseId: item.relatedObject.publicId }}
                            className="text-foreground hover:underline"
                          >
                            {item.relatedObject.label ?? "Verification request"}
                          </Link>
                        ) : (
                          (item.relatedObject?.label ?? "Unavailable")
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {item.failureReason ? (
                          <span className="inline-flex items-start gap-1 text-destructive">
                            <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                            <span>{item.failureReason}</span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-4">
          <TablePagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
          />
        </div>
      </WorkspaceSection>
    </div>
  );
}

function Select({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (next: string) => void;
  label: string;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "all"
              ? `All ${label.toLowerCase()}`
              : (COMMUNICATION_STATUS_TEXT[option] ??
                COMMUNICATION_TYPE_TEXT[option] ??
                option.toUpperCase())}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "failed"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : status === "sent"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-slate-50 text-slate-700 border-slate-200";
  return (
    <span className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>
      {COMMUNICATION_STATUS_TEXT[status] ?? status}
    </span>
  );
}

function InlineInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
