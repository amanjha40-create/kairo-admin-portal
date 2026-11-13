import { describe, expect, it, vi } from "vitest";
import { AUTH_TOKEN_KEY, type SessionStorageBag, writeStoredAuthTokens } from "./session-storage";
import type { StoredAuthTokens } from "./types";
import { coordinateAdminTokenRefresh, recoverRotatedAdminTokens } from "./refresh-coordinator";

function memoryStorage(): SessionStorageBag {
  const store = () => {
    const values = new Map<string, string>();
    return {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };
  };
  return { local: store(), session: store() };
}

function tokens(refreshToken: string): StoredAuthTokens {
  return {
    accessToken: `access-${refreshToken}`,
    refreshToken,
    tokenType: "bearer",
    expiresAt: "2099-01-01T00:00:00.000Z",
    signedInAt: "2026-11-13T00:00:00.000Z",
    remember: true,
  };
}

describe("Admin refresh coordination", () => {
  it("uses one rotation request for concurrent callers sharing a refresh token", async () => {
    const current = tokens("family-1");
    const rotated = tokens("family-2");
    const refresh = vi.fn(async () => rotated);

    const [first, second] = await Promise.all([
      coordinateAdminTokenRefresh(current, refresh),
      coordinateAdminTokenRefresh(current, refresh),
    ]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(first).toEqual(rotated);
    expect(second).toEqual(rotated);
  });

  it("recovers a token family rotated by another browser tab", async () => {
    const storage = memoryStorage();
    writeStoredAuthTokens(storage, tokens("family-old"));
    setTimeout(() => writeStoredAuthTokens(storage, tokens("family-new")), 10);

    await expect(recoverRotatedAdminTokens(storage, "family-old")).resolves.toMatchObject({
      refreshToken: "family-new",
    });
    expect(storage.local.getItem(AUTH_TOKEN_KEY)).toContain("family-new");
  });

  it("reuses a token family rotated while waiting for the cross-tab lock", async () => {
    const storage = memoryStorage();
    const current = tokens("family-old");
    const rotated = tokens("family-new");
    writeStoredAuthTokens(storage, current);
    const originalLocks = navigator.locks;
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: {
        request: async (_name: string, callback: () => Promise<StoredAuthTokens | null>) => {
          writeStoredAuthTokens(storage, rotated);
          return callback();
        },
      },
    });
    const refresh = vi.fn(async () => rotated);

    await expect(coordinateAdminTokenRefresh(current, refresh, storage)).resolves.toEqual(rotated);
    expect(refresh).not.toHaveBeenCalled();
    Object.defineProperty(navigator, "locks", { configurable: true, value: originalLocks });
  });
});
