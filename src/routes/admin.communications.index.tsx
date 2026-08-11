import { createFileRoute } from "@tanstack/react-router";
import { appEnv } from "@/config/env";
import { CommunicationsProductionPage } from "@/features/admin/communications/communications-production-page";

type DemoCommunicationsModule =
  typeof import("@/features/admin/communications/communications-demo-page");

const demoCommunicationsModule: DemoCommunicationsModule | null =
  import.meta.env.VITE_ADMIN_DEMO_MODE === "true"
    ? await import("@/features/admin/communications/communications-demo-page")
    : null;

const DemoCommunicationsCenterPage = demoCommunicationsModule?.DemoCommunicationsCenterPage ?? null;

export const Route = createFileRoute("/admin/communications/")({
  head: () => ({
    meta: [
      { title: "Communications — Kairo Admin" },
      {
        name: "description",
        content:
          "Global monitoring of Kairo verification outreach, delivery, follow-ups and employer responses.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CommunicationsCenterPage,
});

function CommunicationsCenterPage() {
  if (!appEnv.adminDemoMode || DemoCommunicationsCenterPage === null) {
    return <CommunicationsProductionPage />;
  }

  return <DemoCommunicationsCenterPage />;
}
