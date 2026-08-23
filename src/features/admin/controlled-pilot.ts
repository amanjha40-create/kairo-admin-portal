import { appEnv, type AppEnvConfig } from "@/config/env";

export const DEMO_MODE_BUILD_ENABLED =
  typeof __KAIRO_ADMIN_DEMO_MODE__ !== "undefined"
    ? __KAIRO_ADMIN_DEMO_MODE__
    : import.meta.env.MODE === "test";

export type ControlledPilotSection = "Users" | "Communications" | "Risk" | "System";

export const CONTROLLED_PILOT_UNAVAILABLE_MESSAGE =
  "This section is not available in the controlled pilot yet.";

export function isControlledPilotSectionAvailable(config: AppEnvConfig = appEnv): boolean {
  return config.adminDemoMode;
}

export function getControlledPilotUnavailableDescription(section: ControlledPilotSection): string {
  return `${CONTROLLED_PILOT_UNAVAILABLE_MESSAGE} ${section} remains in Demo Mode only until the backend integration is completed.`;
}
