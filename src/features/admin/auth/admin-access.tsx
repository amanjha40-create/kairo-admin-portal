/**
 * Admin Access — derives the current admin identity from the mock auth
 * provider (`useAdminAuth`). The dev role switcher is DEV-only and only
 * lets you preview restricted-role UI while remaining logged in as the
 * real mock account.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Loader2, ShieldOff, TimerOff } from "lucide-react";
import { appEnv } from "@/config/env";
import type { AdminRoleKey, WorkflowPermission } from "../workflow/types";
import { ROLE_LABEL, permissionsForRole } from "../workflow/permissions";
import { useAdminAuth } from "./admin-auth";

/** Dev-only role override key; ignored in production builds. */
const DEV_ROLE_STORAGE_KEY = "kairo.admin.devRole";

export type AdminAccessState = "checking" | "granted" | "denied" | "expired" | "error";

export interface AdminIdentity {
  id?: string;
  name: string;
  email: string;
  /** Human-friendly label derived from `roleKey`. */
  role: string;
  roleKey: AdminRoleKey;
  initials: string;
  permissions: WorkflowPermission[];
}

export interface AdminAccess {
  state: AdminAccessState;
  admin?: AdminIdentity;
  error?: string | null;
}

/** Dev-only helpers for testing restricted roles. No-ops in production. */
export function getDevAdminRole(): AdminRoleKey | null {
  if (!import.meta.env.DEV || !appEnv.adminDemoMode) return null;
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(DEV_ROLE_STORAGE_KEY);
  const allowed: AdminRoleKey[] = [
    "admin",
    "operations_lead",
    "trust_safety",
    "reviewer",
    "read_only",
  ];
  return (allowed as string[]).includes(stored ?? "") ? (stored as AdminRoleKey) : null;
}
export function setDevAdminRole(role: AdminRoleKey | null) {
  if (!import.meta.env.DEV || !appEnv.adminDemoMode) return;
  if (typeof window === "undefined") return;
  if (role === null) window.localStorage.removeItem(DEV_ROLE_STORAGE_KEY);
  else window.localStorage.setItem(DEV_ROLE_STORAGE_KEY, role);
  window.dispatchEvent(new Event("kairo:dev-role-change"));
}

export function useAdminAccess(): AdminAccess {
  const auth = useAdminAuth();
  const [devRole, setDevRole] = useState<AdminRoleKey | null>(() => getDevAdminRole());

  useEffect(() => {
    if (!import.meta.env.DEV || !appEnv.adminDemoMode) return;
    const h = () => setDevRole(getDevAdminRole());
    window.addEventListener("kairo:dev-role-change", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("kairo:dev-role-change", h);
      window.removeEventListener("storage", h);
    };
  }, []);

  if (auth.status === "checking") return { state: "checking" };
  if (auth.status === "error") return { state: "error", error: auth.error };
  if (auth.status === "expired") return { state: "expired" };
  if (auth.status !== "authenticated" || !auth.account) return { state: "denied" };

  const usingDevRoleOverride = import.meta.env.DEV && appEnv.adminDemoMode && Boolean(devRole);
  const effectiveRole: AdminRoleKey =
    usingDevRoleOverride && devRole ? devRole : auth.account.roleKey;
  const effectivePermissions = usingDevRoleOverride
    ? permissionsForRole(effectiveRole)
    : auth.account.permissions;

  return {
    state: "granted",
    admin: {
      id: auth.account.id,
      name: auth.account.name,
      email: auth.account.email,
      roleKey: effectiveRole,
      role: usingDevRoleOverride ? ROLE_LABEL[effectiveRole] : auth.account.role,
      initials: auth.account.initials,
      permissions: effectivePermissions,
    },
  };
}

function CenteredState({
  icon,
  title,
  description,
  tone = "default",
}: {
  icon: ReactNode;
  title: string;
  description: string;
  tone?: "default" | "destructive" | "warning";
}) {
  const iconTone =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground";
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center">
        <div
          className={`mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted ${iconTone}`}
        >
          {icon}
        </div>
        <h1 className="text-base font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function AdminAccessChecking() {
  return (
    <CenteredState
      icon={<Loader2 aria-hidden className="size-5 animate-spin" />}
      title="Checking admin access"
      description="Verifying your session and permissions."
    />
  );
}
export function AdminAccessDenied() {
  return (
    <CenteredState
      icon={<ShieldOff aria-hidden className="size-5" />}
      title="Access denied"
      description="Your account does not have permission to access the Kairo Admin Portal."
      tone="destructive"
    />
  );
}
export function AdminAccessExpired() {
  return (
    <CenteredState
      icon={<TimerOff aria-hidden className="size-5" />}
      title="Admin session expired"
      description="For security, your admin session has ended. Sign in again to continue."
      tone="warning"
    />
  );
}

export function AdminAccessError({
  description,
  onRetry,
}: {
  description: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-destructive">
          <ShieldOff aria-hidden className="size-5" />
        </div>
        <h1 className="text-base font-semibold tracking-tight text-foreground">
          Admin session unavailable
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-[#0B2545] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0B2545]/92 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0FA8A5] focus-visible:ring-offset-2"
        >
          Retry session check
        </button>
      </div>
    </div>
  );
}
export function AdminPortalLoading() {
  return (
    <CenteredState
      icon={<Loader2 aria-hidden className="size-5 animate-spin" />}
      title="Loading admin portal"
      description="Preparing operational workspace."
    />
  );
}

/**
 * Kept for backwards compatibility. Route protection now lives in
 * `admin.tsx`, which redirects unauthenticated visitors to /admin/login.
 * This gate just renders a loading/denied state if it's ever nested inside
 * a route without a session.
 */
export function AdminAccessGate({ children }: { children: ReactNode }) {
  const access = useAdminAccess();
  const auth = useAdminAuth();
  if (access.state === "checking") return <AdminAccessChecking />;
  if (access.state === "error") {
    return (
      <AdminAccessError
        description={access.error ?? "The admin session could not be verified. Try again."}
        onRetry={auth.retrySession}
      />
    );
  }
  if (access.state === "denied") return <AdminAccessDenied />;
  if (access.state === "expired") return <AdminAccessExpired />;
  return <>{children}</>;
}
