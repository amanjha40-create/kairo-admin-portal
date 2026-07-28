import { queryOptions } from "@tanstack/react-query";
import { DEMO_MODE_BUILD_ENABLED } from "@/features/admin/controlled-pilot";
import type {
  PassportStatus,
  ProfileType,
  UserAccountStatus,
  UserActivityEvent,
  UserAttentionKind,
  UserDirectoryMetrics,
  UserRecord,
} from "@/features/admin/mock-data/users";

type DemoUsersModule = typeof import("@/features/admin/mock-data/users");

const demoUsersModule: DemoUsersModule | null = DEMO_MODE_BUILD_ENABLED
  ? await import("@/features/admin/mock-data/users")
  : null;

export const ACCOUNT_STATUS_LABEL =
  demoUsersModule?.ACCOUNT_STATUS_LABEL ?? ({} as Record<UserAccountStatus, string>);
export const ATTENTION_LABEL =
  demoUsersModule?.ATTENTION_LABEL ?? ({} as Record<UserAttentionKind, string>);
export const ONBOARDING_STEP_LABEL =
  demoUsersModule?.ONBOARDING_STEP_LABEL ?? ({} as Record<string, string>);
export const ONBOARDING_STEP_ORDER = demoUsersModule?.ONBOARDING_STEP_ORDER ?? [];
export const PASSPORT_STATUS_LABEL =
  demoUsersModule?.PASSPORT_STATUS_LABEL ?? ({} as Record<PassportStatus, string>);
export const PROFILE_TYPE_LABEL =
  demoUsersModule?.PROFILE_TYPE_LABEL ?? ({} as Record<ProfileType, string>);
export const TRUST_BAND_LABEL = demoUsersModule?.TRUST_BAND_LABEL ?? ({} as Record<string, string>);
export const initialsFor =
  demoUsersModule?.initialsFor ??
  ((user: Pick<UserRecord, "fullName">) => user.fullName.slice(0, 1));
export const mockUsers = demoUsersModule?.mockUsers ?? [];

export type {
  PassportStatus,
  ProfileType,
  UserAccountStatus,
  UserActivityEvent,
  UserAttentionKind,
  UserDirectoryMetrics,
  UserRecord,
};

const EMPTY_DIRECTORY_METRICS: UserDirectoryMetrics = {
  total: 0,
  active: 0,
  onboardingIncomplete: 0,
  passportVerified: 0,
  attentionRequired: 0,
  disabled: 0,
};

export const userKeys = {
  all: () => ["admin", "users"] as const,
  list: () => [...userKeys.all(), "list"] as const,
  detail: (id: string) => [...userKeys.all(), "detail", id] as const,
};

export function listUsers(): UserRecord[] {
  return mockUsers;
}

export function getUserById(id: string): UserRecord | undefined {
  return demoUsersModule?.getUser(id);
}

export function getDirectoryMetrics(): UserDirectoryMetrics {
  return demoUsersModule?.getUserDirectoryMetrics() ?? EMPTY_DIRECTORY_METRICS;
}

export const getUser =
  demoUsersModule?.getUser ?? ((_: string): UserRecord | undefined => undefined);
export const getUserDirectoryMetrics =
  demoUsersModule?.getUserDirectoryMetrics ?? (() => EMPTY_DIRECTORY_METRICS);

export function userListQueryOptions() {
  return queryOptions({
    queryKey: userKeys.list(),
    queryFn: async () => listUsers(),
  });
}
