import { buildAdminLoginRedirect } from "./redirects";
import type { AdminAuthStatus } from "./types";

export type AdminRouterView = "checking" | "public" | "shell" | "denied" | "error" | "redirecting";

export function getAdminRouterRedirect(
  status: AdminAuthStatus,
  pathname: string,
  isPublic: boolean,
): { to: "/admin" | "/admin/login"; search?: { redirect?: string } } | null {
  if (status === "authenticated" && isPublic) {
    return { to: "/admin" };
  }

  if ((status === "unauthenticated" || status === "expired") && !isPublic) {
    return {
      to: "/admin/login",
      search: { redirect: buildAdminLoginRedirect(pathname) },
    };
  }

  return null;
}

export function getAdminRouterView(status: AdminAuthStatus, isPublic: boolean): AdminRouterView {
  if (status === "checking") return "checking";
  if (isPublic) {
    return status === "authenticated" ? "checking" : "public";
  }

  if (status === "forbidden") return "denied";
  if (status === "error") return "error";
  if (status === "unauthenticated" || status === "expired") return "redirecting";
  if (status === "authenticated") return "shell";

  return "denied";
}
