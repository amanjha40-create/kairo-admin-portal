/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { WorkspaceSection } from "@/features/admin/components/workspace-section";
import {
  adminOperationsKeys,
  assistedCareerRecordsQueryOptions,
  createAdminOperationsAdapter,
  type AssistedCareerRecord,
  type CareerClaimType,
  type ExtendedCareerClaimType,
} from "@/features/admin/data/admin-operations";
import { userKeys } from "@/features/admin/data/users";
import { getOperationError } from "@/features/admin/lib/operation-error";

type DraftValue = string | boolean;
export type CareerDraft = Record<string, DraftValue>;

interface FieldDefinition {
  key: string;
  label: string;
  type?: "text" | "date" | "url" | "textarea" | "checkbox" | "select" | "tags";
  required?: boolean;
  nullable?: boolean;
  options?: Array<{ value: string; label: string }>;
  wide?: boolean;
}

interface ClaimDefinition {
  label: string;
  description: string;
  fields: FieldDefinition[];
}

export const CAREER_TYPES: CareerClaimType[] = [
  "employment",
  "education",
  "internship",
  "freelance",
  "certification",
  "portfolio",
  "project",
  "skill",
  "gig_platform",
];

const CLAIMS: Record<CareerClaimType, ClaimDefinition> = {
  employment: {
    label: "Employment",
    description: "Add an employer, role, working arrangement, dates, and role summary.",
    fields: [
      { key: "company_name", label: "Employer", required: true },
      { key: "role_title", label: "Job title", required: true },
      { key: "employment_type", label: "Employment type" },
      {
        key: "work_arrangement",
        label: "Work arrangement",
        type: "select",
        options: [
          { value: "", label: "Not specified" },
          { value: "onsite", label: "On-site" },
          { value: "hybrid", label: "Hybrid" },
          { value: "remote", label: "Remote" },
        ],
      },
      { key: "start_date", label: "Start date", type: "date", nullable: true },
      { key: "end_date", label: "End date", type: "date", nullable: true },
      { key: "is_current", label: "Currently working here", type: "checkbox" },
      { key: "description", label: "Role summary", type: "textarea", nullable: true, wide: true },
    ],
  },
  education: {
    label: "Education",
    description: "Add the institution, qualification, study area, grade, and dates.",
    fields: [
      { key: "institution_name", label: "Institution", required: true },
      { key: "degree", label: "Degree / qualification", required: true },
      { key: "field_of_study", label: "Field of study" },
      {
        key: "education_level",
        label: "Education level",
        type: "select",
        options: [
          { value: "", label: "Not specified" },
          { value: "high_school", label: "High school" },
          { value: "diploma", label: "Diploma" },
          { value: "bachelors", label: "Bachelor's" },
          { value: "masters", label: "Master's" },
          { value: "doctorate", label: "Doctorate" },
          { value: "certification", label: "Certification" },
          { value: "other", label: "Other" },
        ],
      },
      { key: "grade", label: "Grade", nullable: true },
      { key: "start_date", label: "Start date", type: "date", nullable: true },
      { key: "end_date", label: "End date", type: "date", nullable: true },
      { key: "is_current", label: "Currently studying", type: "checkbox" },
    ],
  },
  internship: {
    label: "Internship",
    description: "Add an internship organization, role, dates, and summary.",
    fields: [
      { key: "company_name", label: "Organization", required: true },
      { key: "role", label: "Role", required: true },
      { key: "start_date", label: "Start date", type: "date", nullable: true },
      { key: "end_date", label: "End date", type: "date", nullable: true },
      { key: "is_current", label: "Current internship", type: "checkbox" },
      { key: "description", label: "Summary", type: "textarea", nullable: true, wide: true },
    ],
  },
  freelance: {
    label: "Freelance",
    description: "Add a client engagement or independent project.",
    fields: [
      { key: "client_name", label: "Client", required: true },
      { key: "project_title", label: "Project title", required: true },
      { key: "start_date", label: "Start date", type: "date", nullable: true },
      { key: "end_date", label: "End date", type: "date", nullable: true },
      { key: "is_current", label: "Ongoing engagement", type: "checkbox" },
      { key: "description", label: "Summary", type: "textarea", nullable: true, wide: true },
    ],
  },
  certification: {
    label: "Certification",
    description: "Add the credential, issuer, dates, and optional credential link.",
    fields: [
      { key: "title", label: "Certification", required: true },
      { key: "issuing_organization", label: "Issuing organization", required: true },
      { key: "issued_date", label: "Issued date", type: "date", nullable: true },
      { key: "expiry_date", label: "Expiry date", type: "date", nullable: true },
      { key: "credential_id", label: "Credential ID", nullable: true },
      { key: "credential_url", label: "Credential URL", type: "url", nullable: true },
    ],
  },
  portfolio: {
    label: "Portfolio",
    description: "Add a portfolio item with an optional link, description, and tags.",
    fields: [
      { key: "title", label: "Title", required: true },
      { key: "url", label: "Portfolio URL", type: "url", nullable: true },
      { key: "tags", label: "Tags (comma separated)", type: "tags", nullable: true },
      { key: "description", label: "Description", type: "textarea", nullable: true, wide: true },
    ],
  },
  project: {
    label: "Project",
    description: "Add a project, role, organization, dates, and supporting links.",
    fields: [
      { key: "title", label: "Project title", required: true },
      { key: "role", label: "Role", nullable: true },
      { key: "organization_name", label: "Organization", nullable: true },
      { key: "start_date", label: "Start date", type: "date", nullable: true },
      { key: "end_date", label: "End date", type: "date", nullable: true },
      { key: "is_ongoing", label: "Ongoing project", type: "checkbox" },
      { key: "project_url", label: "Project URL", type: "url", nullable: true },
      { key: "repository_url", label: "Repository URL", type: "url", nullable: true },
      { key: "description", label: "Description", type: "textarea", nullable: true, wide: true },
    ],
  },
  skill: {
    label: "Skill",
    description: "Add one skill. Canonical normalization and duplicate protection apply.",
    fields: [{ key: "name", label: "Skill name", required: true }],
  },
  gig_platform: {
    label: "Gig platform",
    description: "Add platform work, role, dates, partner ID, and optional rating.",
    fields: [
      { key: "platform_name", label: "Platform", required: true },
      { key: "partner_role", label: "Partner role", required: true },
      { key: "started_at", label: "Start date", type: "date", required: true },
      { key: "ended_at", label: "End date", type: "date", nullable: true },
      { key: "is_active", label: "Currently active", type: "checkbox" },
      { key: "partner_id", label: "Partner ID", nullable: true },
      { key: "rating", label: "Rating", nullable: true },
    ],
  },
};

export function isExtendedCareerType(value: CareerClaimType): value is ExtendedCareerClaimType {
  return ["portfolio", "project", "skill", "gig_platform"].includes(value);
}

export function createCareerDraft(claimType: CareerClaimType): CareerDraft {
  return Object.fromEntries(
    CLAIMS[claimType].fields.map((field) => [
      field.key,
      field.type === "checkbox" ? field.key === "is_active" : "",
    ]),
  );
}

export function careerRecordToDraft(
  claimType: ExtendedCareerClaimType,
  record: AssistedCareerRecord,
): CareerDraft {
  const draft = createCareerDraft(claimType);
  for (const field of CLAIMS[claimType].fields) {
    const value = record.payload[field.key];
    if (field.type === "checkbox") draft[field.key] = Boolean(value);
    else if (field.type === "tags" && Array.isArray(value)) draft[field.key] = value.join(", ");
    else if (value !== null && value !== undefined) draft[field.key] = String(value);
  }
  return draft;
}

export function buildCareerPayload(
  claimType: CareerClaimType,
  draft: CareerDraft,
  original?: CareerDraft,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of CLAIMS[claimType].fields) {
    const value = draft[field.key];
    if (original && value === original[field.key]) continue;
    if (field.type === "checkbox") {
      payload[field.key] = Boolean(value);
      continue;
    }
    const normalized = String(value ?? "").trim();
    if (field.type === "tags") {
      const tags = normalized
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (tags.length > 0) payload[field.key] = tags;
      else if (original && field.nullable) payload[field.key] = null;
      continue;
    }
    if (normalized) payload[field.key] = normalized;
    else if (original && field.nullable) payload[field.key] = null;
  }

  const activeKey =
    claimType === "project"
      ? "is_ongoing"
      : claimType === "gig_platform"
        ? "is_active"
        : "is_current";
  const endKey = claimType === "gig_platform" ? "ended_at" : "end_date";
  if (Boolean(draft[activeKey]) && endKey in draft) {
    if (original) payload[endKey] = null;
    else delete payload[endKey];
  }
  return payload;
}

export function validateCareerDraft(claimType: CareerClaimType, draft: CareerDraft): string | null {
  for (const field of CLAIMS[claimType].fields) {
    if (field.required && !String(draft[field.key] ?? "").trim())
      return `${field.label} is required.`;
  }
  return null;
}

export function AssistedCareerEditor({
  candidateId,
  onComplete,
}: {
  candidateId: string;
  onComplete: () => Promise<void>;
}) {
  const adapter = useMemo(() => createAdminOperationsAdapter(), []);
  const queryClient = useQueryClient();
  const [claimType, setClaimType] = useState<CareerClaimType>("employment");
  const [draft, setDraft] = useState<CareerDraft>(() => createCareerDraft("employment"));
  const [editing, setEditing] = useState<AssistedCareerRecord | null>(null);
  const [original, setOriginal] = useState<CareerDraft | undefined>();
  const [legacyRecordId, setLegacyRecordId] = useState("");
  const queryType: ExtendedCareerClaimType = isExtendedCareerType(claimType)
    ? claimType
    : "portfolio";
  const recordsQuery = useQuery({
    ...assistedCareerRecordsQueryOptions(candidateId, queryType),
    enabled: isExtendedCareerType(claimType),
  });
  const definition = CLAIMS[claimType];

  const reset = (nextType: CareerClaimType = claimType) => {
    setDraft(createCareerDraft(nextType));
    setEditing(null);
    setOriginal(undefined);
    setLegacyRecordId("");
  };

  const refresh = async () => {
    if (isExtendedCareerType(claimType)) {
      await queryClient.invalidateQueries({
        queryKey: adminOperationsKeys.careerList(candidateId, claimType),
      });
    }
    await queryClient.invalidateQueries({ queryKey: userKeys.all() });
    await onComplete();
  };

  const save = useMutation({
    mutationFn: async () => {
      const validation = validateCareerDraft(claimType, draft);
      if (validation) throw new Error(validation);
      const payload = buildCareerPayload(claimType, draft, original);
      if (Object.keys(payload).length === 0)
        throw new Error("Change at least one field before saving.");
      return adapter.mutateCareer(
        candidateId,
        { claimType, payload, source: "admin_entered" },
        editing?.recordId || legacyRecordId.trim() || undefined,
      );
    },
    onSuccess: async (result) => {
      toast.success(`${definition.label} saved as ${humanize(result.verificationStatus)}`);
      reset();
      await refresh();
    },
    onError: (error) =>
      toast.error(
        getOperationError(
          error,
          "This record could not be saved. Verified or protected records cannot be overwritten.",
        ),
      ),
  });

  const remove = useMutation({
    mutationFn: (record: AssistedCareerRecord) =>
      adapter.deleteCareerRecord(candidateId, record.claimType, record.recordId),
    onSuccess: async () => {
      toast.success("Record removed from the active profile");
      reset();
      await refresh();
    },
    onError: (error) =>
      toast.error(
        getOperationError(
          error,
          "This record could not be removed. Protected records remain locked.",
        ),
      ),
  });

  const beginEdit = (record: AssistedCareerRecord) => {
    const next = careerRecordToDraft(record.claimType, record);
    setClaimType(record.claimType);
    setDraft(next);
    setOriginal(next);
    setEditing(record);
  };

  return (
    <WorkspaceSection
      title="Career and profile records"
      description="Admin-entered records remain unverified until their canonical verification workflow completes"
    >
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-2">
          {CAREER_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setClaimType(type);
                reset(type);
              }}
              className={`flex h-9 w-full items-center justify-between rounded-md border px-3 text-left text-xs font-medium ${claimType === type ? "border-[#087F7C] bg-[#EAF8F6] text-[#064E4B]" : "border-border bg-background text-foreground hover:bg-accent"}`}
            >
              {CLAIMS[type].label}
              {isExtendedCareerType(type) ? (
                <span className="text-[10px] text-muted-foreground">History</span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="min-w-0 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {editing ? `Edit ${definition.label}` : `Add ${definition.label}`}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">{definition.description}</p>
            <span className="mt-2 inline-flex rounded-full border border-border bg-muted/30 px-2 py-1 text-[10px] font-medium text-muted-foreground">
              Provenance: Admin entered
            </span>
          </div>

          {!isExtendedCareerType(claimType) ? (
            <label className="block max-w-md space-y-1 text-xs font-medium text-foreground">
              Existing record ID (only when editing)
              <input
                value={legacyRecordId}
                onChange={(event) => setLegacyRecordId(event.target.value)}
                placeholder="Leave blank to create a new record"
                className="h-9 w-full rounded-md border border-border bg-background px-3 font-mono text-xs"
              />
            </label>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {definition.fields.map((field) => (
              <CareerField
                key={field.key}
                field={field}
                value={draft[field.key]}
                disabled={
                  (field.key === "end_date" && Boolean(draft.is_current || draft.is_ongoing)) ||
                  (field.key === "ended_at" && Boolean(draft.is_active))
                }
                onChange={(value) => setDraft((current) => ({ ...current, [field.key]: value }))}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
            <p className="text-[11px] text-muted-foreground">
              Backend validation, eligibility, duplicate checks, and verified-record protection
              remain authoritative.
            </p>
            <div className="flex gap-2">
              {editing ? (
                <button
                  type="button"
                  onClick={() => reset()}
                  className="h-9 rounded-md border border-border px-3 text-xs font-medium hover:bg-accent"
                >
                  Cancel
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#0B2545] px-3 text-xs font-medium text-white disabled:opacity-50"
              >
                {editing ? <Pencil className="size-3.5" /> : <Plus className="size-3.5" />}
                {save.isPending
                  ? "Saving..."
                  : editing || legacyRecordId.trim()
                    ? "Save changes"
                    : `Add ${definition.label}`}
              </button>
            </div>
          </div>

          {isExtendedCareerType(claimType) ? (
            <div className="rounded-lg border border-border bg-muted/15 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-foreground">
                    Persisted {definition.label} records
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Loaded from API42 and retained after refresh.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void recordsQuery.refetch()}
                  disabled={recordsQuery.isFetching}
                  className="h-8 rounded-md border border-border px-2 text-[11px] font-medium hover:bg-accent disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>
              {recordsQuery.isPending ? (
                <p className="mt-3 text-xs text-muted-foreground">Loading canonical records...</p>
              ) : recordsQuery.error ? (
                <p className="mt-3 text-xs text-destructive">
                  {getOperationError(recordsQuery.error, "Records could not be loaded.")}
                </p>
              ) : recordsQuery.data?.items.length ? (
                <div className="mt-3 space-y-2">
                  {recordsQuery.data.items.map((record) => (
                    <div
                      key={record.recordId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">
                          {recordTitle(record)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {humanize(record.verificationStatus)} · {record.recordId}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => beginEdit(record)}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-[11px] font-medium hover:bg-accent"
                        >
                          <Pencil className="size-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Remove this ${definition.label.toLowerCase()} record?`,
                              )
                            )
                              remove.mutate(record);
                          }}
                          disabled={remove.isPending}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-red-200 px-2 text-[11px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="size-3" /> Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  No {definition.label.toLowerCase()} records yet.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </WorkspaceSection>
  );
}

function CareerField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: FieldDefinition;
  value: DraftValue;
  disabled?: boolean;
  onChange: (value: DraftValue) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <label
        className={`flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium ${field.wide ? "sm:col-span-2" : ""}`}
      >
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        {field.label}
      </label>
    );
  }
  const className = `space-y-1 text-xs font-medium text-foreground ${field.wide ? "sm:col-span-2" : ""}`;
  if (field.type === "textarea") {
    return (
      <label className={className}>
        {field.label}
        {field.required ? " *" : ""}
        <textarea
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm disabled:bg-muted"
        />
      </label>
    );
  }
  if (field.type === "select") {
    return (
      <label className={className}>
        {field.label}
        {field.required ? " *" : ""}
        <select
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs disabled:bg-muted"
        >
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <label className={className}>
      {field.label}
      {field.required ? " *" : ""}
      <input
        type={field.type === "date" || field.type === "url" ? field.type : "text"}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={field.required}
        className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm disabled:bg-muted"
      />
    </label>
  );
}

function recordTitle(record: AssistedCareerRecord) {
  const fields = record.payload;
  const value = fields.title ?? fields.name ?? fields.platform_name;
  return typeof value === "string" && value.trim() ? value : humanize(record.claimType);
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
