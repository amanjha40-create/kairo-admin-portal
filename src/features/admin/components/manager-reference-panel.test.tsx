// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ManagerReferencePanel } from "./manager-reference-panel";
import type { EmploymentReferencesOverview } from "../data/employment-references";
import type { WorkflowPermission } from "../workflow/types";

afterEach(cleanup);

const dispatchPermission: WorkflowPermission[] = ["verification.approve_outreach"];

function overview(
  overrides: Partial<EmploymentReferencesOverview["reportingManager"]> = {},
): EmploymentReferencesOverview {
  return {
    employmentId: "employment-1",
    completedCount: overrides.status === "completed" ? 2 : 1,
    totalCount: 2,
    hrReference: { status: "completed", completedAt: "2026-10-11T08:00:00Z" },
    reportingManager: {
      status: "ready_to_invite",
      nominationId: "nomination-1",
      relationshipConfirmedByHr: true,
      completedAt: null,
      invitationSentAt: null,
      invitationExpiresAt: null,
      invitationBlockedReason: null,
      ...overrides,
    },
    managerContactProvenance: "hr_confirmed",
    invitation: null,
  };
}

function renderPanel({
  references = overview(),
  permissions = dispatchPermission,
  caseStatus = "verified" as const,
  canonicalEmploymentStatus = "verified",
  onSend = vi.fn(async () => {}),
}: {
  references?: EmploymentReferencesOverview;
  permissions?: WorkflowPermission[];
  caseStatus?: "verified" | "pending_admin_quality_review";
  canonicalEmploymentStatus?: string;
  onSend?: (idempotencyKey: string) => Promise<void>;
} = {}) {
  render(
    <ManagerReferencePanel
      references={references}
      isLoading={false}
      isError={false}
      caseStatus={caseStatus}
      canonicalEmploymentStatus={canonicalEmploymentStatus}
      permissions={permissions}
      onRetry={vi.fn()}
      onSend={onSend}
      createIdempotencyKey={() => "11111111-1111-4111-8111-111111111111"}
    />,
  );
  return { onSend };
}

describe("Reporting manager invitation panel", () => {
  it("shows the action only for a finalized READY_TO_INVITE reference", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: "Send reference request" })).toBeDefined();
    expect(screen.getByText("Confirmed by employer")).toBeDefined();
    expect(screen.getByText("Ready to invite")).toBeDefined();
  });

  it.each([
    ["non-finalized", overview(), dispatchPermission, "pending_admin_quality_review", "pending"],
    [
      "manager unconfirmed",
      overview({ relationshipConfirmedByHr: false }),
      dispatchPermission,
      "verified",
      "verified",
    ],
    [
      "active invitation",
      overview({ status: "invitation_sent", invitationSentAt: "2026-10-12T09:00:00Z" }),
      dispatchPermission,
      "verified",
      "verified",
    ],
    [
      "completed reference",
      overview({ status: "completed", completedAt: "2026-10-12T10:00:00Z" }),
      dispatchPermission,
      "verified",
      "verified",
    ],
    ["unauthorized operator", overview(), [], "verified", "verified"],
  ])("hides the primary send action when %s", (_, references, permissions, status, canonical) => {
    renderPanel({
      references,
      permissions: permissions as WorkflowPermission[],
      caseStatus: status as "verified" | "pending_admin_quality_review",
      canonicalEmploymentStatus: canonical,
    });
    expect(screen.queryByRole("button", { name: "Send reference request" })).toBeNull();
  });

  it("opens confirmation and cancel performs no mutation", () => {
    const onSend = vi.fn(async () => {});
    renderPanel({ onSend });
    fireEvent.click(screen.getByRole("button", { name: "Send reference request" }));
    expect(screen.getByRole("alertdialog")).toBeDefined();
    expect(screen.getByText("Send reference request?")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onSend).not.toHaveBeenCalled();
  });

  it("confirms exactly one mutation and blocks rapid duplicate clicks", async () => {
    let resolve!: () => void;
    const pending = new Promise<void>((done) => {
      resolve = done;
    });
    const onSend = vi.fn(() => pending);
    renderPanel({ onSend });
    fireEvent.click(screen.getByRole("button", { name: "Send reference request" }));
    const confirm = screen.getByRole("button", { name: "Send request" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(onSend).toHaveBeenCalledOnce();
    expect(onSend).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111");
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    expect(confirm.getAttribute("aria-busy")).toBe("true");
    await act(async () => {
      resolve();
      await pending;
    });
  });

  it("shows a safe error and never renders tokens or private links", async () => {
    const onSend = vi.fn(async () => {
      throw new Error("provider token=https://secret.example.test/private");
    });
    renderPanel({ onSend });
    fireEvent.click(screen.getByRole("button", { name: "Send reference request" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send request" }));
    });
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("could not be confirmed");
    expect(alert.textContent).not.toContain("secret.example.test");
    expect(document.body.textContent).not.toContain("provider token");
  });

  it("fails closed when authoritative reference state cannot load", () => {
    render(
      <ManagerReferencePanel
        isLoading={false}
        isError
        caseStatus="verified"
        canonicalEmploymentStatus="verified"
        permissions={dispatchPermission}
        onRetry={vi.fn()}
        onSend={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain("References could not be loaded");
    expect(screen.queryByRole("button", { name: "Send reference request" })).toBeNull();
  });
});
