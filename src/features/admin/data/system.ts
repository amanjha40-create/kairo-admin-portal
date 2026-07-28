import { queryOptions } from "@tanstack/react-query";
import { DEMO_MODE_BUILD_ENABLED } from "@/features/admin/controlled-pilot";
import type {
  AlertRecord,
  AlertStatus,
  AuditEvent,
  BackgroundJob,
  ConfigEntry,
  Deployment,
  FeatureFlag,
  FlagState,
  JobStatus,
  JobType,
  MessageChannel,
  MessageKind,
  MessageLog,
  MessageStatus,
  PlatformService,
  ServiceHealthState,
  SystemOverviewMetrics,
} from "@/features/admin/mock-data/system";

type DemoSystemModule = typeof import("@/features/admin/mock-data/system");

const demoSystemModule: DemoSystemModule | null = DEMO_MODE_BUILD_ENABLED
  ? await import("@/features/admin/mock-data/system")
  : null;

export const ALERT_KIND_LABEL =
  demoSystemModule?.ALERT_KIND_LABEL ?? ({} as Record<string, string>);
export const ALERT_SEVERITY_LABEL =
  demoSystemModule?.ALERT_SEVERITY_LABEL ?? ({} as Record<string, string>);
export const ALERT_STATUS_LABEL =
  demoSystemModule?.ALERT_STATUS_LABEL ?? ({} as Record<AlertStatus, string>);
export const AUDIT_RESOURCE_LABEL =
  demoSystemModule?.AUDIT_RESOURCE_LABEL ?? ({} as Record<string, string>);
export const FLAG_STATE_LABEL =
  demoSystemModule?.FLAG_STATE_LABEL ?? ({} as Record<FlagState, string>);
export const JOB_STATUS_LABEL =
  demoSystemModule?.JOB_STATUS_LABEL ?? ({} as Record<JobStatus, string>);
export const JOB_TYPE_LABEL = demoSystemModule?.JOB_TYPE_LABEL ?? ({} as Record<JobType, string>);
export const MESSAGE_KIND_LABEL =
  demoSystemModule?.MESSAGE_KIND_LABEL ?? ({} as Record<MessageKind, string>);
export const MESSAGE_STATUS_LABEL =
  demoSystemModule?.MESSAGE_STATUS_LABEL ?? ({} as Record<MessageStatus, string>);
export const SERVICE_HEALTH_LABEL =
  demoSystemModule?.SERVICE_HEALTH_LABEL ?? ({} as Record<ServiceHealthState, string>);
export const mockAlerts = demoSystemModule?.mockAlerts ?? [];
export const mockAuditEvents = demoSystemModule?.mockAuditEvents ?? [];
export const mockBackgroundJobs = demoSystemModule?.mockBackgroundJobs ?? [];
export const mockConfigReference = demoSystemModule?.mockConfigReference ?? [];
export const mockDeployments = demoSystemModule?.mockDeployments ?? [];
export const mockFeatureFlags = demoSystemModule?.mockFeatureFlags ?? [];
export const mockMessageLogs = demoSystemModule?.mockMessageLogs ?? [];
export const mockPlatformServices = demoSystemModule?.mockPlatformServices ?? [];

export type {
  AlertRecord,
  AlertStatus,
  AuditEvent,
  BackgroundJob,
  ConfigEntry,
  Deployment,
  FeatureFlag,
  FlagState,
  JobStatus,
  JobType,
  MessageChannel,
  MessageKind,
  MessageLog,
  MessageStatus,
  PlatformService,
  ServiceHealthState,
  SystemOverviewMetrics,
};

export const systemKeys = {
  all: () => ["admin", "system"] as const,
  overview: () => [...systemKeys.all(), "overview"] as const,
};

const EMPTY_SYSTEM_OVERVIEW: SystemOverviewMetrics = {
  api: "operational",
  database: "operational",
  redis: "operational",
  documentStorage: "operational",
  emailDelivery: "operational",
  smsDelivery: "operational",
  backgroundJobs: "operational",
  failedJobs: 0,
  openAlerts: 0,
  pendingJobs: 0,
  recentDeployments: 0,
  auditEvents24h: 0,
};

export const listServices = (): PlatformService[] => mockPlatformServices;
export const listJobs = (): BackgroundJob[] => mockBackgroundJobs;
export const getJob = (id: string): BackgroundJob | undefined => demoSystemModule?.getJobById(id);
export const listFlags = (): FeatureFlag[] => mockFeatureFlags;
export const listMessageLogs = (): MessageLog[] => mockMessageLogs;
export const listAuditEvents = (): AuditEvent[] => mockAuditEvents;
export const listAlerts = (): AlertRecord[] => mockAlerts;
export const listDeployments = (): Deployment[] => mockDeployments;
export const listConfigReference = (): ConfigEntry[] => mockConfigReference;
export const getOverviewMetrics = (): SystemOverviewMetrics =>
  demoSystemModule?.getSystemOverviewMetrics() ?? EMPTY_SYSTEM_OVERVIEW;

export const getJobById =
  demoSystemModule?.getJobById ?? ((_: string): BackgroundJob | undefined => undefined);
export const getSystemOverviewMetrics =
  demoSystemModule?.getSystemOverviewMetrics ?? (() => EMPTY_SYSTEM_OVERVIEW);

export function systemOverviewQueryOptions() {
  return queryOptions({
    queryKey: systemKeys.overview(),
    queryFn: async () => getOverviewMetrics(),
  });
}
