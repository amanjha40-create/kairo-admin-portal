import { DatabaseZap, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { appEnv, getAdminModeLabel } from "@/config/env";
import {
  loadDemoCredentials,
  renderDemoCredentials,
} from "@/features/admin/runtime/demo-credentials";
import { cn } from "@/lib/utils";
import { useAdminAuth } from "../auth/admin-auth";

type DemoCredential = Awaited<ReturnType<typeof loadDemoCredentials>>[number];

const DEMO_RUNTIME_AVAILABLE =
  typeof __KAIRO_ADMIN_DEMO_MODE__ !== "undefined"
    ? __KAIRO_ADMIN_DEMO_MODE__
    : import.meta.env.VITE_ADMIN_DEMO_MODE === "true";

export function shouldLoadDemoCredentials(
  showDemoCredentials: boolean,
  authMode: "demo" | "production",
): boolean {
  return showDemoCredentials && authMode === "demo" && DEMO_RUNTIME_AVAILABLE;
}

function shouldShowAdminEnvironmentNotice(): boolean {
  return appEnv.appEnv !== "production";
}

export function AdminEnvironmentNotice({
  variant = "card",
  showDemoCredentials = false,
}: {
  variant?: "banner" | "card";
  showDemoCredentials?: boolean;
}) {
  if (!shouldShowAdminEnvironmentNotice()) return null;

  return (
    <AdminEnvironmentNoticeContent variant={variant} showDemoCredentials={showDemoCredentials} />
  );
}

function AdminEnvironmentNoticeContent({
  variant,
  showDemoCredentials,
}: {
  variant: "banner" | "card";
  showDemoCredentials: boolean;
}) {
  const auth = useAdminAuth();
  const [credentials, setCredentials] = useState<DemoCredential[]>([]);

  useEffect(() => {
    if (!shouldLoadDemoCredentials(showDemoCredentials, auth.mode)) {
      setCredentials([]);
      return;
    }

    let active = true;
    void loadDemoCredentials().then((loadedCredentials) => {
      if (!active) return;
      setCredentials(loadedCredentials);
    });

    return () => {
      active = false;
    };
  }, [auth.mode, showDemoCredentials]);

  return (
    <section
      className={cn(
        variant === "banner"
          ? "flex flex-wrap items-start gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900"
          : "rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">
        {DEMO_RUNTIME_AVAILABLE && auth.mode === "demo" ? (
          <DatabaseZap aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-700" />
        ) : (
          <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-700" />
        )}
        <div className="min-w-0">
          <p className="font-semibold">
            {getAdminModeLabel()} on {appEnv.appEnv}
          </p>
          {auth.notice ? <p className="mt-1 text-amber-900/90">{auth.notice}</p> : null}
          {DEMO_RUNTIME_AVAILABLE && auth.mode === "demo" ? (
            <p className="mt-1 text-amber-900/90">
              Mock authentication, mock permissions, and deterministic mock operational data are
              enabled for local validation only.
            </p>
          ) : null}
        </div>
      </div>

      {shouldLoadDemoCredentials(showDemoCredentials, auth.mode)
        ? renderDemoCredentials(credentials)
        : null}
    </section>
  );
}
