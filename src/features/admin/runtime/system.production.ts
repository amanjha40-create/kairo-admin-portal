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
const EMPTY_ALERTS: AlertRecord[] = [];
const EMPTY_AUDIT_EVENTS: AuditEvent[] = [];
const EMPTY_BACKGROUND_JOBS: BackgroundJob[] = [];
const EMPTY_CONFIG_REFERENCE: ConfigEntry[] = [];
const EMPTY_DEPLOYMENTS: Deployment[] = [];
const EMPTY_FEATURE_FLAGS: FeatureFlag[] = [];
const EMPTY_MESSAGE_LOGS: MessageLog[] = [];
const EMPTY_PLATFORM_SERVICES: PlatformService[] = [];

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

export const listServices = (): PlatformService[] => EMPTY_PLATFORM_SERVICES;
export const listJobs = (): BackgroundJob[] => EMPTY_BACKGROUND_JOBS;
export const getJob = (_: string): BackgroundJob | undefined => undefined;
export const listFlags = (): FeatureFlag[] => EMPTY_FEATURE_FLAGS;
export const listMessageLogs = (): MessageLog[] => EMPTY_MESSAGE_LOGS;
export const listAuditEvents = (): AuditEvent[] => EMPTY_AUDIT_EVENTS;
export const listAlerts = (): AlertRecord[] => EMPTY_ALERTS;
export const listDeployments = (): Deployment[] => EMPTY_DEPLOYMENTS;
export const listConfigReference = (): ConfigEntry[] => EMPTY_CONFIG_REFERENCE;
export const getOverviewMetrics = (): SystemOverviewMetrics => EMPTY_SYSTEM_OVERVIEW;

export const getJobById = (_: string): BackgroundJob | undefined => undefined;
export const getSystemOverviewMetrics = () => EMPTY_SYSTEM_OVERVIEW;
