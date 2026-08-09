import { ApiError } from "@/lib/api/errors";
import type { AdminAuthAdapter, AdminAuthRestoreResult } from "./types";

export function getAdminRestoreErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  return "The admin session could not be verified. Try again.";
}

export async function resolveAdminAuthSession(
  adapter: Pick<AdminAuthAdapter, "restoreSession">,
): Promise<AdminAuthRestoreResult> {
  try {
    return await adapter.restoreSession();
  } catch (error) {
    return {
      status: "error",
      error: getAdminRestoreErrorMessage(error),
    };
  }
}
