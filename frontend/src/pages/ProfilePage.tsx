import { useState } from "react";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import HubHeader from "@/features/fragments/HubHeader";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toHubUser } from "@/model/auth-model";
import { isMadLabsUser } from "@/lib/admin-access";
import MobileSpotlightSearch from "@/features/fragments/MobileSpotlightSearch";
import useGptCodeAccess from "@/features/gpt-code/useGptCodeAccess";
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

          <button
            type="button"
            onClick={handleLogout}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-border/60 bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut size={16} />
            Sign out
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
