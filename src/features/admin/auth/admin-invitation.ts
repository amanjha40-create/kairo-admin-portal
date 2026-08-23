export function readAdminInvitationToken(hash: string): string | null {
  if (!hash.startsWith("#")) return null;
  const token = new URLSearchParams(hash.slice(1)).get("token")?.trim();
  return token && token.length >= 32 ? token : null;
}

export function getAdminInvitationSetupError(
  fullName: string,
  password: string,
  confirmation: string,
): string | null {
  const hasSetupValue = Boolean(fullName.trim() || password || confirmation);
  if (!hasSetupValue) return null;
  if (!fullName.trim()) return "Enter your full name to create your Admin account.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password !== confirmation) return "Passwords do not match.";
  return null;
}
