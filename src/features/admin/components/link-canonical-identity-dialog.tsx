import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Building2, Link2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminSearchField } from "@/features/admin/components/search-field";
import { company360Keys, createCompany360DataAdapter } from "@/features/admin/data/organizations";
import {
  getRegistryOrgTypeLabel,
  registryKeys,
  registryListQueryOptions,
} from "@/features/admin/data/registry";
import { useDebouncedValue } from "@/features/admin/hooks/use-debounced-value";
import { getOperationError } from "@/features/admin/lib/operation-error";

interface Props {
  open: boolean;
  organizationId: string;
  organizationName: string;
  onOpenChange: (open: boolean) => void;
}

export function LinkCanonicalIdentityDialog({
  open,
  organizationId,
  organizationName,
  onOpenChange,
}: Props) {
  const queryClient = useQueryClient();
  const adapter = useMemo(() => createCompany360DataAdapter(), []);
  const [search, setSearch] = useState(organizationName);
  const [selectedId, setSelectedId] = useState<string>();
  const debouncedSearch = useDebouncedValue(search, 300).trim();
  const results = useQuery({
    ...registryListQueryOptions({ query: debouncedSearch, page: 1, pageSize: 10 }),
    enabled: open && debouncedSearch.length >= 2,
  });
  const selected = results.data?.items.find((item) => item.id === selectedId);
  const linkMutation = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error("Select a canonical identity before linking.");
      return adapter.linkCanonicalIdentity(organizationId, selectedId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: company360Keys.all() }),
        queryClient.invalidateQueries({ queryKey: registryKeys.all() }),
      ]);
      toast.success("Canonical identity linked.");
      setSelectedId(undefined);
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(getOperationError(error, "The canonical identity could not be linked.")),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!linkMutation.isPending) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link canonical identity</DialogTitle>
          <DialogDescription>
            Connect {organizationName} to one authoritative Organization Directory record. This does
            not merge, delete, or rename either record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <AdminSearchField
            value={search}
            onChange={(value) => {
              setSearch(value);
              setSelectedId(undefined);
            }}
            placeholder="Search canonical name, domain, or alias"
            ariaLabel="Search canonical organization identities"
          />

          <div className="max-h-72 overflow-y-auto rounded-md border border-border">
            {debouncedSearch.length < 2 ? (
              <p className="p-4 text-xs text-muted-foreground">
                Enter at least two characters to search the Organization Directory.
              </p>
            ) : null}
            {results.isPending && debouncedSearch.length >= 2 ? (
              <p className="p-4 text-xs text-muted-foreground">Searching canonical identities...</p>
            ) : null}
            {results.error ? (
              <p className="p-4 text-xs text-red-700">{results.error.message}</p>
            ) : null}
            {results.data?.items.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground">
                No canonical identity matched. Create or review the identity in Organization
                Directory before linking.
              </p>
            ) : null}
            {results.data?.items.map((item) => {
              const selectedRow = selectedId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`flex w-full items-start gap-3 border-b border-border p-3 text-left last:border-b-0 ${
                    selectedRow ? "bg-cyan-50 ring-1 ring-inset ring-cyan-300" : "hover:bg-accent"
                  }`}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#0B2545] text-white">
                    <Building2 aria-hidden className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">
                      {item.canonicalName}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {getRegistryOrgTypeLabel(item.orgType)}
                      {item.domain ? ` · ${item.domain}` : " · No primary domain"}
                    </span>
                    <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                      {item.id}
                    </span>
                  </span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground">
                    {item.state.replaceAll("_", " ")}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            <p>
              Link only when the legal identity is authoritative. Shared names or domains are not
              sufficient evidence. The link affects verification routing and organization history.
            </p>
          </div>

          {selected ? (
            <p className="text-xs text-muted-foreground">
              Selected:{" "}
              <span className="font-medium text-foreground">{selected.canonicalName}</span>
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={linkMutation.isPending}
            className="h-9 rounded-md border border-border bg-background px-4 text-sm text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => linkMutation.mutate()}
            disabled={!selectedId || linkMutation.isPending}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-[#0B2545] px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            <Link2 aria-hidden className="size-4" />
            {linkMutation.isPending ? "Linking..." : "Confirm canonical link"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
