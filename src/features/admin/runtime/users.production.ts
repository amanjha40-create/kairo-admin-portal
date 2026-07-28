import type {
  PassportStatus,
  ProfileType,
  UserAccountStatus,
  UserAttentionKind,
  UserDirectoryMetrics,
  UserRecord,
} from "@/features/admin/mock-data/users";

export const ACCOUNT_STATUS_LABEL = {} as Record<UserAccountStatus, string>;
export const ATTENTION_LABEL = {} as Record<UserAttentionKind, string>;
export const ONBOARDING_STEP_LABEL = {} as Record<string, string>;
export const ONBOARDING_STEP_ORDER: string[] = [];
export const PASSPORT_STATUS_LABEL = {} as Record<PassportStatus, string>;
export const PROFILE_TYPE_LABEL = {} as Record<ProfileType, string>;
export const TRUST_BAND_LABEL = {} as Record<string, string>;
export const mockUsers: UserRecord[] = [];

const EMPTY_DIRECTORY_METRICS: UserDirectoryMetrics = {
  total: 0,
  active: 0,
  onboardingIncomplete: 0,
  passportVerified: 0,
  attentionRequired: 0,
  disabled: 0,
};

export function listUsers(): UserRecord[] {
  return mockUsers;
}

export function getUserById(_: string): UserRecord | undefined {
  return undefined;
}

export function getDirectoryMetrics(): UserDirectoryMetrics {
  return EMPTY_DIRECTORY_METRICS;
}

export const getUser = (_: string): UserRecord | undefined => undefined;
export const getUserDirectoryMetrics = () => EMPTY_DIRECTORY_METRICS;
export const initialsFor = (user: Pick<UserRecord, "fullName">) => user.fullName.slice(0, 1);
