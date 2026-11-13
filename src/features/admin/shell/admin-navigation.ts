import { hasPermission } from "../workflow/permissions";
import type { WorkflowPermission } from "../workflow/types";

export interface AdminNavDefinition {
  label: string;
  to: string;
  description: string;
  requiredPermission?: WorkflowPermission;
}

export const ADMIN_NAV: AdminNavDefinition[] = [
  {
    label: "Overview",
    to: "/admin",
    description: "Growth, operations and urgent activity",
  },
  {
    label: "Verifications",
    to: "/admin/verifications",
    description: "Verification queue, cases and tasks",
  },
  {
    label: "Users",
    to: "/admin/users",
    description: "Candidate accounts and profiles",
    requiredPermission: "users.view",
  },
  {
    label: "Clients",
    to: "/admin/registry/organizations",
    description: "Customer workspaces, People and operations",
    requiredPermission: "registry.manage",
  },
  {
    label: "Organization Directory",
    to: "/admin/registry",
    description: "Real-world company and institution records",
    requiredPermission: "registry.manage",
  },
  {
    label: "Communications",
    to: "/admin/communications",
    description: "Outreach, email delivery and templates",
    requiredPermission: "communications.view",
  },
  {
    label: "Risk",
    to: "/admin/risk",
    description: "Trust & Safety investigations, duplicates, document anomalies",
    requiredPermission: "risk.view",
  },
  {
    label: "System",
    to: "/admin/system",
    description: "Platform health, roles and configuration",
    requiredPermission: "system.view",
  },
];

export function visibleAdminNavItems(permissions: WorkflowPermission[]): AdminNavDefinition[] {
  return ADMIN_NAV.filter(
    (item) =>
      item.requiredPermission === undefined || hasPermission(permissions, item.requiredPermission),
  );
}
