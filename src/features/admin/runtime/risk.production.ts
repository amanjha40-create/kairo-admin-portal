import type {
  DocumentAnomaly,
  Investigation,
  InvestigationEventKind,
  InvestigationStatus,
  NoteCategory,
  RecommendedActionKind,
  RiskCategory,
  RiskLevel,
  RiskMetrics,
  SubjectKind,
} from "@/features/admin/mock-data/risk";

export const ALL_INVESTIGATORS: string[] = [];
export const DOCUMENT_ANOMALY_LABEL = {} as Record<DocumentAnomaly["kind"], string>;
export const EVENT_KIND_LABEL = {} as Record<InvestigationEventKind, string>;
export const INVESTIGATION_STATUS_LABEL = {} as Record<InvestigationStatus, string>;
export const NOTE_CATEGORY_LABEL = {} as Record<NoteCategory, string>;
export const RESOLVED_STATUSES: InvestigationStatus[] = [];
export const RECOMMENDED_ACTION_LABEL = {} as Record<RecommendedActionKind, string>;
export const RISK_CATEGORY_LABEL = {} as Record<RiskCategory, string>;
export const RISK_LEVEL_LABEL = {} as Record<RiskLevel, string>;
export const SIGNAL_CONFIDENCE_LABEL = {} as Record<string, string>;
export const SIGNAL_SEVERITY_LABEL = {} as Record<string, string>;
export const SIGNAL_SOURCE_LABEL = {} as Record<string, string>;
export const SIGNAL_STATUS_LABEL = {} as Record<string, string>;
export const SUBJECT_KIND_LABEL = {} as Record<SubjectKind, string>;
export const mockInvestigations: Investigation[] = [];

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

export function getInvestigationById(_: string): Investigation | undefined {
  return undefined;
}

export function getMetrics(): RiskMetrics {
  return EMPTY_RISK_METRICS;
}

export const getInvestigation = (_: string): Investigation | undefined => undefined;
export const getRiskMetrics = () => EMPTY_RISK_METRICS;
