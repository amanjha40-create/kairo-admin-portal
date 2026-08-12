import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Building2, ChevronRight, ExternalLink, GitMerge, Plus } from "lucide-react";
import { appEnv } from "@/config/env";
import { WorkspaceSection } from "@/features/admin/components/workspace-section";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/features/admin/components/states";
import { useAdminAccess, AdminAccessChecking } from "@/features/admin/auth/admin-access";
import { shouldEnableAdminProtectedQuery } from "@/features/admin/auth/protected-query";
import { formatRelativeTime } from "@/features/admin/lib/format";
import {
  REGISTRY_ORG_STATE_LABEL,
  createRegistryDataAdapter,
  getRegistryContactRoleLabel,
  getRegistryContactStateLabel,
  getRegistryLifecycleStatusLabel,
  getRegistryOrgTypeLabel,
  getRegistryTrustStatusLabel,
  registryDetailQueryOptions,
  registryKeys,
  type RegistryAliasCreatePayload,
  type RegistryCapabilityCreatePayload,
  type RegistryDomainCreatePayload,
  type RegistryIdentifierCreatePayload,
  type RegistryMergePayload,
  type RegistryRelationshipCreatePayload,
} from "@/features/admin/data/registry";
import { ApiError } from "@/lib/api/errors";

export const Route = createFileRoute("/admin/registry/$organizationId")({
  head: () => ({
    meta: [
      { title: "Registry organization — Kairo Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RegistryOrgDetail,
  pendingComponent: () => (
    <div className="mx-auto max-w-5xl">
      <LoadingSkeleton rows={8} />
    </div>
  ),
  errorComponent: RegistryDetailErrorBoundary,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl">
      <EmptyState
        title="Organization not found"
        description="The registry record may have been merged, archived, or the identifier is incorrect."
        action={
          <Link
            to="/admin/registry"
            className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90"
          >
            Back to Registry
          </Link>
        }
      />
    </div>
  ),
});

function RegistryDetailErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const copy = getRegistryDetailErrorCopy(error);

  return (
    <div className="mx-auto max-w-2xl">
      <ErrorState
        title={copy.title}
        description={copy.description}
        action={
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90"
          >
            Try again
          </button>
        }
      />
    </div>
  );
}

function RegistryOrgDetail() {
  const { organizationId } = Route.useParams();
  const access = useAdminAccess();
  const router = useRouter();
  const queryClient = useQueryClient();
  const adapter = useMemo(() => createRegistryDataAdapter(appEnv), []);
  const detailQuery = useQuery({
    ...registryDetailQueryOptions(organizationId),
    enabled: shouldEnableAdminProtectedQuery(access.state),
  });

  const [showAliasForm, setShowAliasForm] = useState(false);
  const [showDomainForm, setShowDomainForm] = useState(false);
  const [showIdentifierForm, setShowIdentifierForm] = useState(false);
  const [showCapabilityForm, setShowCapabilityForm] = useState(false);
  const [showRelationshipForm, setShowRelationshipForm] = useState(false);
  const [showMergeForm, setShowMergeForm] = useState(false);

  const refreshRegistry = async () => {
    await queryClient.invalidateQueries({ queryKey: registryKeys.all() });
  };

  const aliasMutation = useMutation({
    mutationFn: (payload: RegistryAliasCreatePayload) => adapter.addAlias(organizationId, payload),
    onSuccess: async () => {
      setShowAliasForm(false);
      await refreshRegistry();
    },
  });
  const domainMutation = useMutation({
    mutationFn: (payload: RegistryDomainCreatePayload) =>
      adapter.addDomain(organizationId, payload),
    onSuccess: async () => {
      setShowDomainForm(false);
      await refreshRegistry();
    },
  });
  const identifierMutation = useMutation({
    mutationFn: (payload: RegistryIdentifierCreatePayload) =>
      adapter.addIdentifier(organizationId, payload),
    onSuccess: async () => {
      setShowIdentifierForm(false);
      await refreshRegistry();
    },
  });
  const capabilityMutation = useMutation({
    mutationFn: (payload: RegistryCapabilityCreatePayload) =>
      adapter.addCapability(organizationId, payload),
    onSuccess: async () => {
      setShowCapabilityForm(false);
      await refreshRegistry();
    },
  });
  const relationshipMutation = useMutation({
    mutationFn: (payload: RegistryRelationshipCreatePayload) =>
      adapter.addRelationship(organizationId, payload),
    onSuccess: async () => {
      setShowRelationshipForm(false);
      await refreshRegistry();
    },
  });
  const mergeMutation = useMutation({
    mutationFn: (payload: RegistryMergePayload) =>
      adapter.mergeOrganization(organizationId, payload),
    onSuccess: async () => {
      setShowMergeForm(false);
      await queryClient.invalidateQueries({ queryKey: registryKeys.all() });
      await router.navigate({ to: "/admin/registry" });
    },
  });

  if (!shouldEnableAdminProtectedQuery(access.state)) {
    return <AdminAccessChecking />;
  }

  if (detailQuery.isPending) {
    return (
      <div className="mx-auto max-w-5xl">
        <LoadingSkeleton rows={8} />
      </div>
    );
  }

  if (detailQuery.error) {
    const copy = getRegistryDetailErrorCopy(detailQuery.error);
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState
          title={copy.title}
          description={copy.description}
          action={
            <button
              type="button"
              onClick={() => {
                void detailQuery.refetch();
              }}
              className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90"
            >
              Try again
            </button>
          }
        />
      </div>
    );
  }

  const org = detailQuery.data;
  if (!org) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          title="Organization not found"
          description="The registry record may have been merged, archived, or the identifier is incorrect."
          action={
            <Link
              to="/admin/registry"
              className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90"
            >
              Back to Registry
            </Link>
          }
        />
      </div>
    );
  }

  const mutationError =
    aliasMutation.error ||
    domainMutation.error ||
    identifierMutation.error ||
    capabilityMutation.error ||
    relationshipMutation.error ||
    mergeMutation.error ||
    null;

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-4">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Link to="/admin/registry" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft aria-hidden className="size-3" />
          Registry
        </Link>
        <ChevronRight aria-hidden className="size-3" />
        <span className="text-foreground">{org.canonicalName}</span>
      </nav>

      <header className="rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Building2 aria-hidden className="size-4 text-muted-foreground" />
              <h1 className="truncate text-base font-semibold tracking-tight text-foreground">
                {org.canonicalName}
              </h1>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                {REGISTRY_ORG_STATE_LABEL[org.state]}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {getRegistryOrgTypeLabel(org.orgType)} · {org.country}
              {org.headquartersState ? ` · ${org.headquartersState}` : ""}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Lifecycle: {getRegistryLifecycleStatusLabel(org.lifecycleStatus)} · Trust:{" "}
              {getRegistryTrustStatusLabel(org.trustStatus)}
            </p>
            {org.aliases.length > 0 ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Aliases: {org.aliases.join(", ")}
              </p>
            ) : null}
          </div>
          <div className="text-right text-[11px] text-muted-foreground">
            {org.website ? (
              <a
                href={org.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-foreground hover:underline"
              >
                {org.domain ?? org.website}
                <ExternalLink aria-hidden className="size-3" />
              </a>
            ) : org.domain ? (
              <div className="font-mono text-foreground">{org.domain}</div>
            ) : (
              <div>Domain unavailable</div>
            )}
            <div className="mt-1">
              Linked organizations:{" "}
              <span className="text-foreground">{org.linkedOrganizationCount}</span>
            </div>
            <div>
              Total verifications: <span className="text-foreground">{org.totalVerifications}</span>
            </div>
          </div>
        </div>
      </header>

      {mutationError ? (
        <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          {mutationError.message}
        </div>
      ) : null}

      {org.possibleDuplicateLinks.length > 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="font-semibold">Possible duplicate detected</div>
          <ul className="ml-4 mt-1 list-disc">
            {org.possibleDuplicateLinks.map((duplicate) => (
              <li key={duplicate.id}>
                <Link
                  to="/admin/registry/$organizationId"
                  params={{ organizationId: duplicate.id }}
                  className="hover:underline"
                >
                  {duplicate.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <WorkspaceSection
            title="Overview"
            description="Canonical registry identity, operational state, and update history."
          >
            <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
              <OverviewField label="Registry public ID" value={org.id} mono />
              <OverviewField
                label="Organization type"
                value={getRegistryOrgTypeLabel(org.orgType)}
              />
              <OverviewField
                label="Primary domain"
                value={org.domain ?? "Unavailable"}
                mono={Boolean(org.domain)}
              />
              <OverviewField label="Created" value={new Date(org.createdAt).toLocaleString()} />
              <OverviewField label="Updated" value={new Date(org.updatedAt).toLocaleString()} />
              <OverviewField
                label="Total verifications"
                value={`${org.totalVerifications} total · ${org.activeCaseCount} active`}
              />
            </div>
          </WorkspaceSection>

          <WorkspaceSection
            title="Identity"
            description="Canonical names, domains, and identifiers used to resolve this organization."
            action={
              !appEnv.adminDemoMode ? (
                <div className="flex flex-wrap gap-1.5">
                  <ToggleAction
                    label="Add alias"
                    open={showAliasForm}
                    onClick={() => setShowAliasForm((v) => !v)}
                  />
                  <ToggleAction
                    label="Add domain"
                    open={showDomainForm}
                    onClick={() => setShowDomainForm((v) => !v)}
                  />
                  <ToggleAction
                    label="Add identifier"
                    open={showIdentifierForm}
                    onClick={() => setShowIdentifierForm((v) => !v)}
                  />
                </div>
              ) : null
            }
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <IdentityList
                title="Aliases"
                empty="No aliases are recorded."
                items={org.aliasItems.map((item) => (
                  <div key={item.id}>
                    <div className="font-medium text-foreground">{item.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {item.type} · {formatRelativeTime(item.createdAt)}
                    </div>
                  </div>
                ))}
              />
              <IdentityList
                title="Domains"
                empty="No domains are recorded."
                items={org.domains.map((item) => (
                  <div key={item.id}>
                    <div className="font-medium text-foreground">{item.domain}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {item.isPrimary ? "Primary" : "Secondary"} ·{" "}
                      {item.isVerified ? "Verified" : "Unverified"}
                    </div>
                  </div>
                ))}
              />
              <IdentityList
                title="Identifiers"
                empty="No identifiers are recorded."
                items={org.identifiers.map((item) => (
                  <div key={item.id}>
                    <div className="font-medium text-foreground">
                      {item.type}: {item.value}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {item.status}
                      {item.issuingCountry ? ` · ${item.issuingCountry}` : ""}
                    </div>
                  </div>
                ))}
              />
            </div>
            {showAliasForm && !appEnv.adminDemoMode ? (
              <AliasForm
                pending={aliasMutation.isPending}
                onCancel={() => setShowAliasForm(false)}
                onSubmit={(payload) => aliasMutation.mutate(payload)}
              />
            ) : null}
            {showDomainForm && !appEnv.adminDemoMode ? (
              <DomainForm
                pending={domainMutation.isPending}
                onCancel={() => setShowDomainForm(false)}
                onSubmit={(payload) => domainMutation.mutate(payload)}
              />
            ) : null}
            {showIdentifierForm && !appEnv.adminDemoMode ? (
              <IdentifierForm
                pending={identifierMutation.isPending}
                onCancel={() => setShowIdentifierForm(false)}
                onSubmit={(payload) => identifierMutation.mutate(payload)}
              />
            ) : null}
          </WorkspaceSection>

          <WorkspaceSection
            title="Relationships"
            description="Canonical organization relationships projected from the shared registry."
            action={
              !appEnv.adminDemoMode ? (
                <ToggleAction
                  label="Add relationship"
                  open={showRelationshipForm}
                  onClick={() => setShowRelationshipForm((v) => !v)}
                />
              ) : null
            }
          >
            {org.relationships.length === 0 ? (
              <EmptyState title="No relationships recorded" />
            ) : (
              <ul className="divide-y divide-border">
                {org.relationships.map((relationship) => (
                  <li key={relationship.id} className="py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium text-foreground">
                          {relationship.relatedOrganizationName}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {relationship.direction} · {relationship.relationshipType} ·{" "}
                          {formatRelativeTime(relationship.createdAt)}
                        </div>
                      </div>
                      <Link
                        to="/admin/registry/$organizationId"
                        params={{ organizationId: relationship.relatedOrganizationId }}
                        className="text-[11px] text-foreground hover:underline"
                      >
                        Open
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {showRelationshipForm && !appEnv.adminDemoMode ? (
              <RelationshipForm
                pending={relationshipMutation.isPending}
                onCancel={() => setShowRelationshipForm(false)}
                onSubmit={(payload) => relationshipMutation.mutate(payload)}
              />
            ) : null}
          </WorkspaceSection>

          <WorkspaceSection
            title="Verification activity"
            description="Verification requests currently linked to this canonical registry record."
          >
            {org.verificationRequests.length === 0 ? (
              <EmptyState title="No linked verifications" />
            ) : (
              <div className="overflow-hidden rounded-md border border-border">
                <table className="min-w-full divide-y divide-border text-xs">
                  <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Case</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Organization</th>
                      <th className="px-3 py-2 font-medium">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {org.verificationRequests.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2">
                          <Link
                            to="/admin/verifications/$caseId"
                            params={{ caseId: item.id }}
                            className="font-medium text-foreground hover:underline"
                          >
                            {item.id}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{item.requestType}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.status}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {item.organizationName ?? "Unavailable"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatRelativeTime(item.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </WorkspaceSection>

          <WorkspaceSection
            title="Linked organizations"
            description="Workspace organizations currently resolved to this canonical registry record."
          >
            {org.linkedOrganizations.length === 0 ? (
              <EmptyState
                title="No linked organizations"
                description="No HR or Institution workspaces currently reference this canonical organization."
              />
            ) : (
              <ul className="divide-y divide-border">
                {org.linkedOrganizations.map((item) => (
                  <li key={item.id} className="py-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium text-foreground">{item.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {getRegistryOrgTypeLabel(item.orgType)} · {item.verificationState}
                          {item.domain ? ` · ${item.domain}` : ""}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {item.memberCount} member{item.memberCount === 1 ? "" : "s"} ·{" "}
                          {item.resolutionStatus}
                          {item.suspendedAt
                            ? ` · Suspended ${formatRelativeTime(item.suspendedAt)}`
                            : ""}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </WorkspaceSection>
        </div>

        <div className="flex flex-col gap-4">
          <WorkspaceSection
            title="Capabilities"
            description="Authoritative capability flags for this canonical organization."
            action={
              !appEnv.adminDemoMode ? (
                <ToggleAction
                  label="Add capability"
                  open={showCapabilityForm}
                  onClick={() => setShowCapabilityForm((v) => !v)}
                />
              ) : null
            }
          >
            {org.capabilities.length === 0 ? (
              <EmptyState title="No capabilities recorded" />
            ) : (
              <ul className="space-y-2 text-xs">
                {org.capabilities.map((capability) => (
                  <li key={capability.id} className="rounded-md border border-border p-2">
                    <div className="font-medium text-foreground">{capability.label}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {capability.key} · {capability.status}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {showCapabilityForm && !appEnv.adminDemoMode ? (
              <CapabilityForm
                pending={capabilityMutation.isPending}
                onCancel={() => setShowCapabilityForm(false)}
                onSubmit={(payload) => capabilityMutation.mutate(payload)}
              />
            ) : null}
          </WorkspaceSection>

          <WorkspaceSection
            title="Verification contacts"
            description={`${org.contacts.length} contact${org.contacts.length === 1 ? "" : "s"} on file. Registry contacts are read-only in this workspace.`}
          >
            {org.contacts.length === 0 ? (
              <EmptyState
                title="No contacts on file"
                description="No masked verification contacts are currently projected from the backend for this registry record."
              />
            ) : (
              <ul className="divide-y divide-border">
                {org.contacts.map((contact) => (
                  <li key={contact.id} className="py-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-foreground">{contact.name}</span>
                          <span className="text-muted-foreground">
                            · {getRegistryContactRoleLabel(contact.role)}
                          </span>
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          {contact.emailMasked}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Added by {contact.addedBy} · {formatRelativeTime(contact.addedAt)}
                          {contact.lastSuccessfulUse
                            ? ` · Last used ${formatRelativeTime(contact.lastSuccessfulUse)}`
                            : ""}
                        </div>
                      </div>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                        {getRegistryContactStateLabel(contact.state)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </WorkspaceSection>

          <WorkspaceSection
            title="Audit activity"
            description="Timeline of significant record, merge, and verification-linked events."
          >
            {org.activity.length === 0 ? (
              <EmptyState title="No activity yet" />
            ) : (
              <ol className="space-y-2 border-l border-border pl-3 text-[11px]">
                {org.activity.map((event) => (
                  <li key={event.id}>
                    <div className="text-foreground">{event.description}</div>
                    <div className="text-muted-foreground">
                      {event.actor} · {formatRelativeTime(event.at)}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </WorkspaceSection>

          <WorkspaceSection
            title="Merge history"
            description="Audited consolidation events for this canonical record."
            action={
              !appEnv.adminDemoMode ? (
                <ToggleAction
                  label="Merge record"
                  open={showMergeForm}
                  onClick={() => setShowMergeForm((v) => !v)}
                  icon={<GitMerge aria-hidden className="size-3.5" />}
                />
              ) : null
            }
          >
            {org.mergeHistory.length === 0 ? (
              <EmptyState title="No merge history" />
            ) : (
              <ul className="space-y-2 text-xs">
                {org.mergeHistory.map((item) => (
                  <li key={item.id} className="rounded-md border border-border p-2">
                    <div className="font-medium text-foreground">
                      {item.direction === "merged_into" ? "Merged into" : "Absorbed"}{" "}
                      {item.otherOrganizationName}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {item.mergeReason ?? "No reason recorded"} ·{" "}
                      {formatRelativeTime(item.createdAt)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {showMergeForm && !appEnv.adminDemoMode ? (
              <MergeForm
                duplicates={org.possibleDuplicateLinks}
                pending={mergeMutation.isPending}
                onCancel={() => setShowMergeForm(false)}
                onSubmit={(payload) => mergeMutation.mutate(payload)}
              />
            ) : null}
          </WorkspaceSection>
        </div>
      </div>
    </div>
  );
}

function ToggleAction({
  label,
  open,
  onClick,
  icon,
}: {
  label: string;
  open: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] text-foreground hover:bg-accent"
    >
      {icon ?? <Plus aria-hidden className="size-3.5" />}
      {open ? "Close" : label}
    </button>
  );
}

function IdentityList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: React.ReactNode[];
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {items.length === 0 ? (
        <div className="mt-2 text-xs text-muted-foreground">{empty}</div>
      ) : (
        <div className="mt-2 space-y-2 text-xs">{items}</div>
      )}
    </div>
  );
}

function OverviewField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={mono ? "mt-1 font-mono text-xs text-foreground" : "mt-1 text-sm text-foreground"}
      >
        {value}
      </div>
    </div>
  );
}

function AliasForm({
  pending,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  onCancel: () => void;
  onSubmit: (payload: RegistryAliasCreatePayload) => void;
}) {
  const [aliasName, setAliasName] = useState("");
  const [aliasType, setAliasType] = useState("alternate_name");
  return (
    <InlineFormContainer title="Add alias">
      <label className="grid gap-1 text-xs">
        <span className="font-medium text-foreground">Alias</span>
        <input
          value={aliasName}
          onChange={(event) => setAliasName(event.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
        />
      </label>
      <label className="grid gap-1 text-xs">
        <span className="font-medium text-foreground">Type</span>
        <select
          value={aliasType}
          onChange={(event) => setAliasType(event.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
        >
          <option value="alternate_name">Alternate name</option>
          <option value="former_name">Former name</option>
          <option value="abbreviation">Abbreviation</option>
          <option value="brand_name">Brand name</option>
        </select>
      </label>
      <InlineFormActions
        pending={pending}
        disabled={aliasName.trim().length === 0}
        submitLabel="Add alias"
        onCancel={onCancel}
        onSubmit={() => onSubmit({ aliasName, aliasType })}
      />
    </InlineFormContainer>
  );
}

function DomainForm({
  pending,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  onCancel: () => void;
  onSubmit: (payload: RegistryDomainCreatePayload) => void;
}) {
  const [domain, setDomain] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  return (
    <InlineFormContainer title="Add domain">
      <label className="grid gap-1 text-xs">
        <span className="font-medium text-foreground">Domain</span>
        <input
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
        />
      </label>
      <InlineCheckbox
        label="Primary domain"
        checked={isPrimary}
        onChange={() => setIsPrimary((value) => !value)}
      />
      <InlineCheckbox
        label="Verified domain"
        checked={isVerified}
        onChange={() => setIsVerified((value) => !value)}
      />
      <InlineFormActions
        pending={pending}
        disabled={domain.trim().length === 0}
        submitLabel="Add domain"
        onCancel={onCancel}
        onSubmit={() => onSubmit({ domain, isPrimary, isVerified })}
      />
    </InlineFormContainer>
  );
}

function IdentifierForm({
  pending,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  onCancel: () => void;
  onSubmit: (payload: RegistryIdentifierCreatePayload) => void;
}) {
  const [identifierType, setIdentifierType] = useState("");
  const [identifierValue, setIdentifierValue] = useState("");
  const [issuingCountry, setIssuingCountry] = useState("IN");
  return (
    <InlineFormContainer title="Add identifier">
      <label className="grid gap-1 text-xs">
        <span className="font-medium text-foreground">Identifier type</span>
        <input
          value={identifierType}
          onChange={(event) => setIdentifierType(event.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
          placeholder="gst, ugc, cin"
        />
      </label>
      <label className="grid gap-1 text-xs">
        <span className="font-medium text-foreground">Identifier value</span>
        <input
          value={identifierValue}
          onChange={(event) => setIdentifierValue(event.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
        />
      </label>
      <label className="grid gap-1 text-xs">
        <span className="font-medium text-foreground">Issuing country</span>
        <input
          value={issuingCountry}
          onChange={(event) => setIssuingCountry(event.target.value)}
          maxLength={2}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm uppercase text-foreground"
        />
      </label>
      <InlineFormActions
        pending={pending}
        disabled={identifierType.trim().length === 0 || identifierValue.trim().length === 0}
        submitLabel="Add identifier"
        onCancel={onCancel}
        onSubmit={() =>
          onSubmit({
            identifierType,
            identifierValue,
            issuingCountry: issuingCountry.trim().toUpperCase(),
          })
        }
      />
    </InlineFormContainer>
  );
}

function CapabilityForm({
  pending,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  onCancel: () => void;
  onSubmit: (payload: RegistryCapabilityCreatePayload) => void;
}) {
  const [capabilityKey, setCapabilityKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  return (
    <InlineFormContainer title="Add capability">
      <label className="grid gap-1 text-xs">
        <span className="font-medium text-foreground">Capability key</span>
        <input
          value={capabilityKey}
          onChange={(event) => setCapabilityKey(event.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
          placeholder="employment"
        />
      </label>
      <label className="grid gap-1 text-xs">
        <span className="font-medium text-foreground">Display name</span>
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
        />
      </label>
      <InlineFormActions
        pending={pending}
        disabled={capabilityKey.trim().length === 0}
        submitLabel="Add capability"
        onCancel={onCancel}
        onSubmit={() => onSubmit({ capabilityKey, displayName: displayName || undefined })}
      />
    </InlineFormContainer>
  );
}

function RelationshipForm({
  pending,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  onCancel: () => void;
  onSubmit: (payload: RegistryRelationshipCreatePayload) => void;
}) {
  const [childRegistryRecordPublicId, setChildRegistryRecordPublicId] = useState("");
  const [relationshipType, setRelationshipType] = useState("subsidiary_of");
  return (
    <InlineFormContainer title="Add relationship">
      <label className="grid gap-1 text-xs">
        <span className="font-medium text-foreground">Related registry public ID</span>
        <input
          value={childRegistryRecordPublicId}
          onChange={(event) => setChildRegistryRecordPublicId(event.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
        />
      </label>
      <label className="grid gap-1 text-xs">
        <span className="font-medium text-foreground">Relationship type</span>
        <select
          value={relationshipType}
          onChange={(event) => setRelationshipType(event.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
        >
          <option value="parent_child">Parent / child</option>
          <option value="branch_of">Branch of</option>
          <option value="subsidiary_of">Subsidiary of</option>
          <option value="department_of">Department of</option>
          <option value="campus_of">Campus of</option>
          <option value="unit_of">Unit of</option>
          <option value="affiliate_of">Affiliate of</option>
        </select>
      </label>
      <InlineFormActions
        pending={pending}
        disabled={childRegistryRecordPublicId.trim().length === 0}
        submitLabel="Add relationship"
        onCancel={onCancel}
        onSubmit={() => onSubmit({ childRegistryRecordPublicId, relationshipType })}
      />
    </InlineFormContainer>
  );
}

function MergeForm({
  duplicates,
  pending,
  onCancel,
  onSubmit,
}: {
  duplicates: Array<{ id: string; label: string }>;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (payload: RegistryMergePayload) => void;
}) {
  const [targetRegistryRecordPublicId, setTargetRegistryRecordPublicId] = useState(
    duplicates[0]?.id ?? "",
  );
  const [mergeReason, setMergeReason] = useState("");
  return (
    <InlineFormContainer title="Merge registry record">
      <label className="grid gap-1 text-xs">
        <span className="font-medium text-foreground">Target registry record</span>
        {duplicates.length > 0 ? (
          <select
            value={targetRegistryRecordPublicId}
            onChange={(event) => setTargetRegistryRecordPublicId(event.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
          >
            {duplicates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} · {item.id}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={targetRegistryRecordPublicId}
            onChange={(event) => setTargetRegistryRecordPublicId(event.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
          />
        )}
      </label>
      <label className="grid gap-1 text-xs">
        <span className="font-medium text-foreground">Reason</span>
        <textarea
          value={mergeReason}
          onChange={(event) => setMergeReason(event.target.value)}
          className="min-h-24 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </label>
      <InlineFormActions
        pending={pending}
        disabled={targetRegistryRecordPublicId.trim().length === 0}
        submitLabel="Merge record"
        onCancel={onCancel}
        onSubmit={() => onSubmit({ targetRegistryRecordPublicId, mergeReason })}
      />
    </InlineFormContainer>
  );
}

function InlineFormContainer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 grid gap-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="text-xs font-medium text-foreground">{title}</div>
      {children}
    </div>
  );
}

function InlineCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-foreground">
      <input type="checkbox" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

function InlineFormActions({
  pending,
  disabled,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  disabled: boolean;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled || pending}
        onClick={onSubmit}
        className="inline-flex h-9 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
      >
        Cancel
      </button>
    </div>
  );
}

function getRegistryDetailErrorCopy(error: Error) {
  if (error instanceof ApiError && error.code === "unauthorized") {
    return {
      title: "Sign in required",
      description: error.message,
    };
  }

  if (error instanceof ApiError && error.code === "forbidden") {
    return {
      title: "Registry access denied",
      description: error.message,
    };
  }

  return {
    title: "Registry organization failed to load",
    description: error.message,
  };
}
