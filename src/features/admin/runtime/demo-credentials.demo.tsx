import { AlertTriangle } from "lucide-react";
import { listMockAdminCredentials } from "@/features/admin/auth/mock-accounts";

type DemoCredential = ReturnType<typeof listMockAdminCredentials>[number];

export async function loadDemoCredentials() {
  return listMockAdminCredentials();
}

export function renderDemoCredentials(credentials: DemoCredential[]) {
  if (credentials.length === 0) return null;

  return (
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
  );
}
