import { Link, createFileRoute } from "@tanstack/react-router";
import { appEnv } from "@/config/env";
import { TrustSafetyInvestigationProduction } from "@/features/admin/components/trust-safety-investigation-production";
import { EmptyState, ErrorState } from "@/features/admin/components/states";

type DemoRiskDetailLoaderModule = typeof import("@/features/admin/risk/risk-detail-demo-loader");
type DemoRiskDetailPageModule = typeof import("@/features/admin/risk/risk-detail-demo-page");

const demoRiskDetailLoaderModule: DemoRiskDetailLoaderModule | null =
  import.meta.env.VITE_ADMIN_DEMO_MODE === "true"
    ? await import("@/features/admin/risk/risk-detail-demo-loader")
    : null;

const demoRiskDetailPageModule: DemoRiskDetailPageModule | null =
  import.meta.env.VITE_ADMIN_DEMO_MODE === "true"
    ? await import("@/features/admin/risk/risk-detail-demo-page")
    : null;

const DemoRiskInvestigationDetailPage =
  demoRiskDetailPageModule?.DemoRiskInvestigationDetailPage ?? null;

export const Route = createFileRoute("/admin/risk/$investigationId")({
  loader: async ({ params }) => {
    if (!appEnv.adminDemoMode || demoRiskDetailLoaderModule === null) {
      return {
        investigationId: params.investigationId,
        production: true as const,
      };
    }

    return demoRiskDetailLoaderModule.loadDemoRiskDetail(params.investigationId);
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title:
          loaderData && "inv" in loaderData && loaderData.inv
            ? `${loaderData.inv.reference} — Trust & Safety`
            : "Trust & Safety — Kairo Admin",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  errorComponent: RiskDetailErrorBoundary,
  notFoundComponent: RiskDetailNotFoundView,
  component: RiskDetailRoutePage,
});

function RiskDetailRoutePage() {
  const loaderData = Route.useLoaderData();

  if ("production" in loaderData && loaderData.production) {
    return <TrustSafetyInvestigationProduction investigationId={loaderData.investigationId} />;
  }

  if (DemoRiskInvestigationDetailPage === null || !("inv" in loaderData)) {
    return <RiskDetailNotFoundView />;
  }

  return <DemoRiskInvestigationDetailPage loaderData={loaderData} />;
}

function RiskDetailErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl p-8">
      <ErrorState
        title="Something went wrong"
        description={error.message}
        action={
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent"
          >
            Retry
          </button>
        }
      />
    </div>
  );
}

function RiskDetailNotFoundView() {
  const { investigationId } = Route.useParams();

  return (
    <div className="mx-auto max-w-2xl p-8">
      <EmptyState
        title="Investigation not found"
        description={`No investigation matches "${investigationId}". Check the reference or return to the list.`}
        action={
          <Link
            to="/admin/risk"
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent"
          >
            Back to investigations
          </Link>
        }
      />
    </div>
  );
}
