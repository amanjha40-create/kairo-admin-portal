import { describe, expect, it } from "vitest";
import type { EmploymentReferencesOverview } from "../data/employment-references";
import {
  evaluateManagerInvitationEligibility,
  sendAndConfirmManagerInvitation,
} from "./manager-reference-invitation";

const ready: EmploymentReferencesOverview = {
  employmentId: "employment-1",
  completedCount: 1,
  totalCount: 2,
  hrReference: { status: "completed", completedAt: "2026-10-11T08:00:00Z" },
  reportingManager: {
    status: "ready_to_invite",
    nominationId: "nomination-1",
    relationshipConfirmedByHr: true,
    completedAt: null,
    invitationSentAt: null,
    invitationExpiresAt: null,
    invitationBlockedReason: null,
  },
  managerContactProvenance: "hr_confirmed",
  invitation: null,
};

describe("manager reference invitation eligibility", () => {
  it("requires the backend-ready state and existing dispatch permission", () => {
    expect(
      evaluateManagerInvitationEligibility({
        references: ready,
        caseStatus: "verified",
        canonicalEmploymentStatus: "verified",
        permissions: ["verification.approve_outreach"],
      }),
    ).toEqual({ allowed: true, reason: null });
  });

  it("does not infer eligibility from frontend state when the backend blocks delivery", () => {
    expect(
      evaluateManagerInvitationEligibility({
        references: {
          ...ready,
          reportingManager: {
            ...ready.reportingManager,
            invitationBlockedReason: "email_required",
          },
        },
        caseStatus: "verified",
        canonicalEmploymentStatus: "verified",
        permissions: ["verification.approve_outreach"],
      }),
    ).toEqual({
      allowed: false,
      reason: "An employer-confirmed manager email is required before sending.",
    });
  });

  it("reports success only after one send and an authoritative non-ready refetch", async () => {
    let sends = 0;
    let refreshes = 0;
    const confirmed = await sendAndConfirmManagerInvitation({
      send: async () => {
        sends += 1;
        return {
          deliveryStatus: "sent",
          sentAt: "2026-10-12T09:00:00Z",
          expiresAt: "2026-10-13T09:00:00Z",
          idempotent: false,
        };
      },
      refresh: async () => {
        refreshes += 1;
        return {
          ...ready,
          reportingManager: {
            ...ready.reportingManager,
            status: "invitation_sent",
            invitationSentAt: "2026-10-12T09:00:00Z",
          },
        };
      },
    });

    expect(sends).toBe(1);
    expect(refreshes).toBe(1);
    expect(confirmed.reportingManager.status).toBe("invitation_sent");
  });

  it("does not claim success when refreshed backend truth remains ready", async () => {
    await expect(
      sendAndConfirmManagerInvitation({
        send: async () => ({
          deliveryStatus: "failed",
          sentAt: null,
          expiresAt: null,
          idempotent: false,
        }),
        refresh: async () => ready,
      }),
    ).rejects.toThrow("could not be confirmed");
  });
});
