import { ApiError } from "@/lib/api/errors";
import type { WorkflowAction } from "./types";

function getBackendMessage(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const error = "error" in details ? details.error : null;
  if (!error || typeof error !== "object" || !("message" in error)) return null;
  return typeof error.message === "string" ? error.message : null;
}

export function mapVerificationActionError(action: WorkflowAction, error: unknown): unknown {
  if (!(error instanceof ApiError) || error.code !== "conflict") return error;

  const backendMessage = getBackendMessage(error.details);
  let message: string | null = null;

  if (
    action === "approve_outreach" &&
    backendMessage === "Verification request is missing authoritative candidate consent metadata"
  ) {
    message =
      "Authoritative candidate consent is missing. Ask the candidate to resubmit the request with consented fields or evidence before approving for dispatch.";
  } else if (
    action === "approve_outreach" &&
    (backendMessage === "Employment verification requires a verification contact" ||
      backendMessage === "Verification contact must be approved before approving the request")
  ) {
    message = "Approve the current verifier contact before dispatching this request.";
  } else if (
    action === "approve_outreach" &&
    (backendMessage === "Verification request is not awaiting admin review" ||
      backendMessage === "Verification request is awaiting final quality review")
  ) {
    message =
      "This case is no longer eligible for pre-dispatch approval. Refresh the case to review its current workflow state.";
  }

  if (!message) return error;
  return new ApiError({
    code: error.code,
    message,
    status: error.status,
    requestId: error.requestId,
    details: error.details,
  });
}
