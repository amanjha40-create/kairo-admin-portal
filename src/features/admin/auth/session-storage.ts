import type { SessionSource, StoredAuthTokens, StoredSession } from "./types";

export const SESSION_KEY = "kairo.admin.session.v2";
export const AUTH_TOKEN_KEY = "kairo.admin.auth.v1";
export const DEMO_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export interface SessionStorageBag {
  local: StorageLike;
  session: StorageLike;
}

export interface StoredSessionRecord {
  session: StoredSession;
  source: SessionSource;
}

export function createBrowserSessionStorage(): SessionStorageBag | null {
  if (typeof window === "undefined") return null;

  return {
    local: window.localStorage,
    session: window.sessionStorage,
  };
}

export function readStoredSession(storage: SessionStorageBag | null): StoredSessionRecord | null {
  if (!storage) return null;

  const readFrom = (store: StorageLike, source: SessionSource): StoredSessionRecord | null => {
    try {
      const raw = store.getItem(SESSION_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as StoredSession;
      if (!parsed.accountId || !parsed.signedInAt) return null;

      return { session: parsed, source };
    } catch {
      return null;
    }
  };

  return readFrom(storage.local, "local") ?? readFrom(storage.session, "session");
}

export function writeStoredSession(
  storage: SessionStorageBag | null,
  session: StoredSession,
): void {
  if (!storage) return;

  const payload = JSON.stringify(session);
  if (session.remember) {
    storage.local.setItem(SESSION_KEY, payload);
    storage.session.removeItem(SESSION_KEY);
    return;
  }

  storage.session.setItem(SESSION_KEY, payload);
  storage.local.removeItem(SESSION_KEY);
}

export function clearStoredSession(storage: SessionStorageBag | null): void {
  if (!storage) return;
  storage.local.removeItem(SESSION_KEY);
  storage.session.removeItem(SESSION_KEY);
}

export function isStoredSessionExpired(
  session: StoredSession,
  now: number,
  maxAgeMs = DEMO_SESSION_MAX_AGE_MS,
): boolean {
  const signedInAt = new Date(session.signedInAt).getTime();
  if (Number.isNaN(signedInAt)) return true;
  return now - signedInAt > maxAgeMs;
}

export interface StoredAuthTokensRecord {
  tokens: StoredAuthTokens;
  source: SessionSource;
}

export function readStoredAuthTokens(
  storage: SessionStorageBag | null,
): StoredAuthTokensRecord | null {
  if (!storage) return null;

  const readFrom = (store: StorageLike, source: SessionSource): StoredAuthTokensRecord | null => {
    try {
      const raw = store.getItem(AUTH_TOKEN_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as StoredAuthTokens;
      if (
        !parsed.accessToken ||
        !parsed.refreshToken ||
        !parsed.tokenType ||
        !parsed.expiresAt ||
        !parsed.signedInAt
      ) {
        return null;
      }

      return { tokens: parsed, source };
    } catch {
      return null;
    }
  };

  return readFrom(storage.local, "local") ?? readFrom(storage.session, "session");
}

export function writeStoredAuthTokens(
  storage: SessionStorageBag | null,
  tokens: StoredAuthTokens,
): void {
  if (!storage) return;

  const payload = JSON.stringify(tokens);
  if (tokens.remember) {
    storage.local.setItem(AUTH_TOKEN_KEY, payload);
    storage.session.removeItem(AUTH_TOKEN_KEY);
    return;
  }

  storage.session.setItem(AUTH_TOKEN_KEY, payload);
  storage.local.removeItem(AUTH_TOKEN_KEY);
}

export function clearStoredAuthTokens(storage: SessionStorageBag | null): void {
  if (!storage) return;
  storage.local.removeItem(AUTH_TOKEN_KEY);
  storage.session.removeItem(AUTH_TOKEN_KEY);
}

export function isStoredAuthTokensExpired(tokens: StoredAuthTokens, now: number): boolean {
  const expiresAt = new Date(tokens.expiresAt).getTime();
  if (Number.isNaN(expiresAt)) return true;
  return now >= expiresAt;
}
