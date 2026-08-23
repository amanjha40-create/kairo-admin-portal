import { queryOptions } from "@tanstack/react-query";
import { appEnv, type AppEnvConfig } from "@/config/env";
import { mapLegacyMockVerificationStatus } from "@/features/admin/lib/verification-status";
import {
  clearStoredAuthTokens,
  createBrowserSessionStorage,
  readStoredAuthTokens,
  writeStoredAuthTokens,
  type SessionStorageBag,
} from "@/features/admin/auth/session-storage";
import {
  mockActivity,
  mockAdminMetrics,
  mockAttentionItems,
  mockFunnel,
  mockVerificationStatuses,
} from "@/features/admin/mock-data";
import { createApiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type {
  AdminActivity,
  AdminActivityKind,
  AdminMetric,
  AttentionItem,
  FunnelStage,
  VerificationStatus,
  VerificationStatusSummary,
} from "./types";

const OVERVIEW_RECENT_WINDOW_DAYS = 30;
const UNAUTHORIZED_MESSAGE = "Your session is no longer valid. Sign in again to continue.";
const DEMO_RUNTIME_AVAILABLE =
  typeof __KAIRO_ADMIN_DEMO_MODE__ !== "undefined"
    ? __KAIRO_ADMIN_DEMO_MODE__
    : import.meta.env.MODE === "test";

interface BackendTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface BackendAdminOverviewCase {
  public_id: string;
  subject_name: string;
  organization_name: string | null;
  status: string;
  priority: string;
  created_at: string;
}

interface BackendAdminOverviewActivity {
  public_id: string;
  verification_request_public_id: string;
  event_type: string;
  event_source: string;
  actor_user_id: string | null;
  created_at: string;
}

interface BackendAdminOverviewResponse {
  generated_at: string;
  recent_window_days: number;
  total_verification_requests: number;
  requests_by_status: Record<string, number>;
  pending_review_count: number;
  priority_case_count: number;
  recent_cases: BackendAdminOverviewCase[];
  recent_admin_activity: BackendAdminOverviewActivity[];
  organization_total: number;
  registry_total: number;
  user_total: number | null;
  trust_safety?: {
    open_investigations: number;
    high_or_critical_investigations: number;
    unassigned_investigations: number;
    active_signals: number;
  } | null;
}

export interface OverviewDashboardData {
  generatedAt: string;
  recentWindowDays: number;
  isEmpty: boolean;
  metrics: AdminMetric[];
  attention: AttentionItem[];
  funnel: FunnelStage[];
  statuses: VerificationStatusSummary[];
  activity: AdminActivity[];
}

interface OverviewDataAdapter {
  mode: "demo" | "production";
  loadDashboard: () => Promise<OverviewDashboardData>;
}

export interface ProductionOverviewAdapterOptions {
  storage?: SessionStorageBag | null;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

interface CreateOverviewDataAdapterOptions {
  demoLoader?: () => Promise<OverviewDashboardData>;
  production?: ProductionOverviewAdapterOptions;
}

export const overviewKeys = {
  all: () => ["admin", "overview"] as const,
  dashboard: (mode: "demo" | "production", recentWindowDays = OVERVIEW_RECENT_WINDOW_DAYS) =>
    [...overviewKeys.all(), mode, recentWindowDays] as const,
};

const STATUS_CONFIG: Array<{
  status: VerificationStatus;
  label: string;
  backendStatuses: string[];
}> = [
  {
    status: "pending_admin_review",
    label: "Pending admin review",
    backendStatuses: ["pending_admin_review"],
  },
  {
    status: "awaiting_subject_corrections",
    label: "Needs candidate correction",
    backendStatuses: ["awaiting_subject_corrections"],
  },
  {
    status: "pending_admin_re_review",
    label: "Pending admin re-review",
    backendStatuses: ["pending_admin_re_review"],
  },
  {
    status: "pending_organization_resolution",
    label: "Pending organization resolution",
    backendStatuses: ["pending_organization_resolution"],
  },
  {
    status: "approved_for_organization_verification",
    label: "Approved for dispatch",
    backendStatuses: ["approved_for_organization_verification"],
  },
  {
    status: "in_progress",
    label: "Awaiting verifier",
    backendStatuses: ["pending_organization_acceptance", "in_progress", "awaiting_information"],
  },
  {
    status: "pending_admin_quality_review",
    label: "Pending admin quality review",
    backendStatuses: ["pending_admin_quality_review"],
  },
  { status: "verified", label: "Verified", backendStatuses: ["verified"] },
  { status: "rejected", label: "Rejected", backendStatuses: ["rejected"] },
  { status: "unable_to_verify", label: "Unable to verify", backendStatuses: ["unable_to_verify"] },
];

export function createOverviewDataAdapter(
  config: AppEnvConfig = appEnv,
  options: CreateOverviewDataAdapterOptions = {},
): OverviewDataAdapter {
  if (DEMO_RUNTIME_AVAILABLE && config.adminDemoMode) {
    return {
      mode: "demo",
      loadDashboard: options.demoLoader ?? loadDemoOverviewDashboard,
    };
  }

  return {
    mode: "production",
    loadDashboard: createProductionOverviewLoader(config, options.production),
  };
}

export function overviewDashboardQueryOptions(
  config: AppEnvConfig = appEnv,
  options: CreateOverviewDataAdapterOptions = {},
) {
  const adapter = createOverviewDataAdapter(config, options);
  return queryOptions({
    queryKey: overviewKeys.dashboard(adapter.mode),
    queryFn: () => adapter.loadDashboard(),
  });
}

async function loadDemoOverviewDashboard(): Promise<OverviewDashboardData> {
  return {
    generatedAt: new Date().toISOString(),
    recentWindowDays: OVERVIEW_RECENT_WINDOW_DAYS,
    isEmpty: false,
    metrics: mockAdminMetrics,
    attention: mockAttentionItems,
    funnel: mockFunnel,
    statuses: mockVerificationStatuses.map((item) => ({
      ...item,
      status: mapLegacyMockVerificationStatus(item.status),
    })),
    activity: mockActivity,
  };
}

function createProductionOverviewLoader(
  config: AppEnvConfig,
  options: ProductionOverviewAdapterOptions = {},
): () => Promise<OverviewDashboardData> {
  const storage = options.storage ?? createBrowserSessionStorage();
  const now = options.now ?? (() => new Date());
  const apiClient = createApiClient({
    baseUrl: config.apiBaseUrl,
    credentials: "omit",
    fetchImpl: options.fetchImpl,
  });

  return async () => {
    const overview = await requestAuthenticatedOverview({
      apiClient,
      storage,
      now,
    });

    return mapBackendOverviewToDashboard(overview);
  };
}

async function requestAuthenticatedOverview(options: {
  apiClient: ReturnType<typeof createApiClient>;
  storage: SessionStorageBag | null;
  now: () => Date;
}): Promise<BackendAdminOverviewResponse> {
  const stored = readStoredAuthTokens(options.storage);
  if (!stored) {
    throw new ApiError({
      code: "unauthorized",
      message: UNAUTHORIZED_MESSAGE,
      status: 401,
    });
  }

  let tokens = stored.tokens;
  if (new Date(tokens.expiresAt).getTime() <= options.now().getTime()) {
    tokens = await refreshOverviewTokens({
      apiClient: options.apiClient,
      storage: options.storage,
      now: options.now,
      refreshToken: tokens.refreshToken,
      remember: tokens.remember,
      signedInAt: tokens.signedInAt,
    });
  }

  let result = await options.apiClient.request<BackendAdminOverviewResponse>(
    `/api/v1/admin/overview?recent_window_days=${OVERVIEW_RECENT_WINDOW_DAYS}`,
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${tokens.accessToken}`,
      },
    },
  );

  if (!result.ok && result.status === 401) {
    tokens = await refreshOverviewTokens({
      apiClient: options.apiClient,
      storage: options.storage,
      now: options.now,
      refreshToken: tokens.refreshToken,
      remember: tokens.remember,
      signedInAt: tokens.signedInAt,
    });

    result = await options.apiClient.request<BackendAdminOverviewResponse>(
      `/api/v1/admin/overview?recent_window_days=${OVERVIEW_RECENT_WINDOW_DAYS}`,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${tokens.accessToken}`,
        },
      },
    );
  }

  if (!result.ok || !result.data) {
    if (result.status === 401) {
      clearStoredAuthTokens(options.storage);
    }
    throw (
      result.error ??
      new ApiError({
        code: "unknown",
        message: "The admin overview could not be loaded.",
        status: result.status,
      })
    );
  }

  return result.data;
}

async function refreshOverviewTokens(options: {
  apiClient: ReturnType<typeof createApiClient>;
  storage: SessionStorageBag | null;
  now: () => Date;
  refreshToken: string;
  remember: boolean;
  signedInAt: string;
}) {
  const refreshResult = await options.apiClient.request<BackendTokenResponse>(
    "/api/v1/auth/refresh",
    {
      method: "POST",
      body: {
        refresh_token: options.refreshToken,
      },
    },
  );

  if (!refreshResult.ok || !refreshResult.data) {
    clearStoredAuthTokens(options.storage);
    throw (
      refreshResult.error ??
      new ApiError({
        code: "unauthorized",
        message: UNAUTHORIZED_MESSAGE,
        status: 401,
      })
    );
  }

  const issuedAt = options.now();
  const refreshedTokens = {
    accessToken: refreshResult.data.access_token,
    refreshToken: refreshResult.data.refresh_token,
    tokenType: refreshResult.data.token_type,
    expiresAt: new Date(issuedAt.getTime() + refreshResult.data.expires_in * 1000).toISOString(),
    signedInAt: options.signedInAt,
    remember: options.remember,
  };

  writeStoredAuthTokens(options.storage, refreshedTokens);
  return refreshedTokens;
}

function mapBackendOverviewToDashboard(
  response: BackendAdminOverviewResponse,
): OverviewDashboardData {
  const generatedAt = new Date(response.generated_at);
  const statuses = STATUS_CONFIG.map((item) => {
    const count = sumCounts(response.requests_by_status, item.backendStatuses);
    const oldestAgeHours = getOldestAgeHours(
      response.recent_cases,
      item.backendStatuses,
      generatedAt,
    );
    return {
      status: item.status,
      label: item.label,
      count,
      oldestAgeHours,
      periodDelta: 0,
    } satisfies VerificationStatusSummary;
  });

  return {
    generatedAt: response.generated_at,
    recentWindowDays: response.recent_window_days,
    isEmpty: isOverviewEmpty(response),
    metrics: [
      metric(
        "verification_requests",
        "Verification requests",
        response.total_verification_requests,
        "All recorded requests",
      ),
      metric(
        "pending_review",
        "Pending admin review",
        response.pending_review_count,
        "Open review queue",
      ),
      metric(
        "priority_cases",
        "Priority cases",
        response.priority_case_count,
        "High and urgent requests",
      ),
      metric(
        "organizations",
        "Organizations",
        response.organization_total,
        "Tracked organizations",
      ),
      metric(
        "registry_records",
        "Registry records",
        response.registry_total,
        "Active trust registry records",
      ),
      metric(
        "registered_users",
        "Registered users",
        response.user_total ?? 0,
        "Active user accounts",
      ),
      metric(
        "trust_safety_open",
        "Open T&S investigations",
        response.trust_safety?.open_investigations ?? 0,
        "Backend-owned Trust & Safety investigations",
      ),
    ],
    attention: buildAttentionItems(response),
    funnel: buildFunnel(response),
    statuses,
    activity: response.recent_admin_activity.map(mapActivity),
  };
}

function metric(id: string, label: string, value: number, context: string): AdminMetric {
  return {
    id,
    label,
    value,
    context,
    changePct: 0,
  };
}

function buildAttentionItems(response: BackendAdminOverviewResponse): AttentionItem[] {
  return [
    {
      id: "pending_review",
      category: "Pending admin review",
      count: response.pending_review_count,
      reason: "Requests are waiting for an admin review decision.",
      priority: "urgent",
      destinationHref: "/admin/verifications?view=pre-dispatch",
      destinationLabel: "Open queue",
    },
    {
      id: "priority_cases",
      category: "Priority cases",
      count: response.priority_case_count,
      reason: "High and urgent requests should be reviewed first.",
      priority: "high",
      destinationHref: "/admin/verifications?view=all-active",
      destinationLabel: "Review cases",
    },
    {
      id: "resubmitted",
      category: "Resubmitted cases",
      count: response.requests_by_status.pending_admin_re_review ?? 0,
      reason: "Candidates have responded and these requests are back for admin review.",
      priority: "high",
      destinationHref: "/admin/verifications?view=pre-dispatch",
      destinationLabel: "Re-review",
    },
    {
      id: "awaiting_information",
      category: "Awaiting information",
      count: response.requests_by_status.awaiting_information ?? 0,
      reason: "These requests are blocked on additional information before they can move forward.",
      priority: "normal",
      destinationHref: "/admin/verifications?view=awaiting-verifier",
      destinationLabel: "Track requests",
    },
    {
      id: "organization_resolution",
      category: "Organization resolution required",
      count: response.requests_by_status.pending_organization_resolution ?? 0,
      reason: "Organization matching needs manual intervention before verification can continue.",
      priority: "normal",
      destinationHref: "/admin/verifications?view=pending-resolution",
      destinationLabel: "Resolve matches",
    },
    {
      id: "trust_safety_open",
      category: "Trust & Safety investigations",
      count: response.trust_safety?.open_investigations ?? 0,
      reason: "Open investigations require operational review and documented resolution.",
      priority: "high",
      destinationHref: "/admin/risk",
      destinationLabel: "Open investigations",
    },
    {
      id: "trust_safety_high",
      category: "High or critical Trust & Safety",
      count: response.trust_safety?.high_or_critical_investigations ?? 0,
      reason: "High-severity investigations should be triaged before lower-risk work.",
      priority: "urgent",
      destinationHref: "/admin/risk",
      destinationLabel: "Review Trust & Safety",
    },
  ];
}

function buildFunnel(response: BackendAdminOverviewResponse): FunnelStage[] {
  return [
    {
      id: "submitted",
      label: "Verification requests",
      count: response.total_verification_requests,
    },
    {
      id: "pending_review",
      label: "Pending review",
      count: response.pending_review_count,
    },
    {
      id: "resubmitted",
      label: "Pending admin re-review",
      count: response.requests_by_status.pending_admin_re_review ?? 0,
    },
    {
      id: "awaiting_organization",
      label: "Pending organization resolution",
      count: response.requests_by_status.pending_organization_resolution ?? 0,
    },
    {
      id: "in_verification",
      label: "In verification",
      count: sumCounts(response.requests_by_status, [
        "approved_for_organization_verification",
        "pending_organization_acceptance",
        "in_progress",
      ]),
    },
    {
      id: "verified",
      label: "Verified",
      count: response.requests_by_status.verified ?? 0,
    },
  ];
}

function mapActivity(activity: BackendAdminOverviewActivity): AdminActivity {
  return {
    id: activity.public_id,
    kind: mapActivityKind(activity.event_type),
    actor: "Admin",
    actorRole: "admin",
    action: humanizeEventLabel(activity.event_type),
    subject: `Case ${activity.verification_request_public_id.slice(0, 8)}`,
    timestamp: activity.created_at,
    detailHref: "/admin/verifications",
  };
}

function mapActivityKind(eventType: string): AdminActivityKind {
  if (eventType.includes("approved") || eventType.includes("verified")) {
    return "verification_approved";
  }
  if (
    eventType.includes("correction") ||
    eventType.includes("information_requested") ||
    eventType.includes("clarification")
  ) {
    return "correction_requested";
  }
  if (eventType.includes("assigned")) {
    return "organization_resolved";
  }
  return "trust_passport_updated";
}

function humanizeEventLabel(eventType: string): string {
  return eventType
    .replace(/^verification_request_/, "")
    .replace(/^admin_/, "")
    .split("_")
    .filter(Boolean)
    .join(" ");
}

function sumCounts(statusCounts: Record<string, number>, statuses: string[]) {
  return statuses.reduce((total, status) => total + (statusCounts[status] ?? 0), 0);
}

function getOldestAgeHours(
  recentCases: BackendAdminOverviewCase[],
  backendStatuses: string[],
  generatedAt: Date,
): number | undefined {
  const matchingCases = recentCases.filter((item) => backendStatuses.includes(item.status));
  if (matchingCases.length === 0) return undefined;

  const oldestTimestamp = matchingCases.reduce<number | null>((oldest, item) => {
    const candidate = new Date(item.created_at).getTime();
    if (Number.isNaN(candidate)) return oldest;
    return oldest === null ? candidate : Math.min(oldest, candidate);
  }, null);

  if (oldestTimestamp == null) return undefined;

  const diffMs = generatedAt.getTime() - oldestTimestamp;
  if (diffMs <= 0) return 0;

  return Math.max(1, Math.round(diffMs / (60 * 60 * 1000)));
}

function isOverviewEmpty(response: BackendAdminOverviewResponse): boolean {
  return (
    response.total_verification_requests === 0 &&
    response.pending_review_count === 0 &&
    response.priority_case_count === 0 &&
    response.recent_cases.length === 0 &&
    response.recent_admin_activity.length === 0 &&
    response.organization_total === 0 &&
    response.registry_total === 0 &&
    (response.user_total ?? 0) === 0 &&
    (response.trust_safety?.open_investigations ?? 0) === 0 &&
    (response.trust_safety?.active_signals ?? 0) === 0
  );
}
