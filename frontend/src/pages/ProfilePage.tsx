import { useEffect, useState } from "react";
import { ChevronRight, LoaderCircle, LogOut, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import HubHeader from "@/features/fragments/HubHeader";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toHubUser } from "@/model/auth-model";
import { isMadLabsUser } from "@/lib/admin-access";
import MobileSpotlightSearch from "@/features/fragments/MobileSpotlightSearch";
import useGptCodeAccess from "@/features/gpt-code/useGptCodeAccess";
import { authApi, type AuthSession } from "@/features/auth/api/authApi";
import {
  clearSkippedAppDetails,
  skippedAppDetailCount,
} from "@/features/fragments/appDetailPreference";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const hasGptCode = useGptCodeAccess();
  const [hiddenAppDetailCount, setHiddenAppDetailCount] = useState(
    skippedAppDetailCount,
  );
  const [currentSession, setCurrentSession] = useState<AuthSession | null>(null);
  const [activeSessionCount, setActiveSessionCount] = useState(0);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    authApi.sessions({ status: "active", page: 1, pageSize: 20 })
      .then((result) => {
        if (!active) return;
        setCurrentSession(result.sessions.find((session) => session.current) ?? null);
        setActiveSessionCount(result.counts.active);
      })
      .catch(() => { if (active) toast.error("Failed to load active devices"); })
      .finally(() => { if (active) setSessionsLoading(false); });
    return () => { active = false; };
  }, []);

  if (!user) return null;

  function resetAppDetails() {
    if (!clearSkippedAppDetails()) {
      toast.error("Couldn't save this preference in this browser");
      return;
    }
    setHiddenAppDetailCount(0);
    toast.success("App detail popups restored");
  }

  const hubUser = toHubUser(user);

  async function handleLogout() {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      toast.error("Failed to sign out");
    }
  }

  const isAdmin = isMadLabsUser(user);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HubHeader user={hubUser} isAdmin={isAdmin} />

      <main className="mx-auto max-w-md px-4 pb-32 pt-10 sm:px-6">
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback>{hubUser.name.trim().charAt(0)}</AvatarFallback>
              {hubUser.avatar_url && <AvatarImage src={hubUser.avatar_url} alt="" />}
            </Avatar>
            <div>
              <p className="text-base font-semibold">{hubUser.name}</p>
              <p className="text-sm text-muted-foreground">{hubUser.email}</p>
              <p className="text-xs text-muted-foreground">{hubUser.role}</p>
            </div>
          </div>

          {user.source === "employee" && (
            <dl className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Employee ID</dt>
                <dd>{user.employee_id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Unit</dt>
                <dd>{user.unit || "-"}</dd>
              </div>
            </dl>
          )}

          {user.source === "intern" && (
            <dl className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Unit</dt>
                <dd>{user.unit || "-"}</dd>
              </div>
            </dl>
          )}

          {user.source === "student" && (
            <dl className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">NIS</dt>
                <dd>{user.nis || "-"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Class</dt>
                <dd>{user.current_class || "-"}</dd>
              </div>
            </dl>
          )}

          {"type" in user && (
            <dl className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Admin ID</dt>
                <dd>{user.admin_no}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Unit</dt>
                <dd>{user.unit_id || "-"}</dd>
              </div>
            </dl>
          )}

          <div className="mt-6 border-t border-border/60 pt-4">
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  App detail popups
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {hiddenAppDetailCount > 0
                    ? `${hiddenAppDetailCount} ${hiddenAppDetailCount === 1 ? "app is" : "apps are"} set to open directly.`
                    : "Every app will show its details before opening."}
                </p>
              </div>
              <button
                type="button"
                onClick={resetAppDetails}
                disabled={hiddenAppDetailCount === 0}
                className="min-h-11 shrink-0 rounded-lg border border-border/60 px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="mt-6 border-t border-border/60 pt-5">
            <button
              type="button"
              onClick={() => navigate("/profile/sessions")}
              className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-border/60 bg-background/50 px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted">
                {sessionsLoading ? <LoaderCircle className="size-4 animate-spin text-muted-foreground" /> : currentSession?.trusted ? <ShieldCheck className="size-5 text-emerald-600" /> : <MonitorSmartphone className="size-5 text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Security and devices</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {sessionsLoading ? "Loading session summary..." : currentSession ? `${currentSession.device_name} · ${currentSession.trusted ? "Trusted" : "Untrusted"}` : "Manage signed-in devices"}
                </p>
                {!sessionsLoading && <p className="mt-0.5 text-xs text-muted-foreground">{activeSessionCount} active {activeSessionCount === 1 ? "session" : "sessions"}</p>}
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-border/60 bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut size={16} />
            Sign out this device
          </button>
        </div>
      </main>

      <MobileSpotlightSearch
        query=""
        user={hubUser}
        onQueryChange={() => {}}
        showGptCode={hasGptCode}
        searchOnHub
      />
    </div>
  );
}
