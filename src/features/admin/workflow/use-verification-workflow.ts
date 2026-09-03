/**
 * useVerificationWorkflow — session-only state for a single case workspace.
 *
 * All changes are scoped to this hook instance. The deterministic mock
 * objects imported from `case-details.ts` are never mutated. Reloading
 * or navigating away discards the state.
 */
import { useCallback, useMemo, useState } from "react";
import type {
  CaseTimelineEvent,
  InternalNote,
  NoteCategory,
  VerificationCaseDetail,
} from "../runtime/verification-review";
import type { Priority, VerificationStatus } from "../data/types";
import type { Assignee } from "../runtime/verification-review";
import {
  buildWorkflowCaseState,
  evaluateWorkflowEligibility,
  isTerminalStatus,
} from "./eligibility";
import type {
  ClarificationRequestPayload,
  ClarificationResponsePayload,
  CorrectionActionPayload,
  DirectConfirmationActionPayload,
  OutreachActionPayload,
  RejectActionPayload,
  SimpleDecisionPayload,
  SessionClarificationRecord,
  SessionCommunicationRecord,
  SessionCorrectionRecord,
  SessionDecisionRecord,
  UnableActionPayload,
  VerifyActionPayload,
  WorkflowAction,
  WorkflowActor,
  WorkflowEligibilityResult,
} from "./types";
import {
  CORRECTION_REASON_LABEL,
  HIGH_RISK_REJECTION_REASONS,
  REJECTION_REASON_LABEL,
  UNABLE_REASON_LABEL,
  VERIFICATION_BASIS_LABEL,
} from "./types";

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface UseVerificationWorkflowResult {
  currentStatus: VerificationStatus;
  isTerminal: boolean;
  assignedReviewer: Assignee;
  priority: Priority;
  notes: InternalNote[];
  extraTimelineEvents: CaseTimelineEvent[];
  sessionCorrections: SessionCorrectionRecord[];
  sessionCommunications: SessionCommunicationRecord[];
  sessionClarifications: SessionClarificationRecord[];
  sessionDecision: SessionDecisionRecord | null;
  acknowledgedFlagIds: Set<string>;
  selectedSuggestionId: string | null;
  hasSessionChanges: boolean;
  nextExpectedAction: string;
  // eligibility
  getEligibility: (
    action: WorkflowAction,
    opts?: { rejectionIsHighRisk?: boolean },
  ) => WorkflowEligibilityResult;
  // primitive setters
  setAssignedReviewer: (v: Assignee) => void | Promise<void>;
  setPriority: (v: Priority) => void | Promise<void>;
  addNote: (body: string, category: NoteCategory) => void | Promise<void>;
  acknowledgeFlag: (flagId: string, label: string) => void;
  selectSuggestion: (id: string | null, name?: string) => void;
  // workflow actions
  submitCorrection: (p: CorrectionActionPayload) => void | Promise<void>;
  submitOutreach: (p: OutreachActionPayload, contactName: string) => void | Promise<void>;
  submitDirectConfirmation: (p: DirectConfirmationActionPayload) => void | Promise<void>;
  submitVerify: (p: VerifyActionPayload) => void | Promise<void>;
  submitReject: (p: RejectActionPayload) => void | Promise<void>;
  submitUnable: (p: UnableActionPayload) => void | Promise<void>;
  submitCancel: (p: SimpleDecisionPayload) => void | Promise<void>;
  submitReturnToVerifier: (p: SimpleDecisionPayload) => void | Promise<void>;
  submitClarificationRequest: (p: ClarificationRequestPayload) => void | Promise<void>;
  submitClarificationResponse: (p: ClarificationResponsePayload) => void | Promise<void>;
}

const NEXT_ACTION_BY_STATUS: Partial<Record<VerificationStatus, string>> = {
  pending_admin_review: "Admin must review evidence before dispatch.",
  awaiting_subject_corrections: "Candidate must resubmit information.",
  pending_admin_re_review: "Admin must review the corrected submission.",
  approved_for_organization_verification: "Request is approved for dispatch.",
  pending_organization_resolution: "Organization match must be resolved.",
  pending_organization_acceptance: "Verifier has not accepted the request yet.",
  in_progress: "Verifier response is pending.",
  awaiting_information: "Clarification response is pending.",
  pending_admin_quality_review: "Admin must complete final quality review.",
  verified: "Case is complete.",
  rejected: "Case is complete.",
  unable_to_verify: "Case is complete.",
  cancelled: "Case is complete.",
  expired: "Case is complete.",
};

export function useVerificationWorkflow(
  detail: VerificationCaseDetail,
  actor: WorkflowActor,
): UseVerificationWorkflowResult {
  const [currentStatus, setCurrentStatus] = useState<VerificationStatus>(detail.summary.status);
  const [assignedReviewer, setAssignedReviewer] = useState<Assignee>(
    detail.summary.assignedReviewer,
  );
  const [priority, setPriority] = useState<Priority>(detail.summary.priority);
  const [notes, setNotes] = useState<InternalNote[]>(detail.notes);
  const [extraEvents, setExtraEvents] = useState<CaseTimelineEvent[]>([]);
  const [acknowledgedFlagIds, setAcknowledgedFlagIds] = useState<Set<string>>(new Set());
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [sessionCorrections, setSessionCorrections] = useState<SessionCorrectionRecord[]>([]);
  const [sessionCommunications, setSessionCommunications] = useState<SessionCommunicationRecord[]>(
    [],
  );
  const [sessionClarifications, setSessionClarifications] = useState<SessionClarificationRecord[]>(
    [],
  );
  const [sessionDecision, setSessionDecision] = useState<SessionDecisionRecord | null>(null);
  const [hasResolvedCorrection, setHasResolvedCorrection] = useState(false);

  const appendEvent = useCallback((ev: Omit<CaseTimelineEvent, "id" | "at" | "sessionOnly">) => {
    setExtraEvents((prev) => [
      ...prev,
      { ...ev, id: uid("session"), at: new Date().toISOString(), sessionOnly: true },
    ]);
  }, []);

  const getEligibility = useCallback(
    (
      action: WorkflowAction,
      opts?: { rejectionIsHighRisk?: boolean },
    ): WorkflowEligibilityResult => {
      const state = buildWorkflowCaseState(detail, {
        currentStatus,
        acknowledgedFlagIds,
        hasOutstandingCorrectionOverride: hasResolvedCorrection ? false : undefined,
      });
      return evaluateWorkflowEligibility(detail, action, actor, state, opts);
    },
    [detail, currentStatus, acknowledgedFlagIds, hasResolvedCorrection, actor],
  );

  const addNote = useCallback(
    (body: string, category: NoteCategory) => {
      const n: InternalNote = {
        id: uid("note"),
        author: actor.name,
        role: actor.role,
        at: new Date().toISOString(),
        body,
        category,
        sessionOnly: true,
      };
      setNotes((prev) => [n, ...prev]);
      appendEvent({
        kind: "internal_note_added",
        actor: actor.name,
        actorSource: "admin",
        description: `Internal note added (${category.replace(/_/g, " ")}).`,
      });
    },
    [actor.name, actor.role, appendEvent],
  );

  const acknowledgeFlag = useCallback(
    (flagId: string, label: string) => {
      setAcknowledgedFlagIds((prev) => {
        if (prev.has(flagId)) return prev;
        const next = new Set(prev);
        next.add(flagId);
        return next;
      });
      appendEvent({
        kind: "attention_flag_acknowledged",
        actor: actor.name,
        actorSource: "admin",
        description: `Acknowledged: ${label}.`,
      });
    },
    [actor.name, appendEvent],
  );

  const selectSuggestion = useCallback(
    (id: string | null, name?: string) => {
      setSelectedSuggestionId(id);
      appendEvent({
        kind: "organization_match",
        actor: actor.name,
        actorSource: "admin",
        description: id
          ? `Suggested match selected for review: ${name ?? id}.`
          : "Cleared session-only suggested match.",
      });
    },
    [actor.name, appendEvent],
  );

  // --- Workflow action submitters ---

  const submitCorrection = useCallback(
    (p: CorrectionActionPayload) => {
      const previous = currentStatus;
      setCurrentStatus("awaiting_subject_corrections");
      setSessionCorrections((prev) => [
        ...prev,
        {
          id: uid("corr"),
          reasonLabels: p.reasons.map((r) => CORRECTION_REASON_LABEL[r]),
          affectedFieldKeys: p.affectedFieldKeys,
          requestedItems: p.requestedItems,
          candidateMessage: p.candidateMessage,
          actorName: actor.name,
          actorRole: actor.role,
          at: new Date().toISOString(),
        },
      ]);
      appendEvent({
        kind: "correction_requested",
        actor: actor.name,
        actorSource: "admin",
        description: `Correction requested (${p.reasons
          .map((r) => CORRECTION_REASON_LABEL[r])
          .join(", ")}). Previous status: ${previous.replace(/_/g, " ")}.`,
      });
      if (p.internalNote) addNote(p.internalNote, "general");
    },
    [actor.name, actor.role, addNote, appendEvent, currentStatus],
  );

  const submitOutreach = useCallback(
    (p: OutreachActionPayload, contactName: string) => {
      const previous = currentStatus;
      setCurrentStatus("approved_for_organization_verification");
      setSessionCommunications((prev) => [
        ...prev,
        {
          id: uid("comm"),
          channel: p.channel,
          template: "employer_verification_request_v3",
          recipientDisplay: contactName,
          state: "prepared",
          at: new Date().toISOString(),
          actorName: actor.name,
        },
      ]);
      appendEvent({
        kind: "outreach_event",
        actor: actor.name,
        actorSource: "admin",
        description: `Outreach approved to ${contactName} (email). No email sent in this session. Previous status: ${previous.replace(/_/g, " ")}.`,
      });
      if (p.internalNote) addNote(p.internalNote, "contact");
    },
    [actor.name, addNote, appendEvent, currentStatus],
  );

  const submitVerify = useCallback(
    (p: VerifyActionPayload) => {
      const previous = currentStatus;
      setCurrentStatus("verified");
      setSessionDecision({
        id: uid("dec"),
        kind: "verify",
        reasonLabel: "Verified",
        basisLabel: VERIFICATION_BASIS_LABEL[p.basis],
        decisionSummary: p.decisionSummary,
        fieldConfirmations: p.fieldConfirmations,
        actorName: actor.name,
        actorRole: actor.role,
        at: new Date().toISOString(),
      });
      appendEvent({
        kind: "decision_prepared",
        actor: actor.name,
        actorSource: "admin",
        description: `Verified on basis: ${VERIFICATION_BASIS_LABEL[p.basis]}. Previous status: ${previous.replace(/_/g, " ")}.`,
      });
      if (p.internalNote) addNote(p.internalNote, "decision_preparation");
    },
    [actor.name, actor.role, addNote, appendEvent, currentStatus],
  );

  const submitDirectConfirmation = useCallback(
    (p: DirectConfirmationActionPayload) => {
      const previous = currentStatus;
      setCurrentStatus("verified");
      setSessionDecision({
        id: uid("dec"),
        kind: "verify",
        reasonLabel: "Verified via direct confirmation",
        basisLabel: p.confirmationMethod.replace(/_/g, " "),
        decisionSummary: p.internalNote,
        actorName: actor.name,
        actorRole: actor.role,
        at: new Date().toISOString(),
      });
      appendEvent({
        kind: "decision_prepared",
        actor: actor.name,
        actorSource: "admin",
        description: `Verified via direct confirmation (${p.confirmationMethod.replace(/_/g, " ")}) with ${p.confirmedBy}. Previous status: ${previous.replace(/_/g, " ")}.`,
      });
    },
    [actor.name, actor.role, appendEvent, currentStatus],
  );

  const submitReject = useCallback(
    (p: RejectActionPayload) => {
      const previous = currentStatus;
      setCurrentStatus("rejected");
      setSessionDecision({
        id: uid("dec"),
        kind: "reject",
        reasonLabel: REJECTION_REASON_LABEL[p.reason],
        decisionSummary: p.decisionSummary,
        candidateMessage: p.candidateMessage,
        actorName: actor.name,
        actorRole: actor.role,
        at: new Date().toISOString(),
      });
      appendEvent({
        kind: "decision_prepared",
        actor: actor.name,
        actorSource: "admin",
        description: `Rejected — ${REJECTION_REASON_LABEL[p.reason]}. Candidate communication prepared. Previous status: ${previous.replace(/_/g, " ")}.`,
      });
      if (p.internalNote) addNote(p.internalNote, "decision_preparation");
      void HIGH_RISK_REJECTION_REASONS; // referenced for future audit hooks
    },
    [actor.name, actor.role, addNote, appendEvent, currentStatus],
  );

  const submitUnable = useCallback(
    (p: UnableActionPayload) => {
      const previous = currentStatus;
      setCurrentStatus("unable_to_verify");
      setSessionDecision({
        id: uid("dec"),
        kind: "unable_to_verify",
        reasonLabel: UNABLE_REASON_LABEL[p.reason],
        decisionSummary: p.attemptsSummary,
        candidateMessage: p.candidateMessage,
        actorName: actor.name,
        actorRole: actor.role,
        at: new Date().toISOString(),
      });
      appendEvent({
        kind: "decision_prepared",
        actor: actor.name,
        actorSource: "admin",
        description: `Unable to Verify — ${UNABLE_REASON_LABEL[p.reason]}. Previous status: ${previous.replace(/_/g, " ")}.`,
      });
      if (p.internalNote) addNote(p.internalNote, "decision_preparation");
    },
    [actor.name, actor.role, addNote, appendEvent, currentStatus],
  );

  const submitClarificationRequest = useCallback(
    (p: ClarificationRequestPayload) => {
      setCurrentStatus("awaiting_information");
      setSessionClarifications((prev) => [
        ...prev,
        {
          id: uid("clar"),
          kind: "employer_request",
          question: p.question,
          affectedFieldKeys: p.affectedFieldKeys,
          at: new Date().toISOString(),
          actorName: actor.name,
        },
      ]);
      appendEvent({
        kind: "employer_response",
        actor: actor.name,
        actorSource: "admin",
        description: `Recorded employer clarification request: ${p.question}`,
      });
      if (p.internalNote) addNote(p.internalNote, "general");
    },
    [actor.name, addNote, appendEvent],
  );

  const submitClarificationResponse = useCallback(
    (p: ClarificationResponsePayload) => {
      setCurrentStatus("in_progress");
      setHasResolvedCorrection(true);
      setSessionClarifications((prev) => [
        ...prev,
        {
          id: uid("clar"),
          kind: "candidate_response",
          response: p.response,
          affectedFieldKeys: [],
          updatedFieldKeys: p.updatedFieldKeys,
          evidenceAdded: p.evidenceAdded,
          at: new Date().toISOString(),
          actorName: actor.name,
        },
      ]);
      appendEvent({
        kind: "candidate_resubmitted",
        actor: actor.name,
        actorSource: "admin",
        description: `Recorded candidate clarification response.`,
      });
      if (p.internalNote) addNote(p.internalNote, "general");
    },
    [actor.name, addNote, appendEvent],
  );

  const submitCancel = useCallback(
    (p: SimpleDecisionPayload) => {
      setCurrentStatus("cancelled");
      appendEvent({
        kind: "decision_prepared",
        actor: actor.name,
        actorSource: "admin",
        description: "Case cancelled in this session.",
      });
      if (p.internalNote) addNote(p.internalNote, "decision_preparation");
    },
    [actor.name, addNote, appendEvent],
  );

  const submitReturnToVerifier = useCallback(
    (p: SimpleDecisionPayload) => {
      setCurrentStatus("in_progress");
      appendEvent({
        kind: "employer_response",
        actor: actor.name,
        actorSource: "admin",
        description: "Returned to verifier for follow-up.",
      });
      if (p.internalNote) addNote(p.internalNote, "decision_preparation");
    },
    [actor.name, addNote, appendEvent],
  );

  const hasSessionChanges =
    extraEvents.length > 0 ||
    sessionCorrections.length > 0 ||
    sessionCommunications.length > 0 ||
    sessionClarifications.length > 0 ||
    sessionDecision !== null ||
    acknowledgedFlagIds.size > 0 ||
    selectedSuggestionId !== null ||
    assignedReviewer !== detail.summary.assignedReviewer ||
    priority !== detail.summary.priority ||
    currentStatus !== detail.summary.status;

  const nextExpectedAction = useMemo(() => {
    if (currentStatus !== detail.summary.status) {
      return NEXT_ACTION_BY_STATUS[currentStatus] ?? "Awaiting next action.";
    }
    return detail.statusMeta.nextExpectedAction;
  }, [currentStatus, detail.statusMeta.nextExpectedAction, detail.summary.status]);

  return {
    currentStatus,
    isTerminal: isTerminalStatus(currentStatus),
    assignedReviewer,
    priority,
    notes,
    extraTimelineEvents: extraEvents,
    sessionCorrections,
    sessionCommunications,
    sessionClarifications,
    sessionDecision,
    acknowledgedFlagIds,
    selectedSuggestionId,
    hasSessionChanges,
    nextExpectedAction,
    getEligibility,
    setAssignedReviewer: (v) => {
      setAssignedReviewer(v);
      appendEvent({
        kind: "assignment_changed",
        actor: actor.name,
        actorSource: "admin",
        description: `Assigned to ${v}.`,
      });
    },
    setPriority: (v) => {
      setPriority(v);
      appendEvent({
        kind: "priority_changed",
        actor: actor.name,
        actorSource: "admin",
        description: `Priority set to ${v}.`,
      });
    },
    addNote,
    acknowledgeFlag,
    selectSuggestion,
    submitCorrection,
    submitOutreach,
    submitDirectConfirmation,
    submitVerify,
    submitReject,
    submitUnable,
    submitCancel,
    submitReturnToVerifier,
    submitClarificationRequest,
    submitClarificationResponse,
  };
}
