import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Building2, Link2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminSearchField } from "@/features/admin/components/search-field";
import { company360Keys, createCompany360DataAdapter } from "@/features/admin/data/organizations";
import {
  getRegistryOrgTypeLabel,
  registryKeys,
  registryListQueryOptions,
  type RegistryListResult,
  type RegistryOrganization,
} from "@/features/admin/data/registry";
import { useDebouncedValue } from "@/features/admin/hooks/use-debounced-value";
import { getOperationError } from "@/features/admin/lib/operation-error";

type Step = "search" | "create" | "confirm-existing" | "confirm-create";

interface Props {
  open: boolean;
  organizationId: string;
  organizationName: string;
  organizationType: string;
  domain?: string;
  website?: string;
  onOpenChange: (open: boolean) => void;
}

interface DraftRecord {
  legalName: string;
  displayName: string;
  organizationType: string;
  country: string;
  stateProvince: string;
  website: string;
  primaryDomain: string;
}

export function ConnectCompanyRecordDialog({
  open,
  organizationId,
  organizationName,
  organizationType,
  domain,
  website,
  onOpenChange,
}: Props) {
  const queryClient = useQueryClient();
  const adapter = useMemo(() => createCompany360DataAdapter(), []);
  const [step, setStep] = useState<Step>("search");
  const [search, setSearch] = useState(organizationName);
  const [selected, setSelected] = useState<RegistryOrganization>();
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [draft, setDraft] = useState<DraftRecord>(() =>
    buildDraft(organizationName, organizationType, domain, website),
  );
  const debouncedSearch = useDebouncedValue(search, 300).trim();

  useEffect(() => {
    if (!open) return;
    setStep("search");
    setSearch(organizationName);
    setSelected(undefined);
    setIdempotencyKey(crypto.randomUUID());
    setDraft(buildDraft(organizationName, organizationType, domain, website));
  }, [domain, open, organizationName, organizationType, website]);

  const results = useQuery({
    ...registryListQueryOptions({ query: debouncedSearch, page: 1, pageSize: 10 }),
    enabled: open && step === "search" && debouncedSearch.length >= 2,
  });

  const connectMutation = useMutation({
    mutationFn: () => {
      if (step === "confirm-existing" && selected) {
        return adapter.connectCompanyRecord(organizationId, selected.id, idempotencyKey);
      }
      if (step === "confirm-create") {
        return adapter.createAndConnectCompanyRecord(organizationId, {
          idempotencyKey,
          legalName: draft.legalName.trim(),
          displayName: draft.displayName.trim() || undefined,
          organizationType: draft.organizationType.trim(),
          country: draft.country.trim(),
          stateProvince: draft.stateProvince.trim() || undefined,
          website: draft.website.trim() || undefined,
          primaryDomain: draft.primaryDomain.trim() || undefined,
        });
      }
      throw new Error("Review a company record before connecting it.");
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: company360Keys.all() }),
        queryClient.invalidateQueries({ queryKey: registryKeys.all() }),
      ]);
      toast.success(
        result.created
          ? "Draft company record created and connected."
          : result.alreadyConnected
            ? "Company record is already connected."
            : "Company record connected.",
      );
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(getOperationError(error, "The company record could not be connected.")),
  });

  const missing = getMissingFields(draft);
  const confirming = step === "confirm-existing" || step === "confirm-create";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!connectMutation.isPending) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Connect company record</DialogTitle>
          <DialogDescription>
            Connect {organizationName} to its real-world Organization Directory record. This does
            not merge workspaces or change People, team access, invitations, ownership, or
            verification status.
          </DialogDescription>
        </DialogHeader>

        {step === "search" ? (
          <SearchStep
            search={search}
            setSearch={(value) => {
              setSearch(value);
              setSelected(undefined);
            }}
            debouncedSearch={debouncedSearch}
            results={results}
            selected={selected}
            onSelect={setSelected}
            onCreate={() => setStep("create")}
          />
        ) : null}

        {step === "create" ? (
          <CreateStep draft={draft} setDraft={setDraft} missing={missing} />
        ) : null}

        {confirming ? (
          <ConfirmationStep
            organizationName={organizationName}
            existing={step === "confirm-existing" ? selected : undefined}
            draft={step === "confirm-create" ? draft : undefined}
          />
        ) : null}

        <DialogFooter className="sm:justify-between">
          <div>
            {step !== "search" ? (
              <button
                type="button"
                onClick={() => setStep(confirming ? (selected ? "search" : "create") : "search")}
                disabled={connectMutation.isPending}
                className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-sm text-foreground hover:bg-accent disabled:opacity-50"
              >
                <ArrowLeft aria-hidden className="size-4" /> Back
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={connectMutation.isPending}
              className="h-9 rounded-md border border-border bg-background px-4 text-sm text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            {step === "search" ? (
              <button
                type="button"
                onClick={() => {
                  setIdempotencyKey(crypto.randomUUID());
                  setStep("confirm-existing");
                }}
                disabled={!selected}
                className={primaryButtonClass}
              >
                Review connection
              </button>
            ) : null}
            {step === "create" ? (
              <button
                type="button"
                onClick={() => {
                  setIdempotencyKey(crypto.randomUUID());
                  setStep("confirm-create");
                }}
                disabled={missing.length > 0}
                className={primaryButtonClass}
              >
                Review new record
              </button>
            ) : null}
            {confirming ? (
              <button
                type="button"
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending}
                className={primaryButtonClass}
              >
                <Link2 aria-hidden className="size-4" />
                {connectMutation.isPending
                  ? "Connecting..."
                  : step === "confirm-create"
                    ? "Create and connect"
                    : "Connect company record"}
              </button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SearchStep({
  search,
  setSearch,
  debouncedSearch,
  results,
  selected,
  onSelect,
  onCreate,
}: {
  search: string;
  setSearch: (value: string) => void;
  debouncedSearch: string;
  results: UseQueryResult<RegistryListResult, Error>;
  selected?: RegistryOrganization;
  onSelect: (item: RegistryOrganization) => void;
  onCreate: () => void;
}) {
  return (
    <div className="space-y-3">
      <AdminSearchField
        value={search}
        onChange={setSearch}
        placeholder="Search company name, domain, alias, or identifier"
        ariaLabel="Search Organization Directory company records"
      />
      <div className="max-h-72 overflow-y-auto rounded-md border border-border">
        {debouncedSearch.length < 2 ? (
          <p className="p-4 text-xs text-muted-foreground">
            Enter at least two characters to search the Organization Directory.
          </p>
        ) : null}
        {results.isPending && debouncedSearch.length >= 2 ? (
          <p className="p-4 text-xs text-muted-foreground">Searching company records...</p>
        ) : null}
        {results.error ? <p className="p-4 text-xs text-red-700">{results.error.message}</p> : null}
        {results.data?.items.length === 0 ? (
          <div className="space-y-3 p-4">
            <p className="text-xs text-muted-foreground">
              No matching company record was found. You can create a Draft record using the Client
              details as suggestions.
            </p>
            <button type="button" onClick={onCreate} className={secondaryButtonClass}>
              <Plus aria-hidden className="size-4" /> Create company record
            </button>
          </div>
        ) : null}
        {results.data?.items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className={`flex w-full items-start gap-3 border-b border-border p-3 text-left last:border-b-0 ${
              selected?.id === item.id
                ? "bg-cyan-50 ring-1 ring-inset ring-cyan-300"
                : "hover:bg-accent"
            }`}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#0B2545] text-white">
              <Building2 aria-hidden className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                {item.canonicalName}
              </span>
              <span className="block text-xs text-muted-foreground">
                {getRegistryOrgTypeLabel(item.orgType)} · {item.country}
                {item.headquartersState ? `, ${item.headquartersState}` : ""}
              </span>
              <span className="block text-xs text-muted-foreground">
                {item.domain ?? "No primary domain"}
                {item.website ? ` · ${item.website}` : ""}
              </span>
              <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                {item.id}
              </span>
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground">
              {item.state.replaceAll("_", " ")}
            </span>
          </button>
        ))}
      </div>
      {results.data && results.data.items.length > 0 ? (
        <button type="button" onClick={onCreate} className={secondaryButtonClass}>
          <Plus aria-hidden className="size-4" /> None match — create company record
        </button>
      ) : null}
    </div>
  );
}

function CreateStep({
  draft,
  setDraft,
  missing,
}: {
  draft: DraftRecord;
  setDraft: React.Dispatch<React.SetStateAction<DraftRecord>>;
  missing: string[];
}) {
  const field = (key: keyof DraftRecord, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-cyan-200 bg-cyan-50 p-3 text-xs text-cyan-950">
        Review these suggestions. The new Organization Directory record will be Draft and
        unverified; connecting it does not verify the company.
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Legal company name"
          value={draft.legalName}
          onChange={(v) => field("legalName", v)}
          required
        />
        <Field
          label="Display name"
          value={draft.displayName}
          onChange={(v) => field("displayName", v)}
        />
        <Field
          label="Organization type"
          value={draft.organizationType}
          onChange={(v) => field("organizationType", v)}
          required
        />
        <Field
          label="Country code"
          value={draft.country}
          onChange={(v) => field("country", v.toUpperCase())}
          required
          placeholder="IN"
          maxLength={2}
        />
        <Field
          label="State / province"
          value={draft.stateProvince}
          onChange={(v) => field("stateProvince", v)}
        />
        <Field
          label="Primary domain"
          value={draft.primaryDomain}
          onChange={(v) => field("primaryDomain", v.toLowerCase())}
          placeholder="example.com"
        />
        <div className="sm:col-span-2">
          <Field
            label="Website"
            value={draft.website}
            onChange={(v) => field("website", v)}
            placeholder="https://example.com"
          />
        </div>
      </div>
      {missing.length ? (
        <p className="text-xs font-medium text-amber-800">
          Complete the required fields: {missing.join(", ")}.
        </p>
      ) : null}
    </div>
  );
}

function ConfirmationStep({
  organizationName,
  existing,
  draft,
}: {
  organizationName: string;
  existing?: RegistryOrganization;
  draft?: DraftRecord;
}) {
  const name = existing?.canonicalName ?? draft?.displayName ?? draft?.legalName;
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Client</p>
        <p className="mt-1 font-medium text-foreground">{organizationName}</p>
        <div className="my-3 h-px bg-border" />
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {draft ? "New Draft company record" : "Existing company record"}
        </p>
        <p className="mt-1 font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">
          {existing
            ? `${getRegistryOrgTypeLabel(existing.orgType)} · ${existing.domain ?? "No primary domain"} · ${existing.country}`
            : `${draft?.organizationType} · ${draft?.primaryDomain || "No primary domain"} · ${draft?.country}`}
        </p>
      </div>
      <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
        <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
        <p>
          Confirm only when these represent the same real-world organization. This connection does
          not verify either record and does not merge or modify Client operations.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="space-y-1 text-xs font-medium text-foreground">
      {label} {required ? <span className="text-red-700">*</span> : null}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm font-normal"
      />
    </label>
  );
}

function buildDraft(
  name: string,
  organizationType: string,
  domain?: string,
  website?: string,
): DraftRecord {
  return {
    legalName: name,
    displayName: name,
    organizationType,
    country: "",
    stateProvince: "",
    website: website ?? (domain ? `https://${domain}` : ""),
    primaryDomain: domain ?? "",
  };
}

function getMissingFields(draft: DraftRecord) {
  const missing: string[] = [];
  if (!draft.legalName.trim()) missing.push("legal company name");
  if (!draft.organizationType.trim()) missing.push("organization type");
  if (draft.country.trim().length !== 2) missing.push("2-letter country code");
  return missing;
}

const primaryButtonClass =
  "inline-flex h-9 items-center gap-2 rounded-md bg-[#0B2545] px-4 text-sm font-medium text-white disabled:opacity-50";
const secondaryButtonClass =
  "inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent";
