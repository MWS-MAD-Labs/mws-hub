import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Bell, CheckCircle2, Clock3 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import HubHeader from "@/features/fragments/HubHeader";
import HubSearch from "@/features/fragments/HubSearch";
import CategoryFilter from "@/features/fragments/CategoryFilter";
import AppCard from "@/features/fragments/AppCard";
import HubEmptyState from "@/features/fragments/HubEmptyState";
import useHubCatalog from "@/hooks/useHubCatalog";
import type { HubApplication } from "@/model/hub-model";
import { toHubUser } from "@/model/auth-model";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { isMadLabsUser } from "@/lib/admin-access";
import { apiRequest } from "@/lib/api";

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || "admin@millennia21.id";

type FeedbackDialogState = { kind: "request" | "report"; app: HubApplication } | null;
const LAUNCH_ERRORS: Record<string, (app: string) => { title: string; description: string }> = {
  app_access_denied: (app) => ({ title: `You don't have access to ${app}`, description: "Your MWS account isn't admitted to this application yet. Ask MAD Labs if you need it." }),
  app_maintenance: (app) => ({ title: `${app} is under maintenance`, description: "It's temporarily switched off while MAD Labs works on it. Try again later." }),
  app_coming_soon: (app) => ({ title: `${app} isn't released yet`, description: "It's listed here early. You'll be able to open it once it goes live." }),
  app_no_link: (app) => ({ title: `${app} has no link yet`, description: `It's in the catalog but no URL has been registered for it. Let MAD Labs know at ${SUPPORT_EMAIL}.` }),
  account_inactive: () => ({ title: "Your account is no longer active", description: `Your record in the Central database is inactive, so apps can't be opened. Contact ${SUPPORT_EMAIL} to restore it.` }),
  central_unavailable: () => ({ title: "Couldn't check your access", description: "The Central database didn't answer just now. Try opening the app again in a moment." }),
};

function FeedbackDialog({ state, isSubmitting, onClose, onSubmit }: { state: FeedbackDialogState; isSubmitting: boolean; onClose: () => void; onSubmit: (text: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { setText(""); setError(""); }, [state]);
  if (!state) return null;

  const isRequest = state.kind === "request";
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) { setError(isRequest ? "Reason is required." : "Problem description is required."); return; }
    setError("");
    await onSubmit(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-4 sm:items-center sm:justify-center" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) onClose(); }}>
      <form role="dialog" aria-modal="true" aria-labelledby="feedback-title" onSubmit={handleSubmit} className="w-full rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl sm:max-w-md">
        <h2 id="feedback-title" className="font-heading text-lg font-bold">{isRequest ? `Request access to ${state.app.name}` : `Report ${state.app.name}`}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{state.app.audience}</p>
        <label className="mt-5 block text-sm font-semibold">{isRequest ? "Reason" : "Problem"}<textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={isRequest ? "Tell MAD Labs why you need this app." : "Tell MAD Labs what is broken or missing."} className="mt-2 min-h-28 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" disabled={isSubmitting} /></label>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60">Cancel</button><button type="submit" disabled={isSubmitting} className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">{isSubmitting ? "Sending..." : "Send"}</button></div>
      </form>
    </div>
  );
}

function LoadingWorkspace() {
  return <div className="animate-pulse"><div className="h-12 max-w-2xl rounded-xl bg-muted" /><div className="mt-10 grid grid-cols-4 gap-5">{Array.from({ length: 4 }, (_, index) => <div key={index}><div className="h-14 w-14 rounded-2xl bg-muted" /><div className="mt-3 h-3 w-24 rounded bg-muted" /></div>)}</div><div className="mt-10 space-y-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-16 border-b border-border bg-card/30" />)}</div></div>;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const SupportHubPage = memo(() => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [feedbackDialog, setFeedbackDialog] = useState<FeedbackDialogState>(null);
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const { isLoading, hasError, query, isFiltering, visibleApplications, availableApplications, hasCatalog, categories, activeCategory, setQuery, setCategory, clearFilters, retry } = useHubCatalog();

  useEffect(() => {
    const code = searchParams.get("error");
    if (!code) return;
    const build = LAUNCH_ERRORS[code];
    if (build) {
      const failure = build(searchParams.get("app") || "That app");
      toast.error(failure.title, { description: failure.description });
      if (window.parent !== window) window.parent.postMessage({ type: "MWS_HUB_LAUNCH_ERROR", code, app: searchParams.get("app"), title: failure.title, description: failure.description }, "*");
    }
    setSearchParams((current) => { const next = new URLSearchParams(current); next.delete("error"); next.delete("app"); return next; }, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleRequestAccess = useCallback((app: HubApplication) => setFeedbackDialog({ kind: "request", app }), []);
  const handleReportProblem = useCallback((app: HubApplication) => setFeedbackDialog({ kind: "report", app }), []);
  const closeFeedbackDialog = useCallback(() => { if (!isFeedbackSubmitting) setFeedbackDialog(null); }, [isFeedbackSubmitting]);
  const submitFeedbackDialog = useCallback(async (text: string) => {
    if (!feedbackDialog) return;
    setIsFeedbackSubmitting(true);
    try {
      const path = feedbackDialog.kind === "request" ? `/apps/${encodeURIComponent(feedbackDialog.app.id)}/request-access` : `/apps/${encodeURIComponent(feedbackDialog.app.id)}/report`;
      await apiRequest(path, { method: "POST", body: feedbackDialog.kind === "request" ? { reason: text } : { message: text } });
      toast.success(feedbackDialog.kind === "request" ? "Access request sent" : "Problem report sent");
      setFeedbackDialog(null);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to send your message.");
    } finally { setIsFeedbackSubmitting(false); }
  }, [feedbackDialog]);

  const isSettled = !isLoading && !hasError;
  const showNoResults = isSettled && hasCatalog && visibleApplications.length === 0;
  const showEmptyCatalog = isSettled && !hasCatalog;
  const hubUser = user ? toHubUser(user) : undefined;
  const pinnedApplications = useMemo(() => availableApplications.filter((app) => app.access === "granted" && app.status !== "maintenance" && app.status !== "coming_soon" && app.href).slice(0, 4), [availableApplications]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HubHeader user={hubUser} isAdmin={isMadLabsUser(user)} />
      <main className="mx-auto grid max-w-[1440px] gap-10 px-4 pb-12 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-14 lg:px-8 lg:pt-11">
        <section className="min-w-0">
          <p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</p>
          <h1 className="font-heading mt-1 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">{getGreeting()}, {hubUser?.name?.split(" ")[0] || "there"}.</h1>
          <p className="mt-2 text-sm text-muted-foreground">What do you need today?</p>
          <div className="mt-6 max-w-2xl"><HubSearch query={query} onQueryChange={setQuery} /></div>

          {isLoading ? <div className="mt-10"><LoadingWorkspace /></div> : null}
          {hasError ? <div className="mt-10"><HubEmptyState variant="error" onAction={retry} /></div> : null}
          {showEmptyCatalog ? <div className="mt-10"><HubEmptyState variant="no-apps" supportEmail={SUPPORT_EMAIL} /></div> : null}

          {isSettled && hasCatalog ? (
            <>
              {!isFiltering && pinnedApplications.length ? <section className="mt-9"><div className="flex items-end justify-between"><div><h2 className="font-heading text-sm font-bold">Pinned applications</h2><p className="mt-1 text-xs text-muted-foreground">Your quickest way back in</p></div></div><div className="scrollbar-hide mt-5 flex gap-5 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 sm:gap-6">{pinnedApplications.map((app) => <AppCard key={app.id} app={app} variant="pinned" onRequestAccess={handleRequestAccess} onReportProblem={handleReportProblem} />)}</div></section> : null}

              <section className="mt-10"><div className="flex items-end justify-between"><h2 className="font-heading text-xl font-extrabold">{isFiltering ? "Results" : "Applications"}</h2><span className="text-xs text-muted-foreground">{visibleApplications.length}</span></div><div className="mt-4"><CategoryFilter categories={categories} activeCategory={activeCategory} onSelect={setCategory} /></div>{showNoResults ? <div className="mt-6"><HubEmptyState variant="no-results" query={query} onAction={clearFilters} /></div> : <div className="mt-2 grid gap-x-8 md:grid-cols-2">{visibleApplications.map((app) => <AppCard key={app.id} app={app} onRequestAccess={handleRequestAccess} onReportProblem={handleReportProblem} />)}</div>}</section>
            </>
          ) : null}
        </section>

        <aside className="border-t border-border pt-8 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <SideSection title="Quick access">{pinnedApplications.slice(0, 3).map((app) => <div key={app.id} className="flex items-center gap-3 py-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-primary"><Clock3 className="h-3.5 w-3.5" /></span><div className="min-w-0"><p className="font-heading truncate text-xs font-bold">{app.name}</p><p className="text-[10px] text-muted-foreground">Available from your catalogue</p></div></div>)}</SideSection>
          <SideSection title="Announcement"><div className="flex gap-3"><Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><p className="font-heading text-xs font-bold">Welcome to MWS Hub</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Find applications and internal services from one place.</p></div></div></SideSection>
          <SideSection title="Service status"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[var(--color-primary)]" /><p className="font-heading text-xs font-bold">Hub services available</p></div><p className="mt-2 text-[10px] text-muted-foreground">Catalogue and authentication are responding.</p></SideSection>
        </aside>
      </main>
      <FeedbackDialog state={feedbackDialog} isSubmitting={isFeedbackSubmitting} onClose={closeFeedbackDialog} onSubmit={submitFeedbackDialog} />
    </div>
  );
});

function SideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border-b border-border py-6 first:pt-0"><h2 className="font-heading mb-4 text-[10px] font-bold text-muted-foreground">{title}</h2>{children}</section>;
}

SupportHubPage.displayName = "SupportHubPage";
export default SupportHubPage;
