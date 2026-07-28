import type {
  Assignee,
  AttentionFlag,
  OrganizationStatus,
  SlaState,
  VerificationCase,
  VerificationType,
} from "@/features/admin/mock-data/verification-cases";

export const ALL_ASSIGNEES: Assignee[] = [];
export const ATTENTION_FLAG_LABEL = {} as Record<AttentionFlag, string>;
export const COMPLETED_STATUSES = [] as VerificationCase["status"][];
export const ORGANIZATION_STATUS_LABEL = {} as Record<OrganizationStatus, string>;
export const SLA_LABEL = {} as Record<SlaState, string>;
export const VERIFICATION_TYPE_LABEL = {} as Record<VerificationType, string>;
export const mockVerificationCases: VerificationCase[] = [];

export function listCases(): VerificationCase[] {
  return mockVerificationCases;
}

export function getCaseById(_: string): VerificationCase | undefined {
  return undefined;
}

export function getCaseByReference(_: string): VerificationCase | undefined {
  return undefined;
}
