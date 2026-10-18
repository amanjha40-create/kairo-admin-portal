import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAdminAccess } from "@/features/admin/auth/admin-access";
import { WorkspaceSection } from "@/features/admin/components/workspace-section";
import {
  createAdminOperationsAdapter,
  type FirstHrInvitation,
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
  const [invitation, setInvitation] = useState<FirstHrInvitation | null>(null);
  const ownerAccepted = company.isWorkspaceCustomer && Boolean(company.primaryOwnerName);

  const mutation = useMutation({
    mutationFn: async () => {
      const input = { fullName: fullName.trim(), email: email.trim() };
      return invitation
        ? adapter.resendFirstHr(company.id, invitation.invitationPublicId, input)
        : adapter.inviteFirstHr(company.id, input);
    },
    onSuccess: async (result) => {
      setInvitation(result);
      await queryClient.invalidateQueries({ queryKey: company360Keys.all() });
      toast.success(invitation ? "First HR invitation resent" : "First HR invitation queued");
    },
    onError: (error) =>
      toast.error(getOperationError(error, "The first HR invitation could not be sent.")),
  });

  return (
    <WorkspaceSection
      title="Organization activation"
      description="First-owner claim state from canonical Company360 data"
    >
      {ownerAccepted ? (
        <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">First HR owner accepted</p>
            <p className="mt-1">
              {company.primaryOwnerName}
              {company.primaryOwnerEmailMasked ? ` · ${company.primaryOwnerEmailMasked}` : ""}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            <p className="font-medium">Awaiting first HR claim</p>
            <p className="mt-1">
              The organization row exists, but no accepted owner membership is visible yet.
            </p>
          </div>
          {canInvite ? (
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <Input label="HR full name" value={fullName} onChange={setFullName} />
              <Input
                label="HR work email"
                value={email}
                onChange={setEmail}
                type="email"
                disabled={Boolean(invitation)}
              />
              <button
                type="button"
                onClick={() => mutation.mutate()}
                disabled={!fullName.trim() || !email.trim() || mutation.isPending}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-foreground px-3 text-xs font-medium text-background disabled:opacity-50"
              >
                {invitation ? <RefreshCw className="size-3.5" /> : <Mail className="size-3.5" />}
                {mutation.isPending
                  ? "Sending..."
                  : invitation
                    ? "Resend invitation"
                    : "Invite first HR owner"}
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">invite_first_hr permission required.</p>
          )}
          {invitation ? (
            <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs">
              <p className="font-medium">Invitation {humanize(invitation.status)}</p>
              <p className="mt-1 text-muted-foreground">
                {invitation.inviteeEmailMasked} · expires{" "}
                {new Date(invitation.expiresAt).toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Refresh Company360 after acceptance. The token and password never appear here.
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
