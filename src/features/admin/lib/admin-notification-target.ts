export type AdminTarget =
  | { kind: "verification"; id: string }
  | { kind: "user"; id: string }
  | { kind: "notification"; id: string };

export function resolveAdminNotificationTarget(
  metadata: Record<string, unknown> | null | undefined,
  fallbackNotificationId?: string,
): AdminTarget | null {
  const verificationRequestId = coerceString(metadata?.verification_request_public_id);
  if (verificationRequestId) {
    return { kind: "verification", id: verificationRequestId };
  }

  const candidateUserId = coerceString(metadata?.candidate_user_public_id);
  if (candidateUserId) {
    return { kind: "user", id: candidateUserId };
  }

  if (fallbackNotificationId) {
    return { kind: "notification", id: fallbackNotificationId };
  }

  return null;
}

function coerceString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
