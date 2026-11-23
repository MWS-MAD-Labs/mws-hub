import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, History, LoaderCircle, LogOut, MonitorSmartphone, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import HubHeader from "@/features/fragments/HubHeader";
import MobileSpotlightSearch from "@/features/fragments/MobileSpotlightSearch";
import { authApi, type AuthSession, type SessionListResult } from "@/features/auth/api/authApi";
import { useAuth } from "@/features/auth/hooks/useAuth";
import useGptCodeAccess from "@/features/gpt-code/useGptCodeAccess";
import { isMadLabsUser } from "@/lib/admin-access";
import { toHubUser } from "@/model/auth-model";

type Confirmation = { kind: "revoke"; session: AuthSession } | { kind: "logoutAll" } | null;
const PAGE_SIZE = 20;

export default function ProfileSessionsPage() {
  const { user, logoutAll } = useAuth();
  const navigate = useNavigate();
  const hasGptCode = useGptCodeAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") === "history" ? "history" : "active";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const [result, setResult] = useState<SessionListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [pending, setPending] = useState(false);
  const [trustPending, setTrustPending] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    authApi.sessions({ status, page, pageSize: PAGE_SIZE })
      .then((next) => {
        if (!active) return;
        setResult(next);
        if (page > next.pagination.totalPages) setSearchParams({ status, page: String(next.pagination.totalPages) }, { replace: true });
      })
      .catch(() => { if (active) toast.error("Failed to load devices and sessions"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, setSearchParams, status]);

  if (!user) return null;
  const hubUser = toHubUser(user);
  const currentSession = result?.sessions.find((session) => session.current);

  function updateParams(nextStatus: "active" | "history", nextPage = 1) {
    setSearchParams({ status: nextStatus, page: String(nextPage) });
  }

  async function confirmAction() {
    if (!confirmation) return;
    setPending(true);
    try {
      if (confirmation.kind === "logoutAll") {
        await logoutAll();
        navigate("/login", { replace: true });
        return;
      }
      await authApi.revokeSession(confirmation.session.id);
      if (confirmation.session.current) {
        navigate("/login", { replace: true });
        return;
      }
      setConfirmation(null);
      const next = await authApi.sessions({ status, page, pageSize: PAGE_SIZE });
      setResult(next);
      toast.success("Device signed out");
    } catch {
      toast.error(confirmation.kind === "logoutAll" ? "Failed to sign out all devices" : "Failed to sign out this device");
    } finally {
      setPending(false);
    }
  }

  async function toggleTrust(session: AuthSession) {
    setTrustPending(true);
    try {
      await authApi.setTrusted(session.id, !session.trusted);
      setResult((current) => current ? {
        ...current,
        sessions: current.sessions.map((item) => item.id === session.id ? { ...item, trusted: !item.trusted } : item),
      } : current);
      toast.success(session.trusted ? "Device trust removed" : "Device marked as trusted");
    } catch {
      toast.error("Failed to update device trust");
    } finally {
      setTrustPending(false);
    }
  }

  function relativeTime(value: string) {
    const elapsed = Math.max(Date.now() - new Date(value).getTime(), 0);
    const minutes = Math.floor(elapsed / 60_000);
    if (minutes < 1) return "Active now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(value).toLocaleDateString();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HubHeader user={hubUser} isAdmin={isMadLabsUser(user)} />
      <main className="mx-auto max-w-4xl px-4 pb-32 pt-8 sm:px-6 sm:pt-10">
        <button type="button" onClick={() => navigate("/profile")} className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronLeft className="size-4" /> Back to profile
        </button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Account security</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Devices and sessions</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Review browsers signed in to your Hub account. Device names are approximate and based on browser information.</p>
          </div>
          <button type="button" onClick={() => setConfirmation({ kind: "logoutAll" })} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-destructive/40 px-4 text-sm font-semibold text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ShieldAlert className="size-4" /> Sign out everywhere
          </button>
        </div>

        {currentSession && status === "active" && (
          <section className="mt-7 rounded-2xl border border-primary/25 bg-primary/[0.04] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><MonitorSmartphone className="size-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{currentSession.device_name}</h2><span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">This device</span></div>
                <p className="mt-1 text-sm text-muted-foreground">{currentSession.trusted ? "Trusted" : "Untrusted"} · {relativeTime(currentSession.last_seen_at)}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">Trust is informational for now and does not bypass Google authentication.</p>
              </div>
              <button type="button" onClick={() => toggleTrust(currentSession)} disabled={trustPending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {trustPending ? <LoaderCircle className="size-4 animate-spin" /> : currentSession.trusted ? <ShieldAlert className="size-4" /> : <ShieldCheck className="size-4" />}
                {currentSession.trusted ? "Remove trust" : "Trust this device"}
              </button>
            </div>
          </section>
        )}

        <section className="mt-6 overflow-hidden rounded-2xl border border-border/70 bg-card">
          <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex rounded-xl bg-muted p-1" aria-label="Session status">
              {(["active", "history"] as const).map((item) => (
                <button key={item} type="button" onClick={() => updateParams(item)} className={`min-h-10 rounded-lg px-4 text-sm font-semibold transition-colors ${status === item ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {item === "active" ? `Active (${result?.counts.active ?? 0})` : `History (${result?.counts.history ?? 0})`}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Sessions are retained as security history.</p>
          </div>

          <div className="divide-y divide-border/70">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-5 py-14 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading sessions...</div>
            ) : !result?.sessions.length ? (
              <div className="px-5 py-14 text-center"><History className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 text-sm font-semibold">No {status} sessions</p><p className="mt-1 text-xs text-muted-foreground">There is nothing to review in this section.</p></div>
            ) : result.sessions.map((session) => (
              <div key={session.id} className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted">{session.trusted ? <ShieldCheck className="size-5 text-emerald-600" /> : <MonitorSmartphone className="size-5 text-muted-foreground" />}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-medium">{session.device_name}</p>{session.current && <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">This device</span>}<span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{session.status === "active" ? (session.trusted ? "Trusted" : "Untrusted") : session.status === "expired" ? "Expired" : "Signed out"}</span></div>
                  <p className="mt-1 text-xs text-muted-foreground">{session.status === "active" ? `Last active ${relativeTime(session.last_seen_at)}` : `Signed in ${new Date(session.created_at).toLocaleDateString()}`}</p>
                </div>
                {session.status === "active" && <button type="button" onClick={() => setConfirmation({ kind: "revoke", session })} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><LogOut className="size-4" /> Sign out</button>}
              </div>
            ))}
          </div>

          {result && (
            <div className="flex flex-col gap-3 border-t border-border/70 bg-muted/30 px-5 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p aria-live="polite">Showing {result.pagination.total === 0 ? 0 : (result.pagination.page - 1) * result.pagination.pageSize + 1}-{Math.min(result.pagination.page * result.pagination.pageSize, result.pagination.total)} of {result.pagination.total}</p>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <button type="button" disabled={!result.pagination.hasPreviousPage} onClick={() => updateParams(status, page - 1)} className="grid size-11 place-items-center rounded-lg border border-border bg-card disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="size-4" /></button>
                <span className="min-w-24 text-center">Page {result.pagination.page} of {result.pagination.totalPages}</span>
                <button type="button" disabled={!result.pagination.hasNextPage} onClick={() => updateParams(status, page + 1)} className="grid size-11 place-items-center rounded-lg border border-border bg-card disabled:opacity-40" aria-label="Next page"><ChevronRight className="size-4" /></button>
              </div>
            </div>
          )}
        </section>
      </main>

      <MobileSpotlightSearch query="" user={hubUser} onQueryChange={() => {}} showGptCode={hasGptCode} searchOnHub />
      <ConfirmDialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => { if (!open) setConfirmation(null); }}
        title={confirmation?.kind === "logoutAll" ? "Sign out everywhere?" : "Sign out this device?"}
        description={confirmation?.kind === "logoutAll"
          ? "This signs you out on every browser and device, including this one. You will need to sign in again."
          : <>{confirmation?.session.device_name} will lose access to MWS Hub and connected applications.{confirmation?.session.current ? " You will be returned to the sign-in page." : ""}</>}
        confirmLabel={confirmation?.kind === "logoutAll" ? "Sign out all devices" : "Sign out device"}
        pendingLabel="Signing out..."
        destructive
        pending={pending}
        onConfirm={confirmAction}
      />
    </div>
  );
}
