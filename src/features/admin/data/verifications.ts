import { queryOptions } from "@tanstack/react-query";
import { DEMO_MODE_BUILD_ENABLED } from "@/features/admin/controlled-pilot";
import type {
  Assignee,
  AttentionFlag,
  OrganizationStatus,
  SlaState,
  VerificationCase,
  VerificationType,
} from "@/features/admin/mock-data/verification-cases";

type DemoVerificationsModule = typeof import("@/features/admin/mock-data/verification-cases");

const demoVerificationsModule: DemoVerificationsModule | null = DEMO_MODE_BUILD_ENABLED
  ? await import("@/features/admin/mock-data/verification-cases")
  : null;

export const ALL_ASSIGNEES = demoVerificationsModule?.ALL_ASSIGNEES ?? [];
export const ATTENTION_FLAG_LABEL =
  demoVerificationsModule?.ATTENTION_FLAG_LABEL ?? ({} as Record<AttentionFlag, string>);
export const COMPLETED_STATUSES = demoVerificationsModule?.COMPLETED_STATUSES ?? [];
export const ORGANIZATION_STATUS_LABEL =
  demoVerificationsModule?.ORGANIZATION_STATUS_LABEL ?? ({} as Record<OrganizationStatus, string>);
export const SLA_LABEL = demoVerificationsModule?.SLA_LABEL ?? ({} as Record<SlaState, string>);
export const VERIFICATION_TYPE_LABEL =
  demoVerificationsModule?.VERIFICATION_TYPE_LABEL ?? ({} as Record<VerificationType, string>);
export const mockVerificationCases = demoVerificationsModule?.mockVerificationCases ?? [];

export type {
  Assignee,
  AttentionFlag,
  OrganizationStatus,
  SlaState,
  VerificationCase,
  VerificationType,
};

export const verificationKeys = {
  all: () => ["admin", "verifications"] as const,
  list: () => [...verificationKeys.all(), "list"] as const,
  detail: (caseId: string) => [...verificationKeys.all(), "detail", caseId] as const,
};

export function listCases(): VerificationCase[] {
  return mockVerificationCases;
}

export function getCaseById(caseId: string): VerificationCase | undefined {
  return mockVerificationCases.find((caseRecord) => caseRecord.id === caseId);
}

export function getCaseByReference(reference: string): VerificationCase | undefined {
  return mockVerificationCases.find((caseRecord) => caseRecord.reference === reference);
}

export function verificationListQueryOptions() {
  return queryOptions({
    queryKey: verificationKeys.list(),
    queryFn: async () => listCases(),
  });
}
