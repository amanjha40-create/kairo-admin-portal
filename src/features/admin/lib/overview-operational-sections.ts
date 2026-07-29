import type { AppEnvConfig } from "@/config/env";
import type { Deployment } from "@/features/admin/mock-data/system";

export function shouldShowOverviewDemoOperationalSections(config: AppEnvConfig): boolean {
  return config.adminDemoMode;
}

export function getOverviewRecentDeployment(deployments: readonly Deployment[]): Deployment | null {
  return deployments[0] ?? null;
}
