import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAdminAccess } from "@/features/admin/auth/admin-access";
import { WorkspaceSection } from "@/features/admin/components/workspace-section";
import {
  adminOperationsKeys,
  createAdminOperationsAdapter,
  organizationProvisioningQueryOptions,
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
  const ownerAccepted = provisioning?.ownerMembershipPresent ?? false;

  const mutation = useMutation({
    mutationFn: async () => {
      const input = { fullName: fullName.trim(), email: email.trim() };
      return invitation
        ? adapter.resendFirstHr(company.id, invitation.invitationPublicId, input)
        : adapter.inviteFirstHr(company.id, input);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminOperationsKeys.provisioning(company.id) }),
        queryClient.invalidateQueries({ queryKey: company360Keys.all() }),
      ]);
      toast.success(invitation ? "First HR invitation resent" : "First HR invitation queued");
    },
    onError: (error) =>
      toast.error(getOperationError(error, "The first HR invitation could not be sent.")),
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
        </div>
      ) : ownerAccepted ? (
        <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">First HR owner accepted / claimed</p>
            <p className="mt-1">
              {company.primaryOwnerName ?? "Canonical owner membership is active"}
              {company.primaryOwnerEmailMasked ? ` · ${company.primaryOwnerEmailMasked}` : ""}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">Awaiting first HR claim</p>
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
              {provisioning?.memberPresent
                ? "Members exist, but no accepted owner membership is present."
                : "The organization exists, but no accepted member or owner claim is present."}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <Input label="HR full name" value={fullName} onChange={setFullName} />
            <Input label="HR work email" value={email} onChange={setEmail} type="email" />
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={
                !fullName.trim() ||
                !email.trim() ||
                mutation.isPending ||
                invitation?.effectiveStatus === "accepted"
              }
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-foreground px-3 text-xs font-medium text-background disabled:opacity-50"
            >
              {invitation ? <RefreshCw className="size-3.5" /> : <Mail className="size-3.5" />}
              {mutation.isPending
                ? "Sending..."
                : invitation?.effectiveStatus === "accepted"
                  ? "First HR claimed"
                  : invitation
                    ? "Resend invitation"
                    : "Invite first HR owner"}
            </button>
          </div>
          {invitation ? (
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
