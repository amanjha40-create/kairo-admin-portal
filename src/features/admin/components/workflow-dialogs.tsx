/**
 * Kairo Admin — Verification workflow dialogs.
 *
 * Each dialog is a controlled component that renders inside a
 * `WorkflowActionDialog` shell. Every submission goes through the shared
 * `useVerificationWorkflow` hook; nothing here mutates mock data or
 * calls a backend.
 */
import { useMemo, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { appEnv } from "@/config/env";
import { WorkflowActionDialog, Field } from "./workflow-action-dialog";
import type { VerificationCaseDetail } from "../runtime/verification-review";
import {
  CORRECTION_REASONS,
  CORRECTION_REASON_LABEL,
  FIELD_CONFIRMATION_LABEL,
  HIGH_RISK_REJECTION_REASONS,
  REJECTION_REASONS,
  REJECTION_REASON_LABEL,
  UNABLE_REASONS,
  UNABLE_REASON_LABEL,
  VERIFICATION_BASES,
  VERIFICATION_BASIS_LABEL,
  type CorrectionReason,
  type DirectConfirmationMethod,
  type DirectConfirmationOutcome,
  type FieldConfirmation,
  type RejectionReason,
  type UnableReason,
  type VerificationBasis,
} from "../workflow/types";
import type { UseVerificationWorkflowResult } from "../workflow/use-verification-workflow";
import {
  buildCanonicalProductionClarificationResponsePayload,
  buildCanonicalProductionOutreachPayload,
  buildCanonicalProductionRejectPayload,
  buildCanonicalProductionUnablePayload,
  buildCanonicalProductionVerifyPayload,
} from "../workflow/canonical-production-payloads";
import {
  clarificationRequestSchema,
  clarificationResponseSchema,
  correctionSchema,
  directConfirmationSchema,
  outreachSchema,
  rejectSchema,
  unableSchema,
  verifySchema,
} from "../workflow/schemas";
import { CONTACT_STATE_LABEL } from "../runtime/verification-review";

const inputCls =
  "block w-full rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const textareaCls = inputCls + " resize-y";
const chipCls =
  "cursor-pointer rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground hover:bg-accent";
const chipSelectedCls =
  "rounded-md border border-foreground bg-foreground px-2 py-1 text-[11px] text-background";

type ZodIssueMap = Record<string, string>;
function issuesFrom(err: unknown): ZodIssueMap {
  const out: ZodIssueMap = {};
  if (err && typeof err === "object" && "issues" in err) {
    const issues = (err as { issues: { path: (string | number)[]; message: string }[] }).issues;
    for (const i of issues) {
      const key = i.path.join(".") || "_";
      if (!out[key]) out[key] = i.message;
    }
  }
  return out;
}

// =====================================================================
// 1. Request Correction
// =====================================================================

export function CorrectionDialog({
  open,
  onOpenChange,
  detail,
  workflow,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  detail: VerificationCaseDetail;
  workflow: UseVerificationWorkflowResult;
}) {
  const eligibility = workflow.getEligibility("request_correction");
  const [reasons, setReasons] = useState<CorrectionReason[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [items, setItems] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<ZodIssueMap>({});

  const requestableItems = [
    "Updated employment dates",
    "Clearer copy of primary evidence",
    "Additional supporting document",
    "Corrected organization details",
    "Updated identity document",
  ];

  function reset() {
    setReasons([]);
    setFields([]);
    setItems([]);
    setMessage("");
    setNote("");
    setErrors({});
  }

  function toggle<T>(list: T[], v: T): T[] {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

  return (
    <WorkflowActionDialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
      title="Request Correction"
      consequenceSummary="Sends the case back to the candidate for clarification. Status moves to Corrections Requested."
      eligibility={eligibility}
      submitLabel={
        appEnv.adminDemoMode ? "Request correction (session-only)" : "Request correction"
      }
      candidateImpactNote={
        appEnv.adminDemoMode
          ? "A candidate-facing message is prepared but not sent in this build."
          : "The backend will manage the candidate-facing correction request."
      }
      onSubmit={async () => {
        const parsed = correctionSchema.safeParse({
          reasons,
          affectedFieldKeys: fields,
          requestedItems: items,
          candidateMessage: message,
          internalNote: note,
        });
        if (!parsed.success) {
          setErrors(issuesFrom(parsed.error));
          return;
        }
        await workflow.submitCorrection({
          reasons: parsed.data.reasons,
          affectedFieldKeys: parsed.data.affectedFieldKeys,
          requestedItems: parsed.data.requestedItems,
          candidateMessage: parsed.data.candidateMessage,
          internalNote: parsed.data.internalNote || undefined,
        });
        toast.success("Correction request recorded", {
          description: appEnv.adminDemoMode
            ? "Session-only. No message was sent to the candidate."
            : "Saved to the backend review workflow.",
        });
        onOpenChange(false);
        reset();
      }}
      aside={
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Candidate-facing preview
          </p>
          <div className="mt-2 rounded border border-border bg-background p-2 text-[11px] text-foreground">
            {message.trim() ? (
              <p className="whitespace-pre-wrap">{message}</p>
            ) : (
              <p className="italic text-muted-foreground">
                The message written on the left will appear to the candidate. The internal note
                below is never shown to them.
              </p>
            )}
          </div>
        </div>
      }
    >
      <Field label="Correction reasons" required error={errors["reasons"]}>
        <div className="flex flex-wrap gap-1.5">
          {CORRECTION_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReasons((prev) => toggle(prev, r))}
              className={reasons.includes(r) ? chipSelectedCls : chipCls}
              aria-pressed={reasons.includes(r)}
            >
              {CORRECTION_REASON_LABEL[r]}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Affected claim fields" required error={errors["affectedFieldKeys"]}>
        <div className="flex flex-wrap gap-1.5">
          {detail.claim.fields.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFields((prev) => toggle(prev, f.key))}
              className={fields.includes(f.key) ? chipSelectedCls : chipCls}
              aria-pressed={fields.includes(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Requested evidence / items">
        <div className="flex flex-wrap gap-1.5">
          {requestableItems.map((it) => (
            <button
              key={it}
              type="button"
              onClick={() => setItems((prev) => toggle(prev, it))}
              className={items.includes(it) ? chipSelectedCls : chipCls}
              aria-pressed={items.includes(it)}
            >
              {it}
            </button>
          ))}
        </div>
      </Field>

      <Field
        label="Candidate-facing message"
        htmlFor="corr-msg"
        required
        error={errors["candidateMessage"]}
        hint="Written directly to the candidate. Do not include internal reasoning."
      >
        <textarea
          id="corr-msg"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={textareaCls}
          maxLength={2000}
        />
      </Field>

      <Field
        label="Internal note (never shown to candidate)"
        htmlFor="corr-note"
        error={errors["internalNote"]}
      >
        <textarea
          id="corr-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={textareaCls}
          maxLength={2000}
        />
      </Field>
    </WorkflowActionDialog>
  );
}

// =====================================================================
// 2. Approve for Dispatch
// =====================================================================

export function OutreachDialog({
  open,
  onOpenChange,
  detail,
  workflow,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  detail: VerificationCaseDetail;
  workflow: UseVerificationWorkflowResult;
}) {
  const eligibility = workflow.getEligibility("approve_outreach");
  const isCanonicalProductionMode = !appEnv.adminDemoMode;
  const approvedContacts = detail.contacts.filter(
    (c) => c.outreachEligible && c.internalApprovalStatus === "approved",
  );
  const [contactId, setContactId] = useState<string>(approvedContacts[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<ZodIssueMap>({});

  const contact = approvedContacts.find((c) => c.id === contactId);
  const backendContact = approvedContacts[0];

  return (
    <WorkflowActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Approve for Dispatch"
      consequenceSummary="Approves the request for backend dispatch into verifier outreach or organization resolution."
      eligibility={eligibility}
      submitLabel={
        appEnv.adminDemoMode ? "Approve for dispatch (session-only)" : "Approve for dispatch"
      }
      candidateImpactNote={
        appEnv.adminDemoMode
          ? "Dispatch approved in this session. No email has been sent."
          : "The backend will advance the request using the deployed verification workflow."
      }
      onSubmit={async () => {
        if (isCanonicalProductionMode) {
          if (!backendContact) {
            setErrors({ contactId: "Approve a contact before dispatching this request." });
            return;
          }
          await workflow.submitOutreach(
            buildCanonicalProductionOutreachPayload(backendContact.id),
            backendContact.name,
          );
          toast.success("Approved for dispatch", {
            description: "The backend will move the request into the next verification stage.",
          });
          onOpenChange(false);
          return;
        }
        const parsed = outreachSchema.safeParse({
          contactId,
          channel: "email",
          internalNote: note,
        });
        if (!parsed.success) {
          setErrors(issuesFrom(parsed.error));
          return;
        }
        if (!contact) return;
        await workflow.submitOutreach(
          {
            contactId: parsed.data.contactId,
            channel: "email",
            internalNote: parsed.data.internalNote || undefined,
          },
          contact.name,
        );
        toast.success(
          appEnv.adminDemoMode ? "Dispatch approved (session-only)" : "Approved for dispatch",
          {
            description: appEnv.adminDemoMode
              ? "No email has been sent."
              : "The backend will move the request into the next verification stage.",
          },
        );
        onOpenChange(false);
      }}
      aside={
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Readiness
            </p>
            <ul className="mt-1 space-y-0.5 text-[11px] text-foreground">
              <li>Org: {detail.organization.state.replace(/_/g, " ")}</li>
              <li>
                Contacts approved: {approvedContacts.length} / {detail.contacts.length}
              </li>
              <li>Evidence: {detail.evidence.length}</li>
              <li>
                Open flags:{" "}
                {
                  detail.flags.filter(
                    (f) => f.state === "open" && !workflow.acknowledgedFlagIds.has(f.id),
                  ).length
                }
              </li>
              <li>
                Prior outreach:{" "}
                {detail.communications.length === 0
                  ? "None"
                  : `${detail.communications.length} event(s)`}
              </li>
            </ul>
          </div>
        </div>
      }
    >
      {isCanonicalProductionMode ? (
        <Field label="Authoritative backend contact" required error={errors["contactId"]}>
          {backendContact ? (
            <div className="rounded border border-border bg-background p-2 text-xs text-foreground">
              <p className="font-medium">
                {backendContact.name} · {backendContact.role}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {backendContact.email ?? backendContact.emailMasked}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {CONTACT_STATE_LABEL[backendContact.state]} ·{" "}
                {(backendContact.confidence * 100).toFixed(0)}% confidence
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Production dispatch uses the currently approved backend contact on this case.
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              No approved outreach-eligible contacts. Approve a contact first.
            </p>
          )}
        </Field>
      ) : (
        <>
          <Field label="Selected approved contact" required error={errors["contactId"]}>
            {approvedContacts.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                No approved outreach-eligible contacts. Approve a contact first.
              </p>
            ) : (
              <div className="space-y-1.5">
                {approvedContacts.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-start gap-2 rounded border border-border bg-background p-2 text-xs"
                  >
                    <input
                      type="radio"
                      name="outreach-contact"
                      checked={contactId === c.id}
                      onChange={() => setContactId(c.id)}
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-foreground">
                        {c.name} · {c.role}
                      </span>
                      <span className="block font-mono text-[11px] text-muted-foreground">
                        {c.email ?? c.emailMasked}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {CONTACT_STATE_LABEL[c.state]} · {(c.confidence * 100).toFixed(0)}%
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </Field>

          <Field label="Outreach channel" required>
            <div className="flex gap-1.5">
              <button type="button" className={chipSelectedCls} aria-pressed>
                Email
              </button>
              <button type="button" disabled className={chipCls + " opacity-50"}>
                SMS (soon)
              </button>
              <button type="button" disabled className={chipCls + " opacity-50"}>
                Portal (soon)
              </button>
            </div>
          </Field>

          <Field label="Internal note" htmlFor="out-note">
            <textarea
              id="out-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={textareaCls}
              maxLength={2000}
            />
          </Field>
        </>
      )}
    </WorkflowActionDialog>
  );
}

// =====================================================================
// 3. Direct confirmation
// =====================================================================

const DIRECT_CONFIRMATION_METHOD_LABEL: Record<DirectConfirmationMethod, string> = {
  phone: "Phone",
  email: "Email",
  video_call: "Video call",
  in_person: "In person",
  other: "Other",
};

export function DirectConfirmationDialog({
  open,
  onOpenChange,
  detail,
  workflow,
  onRouteToCorrection,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  detail: VerificationCaseDetail;
  workflow: UseVerificationWorkflowResult;
  onRouteToCorrection: () => void;
}) {
  const eligibility = workflow.getEligibility("direct_confirmation");
  const contact = detail.contacts[0];
  const [method, setMethod] = useState<DirectConfirmationMethod>(
    contact?.email ? "email" : "phone",
  );
  const [confirmedBy, setConfirmedBy] = useState(contact?.name ?? "");
  const [verifierRole, setVerifierRole] = useState(contact?.role ?? "");
  const [contactDetailUsed, setContactDetailUsed] = useState(contact?.email ?? "");
  const [outcome, setOutcome] = useState<DirectConfirmationOutcome>("details_confirmed");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<ZodIssueMap>({});

  function reset() {
    setMethod(contact?.email ? "email" : "phone");
    setConfirmedBy(contact?.name ?? "");
    setVerifierRole(contact?.role ?? "");
    setContactDetailUsed(contact?.email ?? "");
    setOutcome("details_confirmed");
    setNote("");
    setErrors({});
  }

  return (
    <WorkflowActionDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
      title="Verify via Direct Confirmation"
      consequenceSummary="Records a privileged manual confirmation and marks the linked canonical record Verified."
      eligibility={eligibility}
      submitLabel={
        outcome === "details_confirmed_with_discrepancy"
          ? "Continue to Request Correction"
          : appEnv.adminDemoMode
            ? "Verify via direct confirmation (session-only)"
            : "Verify via direct confirmation"
      }
      candidateImpactNote="Material discrepancies must use the existing correction workflow and cannot produce a clean Verified outcome."
      onSubmit={async () => {
        const parsed = directConfirmationSchema.safeParse({
          confirmationMethod: method,
          confirmedBy,
          verifierRole,
          contactDetailUsed,
          confirmationOutcome: outcome,
          internalNote: note,
        });
        if (!parsed.success) {
          setErrors(issuesFrom(parsed.error));
          return;
        }
        if (parsed.data.confirmationOutcome === "details_confirmed_with_discrepancy") {
          onOpenChange(false);
          reset();
          onRouteToCorrection();
          return;
        }
        await workflow.submitDirectConfirmation(parsed.data);
        toast.success("Verified via direct confirmation", {
          description: appEnv.adminDemoMode
            ? "Recorded for this Demo Mode session only."
            : "The canonical backend recorded the verification and immutable audit event.",
        });
        onOpenChange(false);
        reset();
      }}
    >
      <Field label="Verification method" required error={errors.confirmationMethod}>
        <select
          value={method}
          onChange={(event) => setMethod(event.target.value as DirectConfirmationMethod)}
          className={inputCls}
        >
          {Object.entries(DIRECT_CONFIRMATION_METHOD_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Confirmed by" htmlFor="direct-confirmed-by" required error={errors.confirmedBy}>
        <input
          id="direct-confirmed-by"
          value={confirmedBy}
          onChange={(event) => setConfirmedBy(event.target.value)}
          className={inputCls}
          maxLength={255}
        />
      </Field>
      <Field label="Role / office" htmlFor="direct-role" required error={errors.verifierRole}>
        <input
          id="direct-role"
          value={verifierRole}
          onChange={(event) => setVerifierRole(event.target.value)}
          className={inputCls}
          maxLength={255}
        />
      </Field>
      <Field
        label="Contact detail used"
        htmlFor="direct-contact"
        required
        error={errors.contactDetailUsed}
        hint="Record the exact phone number or email used for this confirmation."
      >
        <input
          id="direct-contact"
          value={contactDetailUsed}
          onChange={(event) => setContactDetailUsed(event.target.value)}
          className={inputCls}
          maxLength={320}
        />
      </Field>
      <Field label="Confirmation outcome" required error={errors.confirmationOutcome}>
        <select
          value={outcome}
          onChange={(event) => setOutcome(event.target.value as DirectConfirmationOutcome)}
          className={inputCls}
        >
          <option value="details_confirmed">Details confirmed</option>
          <option value="details_confirmed_with_discrepancy">
            Details confirmed with discrepancy
          </option>
        </select>
      </Field>
      <Field
        label="Internal verification note"
        htmlFor="direct-note"
        required
        error={errors.internalNote}
        hint="Explain what was confirmed, by whom, and through which channel."
      >
        <textarea
          id="direct-note"
          rows={5}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className={textareaCls}
          maxLength={5000}
        />
      </Field>
    </WorkflowActionDialog>
  );
}

// =====================================================================
// 3. Verify
// =====================================================================

export function VerifyDialog({
  open,
  onOpenChange,
  detail,
  workflow,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  detail: VerificationCaseDetail;
  workflow: UseVerificationWorkflowResult;
}) {
  const eligibility = workflow.getEligibility("verify");
  const isCanonicalProductionMode = !appEnv.adminDemoMode;
  const [basis, setBasis] = useState<VerificationBasis | "">("");
  const initialConfirmations = useMemo<Record<string, FieldConfirmation>>(
    () =>
      detail.claim.fields.reduce(
        (acc, f) => ({ ...acc, [f.key]: "not_confirmed" as FieldConfirmation }),
        {},
      ),
    [detail.claim.fields],
  );
  const [confirmations, setConfirmations] = useState(initialConfirmations);
  const [summary, setSummary] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<ZodIssueMap>({});

  function setConfirmation(key: string, val: FieldConfirmation) {
    setConfirmations((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <WorkflowActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Finalize Verified"
      consequenceSummary="Marks the case as verified. This is a terminal decision in this build."
      eligibility={eligibility}
      submitLabel={
        appEnv.adminDemoMode ? "Confirm verification (session-only)" : "Finalize verified"
      }
      candidateImpactNote={
        appEnv.adminDemoMode
          ? "Session-only decision. Candidate Trust Passport and Trust Score are not updated in this mock workflow."
          : "Only the backend final quality-review path can mark the canonical record verified."
      }
      onSubmit={async () => {
        if (isCanonicalProductionMode) {
          const decisionSummary = summary.trim();
          if (!decisionSummary) {
            setErrors({ decisionSummary: "Provide a reviewer summary." });
            return;
          }
          await workflow.submitVerify(
            buildCanonicalProductionVerifyPayload(
              detail,
              decisionSummary,
              new Date().toISOString().slice(0, 10),
            ),
          );
          toast.success("Case finalized as verified", {
            description: "The backend recorded the final quality-review outcome.",
          });
          onOpenChange(false);
          return;
        }

        const parsed = verifySchema.safeParse({
          basis,
          fieldConfirmations: confirmations,
          decisionSummary: summary,
          effectiveDate,
          expiryDate,
          internalNote: note,
        });
        if (!parsed.success) {
          setErrors(issuesFrom(parsed.error));
          return;
        }
        await workflow.submitVerify({
          basis: parsed.data.basis,
          fieldConfirmations: parsed.data.fieldConfirmations,
          decisionSummary: parsed.data.decisionSummary,
          effectiveDate: parsed.data.effectiveDate,
          expiryDate: parsed.data.expiryDate || undefined,
          internalNote: parsed.data.internalNote || undefined,
        });
        toast.success("Case marked Verified (session-only)", {
          description: "Downstream candidate updates are not performed here.",
        });
        onOpenChange(false);
      }}
      aside={
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Decision summary preview
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[11px] text-foreground">
            {summary.trim() || (
              <span className="italic text-muted-foreground">
                A short summary of the verification decision.
              </span>
            )}
          </p>
        </div>
      }
    >
      {isCanonicalProductionMode ? (
        <div className="rounded border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
          Production finalization uses the canonical backend contract. Record the authoritative
          reviewer summary below and the backend will apply the verified outcome to the linked
          claim.
        </div>
      ) : (
        <>
          <Field label="Verification basis" required error={errors["basis"]}>
            <select
              value={basis}
              onChange={(e) => setBasis(e.target.value as VerificationBasis)}
              className={inputCls}
            >
              <option value="">Select basis…</option>
              {VERIFICATION_BASES.map((b) => (
                <option key={b} value={b}>
                  {VERIFICATION_BASIS_LABEL[b]}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Claim field confirmation"
            required
            error={errors["fieldConfirmations"]}
            hint="Confirm each claim field individually. Fields are not auto-confirmed."
          >
            <div className="rounded border border-border">
              <ul className="divide-y divide-border">
                {detail.claim.fields.map((f) => (
                  <li
                    key={f.key}
                    className="flex flex-wrap items-center justify-between gap-2 px-2 py-1.5"
                  >
                    <span className="min-w-0 truncate text-xs text-foreground">
                      {f.label}
                      <span className="ml-1 text-[11px] text-muted-foreground">· {f.value}</span>
                    </span>
                    <select
                      aria-label={`Confirmation for ${f.label}`}
                      value={confirmations[f.key]}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        setConfirmation(f.key, e.target.value as FieldConfirmation)
                      }
                      className="h-7 rounded border border-border bg-background px-1 text-[11px] text-foreground"
                    >
                      {(
                        [
                          "confirmed",
                          "partially_confirmed",
                          "not_confirmed",
                          "not_applicable",
                        ] as FieldConfirmation[]
                      ).map((s) => (
                        <option key={s} value={s}>
                          {FIELD_CONFIRMATION_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          </Field>
        </>
      )}

      <Field
        label="Decision summary"
        htmlFor="verify-summary"
        required
        error={errors["decisionSummary"]}
      >
        <textarea
          id="verify-summary"
          rows={3}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className={textareaCls}
        />
      </Field>

      {!isCanonicalProductionMode ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Effective date"
              htmlFor="verify-eff"
              required
              error={errors["effectiveDate"]}
            >
              <input
                id="verify-eff"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Expiry date (optional)" htmlFor="verify-exp" error={errors["expiryDate"]}>
              <input
                id="verify-exp"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Internal note" htmlFor="verify-note">
            <textarea
              id="verify-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={textareaCls}
            />
          </Field>
        </>
      ) : null}
    </WorkflowActionDialog>
  );
}

// =====================================================================
// 4. Reject
// =====================================================================

export function RejectDialog({
  open,
  onOpenChange,
  detail,
  workflow,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  detail: VerificationCaseDetail;
  workflow: UseVerificationWorkflowResult;
}) {
  const [reason, setReason] = useState<RejectionReason | "">("");
  const rejectionIsHighRisk = reason ? HIGH_RISK_REJECTION_REASONS.includes(reason) : false;
  const isCanonicalProductionMode = !appEnv.adminDemoMode;
  const eligibility = workflow.getEligibility("reject", {
    rejectionIsHighRisk,
  });

  const [summary, setSummary] = useState("");
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [errors, setErrors] = useState<ZodIssueMap>({});

  const supportingItems = [
    ...detail.evidence.map((e) => ({
      id: e.id,
      label: `Evidence · ${e.title}`,
    })),
    ...detail.communications.map((c) => ({
      id: c.id,
      label: `Communication · ${c.state} to ${c.recipientDisplay}`,
    })),
  ];

  return (
    <WorkflowActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Reject verification"
      consequenceSummary="Rejection means the claim is determined false, invalid, or unsupported. Do not use rejection simply because outreach failed."
      eligibility={eligibility}
      destructive
      submitLabel={appEnv.adminDemoMode ? "Reject case (session-only)" : "Reject"}
      candidateImpactNote={
        appEnv.adminDemoMode
          ? "A candidate-facing explanation is prepared but not sent. The candidate account is not disabled."
          : "The backend will record the rejection decision and preserve the audit trail."
      }
      onSubmit={async () => {
        if (isCanonicalProductionMode) {
          const decisionSummary = summary.trim();
          if (!decisionSummary) {
            setErrors({ decisionSummary: "Provide a reviewer summary." });
            return;
          }
          await workflow.submitReject(buildCanonicalProductionRejectPayload(decisionSummary));
          toast.warning("Case rejected", {
            description: "The backend recorded the rejection decision.",
          });
          onOpenChange(false);
          return;
        }
        const parsed = rejectSchema.safeParse({
          reason,
          decisionSummary: summary,
          supportingEvidenceIds: evidenceIds,
          candidateMessage: message,
          internalNote: note,
          acknowledgement: acknowledged,
        });
        if (!parsed.success) {
          setErrors(issuesFrom(parsed.error));
          return;
        }
        await workflow.submitReject({
          reason: parsed.data.reason,
          decisionSummary: parsed.data.decisionSummary,
          supportingEvidenceIds: parsed.data.supportingEvidenceIds,
          candidateMessage: parsed.data.candidateMessage,
          internalNote: parsed.data.internalNote || undefined,
          acknowledgement: true,
        });
        toast.warning(appEnv.adminDemoMode ? "Case rejected (session-only)" : "Case rejected", {
          description: appEnv.adminDemoMode
            ? "No candidate notification was sent."
            : "The backend recorded the rejection decision.",
        });
        onOpenChange(false);
      }}
      aside={
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Candidate-facing preview
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[11px] text-foreground">
            {message.trim() || (
              <span className="italic text-muted-foreground">
                Explanation shown to the candidate.
              </span>
            )}
          </p>
        </div>
      }
    >
      {!isCanonicalProductionMode ? (
        <Field label="Rejection reason" required error={errors["reason"]}>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as RejectionReason)}
            className={inputCls}
          >
            <option value="">Select reason…</option>
            {REJECTION_REASONS.map((r) => (
              <option key={r} value={r}>
                {REJECTION_REASON_LABEL[r]}
              </option>
            ))}
          </select>
          {rejectionIsHighRisk ? (
            <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-300">
              This rejection reason requires Trust &amp; Safety or Admin permission.
            </p>
          ) : null}
        </Field>
      ) : (
        <div className="rounded border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
          Production rejection uses the canonical backend summary contract and preserves the
          immutable audit trail without client-only decision fields.
        </div>
      )}

      <Field
        label="Decision summary"
        htmlFor="rej-summary"
        required
        error={errors["decisionSummary"]}
      >
        <textarea
          id="rej-summary"
          rows={3}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className={textareaCls}
        />
      </Field>

      {!isCanonicalProductionMode ? (
        <>
          <Field
            label="Evidence or events supporting this rejection"
            required
            error={errors["supportingEvidenceIds"]}
          >
            {supportingItems.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                No evidence or communication events available on this case.
              </p>
            ) : (
              <div className="space-y-1">
                {supportingItems.map((it) => (
                  <label
                    key={it.id}
                    className="flex cursor-pointer items-start gap-2 text-xs text-foreground"
                  >
                    <input
                      type="checkbox"
                      checked={evidenceIds.includes(it.id)}
                      onChange={() =>
                        setEvidenceIds((prev) =>
                          prev.includes(it.id) ? prev.filter((x) => x !== it.id) : [...prev, it.id],
                        )
                      }
                      className="mt-0.5"
                    />
                    <span>{it.label}</span>
                  </label>
                ))}
              </div>
            )}
          </Field>

          <Field
            label="Candidate-facing explanation"
            htmlFor="rej-msg"
            required
            error={errors["candidateMessage"]}
          >
            <textarea
              id="rej-msg"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={textareaCls}
            />
          </Field>

          <Field label="Internal note" htmlFor="rej-note">
            <textarea
              id="rej-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={textareaCls}
            />
          </Field>

          <label className="mt-1 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-[11px] text-destructive">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I understand that rejection is a material verification decision and must be supported
              by the case record.
            </span>
          </label>
          {errors["acknowledgement"] ? (
            <p role="alert" className="mt-1 text-[11px] text-destructive">
              {errors["acknowledgement"]}
            </p>
          ) : null}
        </>
      ) : null}
    </WorkflowActionDialog>
  );
}

// =====================================================================
// 5. Unable to Verify
// =====================================================================

export function UnableDialog({
  open,
  onOpenChange,
  workflow,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  detail: VerificationCaseDetail;
  workflow: UseVerificationWorkflowResult;
}) {
  const eligibility = workflow.getEligibility("unable_to_verify");
  const isCanonicalProductionMode = !appEnv.adminDemoMode;
  const [reason, setReason] = useState<UnableReason | "">("");
  const [attempts, setAttempts] = useState("");
  const [uncertainty, setUncertainty] = useState("");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<ZodIssueMap>({});

  return (
    <WorkflowActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Unable to Verify"
      consequenceSummary="Kairo could not reach a reliable verification conclusion. This is not a rejection."
      eligibility={eligibility}
      submitLabel={
        appEnv.adminDemoMode ? "Mark unable to verify (session-only)" : "Finalize unable to verify"
      }
      candidateImpactNote="Unable to Verify does not mean the claim is false. It means Kairo could not reach a reliable verification conclusion."
      onSubmit={async () => {
        if (isCanonicalProductionMode) {
          const decisionSummary = attempts.trim();
          if (!decisionSummary) {
            setErrors({ attemptsSummary: "Provide a reviewer summary." });
            return;
          }
          await workflow.submitUnable(buildCanonicalProductionUnablePayload(decisionSummary));
          toast("Case finalized as unable to verify", {
            description: "The backend recorded the final inability-to-verify outcome.",
          });
          onOpenChange(false);
          return;
        }
        const parsed = unableSchema.safeParse({
          reason,
          attemptsSummary: attempts,
          outstandingUncertainty: uncertainty,
          candidateMessage: message,
          internalNote: note,
        });
        if (!parsed.success) {
          setErrors(issuesFrom(parsed.error));
          return;
        }
        await workflow.submitUnable({
          reason: parsed.data.reason,
          attemptsSummary: parsed.data.attemptsSummary,
          outstandingUncertainty: parsed.data.outstandingUncertainty,
          candidateMessage: parsed.data.candidateMessage,
          internalNote: parsed.data.internalNote || undefined,
        });
        toast(
          appEnv.adminDemoMode
            ? "Case marked Unable to Verify (session-only)"
            : "Case finalized as unable to verify",
          {
            description: appEnv.adminDemoMode
              ? "No fraud determination is implied."
              : "The backend recorded the final inability-to-verify outcome.",
          },
        );
        onOpenChange(false);
      }}
    >
      {!isCanonicalProductionMode ? (
        <Field label="Reason" required error={errors["reason"]}>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as UnableReason)}
            className={inputCls}
          >
            <option value="">Select reason…</option>
            {UNABLE_REASONS.map((r) => (
              <option key={r} value={r}>
                {UNABLE_REASON_LABEL[r]}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <div className="rounded border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
          Production unable-to-verify decisions use the canonical backend summary contract and keep
          the authoritative verification history on the server.
        </div>
      )}

      <Field
        label={isCanonicalProductionMode ? "Reviewer summary" : "Attempts summary"}
        htmlFor="unable-attempts"
        required
        error={errors["attemptsSummary"]}
        hint={
          isCanonicalProductionMode
            ? undefined
            : "Briefly list the outreach or resolution attempts already made."
        }
      >
        <textarea
          id="unable-attempts"
          rows={3}
          value={attempts}
          onChange={(e) => setAttempts(e.target.value)}
          className={textareaCls}
        />
      </Field>

      {!isCanonicalProductionMode ? (
        <>
          <Field
            label="Outstanding uncertainty"
            htmlFor="unable-uncertainty"
            required
            error={errors["outstandingUncertainty"]}
          >
            <textarea
              id="unable-uncertainty"
              rows={2}
              value={uncertainty}
              onChange={(e) => setUncertainty(e.target.value)}
              className={textareaCls}
            />
          </Field>

          <Field
            label="Candidate-facing explanation"
            htmlFor="unable-msg"
            required
            error={errors["candidateMessage"]}
          >
            <textarea
              id="unable-msg"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={textareaCls}
            />
          </Field>

          <Field label="Internal note" htmlFor="unable-note">
            <textarea
              id="unable-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={textareaCls}
            />
          </Field>
        </>
      ) : null}
    </WorkflowActionDialog>
  );
}

// =====================================================================
// 6. Clarification (secondary)
// =====================================================================

export function ClarificationRequestDialog({
  open,
  onOpenChange,
  detail,
  workflow,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  detail: VerificationCaseDetail;
  workflow: UseVerificationWorkflowResult;
}) {
  const eligibility = workflow.getEligibility("record_clarification_request");
  const [question, setQuestion] = useState("");
  const [fields, setFields] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<ZodIssueMap>({});

  return (
    <WorkflowActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record employer clarification request"
      consequenceSummary="Moves the case into Clarification Requested. No message is sent."
      eligibility={eligibility}
      submitLabel={appEnv.adminDemoMode ? "Record (session-only)" : "Record clarification"}
      onSubmit={async () => {
        const parsed = clarificationRequestSchema.safeParse({
          question,
          affectedFieldKeys: fields,
          internalNote: note,
        });
        if (!parsed.success) {
          setErrors(issuesFrom(parsed.error));
          return;
        }
        await workflow.submitClarificationRequest({
          question: parsed.data.question,
          affectedFieldKeys: parsed.data.affectedFieldKeys,
          internalNote: parsed.data.internalNote || undefined,
        });
        toast(
          appEnv.adminDemoMode
            ? "Clarification request recorded (session-only)"
            : "Clarification request recorded",
        );
        onOpenChange(false);
      }}
    >
      <Field label="Question or missing field" required error={errors["question"]} htmlFor="clr-q">
        <textarea
          id="clr-q"
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className={textareaCls}
        />
      </Field>
      <Field label="Affected claim fields">
        <div className="flex flex-wrap gap-1.5">
          {detail.claim.fields.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() =>
                setFields((prev) =>
                  prev.includes(f.key) ? prev.filter((x) => x !== f.key) : [...prev, f.key],
                )
              }
              className={fields.includes(f.key) ? chipSelectedCls : chipCls}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Internal note" htmlFor="clr-note">
        <textarea
          id="clr-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={textareaCls}
        />
      </Field>
    </WorkflowActionDialog>
  );
}

export function ClarificationResponseDialog({
  open,
  onOpenChange,
  detail,
  workflow,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  detail: VerificationCaseDetail;
  workflow: UseVerificationWorkflowResult;
}) {
  const eligibility = workflow.getEligibility("record_clarification_response");
  const isCanonicalProductionMode = !appEnv.adminDemoMode;
  const [response, setResponse] = useState("");
  const [updated, setUpdated] = useState<string[]>([]);
  const [evidenceAdded, setEvidenceAdded] = useState(false);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<ZodIssueMap>({});

  return (
    <WorkflowActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record candidate clarification response"
      consequenceSummary="Moves the case back to Awaiting verifier."
      eligibility={eligibility}
      submitLabel={appEnv.adminDemoMode ? "Record (session-only)" : "Record clarification response"}
      onSubmit={async () => {
        if (isCanonicalProductionMode) {
          const nextResponse = response.trim();
          if (!nextResponse) {
            setErrors({ response: "Provide the clarification response." });
            return;
          }
          await workflow.submitClarificationResponse(
            buildCanonicalProductionClarificationResponsePayload(nextResponse),
          );
          toast("Clarification response recorded");
          onOpenChange(false);
          return;
        }
        const parsed = clarificationResponseSchema.safeParse({
          response,
          updatedFieldKeys: updated,
          evidenceAdded,
          internalNote: note,
        });
        if (!parsed.success) {
          setErrors(issuesFrom(parsed.error));
          return;
        }
        await workflow.submitClarificationResponse({
          response: parsed.data.response,
          updatedFieldKeys: parsed.data.updatedFieldKeys,
          evidenceAdded: parsed.data.evidenceAdded,
          internalNote: parsed.data.internalNote || undefined,
        });
        toast(
          appEnv.adminDemoMode
            ? "Clarification response recorded (session-only)"
            : "Clarification response recorded",
        );
        onOpenChange(false);
      }}
    >
      <Field label="Response text" required error={errors["response"]} htmlFor="clrr-r">
        <textarea
          id="clrr-r"
          rows={3}
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          className={textareaCls}
        />
      </Field>
      {!isCanonicalProductionMode ? (
        <>
          <Field label="Fields updated">
            <div className="flex flex-wrap gap-1.5">
              {detail.claim.fields.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() =>
                    setUpdated((prev) =>
                      prev.includes(f.key) ? prev.filter((x) => x !== f.key) : [...prev, f.key],
                    )
                  }
                  className={updated.includes(f.key) ? chipSelectedCls : chipCls}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </Field>
          <label className="mt-1 flex items-center gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              checked={evidenceAdded}
              onChange={(e) => setEvidenceAdded(e.target.checked)}
            />
            Additional evidence was added
          </label>
          <Field label="Internal note" htmlFor="clrr-note">
            <textarea
              id="clrr-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={textareaCls}
            />
          </Field>
        </>
      ) : null}
    </WorkflowActionDialog>
  );
}

export function ReturnToVerifierDialog({
  open,
  onOpenChange,
  workflow,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  workflow: UseVerificationWorkflowResult;
}) {
  const eligibility = workflow.getEligibility("return_to_verifier");
  const [decisionSummary, setDecisionSummary] = useState("");

  function reset() {
    setDecisionSummary("");
  }

  return (
    <WorkflowActionDialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
      title="Return to Verifier"
      consequenceSummary="Moves the case back to the verifier for follow-up instead of finalizing a career outcome."
      eligibility={eligibility}
      submitLabel="Return to verifier"
      onSubmit={async () => {
        if (!decisionSummary.trim()) return;
        await workflow.submitReturnToVerifier({ decisionSummary: decisionSummary.trim() });
        toast.success("Returned to verifier");
        onOpenChange(false);
        reset();
      }}
    >
      <Field label="Reviewer summary" htmlFor="return-summary" required>
        <textarea
          id="return-summary"
          rows={4}
          value={decisionSummary}
          onChange={(e) => setDecisionSummary(e.target.value)}
          className={textareaCls}
          maxLength={5000}
          placeholder="Explain what needs follow-up from the verifier."
        />
      </Field>
    </WorkflowActionDialog>
  );
}

export function CancelDialog({
  open,
  onOpenChange,
  workflow,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  workflow: UseVerificationWorkflowResult;
}) {
  const eligibility = workflow.getEligibility("cancel");
  const [decisionSummary, setDecisionSummary] = useState("");

  function reset() {
    setDecisionSummary("");
  }

  return (
    <WorkflowActionDialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
      title="Cancel Verification Request"
      consequenceSummary="Cancels the verification request without marking the underlying career record as verified."
      eligibility={eligibility}
      submitLabel="Cancel request"
      onSubmit={async () => {
        if (!decisionSummary.trim()) return;
        await workflow.submitCancel({ decisionSummary: decisionSummary.trim() });
        toast.success("Verification request cancelled");
        onOpenChange(false);
        reset();
      }}
    >
      <Field label="Cancellation summary" htmlFor="cancel-summary" required>
        <textarea
          id="cancel-summary"
          rows={4}
          value={decisionSummary}
          onChange={(e) => setDecisionSummary(e.target.value)}
          className={textareaCls}
          maxLength={5000}
          placeholder="Record why this request is being cancelled."
        />
      </Field>
    </WorkflowActionDialog>
  );
}
