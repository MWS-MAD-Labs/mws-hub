import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clipboard,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import Logo from "@/assets/logo.webp";
import HubHeader from "@/features/fragments/HubHeader";
import MobileHeader from "@/mobile/components/MobileHeader";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toHubUser } from "@/model/auth-model";
import { isMadLabsUser } from "@/lib/admin-access";
import { cn } from "@/lib/utils";
import {
  gptCodeApi,
  type GptCodeAssignment,
  type GptCodeResult,
} from "@/features/gpt-code/gptCodeApi";

const CODE_CLEAR_MS = 5 * 60 * 1000;
const CODE_LENGTH = 6;

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/* ---------- Info row ---------- */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-4 border-b border-border lg:min-h-14">
      <span className="text-[13px] text-muted-foreground lg:text-sm">
        {label}
      </span>
      <span className="break-all text-right text-[15px] font-semibold">
        {value}
      </span>
    </div>
  );
}

/* ---------- Account dropdown (units with more than one account) ---------- */
function AccountSelect({
  accounts,
  value,
  disabled,
  onChange,
}: {
  accounts: string[];
  value: string;
  disabled?: boolean;
  onChange: (email: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = (email: string) => {
    onChange(email);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const last = accounts.length - 1;
    if (event.key === "Escape") return setOpen(false);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setActive(Math.max(0, accounts.indexOf(value)));
        return setOpen(true);
      }
      setActive((i) =>
        event.key === "ArrowDown" ? Math.min(i + 1, last) : Math.max(i - 1, 0),
      );
    }
    if (event.key === "Home" && open) {
      event.preventDefault();
      setActive(0);
    }
    if (event.key === "End" && open) {
      event.preventDefault();
      setActive(last);
    }
    if (event.key === "Enter" && open) {
      event.preventDefault();
      choose(accounts[active]);
    }
  };

  return (
    <div ref={rootRef} className="relative pt-1" onKeyDown={onKeyDown}>
      <p
        id="gpt-account-label"
        className="mb-2 text-[13px] text-muted-foreground lg:text-sm"
      >
        ChatGPT account · {accounts.length} available
      </p>
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="gpt-account-list"
        aria-labelledby="gpt-account-label"
        disabled={disabled}
        onClick={() => {
          setActive(Math.max(0, accounts.indexOf(value)));
          setOpen((v) => !v);
        }}
        className={cn(
          "flex h-[52px] w-full items-center justify-between rounded-[14px] border border-border bg-card px-4 text-[15px] font-semibold disabled:opacity-60 lg:h-14 lg:px-[18px] lg:text-base",
          FOCUS,
        )}
      >
        <span className="truncate">{value}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-primary transition-transform motion-reduce:transition-none",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          id="gpt-account-list"
          role="listbox"
          aria-labelledby="gpt-account-label"
          aria-activedescendant={`gpt-account-${active}`}
          className="absolute inset-x-0 top-full z-20 mt-1.5 list-none rounded-2xl border border-border bg-card p-1.5 shadow-[0_12px_32px_rgba(60,30,30,0.16)]"
        >
          {accounts.map((email, index) => {
            const selected = email === value;
            return (
              <li
                key={email}
                id={`gpt-account-${index}`}
                role="option"
                aria-selected={selected}
                onClick={() => choose(email)}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "flex h-12 cursor-pointer items-center justify-between rounded-[10px] px-3 text-[15px] font-medium lg:h-[52px] lg:text-base",
                  selected ? "bg-primary/10 text-primary" : "text-foreground",
                  index === active && !selected && "bg-muted",
                )}
              >
                <span className="truncate">{email}</span>
                {selected && (
                  <Check
                    className="h-[18px] w-[18px] shrink-0"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ---------- Digit boxes ---------- */
function CodeDigits({ code }: { code?: string }) {
  const length = code?.length || CODE_LENGTH;
  const half = Math.ceil(length / 2);
  const digits = Array.from({ length }, (_, i) => code?.[i] ?? "");

  const box = (digit: string, index: number) => (
    <div
      key={index}
      className="flex h-16 flex-1 items-center justify-center rounded-xl bg-muted font-mono text-[26px] font-semibold tabular-nums lg:h-24 lg:rounded-2xl lg:bg-white/10 lg:text-5xl"
    >
      {digit || (
        <span className="text-muted-foreground/50 lg:text-white/30">·</span>
      )}
    </div>
  );

  return (
    <div className="flex items-center gap-2.5 lg:gap-3.5" aria-hidden="true">
      <div className="flex flex-1 gap-1.5 lg:gap-2">
        {digits.slice(0, half).map(box)}
      </div>
      <div className="h-0.5 w-2 bg-border lg:h-[3px] lg:w-3 lg:bg-white/40" />
      <div className="flex flex-1 gap-1.5 lg:gap-2">
        {digits.slice(half).map((d, i) => box(d, i + half))}
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function GptCodePage() {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<GptCodeAssignment | null>(null);
  const [selectedEmail, setSelectedEmail] = useState("");
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
      const next = await gptCodeApi.assignment();
      setAssignment(next);
      setSelectedEmail(next.accounts?.[0] ?? next.email);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Your GPT account could not be loaded.",
      );
    } finally {
      setLoadingAssignment(false);
    }
  }, []);

  useEffect(() => {
    void loadAssignment();
  }, [loadAssignment]);
  useEffect(() => {
    if (!result) return;
    const timer = window.setTimeout(() => {
      setResult(null);
      setCopied(false);
    }, CODE_CLEAR_MS);
    return () => window.clearTimeout(timer);
  }, [result]);

  function selectAccount(email: string) {
    setSelectedEmail(email);
    setResult(null); // a code belongs to one account
    setCopied(false);
    setError("");
  }

  async function fetchCode() {
    setFetchingCode(true);
    setError("");
    setResult(null);
    setCopied(false);
    try {
      const next = await gptCodeApi.fetchCode(selectedEmail);
      setResult(next);
      window.requestAnimationFrame(() => resultRef.current?.focus());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The latest code could not be loaded.",
      );
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
  const accounts = assignment?.accounts ?? [];
  const multiAccount = accounts.length > 1;
  const shortName = selectedEmail.split("@")[0]?.toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MobileHeader user={hubUser} />
      <div className="hidden sm:block">
        <HubHeader user={hubUser} isAdmin={isMadLabsUser(user)} />
      </div>

      <main className="mx-auto w-full max-w-[1120px] px-5 pb-32 pt-4 sm:px-8 sm:pb-16 sm:pt-8">
        <Link
          to="/support-hub"
          className={cn(
            "-ml-1 inline-flex h-11 items-center gap-1.5 rounded-md px-1 text-[15px] font-medium text-primary",
            FOCUS,
          )}
        >
          <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" /> Back to
          Hub
        </Link>

        {loadingAssignment ? (
          <div className="mt-6 space-y-3" aria-label="Loading GPT account">
            <div className="h-24 animate-pulse rounded-2xl bg-muted" />
            <div className="h-64 animate-pulse rounded-[22px] bg-muted/70" />
          </div>
        ) : !assignment ? (
          <section
            role="alert"
            className="mt-6 max-w-xl rounded-2xl border border-destructive/30 bg-destructive/10 p-5"
          >
            <h2 className="font-semibold">GPT Code is not available</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {error || "No GPT account is assigned to your unit."}
            </p>
            <button
              type="button"
              onClick={() => void loadAssignment()}
              className={cn(
                "mt-4 inline-flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted",
                FOCUS,
              )}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
          </section>
        ) : (
          <div className="mt-5 grid gap-6 lg:mt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-x-[72px]">
            {/* Left: context */}
            <section className="flex flex-col gap-5">
              <div>
                <img
                  src={Logo}
                  alt=""
                  className="h-7 w-7 object-contain"
                  loading="lazy"
                />
                <h1 className="mt-4 text-3xl font-bold leading-[1.12] tracking-[-0.02em] lg:text-[44px] lg:leading-[1.08] lg:tracking-[-0.025em]">
                  ChatGPT Verification Code
                </h1>
                <p className="mt-3 max-w-md text-[15px] leading-6 text-muted-foreground lg:text-base">
                  Request a verification code on the ChatGPT sign-in screen
                  first, then return here to retrieve the newest email for your
                  unit.
                </p>
              </div>

              <div className="border-t border-border lg:mt-3">
                <InfoRow label="Your unit" value={assignment.unitName} />
              </div>
              {multiAccount ? (
                <AccountSelect
                  accounts={accounts}
                  value={selectedEmail}
                  disabled={fetchingCode}
                  onChange={selectAccount}
                />
              ) : (
                <div className="-mt-5 lg:-mt-5">
                  <InfoRow label="ChatGPT account" value={assignment.email} />
                </div>
              )}

              <ol className="mt-2 hidden flex-col gap-5 lg:flex">
                {[
                  multiAccount
                    ? "Select an account, enter it on ChatGPT and request a login code."
                    : "Enter the account above on ChatGPT and request a login code.",
                  "Wait for the verification email, then select Get verification code.",
                ].map((text, index) => (
                  <li key={text} className="flex items-start gap-3.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[13px] font-bold text-primary">
                      {index + 1}
                    </span>
                    <span className="pt-0.5 text-[15px] leading-6">{text}</span>
                  </li>
                ))}
              </ol>
            </section>

            {/* Right: code */}
            <section
              aria-label="Verification code"
              className="flex flex-col gap-4 rounded-[22px] border border-border bg-card p-5 lg:gap-7 lg:rounded-[28px] lg:border-0 lg:bg-primary lg:p-10 lg:text-primary-foreground"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground lg:text-primary-foreground/75">
                  Latest code{multiAccount ? ` · ${shortName}` : ""}
                </span>
                {result && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    New
                  </span>
                )}
              </div>

              <div
                ref={resultRef}
                tabIndex={-1}
                aria-live="polite"
                className="focus:outline-none"
              >
                <CodeDigits code={result?.code} />
                {result && (
                  <p className="sr-only">
                    Verification code {result.code.split("").join(" ")}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1 lg:flex-row lg:gap-3">
                {result ? (
                  <button
                    type="button"
                    onClick={() => void copyCode()}
                    className={cn(
                      "inline-flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-primary px-5 text-base font-semibold text-primary-foreground lg:h-14 lg:flex-1 lg:bg-white lg:text-primary lg:hover:bg-white/90",
                      FOCUS,
                    )}
                  >
                    {copied ? (
                      <Check className="h-[18px] w-[18px]" aria-hidden="true" />
                    ) : (
                      <Clipboard
                        className="h-[18px] w-[18px]"
                        aria-hidden="true"
                      />
                    )}
                    {copied ? "Copied" : "Copy code"}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => void fetchCode()}
                  disabled={fetchingCode}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 font-semibold disabled:cursor-wait disabled:opacity-65",
                    FOCUS,
                    result
                      ? "h-11 text-sm text-primary lg:h-14 lg:rounded-[14px] lg:border lg:border-white/40 lg:px-6 lg:text-base lg:text-primary-foreground lg:hover:bg-white/10"
                      : "h-[52px] rounded-[14px] bg-primary px-5 text-base text-primary-foreground lg:h-14 lg:flex-1 lg:bg-white lg:text-primary lg:hover:bg-white/90",
                  )}
                >
                  {fetchingCode ? (
                    <LoaderCircle
                      className="h-[18px] w-[18px] animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  ) : !result ? (
                    <ShieldCheck
                      className="h-[18px] w-[18px]"
                      aria-hidden="true"
                    />
                  ) : null}
                  {fetchingCode
                    ? "Checking Gmail…"
                    : result
                      ? "Get again"
                      : "Get verification code"}
                </button>
              </div>

              {error ? (
                <p
                  role="alert"
                  className="text-sm font-medium text-destructive lg:rounded-lg lg:bg-white lg:px-3 lg:py-2"
                >
                  {error}
                </p>
              ) : null}

              <p className="border-t border-border pt-4 text-[13px] leading-5 text-muted-foreground lg:border-white/20 lg:pt-5 lg:text-sm lg:text-primary-foreground/75">
                {result
                  ? `Email received ${result.timestamp}. This code is kept only on this screen and clears after five minutes.`
                  : "Your code will appear here after Hub securely checks the unit mailbox."}
              </p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
