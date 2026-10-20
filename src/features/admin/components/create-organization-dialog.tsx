import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Building2, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createAdminOperationsAdapter,
  getFirstHrInvitationAction,
  organizationProvisioningQueryOptions,
  rehydrateOrganizationProvisioning,
  type OrganizationProvisioningResult,
} from "@/features/admin/data/admin-operations";
import { company360Keys } from "@/features/admin/data/organizations";
import { getOperationError } from "@/features/admin/lib/operation-error";

const ORGANIZATION_TYPES = [
  "employer",
  "university",
  "staffing_agency",
  "background_verification_partner",
  "government",
  "certification_body",
  "hospital",
  "gig_platform",
  "financial_institution",
  "other",
] as const;

export function CreateOrganizationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const adapter = useMemo(() => createAdminOperationsAdapter(), []);
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [organizationType, setOrganizationType] = useState("employer");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [domain, setDomain] = useState("");
  const [organizationSize, setOrganizationSize] = useState("");
  const [organization, setOrganization] = useState<OrganizationProvisioningResult | null>(null);
  const [hrName, setHrName] = useState("");
  const [hrEmail, setHrEmail] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const organizationId = organization?.organizationPublicId ?? "";
  const provisioningQuery = useQuery({
    ...organizationProvisioningQueryOptions(organizationId),
    enabled: Boolean(organizationId),
  });
  const provisioning = provisioningQuery.data;
  const invitation = provisioning?.firstHrInvitation;
  const invitationAction = getFirstHrInvitationAction(provisioning, !provisioningQuery.isError);

  const createMutation = useMutation({
    mutationFn: () =>
      adapter.createOrganization({
        name: name.trim(),
        organizationType,
        ...(website.trim() ? { website: website.trim() } : {}),
        ...(industry.trim() ? { industry: industry.trim() } : {}),
        ...(location.trim() ? { location: location.trim() } : {}),
        ...(workEmail.trim() ? { workEmail: workEmail.trim() } : {}),
        ...(domain.trim() ? { domain: domain.trim() } : {}),
        ...(organizationSize.trim() ? { organizationSize: organizationSize.trim() } : {}),
        idempotencyKey,
      }),
    onSuccess: async (result) => {
      setOrganization(result);
      await queryClient.invalidateQueries({ queryKey: company360Keys.all() });
      toast.success("Organization created; first HR claim is still required");
    },
    onError: (error) =>
      toast.error(getOperationError(error, "The organization could not be created.")),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!organization) throw new Error("Create the organization first.");
      const input = { fullName: hrName.trim(), email: hrEmail.trim() };
      if (invitationAction === "resend" && invitation) {
        return adapter.resendFirstHr(
          organization.organizationPublicId,
          invitation.invitationPublicId,
          input,
        );
      }
      if (invitationAction === "invite") {
        return adapter.inviteFirstHr(organization.organizationPublicId, input);
      }
      throw new Error("The canonical membership state does not permit a first-HR invitation.");
    },
    onSuccess: async () => {
      if (!organization) return;
      await Promise.all([
        rehydrateOrganizationProvisioning(queryClient, organization.organizationPublicId),
        queryClient.invalidateQueries({ queryKey: company360Keys.all() }),
      ]);
      toast.success(
        invitationAction === "resend"
          ? "First HR invitation recovery queued"
          : "First HR owner invitation queued",
      );
    },
    onError: async (error) => {
      if (organization) {
        try {
          await rehydrateOrganizationProvisioning(queryClient, organization.organizationPublicId);
        } catch {
          // Preserve the original delivery error while the query exposes its own read failure state.
        }
      }
      toast.error(getOperationError(error, "The first HR invitation could not be sent."));
    },
  });

  const reset = () => {
    setName("");
    setOrganizationType("employer");
    setWebsite("");
    setIndustry("");
    setLocation("");
    setWorkEmail("");
    setDomain("");
    setOrganizationSize("");
    setOrganization(null);
    setHrName("");
    setHrEmail("");
    setIdempotencyKey(crypto.randomUUID());
    createMutation.reset();
    inviteMutation.reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Provision an organization without creating an owner or implying verified ownership.
          </DialogDescription>
        </DialogHeader>

        {!organization ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Organization name" value={name} onChange={setName} required />
              <label className="space-y-1 text-xs font-medium">
                Organization type
                <select
                  value={organizationType}
                  onChange={(event) => setOrganizationType(event.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs"
                >
                  {ORGANIZATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {humanize(type)}
                    </option>
                  ))}
                </select>
              </label>
              <Input label="Website (optional)" value={website} onChange={setWebsite} />
              <Input label="Domain (optional)" value={domain} onChange={setDomain} />
              <Input label="Industry (optional)" value={industry} onChange={setIndustry} />
              <Input label="Location (optional)" value={location} onChange={setLocation} />
              <Input
                label="Organization work email (optional)"
                value={workEmail}
                onChange={setWorkEmail}
                type="email"
              />
              <Input
                label="Organization size (optional)"
                value={organizationSize}
                onChange={setOrganizationSize}
              />
            </div>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Exact normalized-name duplicates are rejected by the backend. Admin creation does not
              merge organizations, create membership, or mark ownership verified.
            </div>
            <DialogFooter>
              <button
                type="submit"
                disabled={!name.trim() || createMutation.isPending}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-[#0B2545] px-4 text-xs font-medium text-white disabled:opacity-50"
              >
                <Building2 className="size-4" />
                {createMutation.isPending ? "Creating..." : "Create Organization"}
              </button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
              <p className="font-medium">{organization.name} created</p>
              {provisioningQuery.isPending ? (
                <p className="mt-1 text-xs">Loading canonical membership state...</p>
              ) : provisioningQuery.error ? (
                <div className="mt-1 text-xs text-red-800">
                  <p>Canonical membership state unavailable. Invitation actions are disabled.</p>
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
                <>
                  <p className="mt-1 text-xs">
                    Membership: {provisioning?.memberPresent ? "Present" : "None"}
                  </p>
                  <p className="mt-1 text-xs">
                    Owner membership: {provisioning?.ownerMembershipPresent ? "Present" : "None"}
                  </p>
                </>
              )}
            </div>

            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold">
                {provisioningQuery.isError
                  ? "Canonical first-HR state unknown"
                  : provisioning?.ownerMembershipPresent
                    ? "First HR owner accepted / claimed"
                    : provisioning?.memberPresent
                      ? "First HR invitation unavailable"
                      : invitationAction === "resend"
                        ? "Recover first HR invitation"
                        : invitation
                          ? "Send new first HR invitation"
                          : "Invite first HR owner"}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {provisioningQuery.isError
                  ? "Retry canonical status before creating or recovering an invitation."
                  : provisioning?.ownerMembershipPresent
                    ? "Canonical owner membership is active. No further first-HR invitation is available."
                    : provisioning?.memberPresent
                      ? "The backend rejects first-HR invitations while any organization membership exists."
                      : "The invitee accepts through the existing Team Invitation flow and chooses their own account password. The initial role is fixed to Owner."}
              </p>
              {invitationAction !== "none" ? (
                <>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Input label="HR full name" value={hrName} onChange={setHrName} required />
                    <Input
                      label="HR work email"
                      value={hrEmail}
                      onChange={setHrEmail}
                      type="email"
                      required
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => inviteMutation.mutate()}
                      disabled={!hrName.trim() || !hrEmail.trim() || inviteMutation.isPending}
                      className="inline-flex h-9 items-center gap-2 rounded-md bg-foreground px-3 text-xs font-medium text-background disabled:opacity-50"
                    >
                      {invitationAction === "resend" ? (
                        <RefreshCw className="size-3.5" />
                      ) : (
                        <Mail className="size-3.5" />
                      )}
                      {inviteMutation.isPending
                        ? "Sending..."
                        : invitationAction === "resend"
                          ? invitation?.effectiveStatus === "pending"
                            ? "Resend invitation"
                            : "Recover first HR invitation"
                          : invitation
                            ? "Send new first HR invitation"
                            : "Send first HR invitation"}
                    </button>
                  </div>
                </>
              ) : null}
              {invitation ? (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                  <p className="font-medium">
                    Activation {humanize(invitation.effectiveStatus)}
                    {invitation.effectiveStatus !== invitation.status
                      ? ` · stored ${humanize(invitation.status)}`
                      : ""}
                  </p>
                  <p className="mt-1">Invitee: {invitation.inviteeEmailMasked}</p>
                  {invitation.expiresAt ? (
                    <p>Expires: {new Date(invitation.expiresAt).toLocaleString()}</p>
                  ) : null}
                  {invitation.deliveryFailedAt ? (
                    <p className="text-red-700">
                      Delivery failed {new Date(invitation.deliveryFailedAt).toLocaleString()}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[11px]">
                    This masked state is rehydrated from the backend. Recovery requires the intended
                    HR name and full work email; no token is displayed.
                  </p>
                </div>
              ) : provisioningQuery.isPending ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Loading canonical first-HR status...
                </p>
              ) : provisioningQuery.error ? (
                <p className="mt-3 text-xs text-red-700">
                  {getOperationError(
                    provisioningQuery.error,
                    "The canonical first-HR status could not be loaded.",
                  )}
                </p>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  No first-HR invitation is recorded yet.
                </p>
              )}
            </div>

            <DialogFooter>
              <Link
                to="/admin/registry/organizations/$organizationId"
                params={{ organizationId: organization.organizationPublicId }}
                className="inline-flex h-9 items-center rounded-md border border-border px-3 text-xs font-medium hover:bg-accent"
              >
                View organization
              </Link>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Input({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-1 text-xs font-medium">
      {label}
      <input
        type={type}
        required={required}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm disabled:opacity-60"
      />
    </label>
  );
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
