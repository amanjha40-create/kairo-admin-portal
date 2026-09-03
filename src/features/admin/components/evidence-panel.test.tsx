import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../runtime/verification-review", () => ({
  EVIDENCE_DOC_LABEL: {
    experience_letter: "Experience letter",
    other: "Other supporting evidence",
  },
  formatFileSize: (value: number) => `${value} B`,
}));

vi.mock("@/components/ui/sheet", async () => {
  const { createElement: createTestElement } = await import("react");
  const Passthrough = ({ children }: { children?: ReactNode }) =>
    createTestElement("div", null, children);
  return {
    Sheet: Passthrough,
    SheetContent: Passthrough,
    SheetHeader: Passthrough,
    SheetTitle: Passthrough,
    SheetDescription: Passthrough,
  };
});

import { EvidencePreview } from "./evidence-panel";
import {
  evidencePreviewReducer,
  getEvidencePreviewKind,
  isSafeEvidenceUrl,
} from "./evidence-preview";
import type { EvidenceItem } from "../runtime/verification-review";

function evidence(overrides: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    id: "evidence-1",
    title: "Employment evidence",
    docType: "experience_letter",
    filename: "experience.pdf",
    mimeType: "application/pdf",
    uploadedAt: "2026-09-03T10:00:00Z",
    source: "candidate_upload",
    processingStatus: "processed",
    reviewStatus: "not_reviewed",
    attentionFlags: [],
    ...overrides,
  };
}

describe("Admin evidence inline preview", () => {
  it("renders a protected PDF preview container with a loading state", () => {
    const markup = renderToStaticMarkup(
      createElement(EvidencePreview, {
        item: evidence(),
        onRequestEvidenceUrl: vi.fn(async () => "https://documents.example.test/signed"),
        onOpenEvidence: vi.fn(async () => undefined),
      }),
    );

    expect(markup).toContain('data-evidence-preview="pdf"');
    expect(markup).toContain("Loading preview");
    expect(markup).toContain("Open in new tab");
    expect(markup).not.toContain("documents.example.test");
  });

  it.each([
    ["image/jpeg", "photo.bin"],
    ["image/png", "photo.bin"],
    ["image/webp", "photo.bin"],
    [undefined, "photo.jpg"],
    [undefined, "photo.jpeg"],
    [undefined, "photo.png"],
    [undefined, "photo.webp"],
  ])("recognizes supported image evidence (%s, %s)", (mimeType, filename) => {
    expect(getEvidencePreviewKind(evidence({ mimeType, filename }))).toBe("image");
  });

  it("renders an explicit fallback for unsupported files", () => {
    const markup = renderToStaticMarkup(
      createElement(EvidencePreview, {
        item: evidence({ filename: "archive.zip", mimeType: "application/zip" }),
        onRequestEvidenceUrl: vi.fn(async () => "https://documents.example.test/signed"),
        onOpenEvidence: vi.fn(async () => undefined),
      }),
    );

    expect(markup).toContain("Preview not supported");
    expect(markup).toContain("Open in new tab");
  });

  it("fails closed when evidence access is unavailable", () => {
    const markup = renderToStaticMarkup(
      createElement(EvidencePreview, {
        item: evidence(),
      }),
    );

    expect(markup).not.toContain("https://");
    expect(markup).not.toContain("Open in new tab");
  });

  it("supports load, render, failure, and retry state transitions", () => {
    const loading = evidencePreviewReducer({ status: "error", url: null }, { type: "load" });
    const rendering = evidencePreviewReducer(loading, {
      type: "url_received",
      url: "https://documents.example.test/signed",
    });
    const ready = evidencePreviewReducer(rendering, { type: "rendered" });
    const failed = evidencePreviewReducer(ready, { type: "failed" });
    const retried = evidencePreviewReducer(failed, { type: "load" });

    expect(loading).toEqual({ status: "loading", url: null });
    expect(rendering).toEqual({
      status: "rendering",
      url: "https://documents.example.test/signed",
    });
    expect(ready).toEqual({
      status: "ready",
      url: "https://documents.example.test/signed",
    });
    expect(failed).toEqual({ status: "error", url: null });
    expect(retried).toEqual({ status: "loading", url: null });
  });

  it("resets stale preview state before a different evidence item loads", () => {
    const previous = {
      status: "ready" as const,
      url: "https://documents.example.test/old-signed-url",
    };

    expect(evidencePreviewReducer(previous, { type: "load" })).toEqual({
      status: "loading",
      url: null,
    });
  });

  it("accepts only credential-free HTTPS evidence URLs", () => {
    expect(isSafeEvidenceUrl("https://documents.example.test/signed")).toBe(true);
    expect(isSafeEvidenceUrl("http://documents.example.test/signed")).toBe(false);
    expect(isSafeEvidenceUrl("https://user:password@documents.example.test/signed")).toBe(false);
    expect(isSafeEvidenceUrl("not-a-url")).toBe(false);
  });
});
