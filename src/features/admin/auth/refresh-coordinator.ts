import { readStoredAuthTokens, type SessionStorageBag } from "./session-storage";
import type { StoredAuthTokens } from "./types";

const inFlightRefreshes = new Map<string, Promise<StoredAuthTokens | null>>();

export async function coordinateAdminTokenRefresh(
  currentTokens: StoredAuthTokens,
  refresh: () => Promise<StoredAuthTokens | null>,
  storage: SessionStorageBag | null = null,
): Promise<StoredAuthTokens | null> {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (locks && storage) {
    return await locks.request("kairo-admin-refresh-token", async () => {
      const latest = readStoredAuthTokens(storage)?.tokens;
      if (latest && latest.refreshToken !== currentTokens.refreshToken) return latest;
      return coordinateInMemory(currentTokens, refresh);
    });
  }
  return await coordinateInMemory(currentTokens, refresh);
}

function coordinateInMemory(
  currentTokens: StoredAuthTokens,
  refresh: () => Promise<StoredAuthTokens | null>,
): Promise<StoredAuthTokens | null> {
  const existing = inFlightRefreshes.get(currentTokens.refreshToken);
  if (existing) return existing;

  const pending = refresh().finally(() => {
    if (inFlightRefreshes.get(currentTokens.refreshToken) === pending) {
      inFlightRefreshes.delete(currentTokens.refreshToken);
    }
  });
  inFlightRefreshes.set(currentTokens.refreshToken, pending);
  return pending;
}

export async function recoverRotatedAdminTokens(
  storage: SessionStorageBag | null,
  attemptedRefreshToken: string,
): Promise<StoredAuthTokens | null> {
  const current = readStoredAuthTokens(storage)?.tokens;
  if (current && current.refreshToken !== attemptedRefreshToken) return current;

  // A background tab may be throttled while the foreground tab rotates the shared token.
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const afterCrossTabRefresh = readStoredAuthTokens(storage)?.tokens;
    if (afterCrossTabRefresh?.refreshToken !== attemptedRefreshToken) {
      return afterCrossTabRefresh ?? null;
    }
  }
  return null;
}
