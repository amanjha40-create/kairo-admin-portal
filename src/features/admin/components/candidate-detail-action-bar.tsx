import { KeyRound, ShieldCheck, ShieldMinus, ShieldPlus, ShieldX } from "lucide-react";
import type {
  CandidateDetailActionCapability,
  CandidateDetailCapabilities,
} from "@/features/admin/workflow/candidate-detail-capabilities";

export function CandidateDetailActionBar({
  capabilities,
  investigationHref,
  onPasswordReset,
  onRevokeAllSessions,
  onSuspend,
  onRestore,
}: {
  capabilities: CandidateDetailCapabilities;
  investigationHref: string;
  onPasswordReset: () => void;
  onRevokeAllSessions: () => void;
  onSuspend: () => void;
  onRestore: () => void;
}) {
  const assistedActions: Array<[string, CandidateDetailActionCapability]> = [
    ["Edit Profile", capabilities.assistedProfile],
    ["Upload / Review CV", capabilities.cvReview],
    ["Activation", capabilities.activation],
  ];
  const blockedAssistedActions = assistedActions.filter(([, capability]) => !capability.enabled);

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <ActionAnchor
          label="Edit Profile"
          href="#assisted-profile"
          capability={capabilities.assistedProfile}
        />
        <ActionAnchor
          label="Upload / Review CV"
          href="#cv-review"
          capability={capabilities.cvReview}
        />
        <ActionAnchor
          label="Activation"
          href="#account-activation"
          capability={capabilities.activation}
        />
        <ActionAnchor
          label="Verification Operations"
          href="#verification-operations"
          capability={capabilities.verificationOperations}
        />
        {capabilities.createInvestigation.enabled ? (
          <a href={investigationHref} className={actionClass()}>
            <ShieldCheck className="size-3.5" />
            Create investigation
          </a>
        ) : null}
        {capabilities.sendPasswordReset.enabled ? (
          <ActionButton
            label="Send password reset"
            onClick={onPasswordReset}
            icon={<KeyRound className="size-3.5" />}
          />
        ) : null}
        {capabilities.revokeAllSessions.enabled ? (
          <ActionButton
            label="Revoke all sessions"
            onClick={onRevokeAllSessions}
            icon={<ShieldX className="size-3.5" />}
          />
        ) : null}
        {capabilities.suspendAccount.enabled ? (
          <ActionButton
            label="Suspend account"
            onClick={onSuspend}
            icon={<ShieldMinus className="size-3.5" />}
            tone="warning"
          />
        ) : null}
        {capabilities.restoreAccount.enabled ? (
          <ActionButton
            label="Restore account"
            onClick={onRestore}
            icon={<ShieldPlus className="size-3.5" />}
          />
        ) : null}
      </div>
      {blockedAssistedActions.length ? (
        <div
          role="note"
          className="max-w-2xl space-y-0.5 text-right text-[11px] text-muted-foreground"
        >
          {blockedAssistedActions.map(([label, capability]) => (
            <p key={label}>
              {label} unavailable: {capability.reason}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ActionAnchor({
  label,
  href,
  capability,
}: {
  label: string;
  href: string;
  capability: { enabled: boolean; reason?: string };
}) {
  if (!capability.enabled) {
    return (
      <button
        type="button"
        disabled
        aria-label={`${label} unavailable`}
        title={capability.reason}
        className={actionClass(true)}
      >
        {label}
      </button>
    );
  }
  return (
    <a href={href} className={actionClass()}>
      {label}
    </a>
  );
}

function ActionButton({
  label,
  onClick,
  icon,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  tone?: "default" | "warning";
}) {
  return (
    <button type="button" onClick={onClick} className={actionClass(false, tone)}>
      {icon}
      {label}
    </button>
  );
}

function actionClass(disabled = false, tone: "default" | "warning" = "default") {
  const base = "inline-flex h-8 items-center gap-1 rounded-md border px-3 text-xs font-medium";
  if (disabled) {
    return `${base} cursor-not-allowed border-border bg-muted/50 text-muted-foreground opacity-70`;
  }
  if (tone === "warning") {
    return `${base} border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200`;
  }
  return `${base} border-border bg-background text-foreground hover:bg-accent`;
}
