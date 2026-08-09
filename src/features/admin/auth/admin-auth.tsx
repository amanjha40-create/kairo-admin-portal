import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createAdminAuthAdapter } from "@/features/admin/runtime/auth";
import { resolveAdminAuthSession } from "./restore-session";
import type { AdminAccount, AdminAuthAdapter, AdminAuthStatus } from "./types";

export interface AdminAuthContextValue {
  status: AdminAuthStatus;
  account: AdminAccount | null;
  signedInAt: string | null;
  error: string | null;
  login: (
    email: string,
    password: string,
    remember: boolean,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: (reason?: "user" | "expired") => void;
  forgotPassword: (
    email: string,
  ) => Promise<{ ok: true; message?: string } | { ok: false; error: string }>;
  retrySession: () => void;
  mode: AdminAuthAdapter["mode"];
  isConfigured: boolean;
  notice: string | null;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const adapter = useMemo(() => createAdminAuthAdapter(), []);
  const [status, setStatus] = useState<AdminAuthStatus>("checking");
  const [account, setAccount] = useState<AdminAccount | null>(null);
  const [signedInAt, setSignedInAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoreAttempt, setRestoreAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    setStatus("checking");
    setError(null);

    void resolveAdminAuthSession(adapter).then((result) => {
      if (!active) return;

      if (result.status === "authenticated") {
        setAccount(result.account);
        setSignedInAt(result.signedInAt);
        setError(null);
        setStatus("authenticated");
        return;
      }

      setAccount(null);
      setSignedInAt(null);
      setError(result.status === "error" ? result.error : null);
      setStatus(result.status);
    });

    return () => {
      active = false;
    };
  }, [adapter, restoreAttempt]);

  const login = useCallback<AdminAuthContextValue["login"]>(
    async (email, password, remember) => {
      const result = await adapter.login(email, password, remember);
      if (!result.ok) return result;

      if (result.account && result.signedInAt) {
        setAccount(result.account);
        setSignedInAt(result.signedInAt);
        setError(null);
        setStatus("authenticated");
      }
      return { ok: true };
    },
    [adapter],
  );

  const logout = useCallback<AdminAuthContextValue["logout"]>(
    (reason = "user") => {
      void adapter.logout();
      setAccount(null);
      setSignedInAt(null);
      setError(null);
      setStatus(reason === "expired" ? "expired" : "unauthenticated");
    },
    [adapter],
  );

  const retrySession = useCallback<AdminAuthContextValue["retrySession"]>(() => {
    setRestoreAttempt((attempt) => attempt + 1);
  }, []);

  const forgotPassword = useCallback<AdminAuthContextValue["forgotPassword"]>(
    async (email) => adapter.forgotPassword(email),
    [adapter],
  );

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      status,
      account,
      signedInAt,
      error,
      login,
      logout,
      forgotPassword,
      retrySession,
      mode: adapter.mode,
      isConfigured: adapter.isConfigured,
      notice: adapter.notice,
    }),
    [status, account, signedInAt, error, login, logout, forgotPassword, retrySession, adapter],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used inside <AdminAuthProvider>.");
  return ctx;
}
