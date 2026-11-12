import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { FileText, UserPlus } from "lucide-react";
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
  adminOperationsKeys,
  createAdminOperationsAdapter,
} from "@/features/admin/data/admin-operations";
import { createAdminClientOperationsAdapter } from "@/features/admin/data/admin-client-operations";
import { company360Keys, companyDirectoryQueryOptions } from "@/features/admin/data/organizations";
import { userKeys } from "@/features/admin/data/users";
import { getOperationError } from "@/features/admin/lib/operation-error";

interface CreatePersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePersonDialog({ open, onOpenChange }: CreatePersonDialogProps) {
  const queryClient = useQueryClient();
  const adapter = useMemo(() => createAdminOperationsAdapter(), []);
  const clientAdapter = useMemo(() => createAdminClientOperationsAdapter(), []);
  const [mode, setMode] = useState<"manual" | "cv">("manual");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("candidate");
  const [joiningDate, setJoiningDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [created, setCreated] = useState<{
    organizationId: string;
    personId: string;
    fullName: string;
    emailMasked: string;
    candidateId?: string;
    deliveryState?: string;
    cvStatus?: string;
    activationError?: string;
    cvError?: string;
  } | null>(null);
  const [clientOrganizationId, setClientOrganizationId] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const clientsQuery = useQuery({
    ...companyDirectoryQueryOptions({ page: 1, pageSize: 100, status: "all" }),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!clientOrganizationId) throw new Error("Select the Client sending this invitation.");
      const person = await clientAdapter.createPerson(clientOrganizationId, {
        fullName: fullName.trim(),
        email: email.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        relationship,
        ...(relationship === "future_employee" && joiningDate ? { joiningDate } : {}),
      });
      let activation;
      try {
        activation = await clientAdapter.activatePerson(
          clientOrganizationId,
          person.personId,
          idempotencyKey,
        );
      } catch (error) {
        return {
          ...person,
          activationError: getOperationError(
            error,
            "The Person was added, but the Candidate invitation was not sent.",
          ),
        };
      }
      let cvStatus: string | undefined;
      let cvError: string | undefined;
      if (mode === "cv" && file) {
        try {
          const receipt = await adapter.uploadResume(activation.candidate_id, file);
          cvStatus = receipt.status;
        } catch (error) {
          cvError = getOperationError(
            error,
            "The invitation was sent, but the CV could not be uploaded. Retry from Candidate detail.",
          );
        }
      }
      return {
        ...person,
        candidateId: activation.candidate_id,
        deliveryState: activation.delivery_state,
        cvStatus,
        cvError,
      };
    },
    onSuccess: async (result) => {
      setCreated(result);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userKeys.all() }),
        queryClient.invalidateQueries({ queryKey: company360Keys.all() }),
        queryClient.invalidateQueries({ queryKey: adminOperationsKeys.invitations() }),
      ]);
      const activationError = "activationError" in result ? result.activationError : undefined;
      toast[activationError ? "error" : "success"](
        activationError ?? "Candidate invitation queued",
      );
    },
    onError: (error) =>
      toast.error(getOperationError(error, "The Candidate could not be created.")),
  });

  const reset = () => {
    setMode("manual");
    setFullName("");
    setEmail("");
    setPhone("");
    setRelationship("candidate");
    setJoiningDate("");
    setFile(null);
    setCreated(null);
    setClientOrganizationId("");
    setIdempotencyKey(crypto.randomUUID());
    mutation.reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite Candidate</DialogTitle>
          <DialogDescription>
            Add the Person to a Client, send a single-use activation link on that Client&apos;s
            behalf, and optionally start CV review.
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950">
              <p className="font-medium">{created.fullName} added to Client People</p>
              <p className="mt-1 text-xs">Contact: {created.emailMasked}</p>
              <p className="mt-1 text-xs">
                Candidate invitation:{" "}
                {created.activationError ?? created.deliveryState ?? "Not sent"}
              </p>
              {created.cvStatus ? (
                <p className="mt-1 text-xs">CV processing: {created.cvStatus}</p>
              ) : null}
              {created.cvError ? (
                <p className="mt-1 text-xs text-amber-900">{created.cvError}</p>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              The Candidate sets their own password through the emailed link. The Client
              relationship and any CV data remain unverified until their respective review workflows
              complete.
            </p>
            <DialogFooter>
              {created.candidateId ? (
                <Link
                  to="/admin/users/$userId"
                  params={{ userId: created.candidateId }}
                  className="inline-flex h-9 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background"
                >
                  Open Candidate
                </Link>
              ) : (
                <Link
                  to="/admin/registry/organizations/$organizationId"
                  params={{ organizationId: created.organizationId }}
                  className="inline-flex h-9 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background"
                >
                  Open Client to retry
                </Link>
              )}
            </DialogFooter>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (mode === "cv" && !file) {
                toast.error("Choose a PDF or DOCX CV before continuing.");
                return;
              }
              mutation.mutate();
            }}
          >
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-1">
              <ModeButton active={mode === "manual"} onClick={() => setMode("manual")}>
                <UserPlus className="size-4" /> Enter Manually
              </ModeButton>
              <ModeButton active={mode === "cv"} onClick={() => setMode("cv")}>
                <FileText className="size-4" /> Upload CV
              </ModeButton>
            </div>
            <label className="block space-y-1 text-xs font-medium text-foreground">
              Client
              <select
                required
                value={clientOrganizationId}
                onChange={(event) => setClientOrganizationId(event.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">Select the Client sending this invitation</option>
                {(clientsQuery.data?.items ?? []).map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <span className="block font-normal text-muted-foreground">
                Options come only from Clients. Trust Registry organizations are intentionally not
                selectable.
              </span>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledInput label="Full name" value={fullName} onChange={setFullName} required />
              <LabeledInput label="Email" type="email" value={email} onChange={setEmail} required />
              <LabeledInput label="Mobile (optional)" value={phone} onChange={setPhone} />
              <label className="space-y-1 text-xs font-medium text-foreground">
                Relationship
                <select
                  value={relationship}
                  onChange={(event) => setRelationship(event.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="candidate">Candidate</option>
                  <option value="future_employee">Future employee</option>
                  <option value="employee">Employee</option>
                  <option value="contractor">Contractor</option>
                </select>
              </label>
              {relationship === "future_employee" ? (
                <LabeledInput
                  label="Joining date"
                  type="date"
                  value={joiningDate}
                  onChange={setJoiningDate}
                  required
                />
              ) : null}
              {mode === "cv" ? (
                <label className="space-y-1 text-xs font-medium text-foreground">
                  CV (PDF or DOCX)
                  <input
                    type="file"
                    required
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                    className="block h-9 w-full rounded-md border border-border bg-background px-2 py-1 text-xs file:mr-2 file:border-0 file:bg-transparent file:text-xs"
                  />
                </label>
              ) : null}
            </div>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {mode === "cv"
                ? "The invitation is sent on behalf of the selected Client. The CV is parsed into a draft and remains unverified until an Admin reviews and commits selected fields."
                : "The invitation is sent on behalf of the selected Client. Relationship and profile values remain unverified until their canonical review workflows complete."}
              {relationship === "future_employee" ? (
                <span className="mt-1 block">
                  Future employee changes to Employee when the joining date arrives. Document
                  uploads do not change employment status.
                </span>
              ) : null}
            </div>
            <DialogFooter>
              <button
                type="submit"
                disabled={
                  mutation.isPending ||
                  !clientOrganizationId ||
                  !fullName.trim() ||
                  !email.trim() ||
                  (relationship === "future_employee" && !joiningDate)
                }
                className="inline-flex h-9 items-center rounded-md bg-foreground px-4 text-xs font-medium text-background disabled:opacity-50"
              >
                {mutation.isPending
                  ? mode === "cv"
                    ? "Inviting and uploading..."
                    : "Inviting..."
                  : mode === "cv"
                    ? "Invite Candidate and process CV"
                    : "Invite Candidate"}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ModeButton({
  active,
  onClick,
  children,
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-md text-xs font-medium ${active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
    >
      {children}
    </button>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-1 text-xs font-medium text-foreground">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required={required}
        className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
