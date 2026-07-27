import { appEnv, type AppEnvConfig } from "@/config/env";
import { createDemoAuthAdapter } from "./demo-auth-adapter";
import {
  createProductionAuthAdapter,
  type ProductionAuthAdapterOptions,
} from "./production-auth-adapter";
import type { AdminAuthAdapter } from "./types";

interface CreateAdminAuthAdapterOptions {
  demo?: Parameters<typeof createDemoAuthAdapter>[0];
  production?: ProductionAuthAdapterOptions;
}

export function createAdminAuthAdapter(
  config: AppEnvConfig = appEnv,
  options: CreateAdminAuthAdapterOptions = {},
): AdminAuthAdapter {
  return config.adminDemoMode
    ? createDemoAuthAdapter(options.demo)
    : createProductionAuthAdapter(config, options.production);
}
