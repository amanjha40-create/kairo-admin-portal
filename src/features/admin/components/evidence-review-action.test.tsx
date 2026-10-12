// @vitest-environment jsdom
import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EvidenceReviewAction } from "./evidence-review-action";
import { evidenceReviewProgress } from "../workflow/evidence-review";

afterEach(cleanup);
const evidence = { id: "synthetic-evidence", reviewed: false, reviewApplicable: true };
function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function confirm() {
  fireEvent.click(screen.getByRole("checkbox"));
}

describe("evidence review DOM interaction", () => {
  it("requires actual inspection confirmation, sends once and announces pending", async () => {
    const request = deferred();
    const review = vi.fn(() => request.promise);
    render(<EvidenceReviewAction item={evidence} canReview inspectable onReview={review} />);
    const button = screen.getByRole("button", { name: "Mark as reviewed" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    confirm();
    fireEvent.click(button);
    fireEvent.click(button);
    expect(review).toHaveBeenCalledOnce();
    expect(review).toHaveBeenCalledWith(evidence.id);
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("status").textContent).toContain("Saving review and refreshing case");
    expect(screen.getByRole("status").textContent).toContain("Not reviewed");
    await act(async () => {
      request.resolve();
      await request.promise;
    });
    expect(screen.getByRole("status").textContent).toContain("Not reviewed");
  });
  it("cannot attest inspection before the preview is available", () => {
    render(
      <EvidenceReviewAction item={evidence} canReview inspectable={false} onReview={vi.fn()} />,
    );
    expect((screen.getByRole("checkbox") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  });
  it("keeps unreviewed truth after failure and shows no raw error", async () => {
    const review = vi.fn(async () => {
      throw new Error("private raw payload");
    });
    render(<EvidenceReviewAction item={evidence} canReview inspectable onReview={review} />);
    confirm();
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(screen.getByRole("status").textContent).toContain("Not reviewed");
    expect(screen.getByRole("alert").textContent).not.toContain("private raw payload");
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
  });
  it("renders success only from authoritative parent refresh, not the promise alone", async () => {
    const view = render(
      <EvidenceReviewAction
        item={evidence}
        canReview
        inspectable
        onReview={vi.fn(async () => {})}
      />,
    );
    confirm();
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(screen.getByRole("status").textContent).toContain("Not reviewed");
    view.rerender(
      <EvidenceReviewAction
        item={{ ...evidence, reviewed: true, reviewedAt: "2026-10-12T12:00:00Z" }}
        canReview
        inspectable
      />,
    );
    expect(screen.getByRole("status").textContent).toContain("Reviewed at");
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("persists backend truth across drawer unmount/reopen and returns to unreviewed after replacement", () => {
    const reviewed = { ...evidence, reviewed: true, reviewedAt: "2026-10-12T12:00:00Z" };
    const first = render(<EvidenceReviewAction item={reviewed} canReview inspectable />);
    first.unmount();
    const second = render(<EvidenceReviewAction item={reviewed} canReview inspectable />);
    expect(screen.getByRole("status").textContent).toContain("Reviewed at");
    second.rerender(
      <EvidenceReviewAction
        key="replacement"
        item={evidence}
        canReview
        inspectable
        onReview={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Mark as reviewed" })).toBeDefined();
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
  });
  it("updates two-item progress only after each authoritative refresh, never finalizes", async () => {
    const finalize = vi.fn();
    const review = vi.fn(async () => {});
    function Harness() {
      const [items, setItems] = useState([evidence, { ...evidence, id: "second" }]);
      const [index, setIndex] = useState(0);
      const progress = evidenceReviewProgress(items);
      return (
        <>
          <output>
            {progress.reviewed} of {progress.required}
          </output>
          <EvidenceReviewAction
            key={items[index].id}
            item={items[index]}
            canReview
            inspectable
            onReview={async (id) => {
              await review();
              setItems((old) =>
                old.map((item) => (item.id === id ? { ...item, reviewed: true } : item)),
              );
            }}
          />
          <button onClick={() => setIndex(1)}>Second item</button>
          <button onClick={finalize} disabled={progress.reviewed < progress.required}>
            Finalize
          </button>
        </>
      );
    }
    render(<Harness />);
    expect((screen.getByRole("button", { name: "Finalize" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    confirm();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Mark as reviewed" }));
    });
    expect(screen.getByText("1 of 2")).toBeDefined();
    expect((screen.getByRole("button", { name: "Finalize" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.click(screen.getByRole("button", { name: "Second item" }));
    confirm();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Mark as reviewed" }));
    });
    expect(screen.getByText("2 of 2")).toBeDefined();
    expect(review).toHaveBeenCalledTimes(2);
    expect(finalize).not.toHaveBeenCalled();
  });
});
