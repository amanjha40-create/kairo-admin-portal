import { useEffect } from "react";
import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  AdminAccessChecking,
  AdminAccessDenied,
  AdminAccessError,
} from "@/features/admin/auth/admin-access";
import { AdminAuthProvider, useAdminAuth } from "@/features/admin/auth/admin-auth";
import { getAdminRouterRedirect, getAdminRouterView } from "@/features/admin/auth/router-state";
import { AdminShell } from "@/features/admin/shell/admin-shell";

const PUBLIC_ADMIN_ROUTES = new Set<string>(["/admin/login", "/admin/forgot-password"]);

function isPublicAdminPath(pathname: string): boolean {
  const trimmed = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  return PUBLIC_ADMIN_ROUTES.has(trimmed);
}

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Kairo Operations" },
      { name: "description", content: "Kairo Operations — internal trust infrastructure." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AdminAuthProvider>
      <AdminRouter />
    </AdminAuthProvider>
  );
}

function AdminRouter() {
  const auth = useAdminAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublic = isPublicAdminPath(pathname);
  const redirect = getAdminRouterRedirect(auth.status, pathname, isPublic);
  const view = getAdminRouterView(auth.status, isPublic);

  useEffect(() => {
    if (!redirect) return;
    navigate({
      to: redirect.to,
      replace: true,
      search: redirect.search,
    });
  }, [navigate, redirect]);

  if (view === "checking" || view === "redirecting") return <AdminAccessChecking />;
  if (view === "public") return <Outlet />;
  if (view === "denied") return <AdminAccessDenied />;
  if (view === "error") {
    return (
      <AdminAccessError
        description={
          auth.error ?? "The admin session could not be verified. Try again to continue."
        }
        onRetry={auth.retrySession}
      />
    );
  }

  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
