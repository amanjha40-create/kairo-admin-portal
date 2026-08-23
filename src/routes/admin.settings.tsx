import { createFileRoute } from "@tanstack/react-router";
import { AdminSettingsPage } from "@/features/admin/runtime/settings-page";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [{ title: "Settings — Kairo Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminSettingsPage,
});
