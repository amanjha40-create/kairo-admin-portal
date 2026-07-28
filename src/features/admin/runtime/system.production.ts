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
  MessageKind,
  MessageLog,
  MessageStatus,
  PlatformService,
  ServiceHealthState,
  SystemOverviewMetrics,
} from "@/features/admin/mock-data/system";

export const ALERT_KIND_LABEL = {} as Record<string, string>;
export const ALERT_SEVERITY_LABEL = {} as Record<string, string>;
export const ALERT_STATUS_LABEL = {} as Record<AlertStatus, string>;
export const AUDIT_RESOURCE_LABEL = {} as Record<string, string>;
export const FLAG_STATE_LABEL = {} as Record<FlagState, string>;
export const JOB_STATUS_LABEL = {} as Record<JobStatus, string>;
export const JOB_TYPE_LABEL = {} as Record<JobType, string>;
export const MESSAGE_KIND_LABEL = {} as Record<MessageKind, string>;
export const MESSAGE_STATUS_LABEL = {} as Record<MessageStatus, string>;
export const SERVICE_HEALTH_LABEL = {} as Record<ServiceHealthState, string>;
export const mockAlerts: AlertRecord[] = [];
export const mockAuditEvents: AuditEvent[] = [];
export const mockBackgroundJobs: BackgroundJob[] = [];
export const mockConfigReference: ConfigEntry[] = [];
export const mockDeployments: Deployment[] = [];
export const mockFeatureFlags: FeatureFlag[] = [];
export const mockMessageLogs: MessageLog[] = [];
export const mockPlatformServices: PlatformService[] = [];

const EMPTY_SYSTEM_OVERVIEW: SystemOverviewMetrics = {
  api: "operational",
  database: "operational",
  redis: "operational",
  documentStorage: "operational",
  emailDelivery: "operational",
  smsDelivery: "operational",
  backgroundJobs: "operational",
  failedJobs: 0,
  pendingJobs: 0,
  recentDeployments: 0,
  openAlerts: 0,
  auditEvents24h: 0,
};

export const listServices = (): PlatformService[] => mockPlatformServices;
export const listJobs = (): BackgroundJob[] => mockBackgroundJobs;
export const getJob = (_: string): BackgroundJob | undefined => undefined;
export const listFlags = (): FeatureFlag[] => mockFeatureFlags;
export const listMessageLogs = (): MessageLog[] => mockMessageLogs;
export const listAuditEvents = (): AuditEvent[] => mockAuditEvents;
export const listAlerts = (): AlertRecord[] => mockAlerts;
export const listDeployments = (): Deployment[] => mockDeployments;
export const listConfigReference = (): ConfigEntry[] => mockConfigReference;
export const getOverviewMetrics = (): SystemOverviewMetrics => EMPTY_SYSTEM_OVERVIEW;

export const getJobById = (_: string): BackgroundJob | undefined => undefined;
export const getSystemOverviewMetrics = () => EMPTY_SYSTEM_OVERVIEW;
