import { queryOptions } from "@tanstack/react-query";
import { DEMO_MODE_BUILD_ENABLED } from "@/features/admin/controlled-pilot";
import type {
  DocumentAnomaly,
  DuplicateReview,
  Investigation,
  InvestigationEventKind,
  InvestigationNote,
  InvestigationStatus,
  InvestigationTimelineEvent,
  NoteCategory,
  RecommendedActionKind,
  RiskCategory,
  RiskLevel,
  RiskMetrics,
  RiskSignal,
  SubjectKind,
} from "@/features/admin/mock-data/risk";

type DemoRiskModule = typeof import("@/features/admin/mock-data/risk");

const DEMO_RISK_ENABLED =
  DEMO_MODE_BUILD_ENABLED ||
  (import.meta.env.MODE === "test" && import.meta.env.VITE_ADMIN_DEMO_MODE === "true");

const demoRiskModule: DemoRiskModule | null = DEMO_RISK_ENABLED
  ? await import("@/features/admin/mock-data/risk")
  : null;

export const ALL_INVESTIGATORS = demoRiskModule?.ALL_INVESTIGATORS ?? [];
export const DOCUMENT_ANOMALY_LABEL =
  demoRiskModule?.DOCUMENT_ANOMALY_LABEL ?? ({} as Record<DocumentAnomaly["kind"], string>);
export const EVENT_KIND_LABEL =
  demoRiskModule?.EVENT_KIND_LABEL ?? ({} as Record<InvestigationEventKind, string>);
export const INVESTIGATION_STATUS_LABEL =
  demoRiskModule?.INVESTIGATION_STATUS_LABEL ?? ({} as Record<InvestigationStatus, string>);
export const NOTE_CATEGORY_LABEL =
  demoRiskModule?.NOTE_CATEGORY_LABEL ?? ({} as Record<NoteCategory, string>);
export const RESOLVED_STATUSES = demoRiskModule?.RESOLVED_STATUSES ?? [];
export const RECOMMENDED_ACTION_LABEL =
  demoRiskModule?.RECOMMENDED_ACTION_LABEL ?? ({} as Record<RecommendedActionKind, string>);
export const RISK_CATEGORY_LABEL =
  demoRiskModule?.RISK_CATEGORY_LABEL ?? ({} as Record<RiskCategory, string>);
export const RISK_LEVEL_LABEL =
  demoRiskModule?.RISK_LEVEL_LABEL ?? ({} as Record<RiskLevel, string>);
export const SIGNAL_CONFIDENCE_LABEL =
  demoRiskModule?.SIGNAL_CONFIDENCE_LABEL ?? ({} as Record<string, string>);
export const SIGNAL_SEVERITY_LABEL =
  demoRiskModule?.SIGNAL_SEVERITY_LABEL ?? ({} as Record<string, string>);
export const SIGNAL_SOURCE_LABEL =
  demoRiskModule?.SIGNAL_SOURCE_LABEL ?? ({} as Record<string, string>);
export const SIGNAL_STATUS_LABEL =
  demoRiskModule?.SIGNAL_STATUS_LABEL ?? ({} as Record<string, string>);
export const SUBJECT_KIND_LABEL =
  demoRiskModule?.SUBJECT_KIND_LABEL ?? ({} as Record<SubjectKind, string>);
export const mockInvestigations = demoRiskModule?.mockInvestigations ?? [];

export type { Investigation, RiskMetrics };
export type {
  DocumentAnomaly,
  DuplicateReview,
  InvestigationEventKind,
  InvestigationNote,
  InvestigationStatus,
  InvestigationTimelineEvent,
  NoteCategory,
  RecommendedActionKind,
  RiskCategory,
  RiskLevel,
  RiskSignal,
  SubjectKind,
};

export const riskKeys = {
  all: () => ["admin", "risk"] as const,
  list: () => [...riskKeys.all(), "list"] as const,
  detail: (id: string) => [...riskKeys.all(), "detail", id] as const,
};

const EMPTY_RISK_METRICS: RiskMetrics = {
  open: 0,
  highRiskUsers: 0,
  duplicateCandidates: 0,
  documentAnomalies: 0,
  suspiciousLogins: 0,
  pendingTsReview: 0,
  recentlyResolved: 0,
  escalated: 0,
};

export function listInvestigations(): Investigation[] {
  return mockInvestigations;
}

export function getInvestigationById(id: string): Investigation | undefined {
  return demoRiskModule?.getInvestigation(id);
}

export function getMetrics(): RiskMetrics {
  return demoRiskModule?.getRiskMetrics() ?? EMPTY_RISK_METRICS;
}

export const getInvestigation =
  demoRiskModule?.getInvestigation ?? ((_: string): Investigation | undefined => undefined);
export const getRiskMetrics = demoRiskModule?.getRiskMetrics ?? (() => EMPTY_RISK_METRICS);

export function riskListQueryOptions() {
  return queryOptions({
    queryKey: riskKeys.list(),
    queryFn: async () => listInvestigations(),
  });
}
