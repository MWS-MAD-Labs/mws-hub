import { memo, useEffect, useState } from "react";
import { Cake, LoaderCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { hubApi } from "@/features/hub/api/hubApi";
import { cn } from "@/lib/utils";
import type { HubBirthday } from "@/model/hub-model";
import BirthdayCelebrationModal from "./BirthdayCelebrationModal";
import BirthdayModal from "./BirthdayModal";

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

// Once the celebration is closed it stays closed for that day's birthdays.
// Keyed by today's date and who is celebrating, so tomorrow's birthdays (or
// the same person next year) still get their popup.
const CELEBRATION_DISMISSED_KEY = "mws-hub.birthday-celebration.dismissed";

function celebrationKeyOf(todayBirthdays: HubBirthday[]): string {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const ids = todayBirthdays.map((birthday) => birthday.id).sort().join(",");
  return `${date}|${ids}`;
}

function wasCelebrationDismissed(key: string): boolean {
  try {
    return localStorage.getItem(CELEBRATION_DISMISSED_KEY) === key;
  } catch {
    return false;
  }
}

function rememberCelebrationDismissed(key: string) {
  try {
    localStorage.setItem(CELEBRATION_DISMISSED_KEY, key);
  } catch {
    // Storage blocked: the popup simply may show again next time.
  }
}

type BirthdayListProps = {
  className?: string;
};

const BirthdayList = memo(({ className }: BirthdayListProps) => {
  const [birthdays, setBirthdays] = useState<HubBirthday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBirthdayCelebrationOpen, setIsBirthdayCelebrationOpen] =
    useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function loadBirthdays() {
      try {
        setIsLoading(true);
        setHasError(false);

        const data = await hubApi.listBirthdays(8);

        if (isCurrent) {
          setBirthdays(data);
          const today = data.filter((birthday) => birthday.is_today);
          setIsBirthdayCelebrationOpen(
            today.length > 0 &&
              !wasCelebrationDismissed(celebrationKeyOf(today)),
          );
        }
      } catch {
        if (isCurrent) {
          setHasError(true);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void loadBirthdays();

    return () => {
      isCurrent = false;
    };
  }, []);

  const visibleBirthdays = birthdays.filter(
    (birthday) => birthday.is_today || birthday.days_until === 1,
  );
  const todayBirthdays = birthdays.filter((birthday) => birthday.is_today);

  return (
    <>
      <section
        className={cn(
          "mx-1 mb-3 shrink-0 rounded-lg border border-border/60 bg-card/95 px-3 py-2.5 shadow-sm",
          "sm:mx-0 sm:mb-0 sm:rounded-xl sm:p-4",
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-primary/15 bg-primary/10 text-primary sm:h-8 sm:w-8 sm:rounded-lg">
            <Cake className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </span>

          <div className="min-w-0 sm:ml-1">
            <h2 className="text-sm font-semibold leading-tight text-card-foreground sm:text-[15px]">
              Birthdays
            </h2>

            <p className="text-[11px] leading-tight text-muted-foreground sm:mt-0.5 sm:text-xs">
              Upcoming from Central
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="ml-auto shrink-0 rounded-md border border-primary/15 bg-primary/5 px-2.5 py-1 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/10 sm:px-3 sm:py-1.5 sm:text-xs"
          >
            All Birthday
          </button>
        </div>

        {isLoading && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-muted/35 px-3 py-1.5 text-xs font-medium text-muted-foreground sm:mt-3 sm:py-2 sm:text-sm">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            Loading birthdays
          </div>
        )}

        {!isLoading && hasError && (
          <p className="mt-2 rounded-md bg-muted/35 px-3 py-1.5 text-xs font-medium text-muted-foreground sm:mt-3 sm:py-2 sm:text-sm">
            Birthdays are unavailable right now
          </p>
        )}

        {!isLoading && !hasError && birthdays.length === 0 && (
          <p className="mt-2 rounded-md bg-muted/35 px-3 py-1.5 text-xs font-medium text-muted-foreground sm:mt-3 sm:py-2 sm:text-sm">
            No upcoming birthdays
          </p>
        )}

        {!isLoading && !hasError && visibleBirthdays.length > 0 && (
          <div className="mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto sm:mt-3 sm:gap-3 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {visibleBirthdays.map((birthday) => (
              <article
                key={birthday.id}
                className={`grid shrink-0 snap-start grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 rounded-md border border-border/50 bg-background/80 px-2 py-1.5 sm:gap-x-3 sm:rounded-lg sm:px-3 sm:py-2 ${
                  visibleBirthdays.length === 1
                    ? "w-full"
                    : "w-[13.5rem] max-w-[85%]"
                }`}
              >
                <Avatar className="row-span-2 h-8 w-8 sm:h-9 sm:w-9">
                  {birthday.photo_url && (
                    <AvatarImage src={birthday.photo_url} alt="" />
                  )}

                  <AvatarFallback className="text-[10px]">
                    {initialsOf(birthday.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground sm:text-sm">
                    {birthday.name}
                  </p>

                  <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">
                    {dateLabelOf(birthday.birthday)}
                  </p>
                </div>

                <span className="w-fit max-w-full truncate rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary sm:px-2 sm:text-[11px]">
                  {relativeLabelOf(birthday)}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      <BirthdayModal
        open={isModalOpen}
        birthdays={birthdays}
        onClose={() => setIsModalOpen(false)}
      />

      <BirthdayCelebrationModal
        open={isBirthdayCelebrationOpen}
        birthdays={todayBirthdays}
        onOpenChange={(open) => {
          if (!open) rememberCelebrationDismissed(celebrationKeyOf(todayBirthdays));
          setIsBirthdayCelebrationOpen(open);
        }}
      />
    </>
  );
});

BirthdayList.displayName = "BirthdayList";

export default BirthdayList;
