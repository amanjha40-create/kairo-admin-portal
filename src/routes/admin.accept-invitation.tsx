import { useEffect, useState, type FormEvent } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useAdminAuth } from "@/features/admin/auth/admin-auth";
import {
  getAdminInvitationSetupError,
  readAdminInvitationToken,
} from "@/features/admin/auth/admin-invitation";
import { KairoLogo } from "@/features/branding/kairo-logo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/accept-invitation")({
  head: () => ({
    meta: [
      { title: "Accept Admin invitation — Kairo Operations" },
      { name: "description", content: "Accept a sanctioned invitation to Kairo Admin." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminInvitationPage,
});

function AdminInvitationPage() {
  const auth = useAdminAuth();
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [linkState, setLinkState] = useState<"checking" | "ready" | "invalid">("checking");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = readAdminInvitationToken(window.location.hash);
    if (window.location.hash) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
    setInvitationToken(token);
    setLinkState(token ? "ready" : "invalid");
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!invitationToken) {
      setLinkState("invalid");
      return;
    }

    const setupError = getAdminInvitationSetupError(fullName, password, confirmation);
    if (setupError) {
      setError(setupError);
      return;
    }

    setSubmitting(true);
    const result = await auth.acceptInvitation({
      token: invitationToken,
      ...(fullName.trim() ? { fullName: fullName.trim() } : {}),
      ...(password ? { password } : {}),
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setInvitationToken(null);
    setPassword("");
    setConfirmation("");
    setAccepted(true);
  }

  const acceptanceUnavailable = auth.mode === "demo" || !auth.isConfigured;

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1000px 600px at 90% -10%, rgba(15,168,165,0.12), transparent 60%), radial-gradient(900px 500px at -10% 110%, rgba(11,37,69,0.10), transparent 55%)",
        }}
      />
      <main className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10 sm:px-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_60px_-30px_rgba(11,37,69,0.30)] backdrop-blur sm:p-8">
          <div className="flex flex-col items-center text-center">
            <KairoLogo width={150} />
            <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
              Accept Admin invitation
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Confirm your sanctioned access to Kairo Operations
            </p>
          </div>

          {linkState === "checking" ? (
            <div className="mt-7 flex items-center justify-center gap-2 text-sm text-slate-600">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Checking invitation link…
            </div>
          ) : accepted ? (
            <div className="mt-7 space-y-5">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <div className="flex items-start gap-2">
                  <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <p>Your Admin invitation has been accepted and your access is ready.</p>
                </div>
              </div>
              <Link
                to="/admin"
                className="flex h-10 w-full items-center justify-center rounded-md bg-[#0B2545] text-sm font-semibold text-white hover:bg-[#0B2545]/92"
              >
                Continue to Admin
              </Link>
            </div>
          ) : linkState === "invalid" ? (
            <InvitationUnavailable message="This Admin invitation link is missing or invalid." />
          ) : acceptanceUnavailable ? (
            <InvitationUnavailable
              message={
                auth.mode === "demo"
                  ? "Admin invitations cannot be accepted in Demo Mode."
                  : "Admin invitation acceptance is not configured."
              }
            />
          ) : (
            <form onSubmit={onSubmit} noValidate className="mt-7 space-y-4">
              <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-xs leading-5 text-sky-900">
                <div className="flex items-start gap-2">
                  <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <p>
                    Existing Kairo users can accept directly. New recipients should complete the
                    account setup fields below.
                  </p>
                </div>
              </div>

              <TextField
                id="full-name"
                label="Full name for a new account"
                value={fullName}
                autoComplete="name"
                onChange={setFullName}
              />
              <TextField
                id="password"
                label="Password for a new account"
                value={password}
                type="password"
                autoComplete="new-password"
                onChange={setPassword}
              />
              <TextField
                id="password-confirmation"
                label="Confirm new password"
                value={confirmation}
                type="password"
                autoComplete="new-password"
                onChange={setConfirmation}
              />

              {error ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"
                >
                  <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <p>{error}</p>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  "flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#0B2545] text-sm font-semibold text-white",
                  "hover:bg-[#0B2545]/92 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0FA8A5] focus-visible:ring-offset-2",
                  submitting && "cursor-not-allowed opacity-80",
                )}
              >
                {submitting ? (
                  <>
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                    Accepting…
                  </>
                ) : (
                  "Accept invitation"
                )}
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <Link
              to="/admin/login"
              search={{ redirect: undefined }}
              className="text-xs font-medium text-[#0B2545] hover:underline"
            >
              Return to Admin sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function InvitationUnavailable({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mt-7 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p>{message} Request a new invitation from an authorised Kairo administrator.</p>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  type = "text",
  autoComplete,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  type?: "text" | "password";
  autoComplete: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-[#0FA8A5] focus:outline-none focus:ring-2 focus:ring-[#0FA8A5]/30"
      />
    </div>
  );
}
