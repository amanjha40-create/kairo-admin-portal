import { ApiError } from "@/lib/api/errors";

export function getOperationError(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  const payload = error.details as
    { error?: { code?: string; message?: string }; detail?: string } | undefined;
  return payload?.error?.message ?? payload?.detail ?? error.message ?? fallback;
}

export function getOperationErrorCode(error: unknown) {
  if (!(error instanceof ApiError)) return null;
  const payload = error.details as { error?: { code?: string } } | undefined;
  return payload?.error?.code ?? error.code;
}
