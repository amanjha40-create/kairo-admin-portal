import { queryOptions } from "@tanstack/react-query";
import { appEnv } from "@/config/env";
import { createAdminAuthenticatedApi } from "@/features/admin/data/admin-api";

export interface ClientPerson {
  organizationId: string;
  personId: string;
  linkedCandidateId?: string;
  fullName: string;
  emailMasked: string;
  relationship: string;
  invitationStatus: string;
  createdAt: string;
}

export interface ClientTeamInvitation {
  id: string;
  inviteeEmail: string;
  inviteeName?: string;
  role: string;
  status: string;
  invitedAt: string;
  expiresAt: string;
  lastSentAt?: string;
}

export interface ClientJobRole {
  id: string;
  name: string;
  description?: string;
  department?: string;
  location?: string;
  workMode?: string;
  status: string;
  active: boolean;
  assignedPeopleCount: number;
  createdAt: string;
}

export interface ClientPeopleImport {
  id: string;
  filename: string;
  rosterType: string;
  state: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  createdAt: string;
}

export interface ClientPeopleImportPreview extends ClientPeopleImport {
  mappingRequired: boolean;
  readyForConfirmation: boolean;
  warnings: string[];
}

interface BackendClientPerson {
  organization_id: string;
  person_id: string;
  linked_candidate_id: string | null;
  full_name: string;
  email_masked: string;
  relationship: string;
  invitation_status: string;
  created_at: string;
}

interface BackendTeamInvitation {
  public_id: string;
  invitee_email: string;
  invitee_name: string | null;
  role: string;
  status: string;
  invited_at: string;
  expires_at: string;
  last_sent_at: string | null;
}

interface BackendJobRole {
  public_id: string;
  name: string;
  description: string | null;
  department: string | null;
  location: string | null;
  work_mode: string | null;
  status: string;
  is_active: boolean;
  assigned_people_count: number;
  created_at: string;
}

interface BackendImportSummary {
  import_id: string;
  original_filename: string;
  roster_type: string;
  state: string;
  counts: {
    total_rows: number;
    valid_new: number;
    valid_update: number;
    invalid: number;
    created: number;
    updated: number;
    failed: number;
  };
  created_at: string;
}

interface BackendImportPage {
  items: BackendImportSummary[];
}

interface BackendImportPreview extends BackendImportSummary {
  mapping: { missing_required_mappings: string[]; warnings: string[] };
}

const api = () => createAdminAuthenticatedApi(appEnv);

const mapPerson = (row: BackendClientPerson): ClientPerson => ({
  organizationId: row.organization_id,
  personId: row.person_id,
  linkedCandidateId: row.linked_candidate_id ?? undefined,
  fullName: row.full_name,
  emailMasked: row.email_masked,
  relationship: row.relationship,
  invitationStatus: row.invitation_status,
  createdAt: row.created_at,
});

const mapInvitation = (row: BackendTeamInvitation): ClientTeamInvitation => ({
  id: row.public_id,
  inviteeEmail: row.invitee_email,
  inviteeName: row.invitee_name ?? undefined,
  role: row.role,
  status: row.status,
  invitedAt: row.invited_at,
  expiresAt: row.expires_at,
  lastSentAt: row.last_sent_at ?? undefined,
});

const mapRole = (row: BackendJobRole): ClientJobRole => ({
  id: row.public_id,
  name: row.name,
  description: row.description ?? undefined,
  department: row.department ?? undefined,
  location: row.location ?? undefined,
  workMode: row.work_mode ?? undefined,
  status: row.status,
  active: row.is_active,
  assignedPeopleCount: row.assigned_people_count,
  createdAt: row.created_at,
});

const mapImport = (row: BackendImportSummary): ClientPeopleImport => ({
  id: row.import_id,
  filename: row.original_filename,
  rosterType: row.roster_type,
  state: row.state,
  totalRows: row.counts.total_rows,
  validRows: row.counts.valid_new + row.counts.valid_update,
  invalidRows: row.counts.invalid,
  createdCount: row.counts.created,
  updatedCount: row.counts.updated,
  failedCount: row.counts.failed,
  createdAt: row.created_at,
});

export const adminClientOperationKeys = {
  all: () => ["admin", "client-operations"] as const,
  invitations: (organizationId: string) =>
    [...adminClientOperationKeys.all(), organizationId, "invitations"] as const,
  roles: (organizationId: string) =>
    [...adminClientOperationKeys.all(), organizationId, "roles"] as const,
  imports: (organizationId: string) =>
    [...adminClientOperationKeys.all(), organizationId, "imports"] as const,
};

export function createAdminClientOperationsAdapter() {
  return {
    async createPerson(
      organizationId: string,
      input: {
        fullName: string;
        email: string;
        phone?: string;
        relationship: string;
        joiningDate?: string;
      },
    ) {
      const row = await api().request<BackendClientPerson>(
        `/api/v1/admin/operations/organizations/${organizationId}/people`,
        {
          method: "POST",
          body: {
            full_name: input.fullName,
            email: input.email,
            phone: input.phone,
            relationship: input.relationship,
            joining_date: input.joiningDate,
          },
        },
      );
      return mapPerson(row);
    },
    async activatePerson(organizationId: string, personId: string, idempotencyKey: string) {
      return api().request<{
        candidate_id: string;
        claim_status: string;
        email_masked: string;
        expires_at: string;
        last_sent_at: string;
        resend_available_at: string;
        delivery_state: string;
      }>(
        `/api/v1/admin/operations/organizations/${organizationId}/people/${personId}/candidate-activation`,
        { method: "POST", body: { idempotency_key: idempotencyKey } },
      );
    },
    async listInvitations(organizationId: string) {
      const rows = await api().request<BackendTeamInvitation[]>(
        `/api/v1/admin/organizations/${organizationId}/team-invitations`,
      );
      return rows.map(mapInvitation);
    },
    async createInvitation(
      organizationId: string,
      input: { email: string; name?: string; role: string; message?: string },
    ) {
      const row = await api().request<BackendTeamInvitation>(
        `/api/v1/admin/organizations/${organizationId}/team-invitations`,
        {
          method: "POST",
          body: {
            invitee_email: input.email,
            invitee_name: input.name,
            role: input.role,
            personal_message: input.message,
          },
        },
      );
      return mapInvitation(row);
    },
    async resendInvitation(organizationId: string, invitationId: string) {
      const row = await api().request<BackendTeamInvitation>(
        `/api/v1/admin/organizations/${organizationId}/team-invitations/${invitationId}/resend`,
        { method: "POST" },
      );
      return mapInvitation(row);
    },
    async cancelInvitation(organizationId: string, invitationId: string) {
      const row = await api().request<BackendTeamInvitation>(
        `/api/v1/admin/organizations/${organizationId}/team-invitations/${invitationId}/cancel`,
        { method: "POST" },
      );
      return mapInvitation(row);
    },
    async listRoles(organizationId: string) {
      const rows = await api().request<BackendJobRole[]>(
        `/api/v1/admin/organizations/${organizationId}/job-roles`,
      );
      return rows.map(mapRole);
    },
    async createRole(
      organizationId: string,
      input: {
        name: string;
        description?: string;
        department?: string;
        location?: string;
        workMode?: string;
      },
    ) {
      const row = await api().request<BackendJobRole>(
        `/api/v1/admin/organizations/${organizationId}/job-roles`,
        {
          method: "POST",
          body: {
            name: input.name,
            description: input.description,
            department: input.department,
            location: input.location,
            work_mode: input.workMode,
            mode: "submit",
          },
        },
      );
      return mapRole(row);
    },
    async deactivateRole(organizationId: string, roleId: string) {
      const row = await api().request<BackendJobRole>(
        `/api/v1/admin/organizations/${organizationId}/job-roles/${roleId}`,
        { method: "DELETE" },
      );
      return mapRole(row);
    },
    async listImports(organizationId: string) {
      const page = await api().request<BackendImportPage>(
        `/api/v1/admin/organizations/${organizationId}/people-imports?page=1&page_size=50`,
      );
      return page.items.map(mapImport);
    },
    async uploadImport(organizationId: string, file: File) {
      const body = new FormData();
      body.set("roster_type", "employee");
      body.set("file", file);
      const row = await api().request<BackendImportPreview>(
        `/api/v1/admin/organizations/${organizationId}/people-imports`,
        { method: "POST", body },
      );
      return {
        ...mapImport(row),
        mappingRequired: row.state === "mapping_required",
        readyForConfirmation: row.state === "ready_for_review",
        warnings: row.mapping.warnings ?? [],
      } satisfies ClientPeopleImportPreview;
    },
    async confirmImport(organizationId: string, importId: string) {
      const row = await api().request<BackendImportPreview>(
        `/api/v1/admin/organizations/${organizationId}/people-imports/${importId}/confirm`,
        { method: "POST" },
      );
      return {
        ...mapImport(row),
        mappingRequired: row.state === "mapping_required",
        readyForConfirmation: row.state === "ready_for_review",
        warnings: row.mapping.warnings ?? [],
      } satisfies ClientPeopleImportPreview;
    },
    async downloadTemplate(organizationId: string) {
      return api().requestBlob(
        `/api/v1/admin/organizations/${organizationId}/people-import-template.csv`,
      );
    },
  };
}

export const clientInvitationQueryOptions = (organizationId: string) =>
  queryOptions({
    queryKey: adminClientOperationKeys.invitations(organizationId),
    queryFn: () => createAdminClientOperationsAdapter().listInvitations(organizationId),
  });

export const clientJobRoleQueryOptions = (organizationId: string) =>
  queryOptions({
    queryKey: adminClientOperationKeys.roles(organizationId),
    queryFn: () => createAdminClientOperationsAdapter().listRoles(organizationId),
  });

export const clientPeopleImportQueryOptions = (organizationId: string) =>
  queryOptions({
    queryKey: adminClientOperationKeys.imports(organizationId),
    queryFn: () => createAdminClientOperationsAdapter().listImports(organizationId),
  });
