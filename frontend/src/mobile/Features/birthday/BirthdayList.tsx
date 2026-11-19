import { memo, useEffect, useState } from "react";
import { Cake, ChevronDown, LoaderCircle, PartyPopper } from "lucide-react";
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

function dateLabelOf(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "Birthday";

  return birthdayDateFormatter.format(
    new Date(Date.UTC(2000, Number(match[2]) - 1, Number(match[3]))),
  );
}

function relativeLabelOf(birthday: HubBirthday): string {
  if (birthday.is_today) return "Today";
  if (birthday.has_passed) return "Passed";
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

const monthName = new Intl.DateTimeFormat("en", { month: "long" }).format(
  new Date(),
);

// How many of the next birthdays the "Coming up" list shows; the rest are in See All.
const UPCOMING_LIMIT = 3;

// "Coming up" starts closed; once someone opens it, that is remembered per browser.
const UPCOMING_OPEN_KEY = "mws-hub.birthday-upcoming.open";

function readUpcomingOpen(): boolean {
  try {
    return localStorage.getItem(UPCOMING_OPEN_KEY) === "true";
  } catch {
    return false;
  }
}

function rememberUpcomingOpen(open: boolean) {
  try {
    localStorage.setItem(UPCOMING_OPEN_KEY, String(open));
  } catch {
    // Storage blocked: it just starts closed again next time.
  }
}

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function BirthdayAvatar({
  birthday,
  className,
}: {
  birthday: HubBirthday;
  className?: string;
}) {
  return (
    <Avatar className={cn("shrink-0", className)}>
      <AvatarFallback className="text-[11px] font-semibold">
        {initialsOf(birthday.name)}
      </AvatarFallback>
      {birthday.avatar_url && <AvatarImage src={birthday.avatar_url} alt="" />}
    </Avatar>
  );
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
  const [isUpcomingOpen, setIsUpcomingOpen] = useState(readUpcomingOpen);

  useEffect(() => {
    let isCurrent = true;

    async function loadBirthdays() {
      try {
        setIsLoading(true);
        setHasError(false);

        const data = await hubApi.listBirthdays();

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

  const todayBirthdays = birthdays.filter((birthday) => birthday.is_today);
  const upcomingBirthdays = birthdays.filter(
    (birthday) => !birthday.is_today && !birthday.has_passed,
  );
  const passedBirthdays = birthdays.filter((birthday) => birthday.has_passed);
  const nextBirthday = upcomingBirthdays[0];
  const isReady = !isLoading && !hasError && birthdays.length > 0;

  function toggleUpcoming() {
    setIsUpcomingOpen((open) => {
      rememberUpcomingOpen(!open);
      return !open;
    });
  }

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
              Birthday This Month
            </h2>

            <p className="text-[11px] leading-tight text-muted-foreground sm:mt-0.5 sm:text-xs">
              {isReady
                ? `${birthdays.length} ${birthdays.length === 1 ? "person" : "people"} in ${monthName}`
                : monthName}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="ml-auto shrink-0 rounded-md border border-primary/15 bg-primary/5 px-2.5 py-1 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/10 sm:px-3 sm:py-1.5 sm:text-xs"
          >
            See All
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
            No birthdays this month
          </p>
        )}

        {isReady && (
          <div className="mt-2.5 grid gap-2.5 sm:mt-3 sm:gap-3">
            {todayBirthdays.length > 0 ? (
              <div className="relative overflow-hidden rounded-lg bg-primary px-3 py-3 text-primary-foreground sm:rounded-xl sm:px-4">
                <PartyPopper
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-2 -top-2 h-16 w-16 opacity-15"
                />

                <p className="text-[10px] font-bold uppercase tracking-[0.08em] opacity-80">
                  Birthday today
                </p>

                <div className="mt-2 flex items-center gap-2.5">
                  <div className="flex shrink-0">
                    {todayBirthdays.slice(0, 3).map((birthday, index) => (
                      <BirthdayAvatar
                        key={birthday.id}
                        birthday={birthday}
                        className={cn(
                          "h-10 w-10 border-2 border-primary",
                          index > 0 && "-ml-3",
                        )}
                      />
                    ))}
                  </div>

                  <p className="min-w-0 text-base font-bold leading-tight">
                    {todayBirthdays.length > 2
                      ? `${firstNameOf(todayBirthdays[0].name)} & ${todayBirthdays.length - 1} others`
                      : todayBirthdays
                          .map((birthday) => firstNameOf(birthday.name))
                          .join(" & ")}
                  </p>
                </div>

                <ul className="mt-2 grid gap-0.5 text-[11px] leading-snug opacity-85">
                  {todayBirthdays.map((birthday) => (
                    <li key={birthday.id} className="truncate">
                      {birthday.name}
                      {birthday.unit ? ` · ${birthday.unit}` : ""}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => setIsBirthdayCelebrationOpen(true)}
                  className="mt-3 rounded-md bg-primary-foreground px-3 py-1.5 text-[11px] font-bold text-primary transition-opacity hover:opacity-90"
                >
                  Send wishes 🎉
                </button>
              </div>
            ) : (
              <p className="rounded-md bg-muted/35 px-3 py-2 text-xs font-medium text-muted-foreground">
                No birthdays today.
                {nextBirthday && (
                  <>
                    {" "}
                    Next is{" "}
                    <span className="font-semibold text-foreground">
                      {nextBirthday.name}
                    </span>
                    , {relativeLabelOf(nextBirthday).toLowerCase()}
                    {nextBirthday.days_until > 1 ? " away" : ""}.
                  </>
                )}
              </p>
            )}

            {upcomingBirthdays.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={toggleUpcoming}
                  aria-expanded={isUpcomingOpen}
                  aria-controls="birthday-upcoming-list"
                  className="flex w-full items-center gap-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.07em] text-muted-foreground transition-colors hover:text-foreground"
                >
                  Coming up
                  <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">
                    {upcomingBirthdays.length}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      "ml-auto h-3.5 w-3.5 transition-transform motion-reduce:transition-none",
                      isUpcomingOpen && "rotate-180",
                    )}
                  />
                </button>

                {isUpcomingOpen && (
                  <ul id="birthday-upcoming-list" className="mt-1">
                    {upcomingBirthdays.slice(0, UPCOMING_LIMIT).map((birthday) => (
                      <li
                        key={birthday.id}
                        className="flex items-center gap-2.5 border-t border-border/50 py-1.5 first:border-t-0"
                      >
                        <BirthdayAvatar birthday={birthday} className="h-8 w-8" />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground sm:text-sm">
                            {birthday.name}
                          </p>
                          <p className="truncate text-[10px] font-medium text-muted-foreground sm:text-xs">
                            {dateLabelOf(birthday.birthday)}
                            {birthday.unit ? ` · ${birthday.unit}` : ""}
                          </p>
                        </div>

                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            birthday.days_until === 1
                              ? "bg-accent/10 text-accent"
                              : "bg-primary/10 text-primary",
                          )}
                        >
                          {relativeLabelOf(birthday)}
                        </span>
                      </li>
                    ))}

                    {upcomingBirthdays.length > UPCOMING_LIMIT && (
                      <li className="pt-1">
                        <button
                          type="button"
                          onClick={() => setIsModalOpen(true)}
                          className="text-[11px] font-semibold text-primary hover:underline"
                        >
                          +{upcomingBirthdays.length - UPCOMING_LIMIT} more this month
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            )}

            {passedBirthdays.length > 0 && (
              <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                <div className="flex shrink-0">
                  {passedBirthdays.slice(0, 4).map((birthday, index) => (
                    <BirthdayAvatar
                      key={birthday.id}
                      birthday={birthday}
                      className={cn(
                        "h-5 w-5 border border-card [&_*]:text-[8px]",
                        index > 0 && "-ml-1.5",
                      )}
                    />
                  ))}
                </div>
                {passedBirthdays.length} already celebrated this month
              </div>
            )}
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
