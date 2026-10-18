import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileCheck2, MapPinCheck, ShieldAlert, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdminAccess } from "@/features/admin/auth/admin-access";
import {
  createAdminOperationsAdapter,
  validateEvidenceFile,
  type CourtCheck,
  type CourtCheckStatus,
  type EvidenceReceipt,
  type InPersonVerificationReceipt,
  type InPersonVerificationResult,
  type InPersonVerificationType,
} from "@/features/admin/data/admin-operations";
import { company360Keys, type CompanyPersonItem } from "@/features/admin/data/organizations";
import { getOperationError } from "@/features/admin/lib/operation-error";
import { hasPermission } from "@/features/admin/workflow/permissions";

export function PersonVerificationOperationsDialog({
  organizationId,
  person,
  open,
  onOpenChange,
}: {
  organizationId: string;
  person: CompanyPersonItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const access = useAdminAccess();
  const [tab, setTab] = useState<"court" | "in-person">("court");
  const canCourt = hasPermission(access.admin?.permissions ?? [], "manage_court_check");
  const canInPerson = hasPermission(
    access.admin?.permissions ?? [],
    "perform_in_person_verification",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Verification operations · {person?.displayName ?? "Person"}</DialogTitle>
          <DialogDescription>
            Record a scoped Court result or an auditable in-person observation. Neither action is a
            universal person-verification shortcut.
          </DialogDescription>
        </DialogHeader>
        {!person?.linkedUserId ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
            This organization person is not linked to a canonical Candidate, so private evidence
            ownership cannot be established. No operation is available.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-1 rounded-md bg-muted/50 p-1">
              <TabButton active={tab === "court"} onClick={() => setTab("court")}>
                <ShieldAlert className="size-4" /> Court-record check
              </TabButton>
              <TabButton active={tab === "in-person"} onClick={() => setTab("in-person")}>
                <MapPinCheck className="size-4" /> In-person observation
              </TabButton>
            </div>
            {tab === "court" ? (
              canCourt ? (
                <CourtWorkspace
                  organizationId={organizationId}
                  person={person}
                  candidateId={person.linkedUserId}
                />
              ) : (
                <PermissionCopy permission="manage_court_check" />
              )
            ) : canInPerson ? (
              <InPersonWorkspace
                organizationId={organizationId}
                person={person}
                candidateId={person.linkedUserId}
              />
            ) : (
              <PermissionCopy permission="perform_in_person_verification" />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CourtWorkspace({
  organizationId,
  person,
  candidateId,
}: {
  organizationId: string;
  person: CompanyPersonItem;
  candidateId: string;
}) {
  const adapter = useMemo(() => createAdminOperationsAdapter(), []);
  const queryClient = useQueryClient();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [status, setStatus] = useState<CourtCheckStatus>("pending");
  const [searchedAt, setSearchedAt] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [coverage, setCoverage] = useState("");
  const [searchPeriod, setSearchPeriod] = useState("");
  const [source, setSource] = useState("");
  const [finding, setFinding] = useState("");
  const [remarks, setRemarks] = useState("");
  const [limitations, setLimitations] = useState("");
  const [evidence, setEvidence] = useState<EvidenceReceipt[]>([]);
  const [check, setCheck] = useState<CourtCheck | null>(null);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: company360Keys.all() });
  };
  const save = useMutation({
    mutationFn: async () => {
      const input = {
        status,
        ...(searchedAt ? { searchedAt: new Date(searchedAt).toISOString() } : {}),
        jurisdiction: jurisdiction.trim(),
        coverage: coverage.trim(),
        ...(searchPeriod.trim() ? { searchPeriod: searchPeriod.trim() } : {}),
        source: source.trim(),
        ...(finding.trim() ? { finding: finding.trim() } : {}),
        ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
        limitations: limitations.trim(),
        evidenceDocumentIds: evidence.map((item) => item.documentId),
        idempotencyKey,
      };
      return check
        ? adapter.updateCourtCheck(organizationId, person.id, check.publicId, input)
        : adapter.createCourtCheck(organizationId, person.id, input);
    },
    onSuccess: async (result) => {
      setCheck(result);
      toast.success(check ? "Court check updated" : "Court check created");
      await invalidate();
    },
    onError: (error) =>
      toast.error(getOperationError(error, "The Court check could not be saved.")),
  });
  const finalize = useMutation({
    mutationFn: async () => {
      if (!check) throw new Error("Save the Court check first.");
      return adapter.finalizeCourtCheck(organizationId, person.id, check.publicId);
    },
    onSuccess: async (result) => {
      setCheck(result);
      toast.success("Court check finalized and locked");
      await invalidate();
    },
    onError: (error) =>
      toast.error(getOperationError(error, "The Court check could not be finalized.")),
  });

  const findingRequired = status === "match_found" || status === "review_required";
  const resultRequiresDate = status !== "pending";
  const formValid =
    jurisdiction.trim() &&
    coverage.trim() &&
    source.trim() &&
    limitations.trim() &&
    (!resultRequiresDate || searchedAt) &&
    (!findingRequired || finding.trim());

  return (
    <div className="space-y-4 pt-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-medium">
          Result / status
          <select
            value={status}
            disabled={Boolean(check?.finalizedAt)}
            onChange={(event) => setStatus(event.target.value as CourtCheckStatus)}
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="pending">Pending</option>
            <option value="no_match_found">No matching record within stated scope</option>
            <option value="match_found">Match found</option>
            <option value="review_required">Review required</option>
            <option value="unable_to_complete">Unable to complete</option>
          </select>
        </label>
        <Input
          label={`Searched at${resultRequiresDate ? " *" : ""}`}
          type="datetime-local"
          value={searchedAt}
          onChange={setSearchedAt}
          disabled={Boolean(check?.finalizedAt)}
        />
        <Input
          label="Jurisdiction *"
          value={jurisdiction}
          onChange={setJurisdiction}
          disabled={Boolean(check?.finalizedAt)}
        />
        <Input
          label="Search period"
          value={searchPeriod}
          onChange={setSearchPeriod}
          disabled={Boolean(check?.finalizedAt)}
        />
        <Input
          label="Named source *"
          value={source}
          onChange={setSource}
          disabled={Boolean(check?.finalizedAt)}
        />
        <Input
          label="Coverage *"
          value={coverage}
          onChange={setCoverage}
          disabled={Boolean(check?.finalizedAt)}
        />
        <TextArea
          label={`Finding${findingRequired ? " *" : ""}`}
          value={finding}
          onChange={setFinding}
          disabled={Boolean(check?.finalizedAt)}
        />
        <TextArea
          label="Remarks"
          value={remarks}
          onChange={setRemarks}
          disabled={Boolean(check?.finalizedAt)}
        />
        <div className="sm:col-span-2">
          <TextArea
            label="Scope limitations *"
            value={limitations}
            onChange={setLimitations}
            disabled={Boolean(check?.finalizedAt)}
          />
        </div>
      </div>
      <EvidenceUploader
        candidateId={candidateId}
        evidence={evidence}
        onEvidence={setEvidence}
        disabled={Boolean(check?.finalizedAt)}
      />
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
        A no-match result means only “No match found within the stated court-record scope.” It is
        not police verification, criminal clearance, or a guarantee that no record exists.
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={!formValid || save.isPending || Boolean(check?.finalizedAt)}
          className="h-9 rounded-md border border-border px-3 text-xs font-medium hover:bg-accent disabled:opacity-50"
        >
          {save.isPending ? "Saving..." : check ? "Save Court check changes" : "Create Court check"}
        </button>
        <button
          type="button"
          onClick={() => finalize.mutate()}
          disabled={
            !check || check.status === "pending" || finalize.isPending || Boolean(check.finalizedAt)
          }
          className="h-9 rounded-md bg-[#0B2545] px-3 text-xs font-medium text-white disabled:opacity-50"
        >
          {finalize.isPending ? "Finalizing..." : "Finalize Court check"}
        </button>
      </div>
      {check ? <CourtReceipt check={check} /> : null}
    </div>
  );
}

function InPersonWorkspace({
  organizationId,
  person,
  candidateId,
}: {
  organizationId: string;
  person: CompanyPersonItem;
  candidateId: string;
}) {
  const adapter = useMemo(() => createAdminOperationsAdapter(), []);
  const queryClient = useQueryClient();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [verificationType, setVerificationType] =
    useState<InPersonVerificationType>("identity_observation");
  const [performedAt, setPerformedAt] = useState("");
  const [personMet, setPersonMet] = useState("");
  const [relationship, setRelationship] = useState("");
  const [result, setResult] = useState<InPersonVerificationResult>("observed_consistent");
  const [notes, setNotes] = useState("");
  const [evidence, setEvidence] = useState<EvidenceReceipt[]>([]);
  const [receipt, setReceipt] = useState<InPersonVerificationReceipt | null>(null);
  const mutation = useMutation({
    mutationFn: () =>
      adapter.recordInPerson(organizationId, person.id, {
        verificationType,
        performedAt: new Date(performedAt).toISOString(),
        ...(personMet.trim() ? { personMet: personMet.trim() } : {}),
        ...(relationship.trim() ? { relationship: relationship.trim() } : {}),
        result,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        evidenceDocumentIds: evidence.map((item) => item.documentId),
        idempotencyKey,
      }),
    onSuccess: async (resultReceipt) => {
      setReceipt(resultReceipt);
      toast.success("In-person observation recorded");
      await queryClient.invalidateQueries({ queryKey: company360Keys.all() });
    },
    onError: (error) =>
      toast.error(getOperationError(error, "The in-person observation could not be recorded.")),
  });

  return (
    <div className="space-y-4 pt-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-medium">
          Observation type
          <select
            value={verificationType}
            onChange={(event) =>
              setVerificationType(event.target.value as InPersonVerificationType)
            }
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="identity_observation">Identity observed in person</option>
            <option value="document_observation">Document observed in person</option>
          </select>
        </label>
        <Input
          label="Performed at *"
          type="datetime-local"
          value={performedAt}
          onChange={setPerformedAt}
        />
        <Input label="Person met" value={personMet} onChange={setPersonMet} />
        <Input label="Relationship" value={relationship} onChange={setRelationship} />
        <label className="space-y-1 text-xs font-medium">
          Result
          <select
            value={result}
            onChange={(event) => setResult(event.target.value as InPersonVerificationResult)}
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="observed_consistent">Observed consistent</option>
            <option value="discrepancy">Discrepancy</option>
            <option value="unable_to_complete">Unable to complete</option>
          </select>
        </label>
        <TextArea label="Notes" value={notes} onChange={setNotes} />
      </div>
      <EvidenceUploader candidateId={candidateId} evidence={evidence} onEvidence={setEvidence} />
      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        This records what was observed. It does not verify employment, education, identity, or a
        document in any canonical verification state machine. It grants zero Permanent Address Check
        1/2/3 credit.
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!performedAt || mutation.isPending || Boolean(receipt)}
          className="h-9 rounded-md bg-[#0B2545] px-3 text-xs font-medium text-white disabled:opacity-50"
        >
          {mutation.isPending ? "Recording..." : "Record in-person observation"}
        </button>
      </div>
      {receipt ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-950">
          <p className="font-medium">Observation recorded · {humanize(receipt.result)}</p>
          <p className="mt-1">Performed by Admin actor {receipt.performedByUserId}</p>
          <p>Canonical verification changed: No</p>
          <p>Permanent Address check credit: 0</p>
        </div>
      ) : null}
    </div>
  );
}

function EvidenceUploader({
  candidateId,
  evidence,
  onEvidence,
  disabled = false,
}: {
  candidateId: string;
  evidence: EvidenceReceipt[];
  onEvidence: (items: EvidenceReceipt[]) => void;
  disabled?: boolean;
}) {
  const adapter = useMemo(() => createAdminOperationsAdapter(), []);
  const [file, setFile] = useState<File | null>(null);
  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose evidence first.");
      const validationError = validateEvidenceFile(file);
      if (validationError) throw new Error(validationError);
      return adapter.uploadEvidence(candidateId, file);
    },
    onSuccess: (receipt) => {
      onEvidence([...evidence, receipt]);
      setFile(null);
      toast.success("Private evidence attached");
    },
    onError: (error) => toast.error(getOperationError(error, "Evidence could not be uploaded.")),
  });
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-64 flex-1 space-y-1 text-xs font-medium">
          Evidence (PDF, JPEG, PNG, or WebP; maximum 50 MiB)
          <input
            key={file?.name ?? "empty"}
            type="file"
            disabled={disabled}
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="block h-9 w-full rounded-md border border-border bg-background px-2 py-1 text-xs file:border-0 file:bg-transparent"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            if (!file) return;
            const validationError = validateEvidenceFile(file);
            if (validationError) {
              toast.error(validationError);
              return;
            }
            mutation.mutate();
          }}
          disabled={disabled || !file || mutation.isPending}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-medium disabled:opacity-50"
        >
          <Upload className="size-3.5" /> {mutation.isPending ? "Uploading..." : "Attach evidence"}
        </button>
      </div>
      {evidence.length ? (
        <ul className="mt-3 space-y-1 text-xs">
          {evidence.map((item) => (
            <li key={item.documentId} className="flex items-center gap-2 text-muted-foreground">
              <FileCheck2 className="size-3.5 text-emerald-600" /> {item.originalFilename} · private
              document {item.documentId.slice(0, 8)}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2 text-[11px] text-muted-foreground">
        Only the canonical document ID is retained by this workspace. Presigned storage URLs are
        discarded after upload.
      </p>
    </div>
  );
}

function CourtReceipt({ check }: { check: CourtCheck }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">Court check · {humanize(check.status)}</p>
        <span className={check.finalizedAt ? "text-emerald-700" : "text-amber-700"}>
          {check.finalizedAt ? "Finalized and immutable" : "Draft result"}
        </span>
      </div>
      <p className="mt-2 text-muted-foreground">{check.semanticNotice}</p>
      {check.finalizedAt ? (
        <p className="mt-2 text-muted-foreground">
          The backend projects this finalized result into the canonical HR Verification Report.
          Company360 caches were refreshed; the report itself remains organization-member scoped.
        </p>
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded text-xs font-medium ${active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
    >
      {children}
    </button>
  );
}

function PermissionCopy({ permission }: { permission: string }) {
  return (
    <div className="rounded-md border border-border p-4 text-xs text-muted-foreground">
      The <span className="font-mono text-foreground">{permission}</span> permission is required.
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-1 text-xs font-medium">
      {label}
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm disabled:opacity-60"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-1 text-xs font-medium">
      {label}
      <textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
      />
    </label>
  );
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
