import { createFileRoute } from "@tanstack/react-router";
import { appEnv } from "@/config/env";
import { CommunicationProductionDetailPage } from "@/features/admin/communications/communication-production-detail-page";
import { EmptyState } from "@/features/admin/components/states";

type DemoCommunicationDetailModule =
  typeof import("@/features/admin/communications/communication-demo-detail-page");

const demoCommunicationDetailModule: DemoCommunicationDetailModule | null =
  import.meta.env.VITE_ADMIN_DEMO_MODE === "true"
    ? await import("@/features/admin/communications/communication-demo-detail-page")
    : null;

const DemoCommunicationDetailPage =
  demoCommunicationDetailModule?.DemoCommunicationDetailPage ?? null;
const DemoCommunicationNotFoundView =
  demoCommunicationDetailModule?.DemoCommunicationNotFoundView ?? DefaultNotFoundView;

export const Route = createFileRoute("/admin/communications/$communicationId")({
  loader: async ({ params }) => {
    if (!appEnv.adminDemoMode || demoCommunicationDetailModule === null) {
      return {
        communicationId: params.communicationId,
        production: true as const,
      };
    }

    return demoCommunicationDetailModule.loadDemoCommunicationDetail(params.communicationId);
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Communication not found — Kairo Admin" },
          { name: "robots", content: "noindex, nofollow" },
        ],
      };
    }

    if (!("comm" in loaderData) || !loaderData.comm) {
      return {
        meta: [
          { title: "Communications — Kairo Admin" },
          { name: "robots", content: "noindex, nofollow" },
        ],
      };
    }

    return {
      meta: [
        { title: `${loaderData.comm.reference} — Communications — Kairo Admin` },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  errorComponent: ({ error }) => (
    <EmptyState title="Something went wrong" description={error.message} />
  ),
  notFoundComponent: DemoCommunicationNotFoundView,
  component: CommunicationDetailPage,
});

function DefaultNotFoundView() {
  return (
    <div className="mx-auto max-w-3xl">
      <EmptyState
        title="Communication not found"
        description="This communication could not be loaded."
      />
    </div>
  );
}

function CommunicationDetailPage() {
  const loaderData = Route.useLoaderData();

  if ("production" in loaderData && loaderData.production) {
    return <CommunicationProductionDetailPage communicationId={loaderData.communicationId} />;
  }

  if (DemoCommunicationDetailPage === null || !("comm" in loaderData)) {
    return <DefaultNotFoundView />;
  }

  return <DemoCommunicationDetailPage loaderData={loaderData} />;
}
