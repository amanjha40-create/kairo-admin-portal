import { appEnv, type AppEnvConfig } from "@/config/env";
import { DEMO_MODE_BUILD_ENABLED } from "@/features/admin/controlled-pilot";
import {
  createProductionAuthAdapter,
  type ProductionAuthAdapterOptions,
} from "./production-auth-adapter";
import type { DemoAuthAdapterOptions } from "./demo-auth-adapter";
import type { AdminAuthAdapter } from "./types";

type DemoAuthAdapterModule = typeof import("./demo-auth-adapter");

const demoAuthAdapterModule: DemoAuthAdapterModule | null = DEMO_MODE_BUILD_ENABLED
  ? await import("./demo-auth-adapter")
  : null;

interface CreateAdminAuthAdapterOptions {
  demo?: DemoAuthAdapterOptions;
  production?: ProductionAuthAdapterOptions;
}

export function createAdminAuthAdapter(
  config: AppEnvConfig = appEnv,
  options: CreateAdminAuthAdapterOptions = {},
): AdminAuthAdapter {
  if (config.adminDemoMode) {
    if (!demoAuthAdapterModule) {
      throw new Error("Demo auth is unavailable in this production build.");
    }
    return demoAuthAdapterModule.createDemoAuthAdapter(options.demo);
  }

  return createProductionAuthAdapter(config, options.production);
}
