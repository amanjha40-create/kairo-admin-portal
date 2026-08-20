import { describe, expect, it, vi } from "vitest";
import { submitUserActionMutation, submitUserNoteMutation } from "./user-mutation-submit";

describe("user mutation submit helpers", () => {
  it("submits note saves through mutate without touching mutateAsync", () => {
    const mutate = vi.fn();
    const mutateAsync = vi.fn();

    submitUserNoteMutation({ mutate }, "Needs review");

    expect(mutate).toHaveBeenCalledWith("Needs review");
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("submits account actions through mutate without touching mutateAsync", () => {
    const mutate = vi.fn();
    const mutateAsync = vi.fn();

    submitUserActionMutation({ mutate });

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
