import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  createAdminOperationsAdapter,
  type ManagedCandidate,
} from "@/features/admin/data/admin-operations";
import { userKeys } from "@/features/admin/data/users";
import { getOperationError } from "@/features/admin/lib/operation-error";

interface CreatePersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePersonDialog({ open, onOpenChange }: CreatePersonDialogProps) {
  const queryClient = useQueryClient();
  const adapter = useMemo(() => createAdminOperationsAdapter(), []);
  const [mode, setMode] = useState<"manual" | "cv">("manual");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [created, setCreated] = useState<ManagedCandidate | null>(null);
  const [resumeStatus, setResumeStatus] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const mutation = useMutation({
    mutationFn: async () => {
      const candidate = await adapter.createCandidate({
        fullName: fullName.trim(),
        email: email.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(headline.trim() ? { headline: headline.trim() } : {}),
        ...(location.trim() ? { location: location.trim() } : {}),
        idempotencyKey,
      });
      if (mode === "cv" && file) {
        const receipt = await adapter.uploadResume(candidate.candidateId, file);
        setResumeStatus(receipt.status);
      }
      return candidate;
    },
    onSuccess: async (candidate) => {
      setCreated(candidate);
      await queryClient.invalidateQueries({ queryKey: userKeys.all() });
      toast.success(
        mode === "cv" ? "Candidate created and CV review prepared" : "Candidate created",
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
    setHeadline("");
    setLocation("");
    setFile(null);
    setCreated(null);
    setResumeStatus(null);
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
          <DialogTitle>Create Candidate</DialogTitle>
          <DialogDescription>
            Create an unclaimed Candidate record. The Candidate chooses their own password through
            the separate activation flow.
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
              <p className="font-medium">{created.fullName ?? "Candidate"} created</p>
              <p className="mt-1 text-xs">Account state: Admin-created / unclaimed</p>
              <p className="mt-1 text-xs">Contact: {created.emailMasked}</p>
              {resumeStatus ? (
                <p className="mt-1 text-xs">CV processing status: {resumeStatus}</p>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              No password, activation token, or verified identity state was created by this action.
            </p>
            <DialogFooter>
              <Link
                to="/admin/users/$userId"
                params={{ userId: created.candidateId }}
                className="inline-flex h-9 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background"
              >
                Continue to Candidate detail
              </Link>
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
            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledInput label="Full name" value={fullName} onChange={setFullName} required />
              <LabeledInput label="Email" type="email" value={email} onChange={setEmail} required />
              <LabeledInput label="Mobile (optional)" value={phone} onChange={setPhone} />
              <LabeledInput label="Headline (optional)" value={headline} onChange={setHeadline} />
              <LabeledInput label="Location (optional)" value={location} onChange={setLocation} />
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
                ? "The CV is parsed into a draft. Nothing is imported until an Admin opens Candidate detail, reviews, edits, selects, validates, and commits it. Imported fields keep CV-extracted provenance."
                : "Initial values are recorded as Admin entered and require Candidate confirmation. They are not independently verified."}
            </div>
            <DialogFooter>
              <button
                type="submit"
                disabled={mutation.isPending || !fullName.trim() || !email.trim()}
                className="inline-flex h-9 items-center rounded-md bg-foreground px-4 text-xs font-medium text-background disabled:opacity-50"
              >
                {mutation.isPending
                  ? mode === "cv"
                    ? "Creating and uploading..."
                    : "Creating..."
                  : mode === "cv"
                    ? "Create and process CV"
                    : "Create Candidate"}
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
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
