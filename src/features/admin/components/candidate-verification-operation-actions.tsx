import { FileText, MapPinCheck, ShieldAlert } from "lucide-react";
import { getCandidateVerificationOperationCapabilities } from "@/features/admin/workflow/candidate-detail-capabilities";
import type { WorkflowPermission } from "@/features/admin/workflow/types";
import type { PersonVerificationOperationTab } from "./person-verification-operations-dialog";

export function CandidateVerificationOperationActions({
  permissions,
  onLaunch,
}: {
  permissions: WorkflowPermission[];
  onLaunch: (tab: PersonVerificationOperationTab) => void;
}) {
  const operationCapabilities = getCandidateVerificationOperationCapabilities(permissions);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <OperationButton
        icon={<ShieldAlert className="size-4" />}
        title="Court / Criminal"
        description="Record a scoped Court-record check"
        onClick={() => onLaunch("court")}
        disabled={!operationCapabilities.court.enabled}
        reason={operationCapabilities.court.reason}
      />
      <OperationButton
        icon={<MapPinCheck className="size-4" />}
        title="In-person"
        description="Record an auditable observation"
        onClick={() => onLaunch("in-person")}
        disabled={!operationCapabilities.inPerson.enabled}
        reason={operationCapabilities.inPerson.reason}
      />
      <OperationButton
        icon={<FileText className="size-4" />}
        title="Internal Report"
        description="Read the authorized verification report"
        onClick={() => onLaunch("report")}
        disabled={!operationCapabilities.report.enabled}
        reason={operationCapabilities.report.reason}
      />
    </div>
  );
}

function OperationButton({
  icon,
  title,
  description,
  onClick,
  disabled = false,
  reason,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  reason?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? reason : undefined}
      className="rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-[#0FA8A5]/50 hover:bg-[#EAF8F6]/60 disabled:cursor-not-allowed disabled:bg-muted/40 disabled:opacity-65 disabled:hover:border-border"
    >
      <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
        {icon}
        {title}
      </span>
      <span className="mt-1 block text-[11px] text-muted-foreground">{description}</span>
      {disabled && reason ? (
        <span className="mt-1 block text-[11px] text-amber-700">{reason}</span>
      ) : null}
    </button>
  );
}
