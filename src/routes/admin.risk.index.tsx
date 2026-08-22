import { createFileRoute } from "@tanstack/react-router";
import { appEnv } from "@/config/env";
import { ProductionRiskCenterPage } from "@/features/admin/risk/risk-production-page";

type DemoRiskModule = typeof import("@/features/admin/risk/risk-demo-page");

const demoRiskModule: DemoRiskModule | null =
  import.meta.env.VITE_ADMIN_DEMO_MODE === "true"
    ? await import("@/features/admin/risk/risk-demo-page")
    : null;

const DemoRiskCenterPageRuntime = demoRiskModule?.DemoRiskCenterPage ?? null;

export const Route = createFileRoute("/admin/risk/")({
  head: () => ({
    meta: [
      { title: "Trust & Safety — Kairo Admin" },
      {
        name: "description",
        content:
          "Investigate risk signals, duplicate identities and document anomalies across the Kairo platform.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RiskCenterRoutePage,
});

function RiskCenterRoutePage() {
  if (!appEnv.adminDemoMode || DemoRiskCenterPageRuntime === null) {
    return <ProductionRiskCenterPage />;
  }

  return <DemoRiskCenterPageRuntime />;
}
