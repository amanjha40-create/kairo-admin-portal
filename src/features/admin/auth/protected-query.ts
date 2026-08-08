import type { AdminAccessState } from "./admin-access";

export function shouldEnableAdminProtectedQuery(state: AdminAccessState): boolean {
  return state === "granted";
}
