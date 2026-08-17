import type { AppEnvConfig } from "@/config/env";
import { createApiClient } from "@/lib/api/client";
import type { WorkflowPermission } from "../workflow/types";
import {
  clearStoredAuthTokens,
  createBrowserSessionStorage,
  isStoredAuthTokensExpired,
  readStoredAuthTokens,
  writeStoredAuthTokens,
  type SessionStorageBag,
} from "./session-storage";
import type { AdminAccount, AdminAuthAdapter, StoredAuthTokens } from "./types";

const INVALID_CREDENTIALS_MESSAGE =
  "Invalid email or password. Check your credentials and try again.";
const ACCESS_DENIED_MESSAGE =
  "Your account does not have permission to access the Kairo Admin Portal.";
const NOT_CONFIGURED_MESSAGE = "Admin authentication is not configured.";
const PASSWORD_RESET_NOT_CONFIGURED_MESSAGE = "Admin password reset is not configured.";

type BackendRoleKey = "user" | "support" | "moderator" | "hr" | "admin" | "superadmin";

interface BackendTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface BackendAdminSessionAccount {
  id: string;
  email: string;
  name: string | null;
  initials: string;
  role_key: BackendRoleKey;
  permissions: string[];
  is_active: boolean;
}

interface BackendAdminSessionResponse {
  account: BackendAdminSessionAccount;
}

export interface ProductionAuthAdapterOptions {
  storage?: SessionStorageBag | null;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

type SessionLookupResult =
  | { kind: "authenticated"; account: AdminAccount }
  | { kind: "unauthorized" }
  | { kind: "forbidden" }
  | { kind: "error"; error: string };

const SESSION_ACCESS_PERMISSION = "access_admin_portal";

const BACKEND_PERMISSION_MAP: Record<string, WorkflowPermission[]> = {
  access_admin_portal: [
    "users.view",
    "communications.view",
    "risk.view",
    "system.view",
    "system.jobs.view",
    "system.flags.view",
    "system.messaging.view",
    "system.configuration.view",
  ],
  view_all_cases: [
    "users.view",
    "communications.view",
    "communications.view_failures",
    "risk.view",
    "risk.review",
    "system.view",
    "system.jobs.view",
    "system.flags.view",
    "system.messaging.view",
    "system.configuration.view",
  ],
  view_audit_log: ["system.audit.view"],
  add_remark: ["users.notes.create", "communications.notes.create", "risk.note"],
  assign_reviewer: ["verification.assign"],
  change_verification_priority: ["verification.change_priority"],
  review_verification: [
    "verification.approve_outreach",
    "verification.verify",
    "verification.reject",
    "verification.mark_unable",
    "verification.cancel",
    "verification.return_to_verifier",
  ],
  request_more_info: ["verification.request_correction", "verification.record_clarification"],
  read_users: ["users.view"],
  manage_user_notes: ["users.notes.create"],
  manage_user_accounts: ["users.account.disable", "users.account.enable"],
  manage_user_security: ["users.sessions.revoke", "users.password_reset.prepare"],
  manage_users: [
    "users.view",
    "users.notes.create",
    "users.account.disable",
    "users.account.enable",
    "users.sessions.revoke",
    "users.password_reset.prepare",
  ],
};

export function createProductionAuthAdapter(
  config: AppEnvConfig,
  options: ProductionAuthAdapterOptions = {},
): AdminAuthAdapter {
  const storage = options.storage ?? createBrowserSessionStorage();
  const now = options.now ?? (() => new Date());
  const apiClient = createApiClient({
    baseUrl: config.apiBaseUrl,
    credentials: "omit",
    fetchImpl: options.fetchImpl,
  });

  const notice = !config.authTransportConfigured
    ? "Admin authentication is not configured. Set VITE_API_BASE_URL before enabling production sign-in."
    : "Production mode uses the shared Kairo backend authentication flow.";
  const isConfigured = config.authTransportConfigured;

  async function fetchAdminSession(accessToken: string): Promise<SessionLookupResult> {
    const result = await apiClient.request<BackendAdminSessionResponse>("/api/v1/admin/session", {
      method: "GET",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    if (!result.ok) {
      if (result.status === 401) return { kind: "unauthorized" };
      if (result.status === 403) return { kind: "forbidden" };
      return {
        kind: "error",
        error:
          result.error?.message ?? "The admin session could not be verified. Try again shortly.",
      };
    }

    const account = result.data?.account;
    if (
      !account ||
      !account.is_active ||
      !account.permissions.includes(SESSION_ACCESS_PERMISSION)
    ) {
      return { kind: "forbidden" };
    }

    return {
      kind: "authenticated",
      account: mapBackendAdminAccount(account),
    };
  }

  async function refreshTokens(currentTokens: StoredAuthTokens): Promise<StoredAuthTokens | null> {
    const result = await apiClient.request<BackendTokenResponse>("/api/v1/auth/refresh", {
      method: "POST",
      body: {
        refresh_token: currentTokens.refreshToken,
      },
    });

    if (!result.ok || !result.data) return null;

    const refreshedTokens = toStoredAuthTokens(result.data, {
      remember: currentTokens.remember,
      now,
      signedInAt: currentTokens.signedInAt,
    });
    writeStoredAuthTokens(storage, refreshedTokens);
    return refreshedTokens;
  }

  async function revokeRefreshToken(refreshToken: string | null | undefined): Promise<void> {
    if (!refreshToken || !isConfigured) return;

    await apiClient.request<null>("/api/v1/auth/logout", {
      method: "POST",
      body: {
        refresh_token: refreshToken,
      },
    });
  }

  return {
    mode: "production",
    isConfigured,
    notice,
    async restoreSession() {
      if (!isConfigured) return { status: "unauthenticated" };

      const stored = readStoredAuthTokens(storage);
      if (!stored) return { status: "unauthenticated" };

      let tokens = stored.tokens;

      if (isStoredAuthTokensExpired(tokens, now().getTime())) {
        const refreshedTokens = await refreshTokens(tokens);
        if (!refreshedTokens) {
          clearStoredAuthTokens(storage);
          return { status: "expired" };
        }
        tokens = refreshedTokens;
      }

      let sessionResult = await fetchAdminSession(tokens.accessToken);
      if (sessionResult.kind === "unauthorized") {
        const refreshedTokens = await refreshTokens(tokens);
        if (!refreshedTokens) {
          clearStoredAuthTokens(storage);
          return { status: "expired" };
        }

        tokens = refreshedTokens;
        sessionResult = await fetchAdminSession(tokens.accessToken);
      }

      if (sessionResult.kind === "authenticated") {
        return {
          status: "authenticated",
          account: sessionResult.account,
          signedInAt: tokens.signedInAt,
        };
      }

      if (sessionResult.kind === "forbidden") {
        clearStoredAuthTokens(storage);
        return { status: "forbidden" };
      }

      if (sessionResult.kind === "unauthorized") {
        clearStoredAuthTokens(storage);
        return { status: "expired" };
      }

      return {
        status: "error",
        error: sessionResult.error,
      };
    },
    async login(email, password, remember) {
      if (!isConfigured) {
        return {
          ok: false,
          error: NOT_CONFIGURED_MESSAGE,
        };
      }

      const result = await apiClient.request<BackendTokenResponse>("/api/v1/auth/login", {
        method: "POST",
        body: {
          email: email.trim().toLowerCase(),
          password,
        },
      });

      if (!result.ok) {
        return {
          ok: false,
          error: getLoginErrorMessage(
            result.status,
            result.error?.message ?? "Admin authentication is temporarily unavailable.",
          ),
        };
      }

      if (!result.data) {
        return {
          ok: false,
          error: "Admin authentication is temporarily unavailable. Try again shortly.",
        };
      }

      const signedInAt = now().toISOString();
      const tokens = toStoredAuthTokens(result.data, { remember, now, signedInAt });
      const sessionResult = await fetchAdminSession(tokens.accessToken);

      if (sessionResult.kind !== "authenticated") {
        clearStoredAuthTokens(storage);
        if (sessionResult.kind === "forbidden") {
          await revokeRefreshToken(tokens.refreshToken);
          return {
            ok: false,
            error: ACCESS_DENIED_MESSAGE,
          };
        }

        if (sessionResult.kind === "unauthorized") {
          await revokeRefreshToken(tokens.refreshToken);
          return {
            ok: false,
            error: "Your session could not be verified. Sign in again to continue.",
          };
        }

        return {
          ok: false,
          error: "Admin authentication is temporarily unavailable. Try again shortly.",
        };
      }

      writeStoredAuthTokens(storage, tokens);
      return {
        ok: true,
        account: sessionResult.account,
        signedInAt,
      };
    },
    async logout() {
      if (isConfigured) {
        const stored = readStoredAuthTokens(storage);
        await revokeRefreshToken(stored?.tokens.refreshToken);
      }

      clearStoredAuthTokens(storage);
    },
    async forgotPassword(email) {
      if (!isConfigured) {
        return {
          ok: false,
          error: PASSWORD_RESET_NOT_CONFIGURED_MESSAGE,
        };
      }

      const result = await apiClient.request<{ message?: string }>("/api/v1/auth/forgot-password", {
        method: "POST",
        body: {
          email: email.trim().toLowerCase(),
        },
      });

      if (!result.ok) {
        return {
          ok: false,
          error: result.error?.message ?? "The password reset request could not be completed.",
        };
      }

      return {
        ok: true,
        message:
          result.data?.message ??
          "If an authorised Admin account exists for this email, password reset instructions will be sent.",
      };
    },
  };
}

function getLoginErrorMessage(status: number | null, fallbackMessage: string): string {
  if (status === 401) return INVALID_CREDENTIALS_MESSAGE;
  if (status === 403) return ACCESS_DENIED_MESSAGE;
  return fallbackMessage;
}

function toStoredAuthTokens(
  response: BackendTokenResponse,
  options: {
    remember: boolean;
    now: () => Date;
    signedInAt?: string;
  },
): StoredAuthTokens {
  const issuedAt = options.now();
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    tokenType: response.token_type,
    expiresAt: new Date(issuedAt.getTime() + response.expires_in * 1000).toISOString(),
    signedInAt: options.signedInAt ?? issuedAt.toISOString(),
    remember: options.remember,
  };
}

function mapBackendAdminAccount(account: BackendAdminSessionAccount): AdminAccount {
  const permissions = mapBackendPermissions(account.permissions);

  return {
    id: account.id,
    email: account.email,
    name: account.name?.trim() || account.email,
    initials: account.initials,
    roleKey: mapBackendRoleKey(account.role_key),
    role: toRoleLabel(account.role_key),
    permissions,
  };
}

function mapBackendRoleKey(roleKey: BackendRoleKey) {
  switch (roleKey) {
    case "superadmin":
    case "admin":
      return "admin";
    case "hr":
      return "operations_lead";
    case "moderator":
      return "reviewer";
    case "support":
      return "read_only";
    default:
      return "read_only";
  }
}

function toRoleLabel(roleKey: BackendRoleKey): string {
  return roleKey
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function mapBackendPermissions(permissions: string[]): WorkflowPermission[] {
  const mapped = new Set<WorkflowPermission>();

  for (const permission of permissions) {
    for (const uiPermission of BACKEND_PERMISSION_MAP[permission] ?? []) {
      mapped.add(uiPermission);
    }
  }

  return [...mapped];
}
