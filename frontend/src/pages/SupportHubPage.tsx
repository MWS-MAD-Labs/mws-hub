import { memo, useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import HubHeader from "@/features/fragments/HubHeader";
import HubIntro from "@/features/fragments/HubIntro";
import HubSearch from "@/features/fragments/HubSearch";
import CategoryFilter from "@/features/fragments/CategoryFilter";
import AppCard from "@/features/fragments/AppCard";
import MobileAppLauncher from "@/features/fragments/MobileAppLauncher";
import HubEmptyState from "@/features/fragments/HubEmptyState";
import { AppCardSkeletonGrid } from "@/features/fragments/AppCardSkeleton";
import { HUB_GRID_CLASS } from "@/features/fragments/hubGrid";
import MobileHeader from "@/mobile/components/MobileHeader";
import useHubCatalog from "@/hooks/useHubCatalog";
import type { HubApplication } from "@/model/hub-model";
import { toHubUser } from "@/model/auth-model";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { isMadLabsUser } from "@/lib/admin-access";
import { apiRequest } from "@/lib/api";

const SUPPORT_EMAIL =
  import.meta.env.VITE_SUPPORT_EMAIL || "admin@millennia21.id";

type FeedbackDialogState = {
  kind: "request" | "report";
  app: HubApplication;
} | null;
const LAUNCH_ERRORS: Record<
  string,
  (app: string) => { title: string; description: string }
> = {
  app_access_denied: (app) => ({
    title: `You don't have access to ${app}`,
    description:
      "Your MWS account isn't admitted to this application yet. Ask MAD Labs if you need it.",
  }),
  app_maintenance: (app) => ({
    title: `${app} is under maintenance`,
    description:
      "It's temporarily switched off while MAD Labs works on it. Try again later.",
  }),
  app_coming_soon: (app) => ({
    title: `${app} isn't released yet`,
    description:
      "It's listed here early. You'll be able to open it once it goes live.",
  }),
  app_no_link: (app) => ({
    title: `${app} has no link yet`,
    description: `It's in the catalog but no URL has been registered for it. Let MAD Labs know at ${SUPPORT_EMAIL}.`,
  }),
  account_inactive: () => ({
    title: "Your account is no longer active",
    description: `Your record in the Central database is inactive, so apps can't be opened. Contact ${SUPPORT_EMAIL} to restore it.`,
  }),
  central_unavailable: () => ({
    title: "Couldn't check your access",
    description:
      "The Central database didn't answer just now. Try opening the app again in a moment.",
  }),
};

function FeedbackDialog({
  state,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  state: FeedbackDialogState;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setText("");
    setError("");
  }, [state]);

  if (!state) return null;

  const isRequest = state.kind === "request";
  const title = isRequest
    ? `Request access to ${state.app.name}`
    : `Report ${state.app.name}`;
  const label = isRequest ? "Reason" : "Problem";
  const placeholder = isRequest
    ? "Tell MAD Labs why you need this app."
    : "Tell MAD Labs what is broken or missing.";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      setError(isRequest ? "Reason is required." : "Problem description is required.");
      return;
    }

    setError("");
    await onSubmit(trimmed);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/35 px-4 py-4 sm:items-center sm:justify-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full rounded-lg border border-border bg-card p-4 text-card-foreground shadow-xl sm:max-w-md sm:p-5"
      >
        <div className="space-y-1">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{state.app.audience}</p>
        </div>

        <label className="mt-4 block text-sm font-medium">
          {label}
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={placeholder}
            className="mt-1 min-h-28 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            disabled={isSubmitting}
          />
        </label>

        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {isSubmitting ? "Sending..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

const SupportHubPage = memo(() => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [feedbackDialog, setFeedbackDialog] = useState<FeedbackDialogState>(null);
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const {
    isLoading,
    hasError,
    query,
    isFiltering,
    visibleApplications,
    hasCatalog,
    categories,
    activeCategory,
    setQuery,
    setCategory,
    clearFilters,
    retry,
  } = useHubCatalog();

  // A refused launch lands back here with ?error=<code>. Surface it once,
  // then strip the param so a refresh doesn't replay the same toast.
  useEffect(() => {
    const code = searchParams.get("error");
    if (!code) return;

    const build = LAUNCH_ERRORS[code];
    if (build) {
      // "That app" reads better than an empty gap when the name is missing,
      // which happens for failures that are not about a specific app.
      const failure = build(searchParams.get("app") || "That app");
      toast.error(failure.title, { description: failure.description });
    }

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("error");
        next.delete("app");
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  const handleRequestAccess = useCallback((app: HubApplication) => {
    setFeedbackDialog({ kind: "request", app });
  }, []);

  const handleReportProblem = useCallback((app: HubApplication) => {
    setFeedbackDialog({ kind: "report", app });
  }, []);

  const closeFeedbackDialog = useCallback(() => {
    if (!isFeedbackSubmitting) setFeedbackDialog(null);
  }, [isFeedbackSubmitting]);

  const submitFeedbackDialog = useCallback(
    async (text: string) => {
      if (!feedbackDialog) return;

      setIsFeedbackSubmitting(true);
      try {
        const path =
          feedbackDialog.kind === "request"
            ? `/apps/${encodeURIComponent(feedbackDialog.app.id)}/request-access`
            : `/apps/${encodeURIComponent(feedbackDialog.app.id)}/report`;
        const body =
          feedbackDialog.kind === "request"
            ? { reason: text }
            : { message: text };

        await apiRequest(path, { method: "POST", body });
        toast.success(
          feedbackDialog.kind === "request"
            ? "Access request sent"
            : "Problem report sent",
        );
        setFeedbackDialog(null);
      } catch (error: unknown) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to send your message.",
        );
      } finally {
        setIsFeedbackSubmitting(false);
      }
    },
    [feedbackDialog],
  );

  const isSettled = !isLoading && !hasError;
  const showNoResults =
    isSettled && hasCatalog && visibleApplications.length === 0;
  const showEmptyCatalog = isSettled && !hasCatalog;
  const isAdmin = isMadLabsUser(user);

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground sm:h-auto sm:min-h-screen sm:overflow-visible">
      <MobileHeader user={user ? toHubUser(user) : undefined} />
      <div className="hidden sm:block">
        <HubHeader user={user ? toHubUser(user) : undefined} isAdmin={isAdmin} />
      </div>

      <main className="mx-auto flex h-[calc(100svh-3.5rem)] max-w-[1600px] flex-col overflow-hidden px-4 pb-0 pt-4 sm:block sm:h-auto sm:overflow-visible sm:px-6 sm:py-9">
        <div className="hidden sm:block">
          <HubIntro />
        </div>

        {/* Capped rather than stretched to the full 1600px: a search
            field wider than its own results is harder to aim at. */}
        <div className="mt-5 hidden max-w-xl sm:block">
          <HubSearch query={query} onQueryChange={setQuery} />
        </div>

        {/* Sits between search and results because that is the order the
            filtering happens in - type first, then narrow. Desktop only, the
            same as HubSearch: mobile has its own spotlight search. */}
        {isSettled && hasCatalog && (
          <div className="mt-4 hidden sm:block">
            <CategoryFilter
              categories={categories}
              activeCategory={activeCategory}
              onSelect={setCategory}
            />
          </div>
        )}

        <section className="min-h-0 flex-1 sm:mt-6 sm:block sm:h-auto">
          <div className="mb-3 hidden items-baseline gap-2 sm:flex">
            <h2 className="text-sm font-medium text-foreground">
              {isFiltering ? "Results" : "All applications"}
            </h2>
            {isSettled && (
              <p className="text-xs text-muted-foreground">
                {visibleApplications.length}
              </p>
            )}
          </div>

          {isLoading && <AppCardSkeletonGrid />}

          {hasError && <HubEmptyState variant="error" onAction={retry} />}

          {showEmptyCatalog && (
            <div className="pt-20 sm:pt-0">
              <HubEmptyState variant="no-apps" supportEmail={SUPPORT_EMAIL} />
            </div>
          )}

          {showNoResults && (
            <div className="hidden sm:block">
              <HubEmptyState
                variant="no-results"
                query={query}
                onAction={clearFilters}
              />
            </div>
          )}

          {isSettled && hasCatalog && (
            <>
              <MobileAppLauncher
                apps={visibleApplications}
                query={query}
                user={user ? toHubUser(user) : undefined}
                onQueryChange={setQuery}
                onRequestAccess={handleRequestAccess}
                onReportProblem={handleReportProblem}
              />

              <div className={HUB_GRID_CLASS}>
                {visibleApplications.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    onRequestAccess={handleRequestAccess}
                    onReportProblem={handleReportProblem}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      <FeedbackDialog
        state={feedbackDialog}
        isSubmitting={isFeedbackSubmitting}
        onClose={closeFeedbackDialog}
        onSubmit={submitFeedbackDialog}
      />
    </div>
  );
});

SupportHubPage.displayName = "SupportHubPage";
export default SupportHubPage;
