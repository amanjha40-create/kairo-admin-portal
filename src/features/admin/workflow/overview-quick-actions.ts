import type { WorkflowPermission } from "./types";
import { hasPermission } from "./permissions";

export function canFindCandidatesFromOverview(permissions: WorkflowPermission[]): boolean {
  return hasPermission(permissions, "users.view");
}
