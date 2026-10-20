import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, MapPinCheck, ShieldAlert } from "lucide-react";
import {
  PersonVerificationOperationsDialog,
  type PersonVerificationOperationTab,
} from "@/features/admin/components/person-verification-operations-dialog";
import { EmptyState } from "@/features/admin/components/states";
import { WorkspaceSection } from "@/features/admin/components/workspace-section";
import {
  companyPeopleQueryOptions,
  type CompanyPersonItem,
} from "@/features/admin/data/organizations";

interface CandidateOrganization {
  id: string;
  name: string;
}

export function CandidateVerificationOperations({
  candidateId,
  candidateName,
  organizations,
}: {
  candidateId: string;
  candidateName: string;
  organizations: CandidateOrganization[];
}) {
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? "");
  const [initialTab, setInitialTab] = useState<PersonVerificationOperationTab>("court");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!organizations.some((organization) => organization.id === organizationId)) {
      setOrganizationId(organizations[0]?.id ?? "");
    }
  }, [organizationId, organizations]);

  const peopleQuery = useQuery({
    ...companyPeopleQueryOptions(organizationId, {
      search: candidateName,
      status: "all",
      page: 1,
      pageSize: 100,
    }),
    enabled: Boolean(organizationId),
  });
  const person = useMemo(
    () => peopleQuery.data?.items.find((item) => item.linkedUserId === candidateId) ?? null,
    [candidateId, peopleQuery.data?.items],
  );

  const launch = (tab: PersonVerificationOperationTab) => {
    setInitialTab(tab);
    setOpen(true);
  };

  return (
    <div id="verification-operations" className="scroll-mt-20">
      <WorkspaceSection
        title="Verification operations"
        description="Open the existing scoped Court, in-person, or internal report workflow"
        action={
          organizations.length > 1 ? (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Organization
              <select
                value={organizationId}
                onChange={(event) => setOrganizationId(event.target.value)}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
              >
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null
        }
      >
        {organizations.length === 0 ? (
          <EmptyState
            title="No organization-linked verification"
            description="Court, in-person, and internal report operations become available after the Candidate is linked to a canonical organization person."
          />
        ) : peopleQuery.isPending ? (
          <p className="text-xs text-muted-foreground">
            Loading the canonical organization person...
          </p>
        ) : peopleQuery.error ? (
          <p className="text-xs text-red-700">
            The organization person could not be loaded. No operation is available until the
            canonical link can be confirmed.
          </p>
        ) : !person ? (
          <EmptyState
            title="Canonical organization person not found"
            description="This verification references an organization, but its linked person is not available in Company 360. No operation was inferred or created."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <OperationButton
              icon={<ShieldAlert className="size-4" />}
              title="Court / Criminal"
              description="Record a scoped Court-record check"
              onClick={() => launch("court")}
            />
            <OperationButton
              icon={<MapPinCheck className="size-4" />}
              title="In-person"
              description="Record an auditable observation"
              onClick={() => launch("in-person")}
            />
            <OperationButton
              icon={<FileText className="size-4" />}
              title="Internal Report"
              description="Read the authorized verification report"
              onClick={() => launch("report")}
            />
          </div>
        )}
      </WorkspaceSection>

      <PersonVerificationOperationsDialog
        organizationId={organizationId}
        person={person}
        open={open}
        onOpenChange={setOpen}
        initialTab={initialTab}
      />
    </div>
  );
}

function OperationButton({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-[#0FA8A5]/50 hover:bg-[#EAF8F6]/60"
    >
      <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
        {icon}
        {title}
      </span>
      <span className="mt-1 block text-[11px] text-muted-foreground">{description}</span>
    </button>
  );
}
