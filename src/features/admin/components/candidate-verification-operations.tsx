import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminAccess } from "@/features/admin/auth/admin-access";
import { CandidateVerificationOperationActions } from "@/features/admin/components/candidate-verification-operation-actions";
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
  const access = useAdminAccess();
  const permissions = access.admin?.permissions ?? [];
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
          <CandidateVerificationOperationActions permissions={permissions} onLaunch={launch} />
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
