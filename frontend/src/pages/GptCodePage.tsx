import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Clipboard, KeyRound, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import HubHeader from "@/features/fragments/HubHeader";
import MobileHeader from "@/mobile/components/MobileHeader";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toHubUser } from "@/model/auth-model";
import { isMadLabsUser } from "@/lib/admin-access";
import { gptCodeApi, type GptCodeAssignment, type GptCodeResult } from "@/features/gpt-code/gptCodeApi";

const CODE_CLEAR_MS = 5 * 60 * 1000;

export default function GptCodePage() {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<GptCodeAssignment | null>(null);
  const [result, setResult] = useState<GptCodeResult | null>(null);
  const [loadingAssignment, setLoadingAssignment] = useState(true);
  const [fetchingCode, setFetchingCode] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const loadAssignment = useCallback(async () => {
    setLoadingAssignment(true);
    setError("");
    try {
      setAssignment(await gptCodeApi.assignment());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your GPT account could not be loaded.");
    } finally {
      setLoadingAssignment(false);
    }
  }, []);

  useEffect(() => { void loadAssignment(); }, [loadAssignment]);
  useEffect(() => {
    if (!result) return;
    const timer = window.setTimeout(() => {
      setResult(null);
      setCopied(false);
    }, CODE_CLEAR_MS);
    return () => window.clearTimeout(timer);
  }, [result]);

  async function fetchCode() {
    setFetchingCode(true);
    setError("");
    setResult(null);
    setCopied(false);
    try {
      const next = await gptCodeApi.fetchCode();
      setResult(next);
      window.requestAnimationFrame(() => resultRef.current?.focus());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The latest code could not be loaded.");
    } finally {
      setFetchingCode(false);
    }
  }

  async function copyCode() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      toast.success("Verification code copied");
    } catch {
      toast.error("Copy failed. Select the code and copy it manually.");
    }
  }

  const hubUser = user ? toHubUser(user) : undefined;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MobileHeader user={hubUser} />
      <div className="hidden sm:block"><HubHeader user={hubUser} isAdmin={isMadLabsUser(user)} /></div>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8 sm:py-10">
        <Link to="/support-hub" className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeft className="h-4 w-4" /> Back to Hub
        </Link>

        <header className="mt-8 border-b border-border pb-7">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><KeyRound className="h-5 w-5" /></span>
            <div>
              <h1 className="text-2xl font-bold tracking-[-0.025em] sm:text-3xl">ChatGPT login code</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Request a verification code on the ChatGPT sign-in screen first, then return here to retrieve the newest email for your unit.</p>
            </div>
          </div>
        </header>

        {loadingAssignment ? (
          <div className="mt-7 space-y-3" aria-label="Loading GPT account">
            <div className="h-20 animate-pulse rounded-xl bg-muted" />
            <div className="h-56 animate-pulse rounded-xl bg-muted/70" />
          </div>
        ) : !assignment ? (
          <section role="alert" className="mt-7 rounded-xl border border-destructive/30 bg-destructive/8 p-5">
            <h2 className="font-semibold">GPT Code is not available</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{error || "No GPT account is assigned to your unit."}</p>
            <button type="button" onClick={() => void loadAssignment()} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><RefreshCw className="h-4 w-4" />Try again</button>
          </section>
        ) : (
          <div className="mt-7">
            <section aria-label="Assigned GPT account" className="grid gap-4 border-b border-border pb-6 sm:grid-cols-2">
              <div><p className="text-xs font-medium text-muted-foreground">Your unit</p><p className="mt-1 text-sm font-semibold">{assignment.unitName}</p></div>
              <div><p className="text-xs font-medium text-muted-foreground">ChatGPT account</p><p className="mt-1 break-all text-sm font-semibold">{assignment.email}</p></div>
            </section>

            <section className="py-7">
              <h2 className="text-base font-semibold">Retrieve the latest email</h2>
              <ol className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                <li><span className="mr-2 font-semibold text-foreground">1.</span>Enter the account above on ChatGPT and request a login code.</li>
                <li><span className="mr-2 font-semibold text-foreground">2.</span>Wait for the verification email, then select the button below.</li>
              </ol>

              <button type="button" onClick={() => void fetchCode()} disabled={fetchingCode} className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-65">
                {fetchingCode ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {fetchingCode ? "Checking Gmail…" : result ? "Check for a newer code" : "Get verification code"}
              </button>

              {error ? <p role="alert" className="mt-4 text-sm font-medium text-destructive">{error}</p> : null}
            </section>

            <div ref={resultRef} tabIndex={-1} aria-live="polite" className="border-t border-border pt-7 focus:outline-none">
              {result ? (
                <div>
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Latest verification code</p>
                      <p className="mt-2 select-all text-4xl font-bold tracking-[0.18em] tabular-nums sm:text-5xl" aria-label={`Verification code ${result.code.split("").join(" ")}`}>{result.code}</p>
                    </div>
                    <button type="button" onClick={() => void copyCode()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Clipboard className="h-4 w-4" />}{copied ? "Copied" : "Copy code"}
                    </button>
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">Email received {result.timestamp}. This code is kept only on this screen and clears after five minutes.</p>
                </div>
              ) : (
                <div className="flex min-h-32 items-center justify-center border border-dashed border-border px-5 text-center">
                  <p className="max-w-md text-sm leading-6 text-muted-foreground">Your code will appear here after Hub securely checks the unit mailbox through Apps Script.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
