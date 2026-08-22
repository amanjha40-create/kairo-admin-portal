export type TrustSafetySubjectType = "user" | "verification_request" | "trust_registry_record";

export function buildTrustSafetyCreateHref(
  subjectType: TrustSafetySubjectType,
  subjectPublicId: string,
) {
  const params = new URLSearchParams({
    create: "1",
    subjectType,
    subjectPublicId,
  });
  return `/admin/risk?${params.toString()}`;
}
