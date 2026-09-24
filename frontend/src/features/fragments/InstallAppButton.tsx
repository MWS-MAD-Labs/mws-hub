import { Download } from "lucide-react";
import usePwaInstall from "@/hooks/usePwaInstall";

type InstallAppButtonProps = {
  variant?: "default" | "compact";
};

// Renders nothing unless the browser currently offers an install prompt, so
// it never takes up space on unsupported browsers or inside the installed app.
export default function InstallAppButton({ variant = "default" }: InstallAppButtonProps) {
  const { canInstall, promptInstall } = usePwaInstall();

  if (!canInstall) return null;

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={() => void promptInstall()}
        aria-label="Install MWS Hub"
        title="Install MWS Hub"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 text-foreground transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Download className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void promptInstall()}
      className="flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Download className="h-3.5 w-3.5" />
      Install App
    </button>
  );
}
