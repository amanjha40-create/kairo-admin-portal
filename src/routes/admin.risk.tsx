import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/risk")({
  head: () => ({
    meta: [
      { title: "Risk & Trust & Safety — KairoID Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <Outlet />,
});
