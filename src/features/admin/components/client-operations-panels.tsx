import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, MailPlus, Plus, Upload } from "lucide-react";
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
  adminClientOperationKeys,
  clientInvitationQueryOptions,
  clientJobRoleQueryOptions,
  clientPeopleImportQueryOptions,
  createAdminClientOperationsAdapter,
  type ClientPeopleImportPreview,
} from "@/features/admin/data/admin-client-operations";
import { company360Keys, type CompanyPersonItem } from "@/features/admin/data/organizations";
import { getOperationError } from "@/features/admin/lib/operation-error";

const buttonClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[#0B2545] px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass =
  "inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground disabled:opacity-50";
const inputClass =
  "h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground";

export function AddClientPersonDialog({
  organizationId,
  open,
  onOpenChange,
}: {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const adapter = useMemo(() => createAdminClientOperationsAdapter(), []);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("employee");
  const mutation = useMutation({
    mutationFn: () =>
      adapter.createPerson(organizationId, {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        relationship,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: company360Keys.all() });
      toast.success("Client Person created without a Candidate account");
      onOpenChange(false);
      setFullName("");
      setEmail("");
      setPhone("");
    },
    onError: (error) => toast.error(getOperationError(error, "The Person could not be created.")),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Client Person</DialogTitle>
          <DialogDescription>
            Adds a People record only. Candidate access is created later through a separate,
            explicit invitation.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <Field label="Full name" value={fullName} onChange={setFullName} required />
          <Field label="Email" value={email} onChange={setEmail} type="email" required />
          <Field label="Phone (optional)" value={phone} onChange={setPhone} />
          <label className="block space-y-1 text-xs font-medium">
            Relationship
            <select
              value={relationship}
              onChange={(event) => setRelationship(event.target.value)}
              className={inputClass}
            >
              <option value="employee">Employee</option>
              <option value="former_employee">Former employee</option>
              <option value="contractor">Contractor</option>
              <option value="future_employee">Future employee</option>
              <option value="candidate">Candidate</option>
            </select>
          </label>
          <DialogFooter>
            <button
              type="submit"
              disabled={mutation.isPending || !fullName.trim() || !email.trim()}
              className={buttonClass}
            >
              {mutation.isPending ? "Adding..." : "Add Person"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CandidateActivationAction({
  organizationId,
  person,
  allowed,
}: {
  organizationId: string;
  person: CompanyPersonItem;
  allowed: boolean;
}) {
  const adapter = useMemo(() => createAdminClientOperationsAdapter(), []);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => adapter.activatePerson(organizationId, person.id, crypto.randomUUID()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: company360Keys.all() });
      toast.success("Candidate activation queued for the Client Person");
    },
    onError: (error) =>
      toast.error(getOperationError(error, "Candidate activation could not be queued.")),
    onSettled: () => queryClient.invalidateQueries({ queryKey: company360Keys.all() }),
  });
  const canRetry = person.linkedUserId && person.invitationStatus === "not_invited";
  if (person.linkedUserId && !canRetry) return null;
  return (
    <button
      type="button"
      disabled={!allowed || mutation.isPending}
      title={!allowed ? "send_candidate_activation permission required" : undefined}
      onClick={() => mutation.mutate()}
      className="font-medium text-[#087F7C] hover:underline disabled:text-muted-foreground"
    >
      {mutation.isPending
        ? "Inviting..."
        : canRetry
          ? "Retry Candidate invitation"
          : "Invite as Candidate"}
    </button>
  );
}

export function ClientTeamInvitationsPanel({
  organizationId,
  canManage,
}: {
  organizationId: string;
  canManage: boolean;
}) {
  const adapter = useMemo(() => createAdminClientOperationsAdapter(), []);
  const queryClient = useQueryClient();
  const query = useQuery(clientInvitationQueryOptions(organizationId));
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("member");
  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: adminClientOperationKeys.invitations(organizationId),
    });
  const createMutation = useMutation({
    mutationFn: () =>
      adapter.createInvitation(organizationId, {
        email: email.trim(),
        name: name.trim() || undefined,
        role,
      }),
    onSuccess: async () => {
      await refresh();
      setShowForm(false);
      setEmail("");
      setName("");
      toast.success("Client team invitation queued");
    },
    onError: (error) => toast.error(getOperationError(error, "Invitation could not be created.")),
  });
  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "resend" | "cancel" }) =>
      action === "resend"
        ? adapter.resendInvitation(organizationId, id)
        : adapter.cancelInvitation(organizationId, id),
    onSuccess: refresh,
    onError: (error) => toast.error(getOperationError(error, "Invitation action failed.")),
  });
  return (
    <Panel
      title="Team invitations"
      description="Invite Client workspace members on the Client's behalf. Delivery uses the canonical invitation flow."
      action={
        <button
          type="button"
          disabled={!canManage}
          onClick={() => setShowForm((value) => !value)}
          className={buttonClass}
        >
          <MailPlus className="size-3.5" /> Invite member
        </button>
      }
    >
      {showForm ? (
        <form
          className="mb-4 grid gap-2 rounded-lg border border-border bg-muted/20 p-3 md:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate();
          }}
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name (optional)"
            className={inputClass}
          />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Work email"
            type="email"
            required
            className={inputClass}
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className={inputClass}
          >
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="reviewer">Reviewer</option>
          </select>
          <button type="submit" disabled={createMutation.isPending} className={buttonClass}>
            Send invitation
          </button>
        </form>
      ) : null}
      <SimpleTable
        headers={["Recipient", "Role", "Status", "Sent", "Actions"]}
        rows={(query.data ?? []).map((item) => [
          item.inviteeName ? `${item.inviteeName} · ${item.inviteeEmail}` : item.inviteeEmail,
          item.role,
          item.status,
          formatDate(item.lastSentAt ?? item.invitedAt),
          item.status === "pending" ? (
            <span key="actions" className="flex gap-2">
              <button
                type="button"
                disabled={!canManage || actionMutation.isPending}
                onClick={() => actionMutation.mutate({ id: item.id, action: "resend" })}
                className="font-medium text-[#087F7C] disabled:text-muted-foreground"
              >
                Resend
              </button>
              <button
                type="button"
                disabled={!canManage || actionMutation.isPending}
                onClick={() => actionMutation.mutate({ id: item.id, action: "cancel" })}
                className="font-medium text-destructive disabled:text-muted-foreground"
              >
                Revoke
              </button>
            </span>
          ) : (
            "—"
          ),
        ])}
        loading={query.isPending}
        empty="No team invitations recorded."
      />
    </Panel>
  );
}

export function ClientJobRolesPanel({
  organizationId,
  canManage,
}: {
  organizationId: string;
  canManage: boolean;
}) {
  const adapter = useMemo(() => createAdminClientOperationsAdapter(), []);
  const queryClient = useQueryClient();
  const query = useQuery(clientJobRoleQueryOptions(organizationId));
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState("");
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: adminClientOperationKeys.roles(organizationId) });
  const createMutation = useMutation({
    mutationFn: () =>
      adapter.createRole(organizationId, {
        name: name.trim(),
        department: department.trim() || undefined,
        location: location.trim() || undefined,
        workMode: workMode || undefined,
      }),
    onSuccess: async () => {
      await refresh();
      setShowForm(false);
      setName("");
      toast.success("Client job role created");
    },
    onError: (error) => toast.error(getOperationError(error, "Job role could not be created.")),
  });
  const deactivateMutation = useMutation({
    mutationFn: (roleId: string) => adapter.deactivateRole(organizationId, roleId),
    onSuccess: refresh,
    onError: (error) => toast.error(getOperationError(error, "Job role could not be archived.")),
  });
  return (
    <Panel
      title="Client job roles"
      description="Canonical roles used for Client People and employment operations."
      action={
        <button
          type="button"
          disabled={!canManage}
          onClick={() => setShowForm((value) => !value)}
          className={buttonClass}
        >
          <Plus className="size-3.5" /> Add role
        </button>
      }
    >
      {showForm ? (
        <form
          className="mb-4 grid gap-2 rounded-lg border border-border bg-muted/20 p-3 md:grid-cols-5"
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate();
          }}
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Role name"
            required
            className={inputClass}
          />
          <input
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            placeholder="Department"
            className={inputClass}
          />
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Location"
            className={inputClass}
          />
          <select
            value={workMode}
            onChange={(event) => setWorkMode(event.target.value)}
            className={inputClass}
          >
            <option value="">Work mode</option>
            <option value="onsite">Onsite</option>
            <option value="hybrid">Hybrid</option>
            <option value="remote">Remote</option>
          </select>
          <button type="submit" disabled={createMutation.isPending} className={buttonClass}>
            Create role
          </button>
        </form>
      ) : null}
      <SimpleTable
        headers={["Role", "Department", "Work mode", "People", "Status", "Actions"]}
        rows={(query.data ?? []).map((role) => [
          role.name,
          role.department ?? "—",
          role.workMode ?? "—",
          String(role.assignedPeopleCount),
          role.status,
          role.active ? (
            <button
              key="archive"
              type="button"
              disabled={!canManage || deactivateMutation.isPending}
              onClick={() => deactivateMutation.mutate(role.id)}
              className="font-medium text-destructive disabled:text-muted-foreground"
            >
              Archive
            </button>
          ) : (
            "—"
          ),
        ])}
        loading={query.isPending}
        empty="No client job roles recorded."
      />
    </Panel>
  );
}

export function ClientPeopleImportsPanel({
  organizationId,
  canManage,
}: {
  organizationId: string;
  canManage: boolean;
}) {
  const adapter = useMemo(() => createAdminClientOperationsAdapter(), []);
  const queryClient = useQueryClient();
  const query = useQuery(clientPeopleImportQueryOptions(organizationId));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ClientPeopleImportPreview | null>(null);
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: adminClientOperationKeys.imports(organizationId) });
  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Choose a CSV file first.");
      return adapter.uploadImport(organizationId, file);
    },
    onSuccess: (result) => setPreview(result),
    onError: (error) => toast.error(getOperationError(error, "CSV preview could not be created.")),
  });
  const confirmMutation = useMutation({
    mutationFn: () => {
      if (!preview) throw new Error("Create a preview first.");
      return adapter.confirmImport(organizationId, preview.id);
    },
    onSuccess: async (result) => {
      setPreview(result);
      await Promise.all([
        refresh(),
        queryClient.invalidateQueries({ queryKey: company360Keys.all() }),
      ]);
      toast.success("Client People import completed");
    },
    onError: (error) => toast.error(getOperationError(error, "CSV import could not be confirmed.")),
  });
  const downloadTemplate = async () => {
    const blob = await adapter.downloadTemplate(organizationId);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "client-people-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Panel
      title="CSV People imports"
      description="Import Client People first. CSV import never creates Candidate accounts; activation is a separate invitation action."
      action={
        <button
          type="button"
          onClick={() => void downloadTemplate()}
          className={secondaryButtonClass}
        >
          <Download className="size-3.5" /> Template
        </button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 p-3">
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={!canManage}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="min-w-64 flex-1 text-xs"
        />
        <button
          type="button"
          disabled={!canManage || !file || uploadMutation.isPending}
          onClick={() => uploadMutation.mutate()}
          className={secondaryButtonClass}
        >
          <Upload className="size-3.5" /> Preview
        </button>
        {preview?.readyForConfirmation ? (
          <button
            type="button"
            disabled={confirmMutation.isPending}
            onClick={() => confirmMutation.mutate()}
            className={buttonClass}
          >
            Confirm {preview.validRows} People
          </button>
        ) : null}
      </div>
      {preview ? (
        <div className="mb-4 rounded-md border border-cyan-200 bg-cyan-50 p-3 text-xs text-cyan-950">
          Preview: {preview.totalRows} rows, {preview.validRows} valid, {preview.invalidRows}{" "}
          invalid.
          {preview.mappingRequired ? " Column mapping is required before confirmation." : ""}
        </div>
      ) : null}
      <SimpleTable
        headers={["File", "State", "Rows", "Created", "Updated", "Failed", "Uploaded"]}
        rows={(query.data ?? []).map((item) => [
          item.filename,
          item.state,
          String(item.totalRows),
          String(item.createdCount),
          String(item.updatedCount),
          String(item.failedCount),
          formatDate(item.createdAt),
        ])}
        loading={query.isPending}
        empty="No Client People imports recorded."
      />
    </Panel>
  );
}

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 max-w-3xl text-xs text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SimpleTable({
  headers,
  rows,
  loading,
  empty,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  loading: boolean;
  empty: string;
}) {
  if (loading) return <p className="py-8 text-center text-xs text-muted-foreground">Loading…</p>;
  if (!rows.length)
    return <p className="py-8 text-center text-xs text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-3 text-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({
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
    <label className="block space-y-1 text-xs font-medium">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required={required}
        className={inputClass}
      />
    </label>
  );
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}
