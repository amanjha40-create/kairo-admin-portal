import type { AdminAuthAdapter } from "./types";
import { resolveAdminAuthSession } from "./restore-session";

export async function resolveAdminLandingPath(
  adapter: AdminAuthAdapter,
): Promise<"/admin" | "/admin/login"> {
  const result = await resolveAdminAuthSession(adapter);
  return result.status === "authenticated" ||
    result.status === "forbidden" ||
    result.status === "error"
    ? "/admin"
    : "/admin/login";
}
