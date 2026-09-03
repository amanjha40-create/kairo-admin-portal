import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { mapVerificationActionError } from "./action-errors";

function conflict(message: string) {
  return new ApiError({
    code: "conflict",
    message: "This request conflicts with the current state of the resource.",
    status: 409,
    requestId: "request-1",
    details: { error: { code: "conflict", message } },
  });
}

describe("verification action errors", () => {
  it("maps missing authoritative consent to actionable dispatch copy", () => {
    const error = mapVerificationActionError(
      "approve_outreach",
      conflict("Verification request is missing authoritative candidate consent metadata"),
    );

    expect(error).toMatchObject({
      message:
        "Authoritative candidate consent is missing. Ask the candidate to resubmit the request with consented fields or evidence before approving for dispatch.",
      status: 409,
      requestId: "request-1",
    });
  });

  it.each([
    "Employment verification requires a verification contact",
    "Verification contact must be approved before approving the request",
  ])("maps the backend contact conflict to actionable dispatch copy", (message) => {
    expect(mapVerificationActionError("approve_outreach", conflict(message))).toMatchObject({
      message: "Approve the current verifier contact before dispatching this request.",
      status: 409,
    });
  });

  it("maps stale workflow state to refresh guidance", () => {
    expect(
      mapVerificationActionError(
        "approve_outreach",
        conflict("Verification request is not awaiting admin review"),
      ),
    ).toMatchObject({
      message:
        "This case is no longer eligible for pre-dispatch approval. Refresh the case to review its current workflow state.",
    });
  });

  it("preserves unknown conflicts and non-dispatch errors", () => {
    const unknownConflict = conflict("A new backend conflict");
    const networkError = new ApiError({ code: "network", message: "Offline" });

    expect(mapVerificationActionError("approve_outreach", unknownConflict)).toBe(unknownConflict);
    expect(mapVerificationActionError("reject", networkError)).toBe(networkError);
  });
});
