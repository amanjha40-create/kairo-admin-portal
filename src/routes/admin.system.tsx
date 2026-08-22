import { createFileRoute } from "@tanstack/react-router";
import { SystemOperationsPage } from "@/features/admin/runtime/system-page";

export const Route = createFileRoute("/admin/system")({
  head: () => ({
    meta: [
      { title: "System Operations — Kairo Admin" },
      {
        name: "description",
        content:
          "Backend-driven operational health, incidents, failures, retries, and runtime metadata.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SystemOperationsPage,
});
