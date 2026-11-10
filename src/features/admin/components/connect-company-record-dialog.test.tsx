// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  items: [] as Array<Record<string, unknown>>,
  connect: vi.fn(),
  createAndConnect: vi.fn(),
}));

vi.mock("@/features/admin/data/organizations", () => ({
  company360Keys: { all: () => ["company360"] },
  createCompany360DataAdapter: () => ({
    connectCompanyRecord: mocks.connect,
    createAndConnectCompanyRecord: mocks.createAndConnect,
  }),
}));

vi.mock("@/features/admin/data/registry", () => ({
  getRegistryOrgTypeLabel: (value: string) => value,
  registryKeys: { all: () => ["registry"] },
  registryListQueryOptions: () => ({
    queryKey: ["registry", "dialog-test", mocks.items.length],
    queryFn: async () => ({
      items: mocks.items,
      total: mocks.items.length,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    }),
  }),
}));

import { ConnectCompanyRecordDialog } from "./connect-company-record-dialog";

afterEach(cleanup);

beforeEach(() => {
  mocks.items = [];
  mocks.connect.mockReset();
  mocks.createAndConnect.mockReset();
});

function renderDialog(onOpenChange = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ConnectCompanyRecordDialog
        open
        organizationId="11111111-1111-1111-1111-111111111111"
        organizationName="Example Client"
        organizationType="employer"
        domain="example.test"
        website="https://example.test"
        onOpenChange={onOpenChange}
      />
    </QueryClientProvider>,
  );
  return onOpenChange;
}

describe("Connect company record dialog", () => {
  it("connects an explicitly reviewed existing record", async () => {
    mocks.items = [
      {
        id: "22222222-2222-2222-2222-222222222222",
        canonicalName: "Example Client Limited",
        state: "unverified",
        orgType: "private_company",
        domain: "example.test",
        website: "https://example.test",
        country: "IN",
      },
    ];
    mocks.connect.mockResolvedValue({
      created: false,
      alreadyConnected: false,
      recordName: "Example Client Limited",
    });
    renderDialog();

    fireEvent.click(await screen.findByRole("button", { name: /Example Client Limited/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review connection" }));
    fireEvent.click(screen.getByRole("button", { name: "Connect company record" }));

    await waitFor(() => expect(mocks.connect).toHaveBeenCalledOnce());
    expect(mocks.connect.mock.calls[0].slice(0, 2)).toEqual([
      "11111111-1111-1111-1111-111111111111",
      "22222222-2222-2222-2222-222222222222",
    ]);
  });

  it("requires missing fields and creates a Draft record only after confirmation", async () => {
    mocks.createAndConnect.mockResolvedValue({
      created: true,
      alreadyConnected: false,
      recordName: "Example Client",
    });
    renderDialog();

    fireEvent.click(await screen.findByRole("button", { name: "Create company record" }));
    const review = screen.getByRole("button", { name: "Review new record" });
    expect((review as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/2-letter country code/)).toBeDefined();

    fireEvent.change(screen.getByLabelText(/Country code/), { target: { value: "in" } });
    expect((review as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(review);
    fireEvent.click(screen.getByRole("button", { name: "Create and connect" }));

    await waitFor(() => expect(mocks.createAndConnect).toHaveBeenCalledOnce());
    expect(mocks.createAndConnect.mock.calls[0][1]).toMatchObject({
      legalName: "Example Client",
      country: "IN",
      primaryDomain: "example.test",
    });
  });

  it("cancels without creating, connecting, or reporting success", async () => {
    const onOpenChange = renderDialog();

    fireEvent.click(await screen.findByRole("button", { name: "Create company record" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mocks.connect).not.toHaveBeenCalled();
    expect(mocks.createAndConnect).not.toHaveBeenCalled();
  });
});
