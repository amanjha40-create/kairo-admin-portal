import { appEnv, type AppEnvConfig } from "@/config/env";
import {
  createProductionAuthAdapter,
  type ProductionAuthAdapterOptions,
} from "@/features/admin/auth/production-auth-adapter";
import type { AdminAuthAdapter } from "@/features/admin/auth/types";

interface CreateAdminAuthAdapterOptions {
  production?: ProductionAuthAdapterOptions;
}

export function createAdminAuthAdapter(
  config: AppEnvConfig = appEnv,
  options: CreateAdminAuthAdapterOptions = {},
): AdminAuthAdapter {
  return createProductionAuthAdapter(config, options.production);
}
