import { appEnv, type AppEnvConfig } from "@/config/env";
import type { ProductionAdminApiOptions } from "./admin-api";
import { createAdminAuthenticatedApi } from "./admin-api";

export type ManagerReferenceStatus =
  | "not_started"
  | "awaiting_hr_validation"
  | "ready_to_invite"
  | "invitation_sent"
  | "opened"
  | "completed"
  | "declined"
  | "expired"
  | "needs_review";

export interface EmploymentReferenceSummary {
  status: string;
  completedAt: string | null;
}

export interface ManagerReferenceSummary extends EmploymentReferenceSummary {
  status: ManagerReferenceStatus;
  nominationId: string | null;
  relationshipConfirmedByHr: boolean;
  invitationSentAt: string | null;
  invitationExpiresAt: string | null;
  invitationBlockedReason:
    "awaiting_hr_validation" | "employment_not_verified" | "email_required" | null;
}

export interface ManagerReferenceInvitation {
  deliveryStatus: string;
  sentAt: string | null;
  openedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  respondedAt: string | null;
}

export interface EmploymentReferencesOverview {
  employmentId: string;
  completedCount: number;
  totalCount: number;
  hrReference: EmploymentReferenceSummary;
  reportingManager: ManagerReferenceSummary;
  managerContactProvenance: string | null;
  invitation: ManagerReferenceInvitation | null;
}

export interface ManagerReferenceInviteResult {
  deliveryStatus: string;
  sentAt: string | null;
  expiresAt: string | null;
  idempotent: boolean;
}

interface BackendReferenceSummary {
  status: string;
  completed_at: string | null;
}

interface BackendManagerReferenceSummary extends BackendReferenceSummary {
  status: ManagerReferenceStatus;
  nomination_id: string | null;
  relationship_confirmed_by_hr: boolean;
  invitation_sent_at: string | null;
  invitation_expires_at: string | null;
  invitation_blocked_reason:
    "awaiting_hr_validation" | "employment_not_verified" | "email_required" | null;
}

interface BackendEmploymentReferencesSummary {
  employment_id: string;
  completed_count: number;
  total_count: number;
  hr_reference: BackendReferenceSummary;
  reporting_manager: BackendManagerReferenceSummary;
}

interface BackendReferenceReportItem {
  kind: string;
  contact_provenance?: string | null;
  invitation?: {
    delivery_status: string;
    sent_at: string | null;
    opened_at: string | null;
    expires_at: string | null;
    revoked_at: string | null;
    responded_at: string | null;
  } | null;
}

interface BackendEmploymentReferencesReport {
  summary: BackendEmploymentReferencesSummary;
  references: BackendReferenceReportItem[];
}

interface BackendManagerReferenceInviteResult {
  delivery_status: string;
  sent_at: string | null;
  expires_at: string | null;
  idempotent: boolean;
}

export interface AdminEmploymentReferencesAdapter {
  getOverview: (employmentId: string) => Promise<EmploymentReferencesOverview>;
  sendManagerInvitation: (
    employmentId: string,
    payload: { nominationId: string; idempotencyKey: string },
  ) => Promise<ManagerReferenceInviteResult>;
}

export interface CreateAdminEmploymentReferencesAdapterOptions {
  production?: ProductionAdminApiOptions;
}

export const employmentReferencesKeys = {
  overview: (employmentId: string) => ["admin", "employment-references", employmentId] as const,
};

export function createAdminEmploymentReferencesAdapter(
  config: AppEnvConfig = appEnv,
  options: CreateAdminEmploymentReferencesAdapterOptions = {},
): AdminEmploymentReferencesAdapter {
  const api = createAdminAuthenticatedApi(config, options.production);

  return {
    async getOverview(employmentId) {
      const response = await api.request<BackendEmploymentReferencesReport>(
        `/api/v1/admin/employments/${employmentId}/references`,
      );
      if (response.summary.employment_id !== employmentId) {
        throw new Error("Employment reference response did not match the requested record.");
      }

      const managerReference = response.references.find(
        (reference) => reference.kind === "reporting_manager_reference",
      );
      const invitation = managerReference?.invitation;

      return {
        employmentId: response.summary.employment_id,
        completedCount: response.summary.completed_count,
        totalCount: response.summary.total_count,
        hrReference: {
          status: response.summary.hr_reference.status,
          completedAt: response.summary.hr_reference.completed_at,
        },
        reportingManager: {
          status: response.summary.reporting_manager.status,
          nominationId: response.summary.reporting_manager.nomination_id,
          relationshipConfirmedByHr:
            response.summary.reporting_manager.relationship_confirmed_by_hr,
          completedAt: response.summary.reporting_manager.completed_at,
          invitationSentAt: response.summary.reporting_manager.invitation_sent_at,
          invitationExpiresAt: response.summary.reporting_manager.invitation_expires_at,
          invitationBlockedReason: response.summary.reporting_manager.invitation_blocked_reason,
        },
        managerContactProvenance: managerReference?.contact_provenance ?? null,
        invitation: invitation
          ? {
              deliveryStatus: invitation.delivery_status,
              sentAt: invitation.sent_at,
              openedAt: invitation.opened_at,
              expiresAt: invitation.expires_at,
              revokedAt: invitation.revoked_at,
              respondedAt: invitation.responded_at,
            }
          : null,
      };
    },

    async sendManagerInvitation(employmentId, payload) {
      const response = await api.request<BackendManagerReferenceInviteResult>(
        `/api/v1/admin/employments/${employmentId}/references/reporting-manager/invite`,
        {
          method: "POST",
          body: {
            nomination_id: payload.nominationId,
            idempotency_key: payload.idempotencyKey,
          },
        },
      );

      return {
        deliveryStatus: response.delivery_status,
        sentAt: response.sent_at,
        expiresAt: response.expires_at,
        idempotent: response.idempotent,
      };
    },
  };
}
