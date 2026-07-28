import type { AppEnvConfig } from "@/config/env";
import { createApiClient, type ApiRequestOptions, type ApiResult } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  clearStoredAuthTokens,
  createBrowserSessionStorage,
  isStoredAuthTokensExpired,
  readStoredAuthTokens,
  writeStoredAuthTokens,
  type SessionStorageBag,
} from "@/features/admin/auth/session-storage";
import type { StoredAuthTokens } from "@/features/admin/auth/types";

interface BackendTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface ProductionAdminApiOptions {
  storage?: SessionStorageBag | null;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

export interface AdminAuthenticatedApi {
  request: <T>(path: string, options?: ApiRequestOptions) => Promise<T>;
}

const UNAUTHORIZED_MESSAGE = "Your session is no longer valid. Sign in again to continue.";

export function createAdminAuthenticatedApi(
  config: AppEnvConfig,
  options: ProductionAdminApiOptions = {},
): AdminAuthenticatedApi {
  const storage = options.storage ?? createBrowserSessionStorage();
  const now = options.now ?? (() => new Date());
  const apiClient = createApiClient({
    baseUrl: config.apiBaseUrl,
    credentials: "omit",
    fetchImpl: options.fetchImpl,
  });

  async function refreshTokens(currentTokens: StoredAuthTokens): Promise<StoredAuthTokens | null> {
    const result = await apiClient.request<BackendTokenResponse>("/api/v1/auth/refresh", {
      method: "POST",
      body: {
        refresh_token: currentTokens.refreshToken,
      },
    });

    if (!result.ok || !result.data) return null;

    const issuedAt = now();
    const refreshedTokens: StoredAuthTokens = {
      accessToken: result.data.access_token,
      refreshToken: result.data.refresh_token,
      tokenType: result.data.token_type,
      expiresAt: new Date(issuedAt.getTime() + result.data.expires_in * 1000).toISOString(),
      signedInAt: currentTokens.signedInAt,
      remember: currentTokens.remember,
    };

    writeStoredAuthTokens(storage, refreshedTokens);
    return refreshedTokens;
  }

  async function authenticatedRequest<T>(
    path: string,
    options: ApiRequestOptions = {},
  ): Promise<ApiResult<T>> {
    const stored = readStoredAuthTokens(storage);
    if (!stored) {
      return {
        ok: false as const,
        error: new ApiError({
          code: "unauthorized",
          message: UNAUTHORIZED_MESSAGE,
          status: 401,
        }),
        status: 401,
        requestId: null,
      };
    }

    let tokens = stored.tokens;
    if (isStoredAuthTokensExpired(tokens, now().getTime())) {
      const refreshed = await refreshTokens(tokens);
      if (!refreshed) {
        clearStoredAuthTokens(storage);
        return {
          ok: false as const,
          error: new ApiError({
            code: "unauthorized",
            message: UNAUTHORIZED_MESSAGE,
            status: 401,
          }),
          status: 401,
          requestId: null,
        };
      }
      tokens = refreshed;
    }

    let result = await apiClient.request<T>(path, {
      ...options,
      headers: {
        ...Object.fromEntries(new Headers(options.headers).entries()),
        authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    if (!result.ok && result.status === 401) {
      const refreshed = await refreshTokens(tokens);
      if (!refreshed) {
        clearStoredAuthTokens(storage);
        return {
          ok: false as const,
          error: new ApiError({
            code: "unauthorized",
            message: UNAUTHORIZED_MESSAGE,
            status: 401,
          }),
          status: 401,
          requestId: null,
        };
      }

      tokens = refreshed;
      result = await apiClient.request<T>(path, {
        ...options,
        headers: {
          ...Object.fromEntries(new Headers(options.headers).entries()),
          authorization: `Bearer ${tokens.accessToken}`,
        },
      });
    }

    if (!result.ok && result.status === 401) {
      clearStoredAuthTokens(storage);
    }

    return result as ApiResult<T>;
  }

  return {
    async request<T>(path: string, options: ApiRequestOptions = {}) {
      const result = await authenticatedRequest<T>(path, options);
      if (!result.ok) {
        throw result.error;
      }

      return result.data;
    },
  };
}
