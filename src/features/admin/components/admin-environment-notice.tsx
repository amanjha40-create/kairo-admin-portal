import { AlertTriangle, DatabaseZap, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { appEnv, getAdminModeLabel } from "@/config/env";
import { DEMO_MODE_BUILD_ENABLED } from "@/features/admin/controlled-pilot";
import { loadDemoCredentials } from "@/features/admin/runtime/demo-credentials";
import { cn } from "@/lib/utils";
import { useAdminAuth } from "../auth/admin-auth";

type DemoCredential = {
  id: string;
  email: string;
  password: string;
  name: string;
  roleKey: string;
};

export function shouldLoadDemoCredentials(
  showDemoCredentials: boolean,
  authMode: "demo" | "production",
): boolean {
  return showDemoCredentials && authMode === "demo" && DEMO_MODE_BUILD_ENABLED;
}

export function AdminEnvironmentNotice({
  variant = "card",
  showDemoCredentials = false,
}: {
  variant?: "banner" | "card";
  showDemoCredentials?: boolean;
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
        {auth.mode === "demo" ? (
          <DatabaseZap aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-700" />
        ) : (
          <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-700" />
        )}
        <div className="min-w-0">
          <p className="font-semibold">
            {getAdminModeLabel()} on {appEnv.appEnv}
          </p>
          {auth.notice ? <p className="mt-1 text-amber-900/90">{auth.notice}</p> : null}
          {auth.mode === "demo" ? (
            <p className="mt-1 text-amber-900/90">
              Mock authentication, mock permissions, and deterministic mock operational data are
              enabled for local validation only.
            </p>
          ) : null}
        </div>
      </div>

      {shouldLoadDemoCredentials(showDemoCredentials, auth.mode) && credentials.length > 0 ? (
        <div className="w-full rounded-lg border border-amber-200/80 bg-white/70 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-700" />
            <div className="min-w-0">
              <p className="font-semibold">Local demo credentials</p>
              <p className="mt-1 text-xs text-amber-900/90">
                These accounts are development-only and must never be visible in production mode.
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-2 text-xs">
            {credentials.map((account) => (
              <div
                key={account.id}
                className="rounded-md border border-amber-100 bg-white/80 px-3 py-2"
              >
                <p className="font-medium text-slate-900">
                  {account.name} · {account.roleKey}
                </p>
                <p className="text-slate-700">{account.email}</p>
                <p className="font-mono text-slate-700">{account.password}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
