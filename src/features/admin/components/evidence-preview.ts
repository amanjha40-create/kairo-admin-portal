import type { EvidenceItem } from "../runtime/verification-review";

export type EvidencePreviewKind = "pdf" | "image" | "unsupported";

export type EvidencePreviewState =
  | { status: "loading"; url: null }
  | { status: "rendering" | "ready"; url: string }
  | { status: "error"; url: null };

export type EvidencePreviewAction =
  | { type: "load" }
  | { type: "url_received"; url: string }
  | { type: "rendered" }
  | { type: "failed" };

export function evidencePreviewReducer(
  state: EvidencePreviewState,
  action: EvidencePreviewAction,
): EvidencePreviewState {
  switch (action.type) {
    case "load":
      return { status: "loading", url: null };
    case "url_received":
      return { status: "rendering", url: action.url };
    case "rendered":
      return state.url ? { status: "ready", url: state.url } : { status: "error", url: null };
    case "failed":
      return { status: "error", url: null };
  }
}

export function getEvidencePreviewKind(
  item: Pick<EvidenceItem, "filename" | "mimeType">,
): EvidencePreviewKind {
  const mimeType = item.mimeType?.split(";", 1)[0]?.trim().toLowerCase();
  const extension = item.filename.split(".").pop()?.toLowerCase();

  if (mimeType === "application/pdf" || extension === "pdf") {
    return "pdf";
  }
  if (
    ["image/jpeg", "image/png", "image/webp"].includes(mimeType ?? "") ||
    ["jpg", "jpeg", "png", "webp"].includes(extension ?? "")
  ) {
    return "image";
  }
  return "unsupported";
}

export function isSafeEvidenceUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}
