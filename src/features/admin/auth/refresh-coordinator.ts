import { readStoredAuthTokens, type SessionStorageBag } from "./session-storage";
import type { StoredAuthTokens } from "./types";

const inFlightRefreshes = new Map<string, Promise<StoredAuthTokens | null>>();

export function coordinateAdminTokenRefresh(
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

  // Another tab cannot share the in-memory promise, but its successful rotation updates storage.
  await new Promise((resolve) => setTimeout(resolve, 75));
  const afterCrossTabRefresh = readStoredAuthTokens(storage)?.tokens;
  return afterCrossTabRefresh?.refreshToken !== attemptedRefreshToken
    ? (afterCrossTabRefresh ?? null)
    : null;
}
