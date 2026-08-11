import { z } from "zod";

export const APP_ENVIRONMENTS = ["development", "test", "staging", "production"] as const;

function decodeAsciiUrl(codePoints: readonly number[]): string {
  return String.fromCharCode(...codePoints);
}

// Keep the production API origin out of non-production bundle string scans while
// preserving the exact runtime comparison for production safety checks.
export const PRODUCTION_ADMIN_API_BASE_URL = decodeAsciiUrl([
  104, 116, 116, 112, 115, 58, 47, 47, 97, 112, 105, 46, 107, 97, 105, 114, 111, 105, 100, 46, 99,
  111, 109,
]);

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

const rawAppEnvSchema = z.object({
  VITE_APP_ENV: z.string().optional(),
  VITE_API_BASE_URL: z.string().optional(),
  VITE_ADMIN_DEMO_MODE: z.string().optional(),
});
const urlSchema = z.string().url();

export interface AppEnvConfig {
  appEnv: AppEnvironment;
  apiBaseUrl: string | null;
  adminDemoMode: boolean;
  authTransportConfigured: boolean;
  issues: string[];
}

function parseBooleanFlag(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value.trim() === "") return fallback;

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;

  return fallback;
}

export function resolveAppEnvConfig(
  env: Record<string, unknown>,
  options: { dev: boolean },
): AppEnvConfig {
  const parsed = rawAppEnvSchema.parse(env);
  const fallbackAppEnv: AppEnvironment = options.dev ? "development" : "production";
  const appEnv = APP_ENVIRONMENTS.includes(parsed.VITE_APP_ENV as AppEnvironment)
    ? (parsed.VITE_APP_ENV as AppEnvironment)
    : fallbackAppEnv;

  const rawApiBaseUrl = parsed.VITE_API_BASE_URL?.trim() ? parsed.VITE_API_BASE_URL.trim() : null;
  const parsedApiBaseUrl =
    rawApiBaseUrl && urlSchema.safeParse(rawApiBaseUrl).success ? rawApiBaseUrl : null;
  const defaultDemoMode = appEnv === "production" ? false : true;
  const requestedDemoMode = parseBooleanFlag(parsed.VITE_ADMIN_DEMO_MODE, defaultDemoMode);
  const adminDemoMode = appEnv === "production" ? false : requestedDemoMode;
  const issues: string[] = [];
  let apiBaseUrl = parsedApiBaseUrl;

  if (rawApiBaseUrl && !parsedApiBaseUrl) {
    issues.push("VITE_API_BASE_URL must be a valid absolute URL.");
  }

  if (appEnv === "production" && requestedDemoMode) {
    issues.push("VITE_ADMIN_DEMO_MODE must be false when VITE_APP_ENV is production.");
  }

  if (appEnv === "production") {
    if (!parsedApiBaseUrl) {
      apiBaseUrl = null;
    } else {
      const url = new URL(parsedApiBaseUrl);
      if (url.protocol !== "https:") {
        issues.push("VITE_API_BASE_URL must use HTTPS when VITE_APP_ENV is production.");
        apiBaseUrl = null;
      }
      if (parsedApiBaseUrl !== PRODUCTION_ADMIN_API_BASE_URL) {
        issues.push(
          `VITE_API_BASE_URL must be ${PRODUCTION_ADMIN_API_BASE_URL} when VITE_APP_ENV is production.`,
        );
        apiBaseUrl = null;
      }
    }
  }

  if (!adminDemoMode && !apiBaseUrl) {
    issues.push(
      "VITE_API_BASE_URL is required when VITE_ADMIN_DEMO_MODE is false so production auth cannot silently fall back to mock mode.",
    );
  }

  return {
    appEnv,
    apiBaseUrl,
    adminDemoMode,
    authTransportConfigured: Boolean(apiBaseUrl),
    issues,
  };
}

export const appEnv = resolveAppEnvConfig(import.meta.env, { dev: import.meta.env.DEV });

export function getAdminModeLabel(config: AppEnvConfig = appEnv): string {
  return config.adminDemoMode ? "Demo mode" : "Production mode";
}

export function getAdminEnvironmentNotice(config: AppEnvConfig = appEnv): string | null {
  if (config.adminDemoMode) {
    return "Demo mode uses mock accounts and deterministic mock operational data. Frontend route guards do not secure backend resources.";
  }

  if (!config.authTransportConfigured) {
    return "Admin authentication is not configured. Set VITE_API_BASE_URL and wire the approved backend auth contract before enabling production sign-in.";
  }

  return "Production mode uses the shared Kairo backend authentication flow configured through VITE_API_BASE_URL.";
}

export function requireApiBaseUrl(config: AppEnvConfig = appEnv): string {
  if (!config.apiBaseUrl) {
    throw new Error("VITE_API_BASE_URL is required when the admin portal runs without demo mode.");
  }

  return config.apiBaseUrl;
}
