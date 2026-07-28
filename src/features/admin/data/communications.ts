import { queryOptions } from "@tanstack/react-query";
import { DEMO_MODE_BUILD_ENABLED } from "@/features/admin/controlled-pilot";
import type {
  Communication,
  CommunicationChannel,
  CommunicationStatus,
  CommunicationType,
  DeliveryEvent,
  FollowUpRecord,
  InternalNoteSeed,
  TemplateDefinition,
  TemplateKey,
} from "@/features/admin/mock-data/communications";

type DemoCommunicationsModule = typeof import("@/features/admin/mock-data/communications");

const demoCommunicationsModule: DemoCommunicationsModule | null = DEMO_MODE_BUILD_ENABLED
  ? await import("@/features/admin/mock-data/communications")
  : null;

export const COMMUNICATION_CHANNEL_LABEL =
  demoCommunicationsModule?.COMMUNICATION_CHANNEL_LABEL ??
  ({} as Record<CommunicationChannel, string>);
export const COMMUNICATION_STATUS_LABEL =
  demoCommunicationsModule?.COMMUNICATION_STATUS_LABEL ??
  ({} as Record<CommunicationStatus, string>);
export const COMMUNICATION_TYPE_LABEL =
  demoCommunicationsModule?.COMMUNICATION_TYPE_LABEL ?? ({} as Record<CommunicationType, string>);
export const DELIVERY_EVENT_LABEL =
  demoCommunicationsModule?.DELIVERY_EVENT_LABEL ?? ({} as Record<DeliveryEvent["kind"], string>);
export const FAILURE_REASON_LABEL =
  demoCommunicationsModule?.FAILURE_REASON_LABEL ?? ({} as Record<string, string>);
export const FAILURE_RECOMMENDED_ACTION =
  demoCommunicationsModule?.FAILURE_RECOMMENDED_ACTION ?? ({} as Record<string, string>);
export const isFailedStatus =
  demoCommunicationsModule?.isFailedStatus ?? ((_: CommunicationStatus) => false);
export const mockCommunications = demoCommunicationsModule?.mockCommunications ?? [];
export const mockTemplates = demoCommunicationsModule?.mockTemplates ?? [];

export type {
  Communication,
  CommunicationChannel,
  CommunicationStatus,
  CommunicationType,
  DeliveryEvent,
  FollowUpRecord,
  InternalNoteSeed,
  TemplateDefinition,
  TemplateKey,
};

export const communicationKeys = {
  all: () => ["admin", "communications"] as const,
  list: () => [...communicationKeys.all(), "list"] as const,
  detail: (id: string) => [...communicationKeys.all(), "detail", id] as const,
  metrics: () => [...communicationKeys.all(), "metrics"] as const,
};

const EMPTY_COMMUNICATION_METRICS = {
  total: 0,
  pending: 0,
  delivered: 0,
  awaitingResponse: 0,
  failed: 0,
  bounced: 0,
  complaints: 0,
  followUpsDueToday: 0,
  failedTotal: 0,
};

export function listCommunications(): Communication[] {
  return mockCommunications;
}

export function getCommunicationById(id: string): Communication | undefined {
  return demoCommunicationsModule?.getCommunication(id);
}

export function listCommunicationsForCase(caseId: string): Communication[] {
  return demoCommunicationsModule?.getCommunicationsForCase(caseId) ?? [];
}

export function getMetrics() {
  return demoCommunicationsModule?.getCommunicationMetrics() ?? EMPTY_COMMUNICATION_METRICS;
}

export const getCommunication =
  demoCommunicationsModule?.getCommunication ??
  ((_: string): Communication | undefined => undefined);
export const getCommunicationMetrics =
  demoCommunicationsModule?.getCommunicationMetrics ?? (() => EMPTY_COMMUNICATION_METRICS);
export const getCommunicationsForCase =
  demoCommunicationsModule?.getCommunicationsForCase ?? (() => []);
export const getTemplate =
  demoCommunicationsModule?.getTemplate ??
  ((_: TemplateKey): TemplateDefinition | undefined => undefined);

export function communicationsListQueryOptions() {
  return queryOptions({
    queryKey: communicationKeys.list(),
    queryFn: async () => listCommunications(),
  });
}
