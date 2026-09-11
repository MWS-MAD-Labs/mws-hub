import { Cake, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { HubBirthday } from "@/model/hub-model";

const birthdayDateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

function dateLabelOf(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "Birthday";
  return birthdayDateFormatter.format(
    new Date(Date.UTC(2000, Number(match[2]) - 1, Number(match[3]))),
  );
}

function relativeLabelOf(birthday: HubBirthday): string {
  if (birthday.is_today) return "Today";
  if (birthday.days_until === 1) return "Tomorrow";
  return `${birthday.days_until} days`;
}

function badgeClassOf(birthday: HubBirthday): string {
  if (birthday.is_today) {
    return "bg-primary text-primary-foreground";
  }

  if (birthday.days_until === 1) {
    return "bg-accent/10 text-accent";
  }

  return "bg-primary/10 text-primary";
}

interface BirthdayModalProps {
  open: boolean;
  birthdays: HubBirthday[];
  onClose: () => void;
}

export default function BirthdayModal({
  open,
  birthdays,
  onClose,
}: BirthdayModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-[2px] [padding-bottom:calc(env(safe-area-inset-bottom)+1rem)] [padding-top:calc(env(safe-area-inset-top)+1rem)]"
      role="dialog"
      aria-modal="true"
      aria-label="All birthdays"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/80 bg-[#fffdf9] shadow-2xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-rose-100/70"
          style={{
            clipPath:
              "polygon(0 38%, 18% 26%, 36% 36%, 54% 24%, 72% 35%, 88% 27%, 100% 38%, 100% 100%, 0 100%)",
          }}
        />

        <div className="relative z-10 flex items-center gap-3 border-b border-primary/10 bg-primary/5 px-4 py-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
            <Cake className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold leading-tight text-card-foreground">
              All Birthdays
            </h2>
            <p className="text-xs font-medium text-muted-foreground">
              Upcoming birthdays from Central
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
            {birthdays.length}
          </span>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close birthday modal"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative z-10 max-h-[min(28rem,65svh)] overflow-y-auto p-3">
          {birthdays.length === 0 ? (
            <div className="rounded-xl border border-dashed border-primary/15 bg-white/70 px-4 py-10 text-center">
              <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Cake className="h-5 w-5" />
              </span>
              <p className="text-sm font-semibold text-foreground">
                No upcoming birthdays
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                We will show the next birthdays here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {birthdays.map((birthday) => (
                <article
                  key={birthday.id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 shadow-sm ${
                    birthday.is_today
                      ? "border-primary/20 bg-primary/5"
                      : "border-border/50 bg-white/85"
                  }`}
                >
                  <Avatar className="h-11 w-11 shrink-0 border-2 border-white shadow-sm">
                    {birthday.photo_url && (
                      <AvatarImage src={birthday.photo_url} alt="" />
                    )}
                    <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                      {initialsOf(birthday.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {birthday.name}
                    </p>

                    <p className="truncate text-[11px] font-semibold text-muted-foreground">
                      {birthday.unit || "Central"}
                    </p>

                    <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                      Birthday on {dateLabelOf(birthday.birthday)}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${badgeClassOf(
                      birthday,
                    )}`}
                  >
                    {relativeLabelOf(birthday)}
                  </span>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
