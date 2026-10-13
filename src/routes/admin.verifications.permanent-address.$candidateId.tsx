import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { appEnv } from "@/config/env";
import { useAdminAccess } from "@/features/admin/auth/admin-access";
import { PermanentAddressWorkspace } from "@/features/admin/components/permanent-address-workspace";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PermissionDeniedState,
} from "@/features/admin/components/states";
import {
  createPermanentAddressAdapter,
  permanentAddressDetailQueryOptions,
  permanentAddressDocumentQueryOptions,
  permanentAddressKeys,
  type AddressDocumentDecisionOutcome,
  type ManualLocationOutcome,
} from "@/features/admin/data/permanent-address";
import { permanentAddressActionErrorMessage } from "@/features/admin/lib/permanent-address";
import { hasPermission } from "@/features/admin/workflow/permissions";

export const Route = createFileRoute("/admin/verifications/permanent-address/$candidateId")({
  head: () => ({
    meta: [
      { title: "Permanent Address review — KairoID Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PermanentAddressReviewRoute,
});

function PermanentAddressReviewRoute() {
  const { candidateId } = Route.useParams();
  const access = useAdminAccess();
  const canReview = hasPermission(access.admin?.permissions ?? [], "verification.review_address");
  const adapter = useMemo(() => createPermanentAddressAdapter(appEnv), []);
  const queryClient = useQueryClient();
  const detailQuery = useQuery({
    ...permanentAddressDetailQueryOptions(candidateId),
    enabled: canReview && !appEnv.adminDemoMode,
  });
  const versionId = detailQuery.data?.permanentAddress.addressVersionId ?? "";
  const documentQuery = useQuery({
    ...permanentAddressDocumentQueryOptions(versionId),
    enabled:
      canReview &&
      !appEnv.adminDemoMode &&
      Boolean(versionId && detailQuery.data?.document.previewAvailable),
    retry: false,
  });

  async function refreshTruth() {
    await queryClient.invalidateQueries({ queryKey: permanentAddressKeys.all() });
  }

  const documentMutation = useMutation({
    mutationFn: async (outcome: AddressDocumentDecisionOutcome) => {
      const current = detailQuery.data;
      const documentId = current?.document.documentId;
      const currentVersionId = current?.permanentAddress.addressVersionId;
      if (!documentId || !currentVersionId) throw new Error("Current document is unavailable.");
      const approving = outcome === "APPROVE_MATCHING";
      return adapter.decideDocument(currentVersionId, {
        documentId,
        idempotencyKey: crypto.randomUUID(),
        outcome,
        inspectedDocument: true,
        candidateIdentityMatches: approving,
        documentAcceptable: approving,
        addressMatches: approving,
      });
    },
    onSuccess: async () => {
      await refreshTruth();
      toast.success("Document decision recorded", {
        description: "Permanent Address truth was refreshed from the backend.",
      });
    },
    onError: async (error) => {
      await refreshTruth();
      toast.error("Document decision failed", {
        description: permanentAddressActionErrorMessage(error),
      });
    },
  });

  const locationMutation = useMutation({
    mutationFn: async (outcome: ManualLocationOutcome) => {
      const current = detailQuery.data;
      const attempt = current?.latestAttempt;
      if (!attempt) throw new Error("Current location attempt is unavailable.");
      return adapter.resolveManualLocation(attempt.addressVersionId, attempt.sessionId, {
        candidateId: current.permanentAddress.candidateId,
        idempotencyKey: crypto.randomUUID(),
        outcome,
      });
    },
    onSuccess: async () => {
      await refreshTruth();
      toast.success("Location review recorded", {
        description: "Location progress was refreshed from the backend.",
      });
    },
    onError: async (error) => {
      await refreshTruth();
      toast.error("Location review failed", {
        description: permanentAddressActionErrorMessage(error),
      });
    },
  });

  if (!canReview) {
    return (
      <PermissionDeniedState description="Permanent Address review requires the backend verification-review permission." />
    );
  }

  if (appEnv.adminDemoMode) {
    return (
      <EmptyState
        title="Permanent Address review is unavailable in Demo Mode"
        description="This workspace intentionally displays only canonical backend data."
      />
    );
  }

  if (detailQuery.isPending) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <LoadingSkeleton rows={10} />
      </div>
    );
  }

  if (detailQuery.error) {
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState
          title={
            detailQuery.error.message === "The requested resource could not be found."
              ? "Permanent Address review not found"
              : "Permanent Address review failed to load"
          }
          description={detailQuery.error.message}
          action={
            <button
              type="button"
              onClick={() => void detailQuery.refetch()}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-medium text-background"
            >
              <RefreshCw aria-hidden className="size-3.5" /> Try again
            </button>
          }
        />
      </div>
    );
  }

  if (!detailQuery.data) return null;

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <Link
              to="/admin/verifications"
              search={{ view: "all-active" }}
              className="hover:text-foreground hover:underline"
            >
              Verifications
            </Link>
            <span>/</span>
            <Link
              to="/admin/verifications/permanent-address"
              className="hover:text-foreground hover:underline"
            >
              Permanent Address
            </Link>
            <span>/</span>
            <span className="font-mono">{candidateId.slice(0, 8)}</span>
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            {documentQuery.data?.candidateName ?? `Candidate ${candidateId.slice(0, 8)}`}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Permanent Address document and location review workspace.
          </p>
        </div>
        <Link
          to="/admin/verifications/permanent-address"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
        >
          <ArrowLeft aria-hidden className="size-3.5" /> All address reviews
        </Link>
      </header>

      {documentQuery.error ? (
        <div
          role="status"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
        >
          Extended document metadata is temporarily unavailable. The authoritative address review
          remains loaded.
        </div>
      ) : null}

      <PermanentAddressWorkspace
        detail={detailQuery.data}
        documentDetail={documentQuery.data}
        canReview={canReview}
        mutationPending={documentMutation.isPending || locationMutation.isPending}
        loadDocumentContent={adapter.getDocumentContent}
        onDocumentDecision={async (outcome) => {
          await documentMutation.mutateAsync(outcome);
        }}
        onLocationDecision={async (outcome) => {
          await locationMutation.mutateAsync(outcome);
        }}
      />
    </div>
  );
}
