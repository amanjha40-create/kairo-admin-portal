import { useRef, useState } from "react";
import type { EvidenceReviewMetadata } from "../workflow/evidence-review";
import { createEvidenceReviewSubmit, evidenceReviewError } from "../workflow/evidence-review";

export function EvidenceReviewAction({
  item,
  canReview,
  inspectable,
  onReview,
}: {
  item: EvidenceReviewMetadata & { id: string };
  canReview: boolean;
  inspectable: boolean;
  onReview?: (evidenceId: string) => Promise<void>;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = useRef(createEvidenceReviewSubmit());

  async function review() {
    if (
      !confirmed ||
      !inspectable ||
      !canReview ||
      item.reviewed ||
      !item.reviewApplicable ||
      !onReview
    )
      return;
    await submit.current(async () => {
      setPending(true);
      setError(null);
      try {
        await onReview(item.id);
      } catch (failure) {
        setError(evidenceReviewError(failure));
      } finally {
        setPending(false);
        setConfirmed(false);
      }
    });
  }

  return (
    <section
      aria-label="Evidence inspection"
      className="rounded-md border border-border p-3 text-sm"
    >
      <div role="status" aria-live="polite" aria-atomic="true">
        <p className="font-semibold">{item.reviewed ? "Reviewed" : "Not reviewed"}</p>
        {item.reviewed && item.reviewedAt ? (
          <p className="mt-1 break-words text-xs text-muted-foreground">
            Reviewed at{" "}
            <time dateTime={item.reviewedAt}>{new Date(item.reviewedAt).toLocaleString()}</time>
          </p>
        ) : null}
        {pending ? <p>Saving review and refreshing case...</p> : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Review records inspection only. It does not accept evidence or finalize the case.
      </p>
      {!item.reviewApplicable ? (
        <p className="mt-2 text-xs">Not applicable to current review progress.</p>
      ) : null}
      {!item.reviewed && item.reviewApplicable && canReview && onReview ? (
        <div className="mt-3 space-y-3">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={pending || !inspectable}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1 shrink-0 accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            />
            <span>
              I inspected this evidence and confirmed it is readable, belongs to this case, and is
              appropriate for review.
            </span>
          </label>
          {!inspectable ? (
            <p className="text-xs">
              Load the preview or open the evidence to inspect it before marking it reviewed.
            </p>
          ) : null}
          <button
            type="button"
            disabled={pending || !confirmed || !inspectable}
            aria-busy={pending}
            onClick={() => void review()}
            className="inline-flex min-h-10 max-w-full items-center justify-center rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {pending ? "Saving review..." : "Mark as reviewed"}
          </button>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}
