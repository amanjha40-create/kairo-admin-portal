// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CandidateVerificationOperationActions } from "./candidate-verification-operation-actions";

afterEach(cleanup);

describe("Candidate verification operation actions", () => {
  it("disables permission-denied operations and never launches them", () => {
    const launch = vi.fn();
    render(
      <CandidateVerificationOperationActions permissions={["users.view"]} onLaunch={launch} />,
    );

    for (const label of ["Court / Criminal", "In-person"]) {
      const button = screen.getByRole("button", { name: new RegExp(label) });
      expect((button as HTMLButtonElement).disabled).toBe(true);
      fireEvent.click(button);
      fireEvent.keyDown(button, { key: "Enter" });
      fireEvent.keyDown(button, { key: " " });
    }
    expect(launch).not.toHaveBeenCalled();
    expect(screen.getByText(/manage_court_check permission is required/)).toBeDefined();
    expect(screen.getByText(/perform_in_person_verification permission is required/)).toBeDefined();
  });

  it("launches only the permission-backed canonical operation", () => {
    const launch = vi.fn();
    render(
      <CandidateVerificationOperationActions
        permissions={["users.view", "manage_court_check", "perform_in_person_verification"]}
        onLaunch={launch}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Court \/ Criminal/ }));
    fireEvent.click(screen.getByRole("button", { name: /In-person/ }));
    fireEvent.click(screen.getByRole("button", { name: /Internal Report/ }));
    expect(launch.mock.calls).toEqual([["court"], ["in-person"], ["report"]]);
  });
});
