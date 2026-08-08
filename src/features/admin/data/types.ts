export type {
  AdminActivity,
  AdminActivityKind,
  AdminMetric,
  AttentionItem,
  FunnelStage,
  PlatformServiceState,
  PlatformServiceStatus,
} from "@/features/admin/mock-data/types";

export { parseDestination } from "@/features/admin/mock-data/types";

export type Priority = "low" | "normal" | "high" | "urgent";

export type VerificationStatus =
  | "draft"
  | "pending_subject_acceptance"
  | "accepted"
  | "pending_subject_submission"
  | "pending_admin_review"
  | "awaiting_subject_corrections"
  | "pending_admin_re_review"
  | "approved_for_organization_verification"
  | "pending_organization_resolution"
  | "pending_organization_acceptance"
  | "in_progress"
  | "awaiting_information"
  | "pending_admin_quality_review"
  | "verified"
  | "rejected"
  | "unable_to_verify"
  | "cancelled"
  | "expired";

export interface VerificationStatusSummary {
  status: VerificationStatus;
  label: string;
  count: number;
  oldestAgeHours?: number;
  periodDelta: number;
}
