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
    const lock = { current: false };

    submitUserActionMutation({ mutate }, lock);

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("blocks duplicate account actions until the current request settles", () => {
    let settle: (() => void) | undefined;
    const mutate = vi.fn((_value: void, options?: { onSettled?: () => void }) => {
      settle = options?.onSettled;
    });
    const lock = { current: false };

    expect(submitUserActionMutation({ mutate }, lock)).toBe(true);
    expect(submitUserActionMutation({ mutate }, lock)).toBe(false);
    expect(mutate).toHaveBeenCalledOnce();
    expect(lock.current).toBe(true);

    settle?.();
    expect(lock.current).toBe(false);
    expect(submitUserActionMutation({ mutate }, lock)).toBe(true);
    expect(mutate).toHaveBeenCalledTimes(2);
  });
});
