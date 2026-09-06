import type { FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CanonicalOrganizationDraft } from "@/features/admin/lib/organization-resolution";

const inputClass =
  "h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground";

interface Props {
  open: boolean;
  draft: CanonicalOrganizationDraft;
  continuesOutreach: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: CanonicalOrganizationDraft) => void;
  onConfirm: () => Promise<void>;
}

export function CanonicalOrganizationDialog({
  open,
  draft,
  continuesOutreach,
  isSubmitting,
  onOpenChange,
  onDraftChange,
  onConfirm,
}: Props) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    await onConfirm();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <DialogTitle>Create canonical organization</DialogTitle>
            <DialogDescription>
              Review the authoritative organization details before creation. This does not create an
              Admin-owned workspace membership.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-muted-foreground sm:col-span-2">
              <span>Canonical name</span>
              <input
                required
                value={draft.name}
                onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
                className={inputClass}
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>Organization type</span>
              <select
                value={draft.organizationType}
                onChange={(event) =>
                  onDraftChange({
                    ...draft,
                    organizationType: event.target.value as "employer" | "university",
                  })
                }
                className={inputClass}
              >
                <option value="employer">Employer</option>
                <option value="university">University / institution</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>Country code</span>
              <input
                required
                maxLength={2}
                value={draft.country}
                onChange={(event) =>
                  onDraftChange({ ...draft, country: event.target.value.toUpperCase() })
                }
                className={inputClass}
                placeholder="IN"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>State / province</span>
              <input
                value={draft.stateProvince}
                onChange={(event) => onDraftChange({ ...draft, stateProvince: event.target.value })}
                className={inputClass}
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>Domain</span>
              <input
                value={draft.domain}
                onChange={(event) => onDraftChange({ ...draft, domain: event.target.value })}
                className={inputClass}
                placeholder="example.com"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground sm:col-span-2">
              <span>Website</span>
              <input
                value={draft.website}
                onChange={(event) => onDraftChange({ ...draft, website: event.target.value })}
                className={inputClass}
                placeholder="https://example.com"
              />
            </label>
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p>
              Registry reference: {draft.registryName ?? "No resolved Registry record"}
              {draft.registryRecordId ? ` (${draft.registryRecordId})` : ""}
            </p>
            {!draft.registryRecordId ? (
              <p className="mt-1">
                A draft Trust Registry record will be created and linked with the canonical
                organization.
              </p>
            ) : null}
            <p className="mt-1 font-medium text-foreground">
              {continuesOutreach
                ? "Confirmation will create and attach the organization, then send the verifier invitation."
                : "Confirmation will create and attach the organization. Outreach still requires Admin approval."}
            </p>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-9 rounded-md border border-border bg-background px-4 text-sm text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !draft.name.trim() ||
                draft.country.trim().length !== 2 ||
                !draft.organizationType
              }
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {isSubmitting
                ? "Creating..."
                : continuesOutreach
                  ? "Create organization and send invitation"
                  : "Create canonical organization"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
