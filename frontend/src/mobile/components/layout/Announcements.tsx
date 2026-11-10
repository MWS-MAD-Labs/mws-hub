import { Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

type AnnouncementsProps = {
  className?: string;
};

export default function Announcements({ className }: AnnouncementsProps) {
  return (
    <section
      className={cn(
        "mb-2 shrink-0 rounded-lg border border-border/60 bg-card px-3 py-2.5 shadow-sm",
        "sm:mb-0 sm:rounded-xl sm:p-4",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary sm:h-8 sm:w-8 sm:rounded-lg">
          <Megaphone className="h-4 w-4" />
        </span>
        <p className="text-xs font-semibold text-foreground sm:ml-1 sm:text-[15px]">Announcements</p>
      </div>

      <div className="mt-2 text-xs font-medium text-muted-foreground sm:mt-3 sm:text-sm sm:leading-relaxed">
        <p>Welcome to MWS Hub! Check out the latest updates and features.</p>
      </div>
    </section>
  );
}
