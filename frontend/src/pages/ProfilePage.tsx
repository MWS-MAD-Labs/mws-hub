import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import HubHeader from "@/features/fragments/HubHeader";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toHubUser } from "@/model/auth-model";
import { isMadLabsUser } from "@/lib/admin-access";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const hubUser = toHubUser(user);
  const initials = hubUser.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

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

      <main className="mx-auto max-w-md px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="text-base">{initials}</AvatarFallback>
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
    </div>
  );
}
