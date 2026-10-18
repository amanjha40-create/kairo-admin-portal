import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileCheck2, FileText, MapPinCheck, ShieldAlert, Upload } from "lucide-react";
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
  adminOperationsKeys,
  adminVerificationReportQueryOptions,
  courtReceiptQueryOptions,
  courtReceiptsQueryOptions,
  createAdminOperationsAdapter,
  inPersonReceiptQueryOptions,
  inPersonReceiptsQueryOptions,
  refreshCourtReceiptCache,
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
  const [tab, setTab] = useState<"court" | "in-person" | "report">("court");
  const canCourt = hasPermission(access.admin?.permissions ?? [], "manage_court_check");
  const canInPerson = hasPermission(
    access.admin?.permissions ?? [],
    "perform_in_person_verification",
  );
  const canReport = hasPermission(access.admin?.permissions ?? [], "users.view");

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
        {person ? (
          <>
            <div className="grid grid-cols-3 gap-1 rounded-md bg-muted/50 p-1">
              <TabButton active={tab === "court"} onClick={() => setTab("court")}>
                <ShieldAlert className="size-4" /> Court-record check
              </TabButton>
              <TabButton active={tab === "in-person"} onClick={() => setTab("in-person")}>
                <MapPinCheck className="size-4" /> In-person observation
              </TabButton>
              <TabButton active={tab === "report"} onClick={() => setTab("report")}>
                <FileText className="size-4" /> Verification report
              </TabButton>
            </div>
            {tab === "report" ? (
              canReport ? (
                <VerificationReportWorkspace organizationId={organizationId} person={person} />
              ) : (
                <PermissionCopy permission="users.view" />
              )
            ) : tab === "court" ? (
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
        ) : null}
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
  candidateId?: string;
}) {
  const adapter = useMemo(() => createAdminOperationsAdapter(), []);
  const queryClient = useQueryClient();
  const receiptsQuery = useQuery(courtReceiptsQueryOptions(organizationId, person.id));
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>();
  const canonicalCourtId =
    selectedCourtId === undefined
      ? receiptsQuery.data?.items.at(0)?.publicId
      : (selectedCourtId ?? undefined);
  const receiptQuery = useQuery({
    ...courtReceiptQueryOptions(organizationId, person.id, canonicalCourtId ?? ""),
    enabled: Boolean(canonicalCourtId),
  });
  const check = receiptQuery.data ?? null;
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
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
  const [existingEvidenceIds, setExistingEvidenceIds] = useState<string[]>([]);

  useEffect(() => {
    if (!check) return;
    setStatus(check.status);
    setSearchedAt(toDateTimeLocal(check.searchedAt));
    setJurisdiction(check.jurisdiction);
    setCoverage(check.coverage);
    setSearchPeriod(check.searchPeriod ?? "");
    setSource(check.source);
    setFinding(check.finding ?? "");
    setRemarks(check.remarks ?? "");
    setLimitations(check.limitations);
    setExistingEvidenceIds(check.evidenceDocumentIds);
    setEvidence([]);
  }, [check]);

  const refreshCanonicalState = async (checkId: string) => {
    await Promise.all([
      refreshCourtReceiptCache(queryClient, organizationId, person.id, checkId),
      queryClient.invalidateQueries({
        queryKey: adminOperationsKeys.verificationReport(organizationId, person.id),
      }),
      queryClient.invalidateQueries({ queryKey: company360Keys.all() }),
    ]);
  };
  const save = useMutation({
    mutationFn: async () => {
      if (!candidateId) throw new Error("Link a canonical Candidate before writing Court data.");
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
        evidenceDocumentIds: [...existingEvidenceIds, ...evidence.map((item) => item.documentId)],
        idempotencyKey,
      };
      return check
        ? adapter.updateCourtCheck(organizationId, person.id, check.publicId, input)
        : adapter.createCourtCheck(organizationId, person.id, input);
    },
    onSuccess: async (result) => {
      setSelectedCourtId(result.publicId);
      await refreshCanonicalState(result.publicId);
      toast.success(check ? "Court check updated" : "Court check created");
    },
    onError: (error) =>
      toast.error(getOperationError(error, "The Court check could not be saved.")),
  });
  const finalize = useMutation({
    mutationFn: async () => {
      if (!candidateId) throw new Error("Link a canonical Candidate before finalizing Court data.");
      if (!check) throw new Error("Save the Court check first.");
      return adapter.finalizeCourtCheck(organizationId, person.id, check.publicId);
    },
    onSuccess: async (result) => {
      setSelectedCourtId(result.publicId);
      await refreshCanonicalState(result.publicId);
      toast.success("Court check finalized and locked");
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
      <div className="rounded-md border border-border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium">Persisted Court operations</p>
            <p className="text-[11px] text-muted-foreground">
              Canonical backend receipts survive refresh. Showing the latest 100 of{" "}
              {receiptsQuery.data?.total ?? 0}.
            </p>
          </div>
          {candidateId ? (
            <button
              type="button"
              onClick={() => {
                setSelectedCourtId(null);
                setIdempotencyKey(crypto.randomUUID());
                setStatus("pending");
                setSearchedAt("");
                setJurisdiction("");
                setCoverage("");
                setSearchPeriod("");
                setSource("");
                setFinding("");
                setRemarks("");
                setLimitations("");
                setExistingEvidenceIds([]);
                setEvidence([]);
              }}
              className="h-8 rounded-md border border-border px-3 text-xs font-medium hover:bg-accent"
            >
              New Court check
            </button>
          ) : null}
        </div>
        {receiptsQuery.isPending ? (
          <p className="mt-3 text-xs text-muted-foreground">Loading persisted Court receipts...</p>
        ) : receiptsQuery.error ? (
          <p className="mt-3 text-xs text-red-700">
            {getOperationError(receiptsQuery.error, "Court receipts could not be loaded.")}
          </p>
        ) : receiptsQuery.data?.items.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {receiptsQuery.data.items.map((item) => (
              <button
                key={item.publicId}
                type="button"
                onClick={() => setSelectedCourtId(item.publicId)}
                className={`rounded-md border px-3 py-2 text-left text-xs ${canonicalCourtId === item.publicId ? "border-[#087F7C] bg-[#EAF8F6]" : "border-border hover:bg-accent"}`}
              >
                <span className="block font-medium">{humanize(item.status)}</span>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(item.updatedAt).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">No persisted Court receipts yet.</p>
        )}
        {canonicalCourtId && receiptQuery.isPending ? (
          <p className="mt-3 text-xs text-muted-foreground">Loading selected receipt detail...</p>
        ) : null}
        {receiptQuery.error ? (
          <p className="mt-3 text-xs text-red-700">
            {getOperationError(
              receiptQuery.error,
              "The selected Court receipt could not be loaded.",
            )}
          </p>
        ) : null}
      </div>
      {candidateId ? (
        <>
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
          {existingEvidenceIds.length ? (
            <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Persisted private evidence: {existingEvidenceIds.length} document
              {existingEvidenceIds.length === 1 ? "" : "s"} (
              {existingEvidenceIds.map((id) => id.slice(0, 8)).join(", ")})
            </div>
          ) : null}
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            A no-match result means only “No match found within the stated court-record scope.” It
            is not police verification, criminal clearance, or a guarantee that no record exists.
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={
                !formValid ||
                save.isPending ||
                Boolean(check?.finalizedAt) ||
                (Boolean(canonicalCourtId) && receiptQuery.isPending)
              }
              className="h-9 rounded-md border border-border px-3 text-xs font-medium hover:bg-accent disabled:opacity-50"
            >
              {save.isPending
                ? "Saving..."
                : check
                  ? "Save Court check changes"
                  : "Create Court check"}
            </button>
            <button
              type="button"
              onClick={() => finalize.mutate()}
              disabled={
                !check ||
                check.status === "pending" ||
                finalize.isPending ||
                Boolean(check.finalizedAt)
              }
              className="h-9 rounded-md bg-[#0B2545] px-3 text-xs font-medium text-white disabled:opacity-50"
            >
              {finalize.isPending ? "Finalizing..." : "Finalize Court check"}
            </button>
          </div>
          {check ? <CourtReceipt check={check} /> : null}
        </>
      ) : (
        <>
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            Existing scoped receipts remain readable. New Court operations, changes, finalization,
            and private evidence uploads require a linked canonical Candidate.
          </div>
          {check ? <CourtReceipt check={check} /> : null}
        </>
      )}
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
  candidateId?: string;
}) {
  const adapter = useMemo(() => createAdminOperationsAdapter(), []);
  const queryClient = useQueryClient();
  const receiptsQuery = useQuery(inPersonReceiptsQueryOptions(organizationId, person.id));
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>();
  const canonicalReceiptId = selectedReceiptId ?? receiptsQuery.data?.items.at(0)?.publicId;
  const receiptQuery = useQuery({
    ...inPersonReceiptQueryOptions(organizationId, person.id, canonicalReceiptId ?? ""),
    enabled: Boolean(canonicalReceiptId),
  });
  const receipt = receiptQuery.data;
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [verificationType, setVerificationType] =
    useState<InPersonVerificationType>("identity_observation");
  const [performedAt, setPerformedAt] = useState("");
  const [personMet, setPersonMet] = useState("");
  const [relationship, setRelationship] = useState("");
  const [result, setResult] = useState<InPersonVerificationResult>("observed_consistent");
  const [notes, setNotes] = useState("");
  const [evidence, setEvidence] = useState<EvidenceReceipt[]>([]);
  const mutation = useMutation({
    mutationFn: () => {
      if (!candidateId) {
        throw new Error("Link a canonical Candidate before recording an in-person observation.");
      }
      return adapter.recordInPerson(organizationId, person.id, {
        verificationType,
        performedAt: new Date(performedAt).toISOString(),
        ...(personMet.trim() ? { personMet: personMet.trim() } : {}),
        ...(relationship.trim() ? { relationship: relationship.trim() } : {}),
        result,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        evidenceDocumentIds: evidence.map((item) => item.documentId),
        idempotencyKey,
      });
    },
    onSuccess: async (resultReceipt) => {
      setSelectedReceiptId(resultReceipt.publicId);
      setIdempotencyKey(crypto.randomUUID());
      setPerformedAt("");
      setPersonMet("");
      setRelationship("");
      setNotes("");
      setEvidence([]);
      toast.success("In-person observation recorded");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: adminOperationsKeys.inPersonList(organizationId, person.id),
        }),
        queryClient.fetchQuery(
          inPersonReceiptQueryOptions(organizationId, person.id, resultReceipt.publicId),
        ),
        queryClient.invalidateQueries({
          queryKey: adminOperationsKeys.verificationReport(organizationId, person.id),
        }),
        queryClient.invalidateQueries({ queryKey: company360Keys.all() }),
      ]);
    },
    onError: (error) =>
      toast.error(getOperationError(error, "The in-person observation could not be recorded.")),
  });

  return (
    <div className="space-y-4 pt-2">
      <div className="rounded-md border border-border p-3">
        <div>
          <p className="text-xs font-medium">Persisted in-person operations</p>
          <p className="text-[11px] text-muted-foreground">
            Canonical backend receipts survive refresh. Showing the latest 100 of{" "}
            {receiptsQuery.data?.total ?? 0}.
          </p>
        </div>
        {receiptsQuery.isPending ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Loading persisted in-person receipts...
          </p>
        ) : receiptsQuery.error ? (
          <p className="mt-3 text-xs text-red-700">
            {getOperationError(
              receiptsQuery.error,
              "In-person verification receipts could not be loaded.",
            )}
          </p>
        ) : receiptsQuery.data?.items.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {receiptsQuery.data.items.map((item) => (
              <button
                key={item.publicId}
                type="button"
                onClick={() => setSelectedReceiptId(item.publicId)}
                className={`rounded-md border px-3 py-2 text-left text-xs ${canonicalReceiptId === item.publicId ? "border-[#087F7C] bg-[#EAF8F6]" : "border-border hover:bg-accent"}`}
              >
                <span className="block font-medium">{humanize(item.verificationType)}</span>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(item.performedAt).toLocaleString()} · {humanize(item.result)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">No persisted in-person receipts yet.</p>
        )}
        {canonicalReceiptId && receiptQuery.isPending ? (
          <p className="mt-3 text-xs text-muted-foreground">Loading selected receipt detail...</p>
        ) : null}
        {receiptQuery.error ? (
          <p className="mt-3 text-xs text-red-700">
            {getOperationError(
              receiptQuery.error,
              "The selected in-person receipt could not be loaded.",
            )}
          </p>
        ) : null}
      </div>
      {candidateId ? (
        <>
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
          <EvidenceUploader
            candidateId={candidateId}
            evidence={evidence}
            onEvidence={setEvidence}
          />
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            This records what was observed. It does not verify employment, education, identity, or a
            document in any canonical verification state machine. It grants zero Permanent Address
            Check 1/2/3 credit.
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={!performedAt || mutation.isPending}
              className="h-9 rounded-md bg-[#0B2545] px-3 text-xs font-medium text-white disabled:opacity-50"
            >
              {mutation.isPending ? "Recording..." : "Record in-person observation"}
            </button>
          </div>
          {receipt ? <InPersonReceipt receipt={receipt} /> : null}
        </>
      ) : (
        <>
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            Existing scoped receipts remain readable. New in-person observations and private
            evidence uploads require a linked canonical Candidate.
          </div>
          {receipt ? <InPersonReceipt receipt={receipt} /> : null}
        </>
      )}
    </div>
  );
}

function VerificationReportWorkspace({
  organizationId,
  person,
}: {
  organizationId: string;
  person: CompanyPersonItem;
}) {
  const reportQuery = useQuery(adminVerificationReportQueryOptions(organizationId, person.id));

  if (reportQuery.isPending) {
    return (
      <div className="rounded-md border border-border p-4 text-xs text-muted-foreground">
        Loading the authorized internal Verification Report...
      </div>
    );
  }
  if (reportQuery.error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-xs text-red-950">
        <p className="font-medium">Verification Report unavailable</p>
        <p className="mt-1">
          {getOperationError(
            reportQuery.error,
            "The report could not be loaded for this organization and person.",
          )}
        </p>
      </div>
    );
  }

  const report = reportQuery.data;
  if (!report) return null;

  return (
    <div className="space-y-4 pt-2">
      <div className="rounded-md border border-border bg-muted/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{report.header.personName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {report.header.role ?? "Role not recorded"} · requested by{" "}
              {report.header.requestedByOrganization}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {[report.header.maskedEmail, report.header.maskedPhone].filter(Boolean).join(" · ") ||
                "No masked contact available"}
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-medium">{report.header.reportStatus}</p>
            <p className="text-muted-foreground">
              Updated {new Date(report.header.reportUpdatedAt).toLocaleString()}
            </p>
            {report.header.trustScore !== undefined ? (
              <p className="mt-1">Trust score {report.header.trustScore}</p>
            ) : null}
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Authorized internal Admin view. It is not a Candidate, public Passport, HR, or Institution
          projection, and this screen provides no export action.
        </p>
      </div>

      <ReportSection title="Check summary" empty={report.checkSummaries.length === 0}>
        <div className="grid gap-2 sm:grid-cols-2">
          {report.checkSummaries.map((item) => (
            <ReportCard key={`${item.check}-${item.updatedAt ?? "pending"}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{humanize(item.check)}</p>
                <span>{humanize(item.status)}</span>
              </div>
              <p className="mt-1 text-muted-foreground">{item.displayText}</p>
            </ReportCard>
          ))}
        </div>
      </ReportSection>

      <ReportSection title="Identity" empty={report.identity.length === 0}>
        {report.identity.map((item, index) => (
          <ReportCard key={`identity-${index}`}>
            <ReportLine label="Status" value={humanize(item.status)} />
            <ReportLine label="Declared" value={formatRecord(item.declaredValues)} />
            <ReportLine label="Verified" value={formatRecord(item.verifiedValues)} />
            <ReportLine label="Source" value={item.source} />
            <ReportLine label="Remarks" value={item.remarks} />
            <EvidenceReference evidenceId={item.evidenceId} />
          </ReportCard>
        ))}
      </ReportSection>

      <ReportSection title="Employment" empty={report.employment.length === 0}>
        {report.employment.map((item, index) => (
          <ReportCard key={`${item.organization}-${index}`}>
            <ReportLine label="Organization" value={item.organization} />
            <ReportLine label="Status" value={humanize(item.status)} />
            <ReportLine label="Declared title" value={item.declaredTitle} />
            <ReportLine label="Confirmed title" value={item.confirmedTitle} />
            <ReportLine
              label="Declared dates"
              value={formatDateRange(item.declaredStartDate, item.declaredEndDate)}
            />
            <ReportLine
              label="Confirmed dates"
              value={formatDateRange(item.confirmedStartDate, item.confirmedEndDate)}
            />
            <ReportLine label="Confirmed by" value={item.confirmedBy} />
            <ReportLine label="Reviewer" value={item.reviewer} />
            <ReportLine label="Remarks" value={item.remarks} />
            <EvidenceReference evidenceId={item.evidenceId} />
          </ReportCard>
        ))}
      </ReportSection>

      <ReportSection title="Education" empty={report.education.length === 0}>
        {report.education.map((item, index) => (
          <ReportCard key={`${item.institution ?? "education"}-${index}`}>
            <ReportLine label="Institution" value={item.institution} />
            <ReportLine label="University" value={item.university} />
            <ReportLine label="Qualification" value={item.qualification} />
            <ReportLine label="Completion year" value={item.completionYear?.toString()} />
            <ReportLine label="Status" value={humanize(item.status)} />
            <ReportLine label="Declared" value={formatRecord(item.declaredValues)} />
            <ReportLine label="Confirmed" value={formatRecord(item.confirmedValues)} />
            <EvidenceReference evidenceId={item.evidenceId} />
          </ReportCard>
        ))}
      </ReportSection>

      <ReportSection title="Professional references" empty={report.references.length === 0}>
        {report.references.map((item, index) => (
          <ReportCard key={`${item.name ?? "reference"}-${index}`}>
            <ReportLine label="Reference" value={item.name} />
            <ReportLine label="Relationship" value={item.titleOrRelationship} />
            <ReportLine label="Organization" value={item.organization} />
            <ReportLine label="Status" value={humanize(item.status)} />
            <ReportLine label="Strengths" value={item.strengths} />
            <ReportLine label="Development areas" value={item.developmentAreas} />
            <ReportLine label="Rehire response" value={item.rehireResponse} />
            {item.comments ? (
              <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-950">
                <span className="font-medium">Internal Admin reference comments:</span>{" "}
                {item.comments}
              </div>
            ) : null}
            <EvidenceReference evidenceId={item.evidenceId} />
          </ReportCard>
        ))}
      </ReportSection>

      <ReportSection title="Address" empty={report.address.length === 0}>
        {report.address.map((item, index) => (
          <ReportCard key={`address-${index}`}>
            <ReportLine label="Status" value={humanize(item.status)} />
            <ReportLine label="Declared address" value={item.declaredAddress} />
            <ReportLine label="Method" value={item.verificationMethod} />
            <ReportLine label="Scope" value={item.scope} />
            <ReportLine
              label="Physical visit"
              value={item.physicalVisitPerformed ? "Recorded" : "Not recorded"}
            />
            <EvidenceReference evidenceId={item.evidenceId} />
          </ReportCard>
        ))}
      </ReportSection>

      <ReportSection title="Court search" empty={report.courtSearch.length === 0}>
        {report.courtSearch.map((item, index) => (
          <ReportCard key={`court-${index}`}>
            <ReportLine label="Status" value={humanize(item.status)} />
            <ReportLine label="Subject" value={item.safeSubjectDisplay} />
            <ReportLine label="Scope" value={item.scope} />
            <ReportLine label="Search period" value={item.searchPeriod} />
            <ReportLine label="Source" value={item.source} />
            <ReportLine label="Finding" value={item.finding} />
            <ReportLine label="Remarks" value={item.remarks} />
            <ReportLine label="Limitations" value={item.limitations} />
            <EvidenceReference evidenceId={item.evidenceId} />
          </ReportCard>
        ))}
      </ReportSection>

      <ReportSection title="Open items" empty={report.openItems.length === 0}>
        {report.openItems.map((item) => (
          <ReportCard key={`${item.code}-${item.requestPublicId ?? item.check}`}>
            <p className="font-medium">{item.displayText}</p>
            <p className="mt-1 text-muted-foreground">
              {humanize(item.check)} · {item.code}
            </p>
          </ReportCard>
        ))}
      </ReportSection>
    </div>
  );
}

function ReportSection({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {empty ? (
        <div className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          No records reported.
        </div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
}

function ReportCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-border bg-muted/20 p-3 text-xs">{children}</div>;
}

function ReportLine({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <p className="mt-1 first:mt-0">
      <span className="font-medium">{label}:</span> {value}
    </p>
  );
}

function EvidenceReference({ evidenceId }: { evidenceId?: string }) {
  if (!evidenceId) return null;
  return (
    <p className="mt-2 text-[11px] text-muted-foreground">
      Private evidence linked · {evidenceId.slice(0, 8)}
    </p>
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
          The backend projects this finalized result into the canonical Verification Report. The
          authorized internal Admin report is refreshed from its own backend read contract.
        </p>
      ) : null}
    </div>
  );
}

function InPersonReceipt({ receipt }: { receipt: InPersonVerificationReceipt }) {
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-950">
      <p className="font-medium">
        Persisted observation · {humanize(receipt.verificationType)} · {humanize(receipt.result)}
      </p>
      <p className="mt-1">Performed {new Date(receipt.performedAt).toLocaleString()}</p>
      <p>Performed by Admin actor {receipt.performedByUserId}</p>
      {receipt.personMet ? <p>Person met: {receipt.personMet}</p> : null}
      {receipt.relationship ? <p>Relationship: {receipt.relationship}</p> : null}
      {receipt.notes ? <p>Notes: {receipt.notes}</p> : null}
      <p>Private evidence documents: {receipt.evidenceDocumentIds.length}</p>
      <p>Canonical verification changed: No</p>
      <p>Permanent Address check credit: 0</p>
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

function toDateTimeLocal(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatRecord(value: Record<string, string | null>) {
  const fields = Object.entries(value)
    .filter(([, fieldValue]) => fieldValue)
    .map(([key, fieldValue]) => `${humanize(key)}: ${fieldValue}`);
  return fields.join(" · ") || "Not recorded";
}

function formatDateRange(start?: string, end?: string) {
  if (!start && !end) return undefined;
  return `${start ?? "Not recorded"} to ${end ?? "Present / not recorded"}`;
}
