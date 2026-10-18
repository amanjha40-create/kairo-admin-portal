import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAdminAccess } from "@/features/admin/auth/admin-access";
import { WorkspaceSection } from "@/features/admin/components/workspace-section";
import {
  createAdminOperationsAdapter,
  getFirstHrInvitationAction,
  organizationProvisioningQueryOptions,
  rehydrateOrganizationProvisioning,
} from "@/features/admin/data/admin-operations";
import { company360Keys, type CompanyDetail } from "@/features/admin/data/organizations";
import { getOperationError } from "@/features/admin/lib/operation-error";
import { hasPermission } from "@/features/admin/workflow/permissions";

export function OrganizationProvisioningPanel({ company }: { company: CompanyDetail }) {
  const access = useAdminAccess();
  const queryClient = useQueryClient();
  const adapter = useMemo(() => createAdminOperationsAdapter(), []);
  const canInvite = hasPermission(access.admin?.permissions ?? [], "invite_first_hr");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const provisioningQuery = useQuery({
    ...organizationProvisioningQueryOptions(company.id),
    enabled: canInvite,
  });
  const provisioning = provisioningQuery.data;
  const invitation = provisioning?.firstHrInvitation;
  const invitationAction = getFirstHrInvitationAction(provisioning, !provisioningQuery.isError);

  const mutation = useMutation({
    mutationFn: async () => {
      const input = { fullName: fullName.trim(), email: email.trim() };
      if (invitationAction === "resend" && invitation) {
        return adapter.resendFirstHr(company.id, invitation.invitationPublicId, input);
      }
      if (invitationAction === "invite") return adapter.inviteFirstHr(company.id, input);
      throw new Error("The canonical membership state does not permit a first-HR invitation.");
    },
    onSuccess: async () => {
      await Promise.all([
        rehydrateOrganizationProvisioning(queryClient, company.id),
        queryClient.invalidateQueries({ queryKey: company360Keys.all() }),
      ]);
      toast.success(
        invitationAction === "resend"
          ? "First HR invitation recovery queued"
          : "First HR invitation queued",
      );
    },
    onError: async (error) => {
      try {
        await rehydrateOrganizationProvisioning(queryClient, company.id);
      } catch {
        // Preserve the original delivery error while the query exposes its own read failure state.
      }
      toast.error(getOperationError(error, "The first HR invitation could not be sent."));
    },
  });

  return (
    <WorkspaceSection
      title="Organization activation"
      description="Backend-authoritative first-owner membership and masked invitation state"
    >
      {!canInvite ? (
        <p className="text-xs text-muted-foreground">invite_first_hr permission required.</p>
      ) : provisioningQuery.isPending ? (
        <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Loading canonical provisioning status...
        </div>
      ) : provisioningQuery.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-950">
          <p className="font-medium">Provisioning status unavailable</p>
          <p className="mt-1">
            {getOperationError(
              provisioningQuery.error,
              "The canonical first-HR state could not be loaded.",
            )}
          </p>
          <button
            type="button"
            onClick={() => void provisioningQuery.refetch()}
            disabled={provisioningQuery.isFetching}
            className="mt-2 inline-flex h-8 items-center gap-1 rounded-md border border-red-300 px-2 font-medium disabled:opacity-50"
          >
            <RefreshCw className="size-3" /> Retry canonical status
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div
            className={`rounded-md border px-3 py-2 text-xs ${provisioning?.ownerMembershipPresent ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-amber-200 bg-amber-50 text-amber-950"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-medium">
                {provisioning?.ownerMembershipPresent ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : null}
                {provisioning?.ownerMembershipPresent
                  ? "First HR owner accepted / claimed"
                  : provisioning?.memberPresent
                    ? "Existing membership blocks first-HR invitation"
                    : invitation
                      ? `First-HR invitation ${humanize(invitation.effectiveStatus)}`
                      : "No first-HR invitation"}
              </p>
              <button
                type="button"
                onClick={() => provisioningQuery.refetch()}
                disabled={provisioningQuery.isFetching}
                className="inline-flex items-center gap-1 font-medium disabled:opacity-50"
              >
                <RefreshCw className="size-3" /> Refresh status
              </button>
            </div>
            <p className="mt-1">
              {provisioning?.ownerMembershipPresent
                ? `${company.primaryOwnerName ?? "Canonical owner membership is active"}${company.primaryOwnerEmailMasked ? ` · ${company.primaryOwnerEmailMasked}` : ""}`
                : provisioning?.memberPresent
                  ? "The backend rejects first-HR invitations while any organization membership exists."
                  : invitationAction === "resend"
                    ? "The stored invitation is pending and supports canonical resend/recovery."
                    : invitation
                      ? "The previous invitation is terminal. A new invitation may be sent."
                      : "The organization has no member, owner, or first-HR invitation."}
            </p>
          </div>
          {invitationAction !== "none" ? (
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <Input label="HR full name" value={fullName} onChange={setFullName} />
              <Input label="HR work email" value={email} onChange={setEmail} type="email" />
              <button
                type="button"
                onClick={() => mutation.mutate()}
                disabled={!fullName.trim() || !email.trim() || mutation.isPending}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-foreground px-3 text-xs font-medium text-background disabled:opacity-50"
              >
                {invitationAction === "resend" ? (
                  <RefreshCw className="size-3.5" />
                ) : (
                  <Mail className="size-3.5" />
                )}
                {mutation.isPending
                  ? "Sending..."
                  : invitationAction === "resend"
                    ? invitation?.effectiveStatus === "pending"
                      ? "Resend invitation"
                      : "Recover first HR invitation"
                    : invitation
                      ? "Send new first HR invitation"
                      : "Invite first HR owner"}
              </button>
            </div>
          ) : null}
          {invitationAction === "resend" ? (
            <p className="text-[11px] text-muted-foreground">
              Resend requires the intended HR name and full work email again. The backend exposes
              only the masked recipient after refresh.
            </p>
          ) : null}
          {invitation ? (
            <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs">
              <p className="font-medium">
                Invitation {humanize(invitation.effectiveStatus)}
                {invitation.effectiveStatus !== invitation.status
                  ? ` · stored ${humanize(invitation.status)}`
                  : ""}
              </p>
              <p className="mt-1 text-muted-foreground">
                {invitation.inviteeEmailMasked}
                {invitation.expiresAt
                  ? ` · expires ${new Date(invitation.expiresAt).toLocaleString()}`
                  : ""}
              </p>
              {invitation.lastSentAt ? (
                <p className="mt-1 text-muted-foreground">
                  Last sent {new Date(invitation.lastSentAt).toLocaleString()}
                </p>
              ) : null}
              {invitation.deliveryFailedAt ? (
                <p className="mt-1 text-red-700">
                  Delivery failed {new Date(invitation.deliveryFailedAt).toLocaleString()}
                </p>
              ) : null}
              <p className="mt-1 text-[11px] text-muted-foreground">
                This status is rehydrated from the masked backend provisioning read. Tokens and
                passwords never appear here.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </WorkspaceSection>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-1 text-xs font-medium">
      {label}
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm disabled:opacity-60"
      />
    </label>
  );
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
