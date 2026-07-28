import type {
  Communication,
  CommunicationChannel,
  CommunicationStatus,
  CommunicationType,
  DeliveryEvent,
  TemplateDefinition,
  TemplateKey,
} from "@/features/admin/mock-data/communications";

export const COMMUNICATION_CHANNEL_LABEL = {} as Record<CommunicationChannel, string>;
export const COMMUNICATION_STATUS_LABEL = {} as Record<CommunicationStatus, string>;
export const COMMUNICATION_TYPE_LABEL = {} as Record<CommunicationType, string>;
export const DELIVERY_EVENT_LABEL = {} as Record<DeliveryEvent["kind"], string>;
export const FAILURE_REASON_LABEL = {} as Record<string, string>;
export const FAILURE_RECOMMENDED_ACTION = {} as Record<string, string>;
export const mockCommunications: Communication[] = [];
export const mockTemplates: TemplateDefinition[] = [];

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

export function getCommunicationById(_: string): Communication | undefined {
  return undefined;
}

export function listCommunicationsForCase(): Communication[] {
  return [];
}

export function getMetrics() {
  return EMPTY_COMMUNICATION_METRICS;
}

export const getCommunication = (_: string): Communication | undefined => undefined;
export const getCommunicationMetrics = () => EMPTY_COMMUNICATION_METRICS;
export const getCommunicationsForCase = () => [];
export const getTemplate = (_: TemplateKey): TemplateDefinition | undefined => undefined;
export const isFailedStatus = (_: CommunicationStatus) => false;
