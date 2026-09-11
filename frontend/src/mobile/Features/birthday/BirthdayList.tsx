import { memo, useEffect, useState } from "react";
import { Cake, LoaderCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { hubApi } from "@/features/hub/api/hubApi";
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

const BirthdayList = memo(() => {
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
          setIsBirthdayCelebrationOpen(
            data.some((birthday) => birthday.is_today),
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
      <section className="mx-1 mb-3 shrink-0 rounded-lg border border-border/60 bg-card/95 px-3 py-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-primary/15 bg-primary/10 text-primary">
            <Cake className="h-3.5 w-3.5" />
          </span>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight text-card-foreground">
              Birthdays
            </h2>

            <p className="text-[11px] leading-tight text-muted-foreground">
              Upcoming from Central
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="ml-auto shrink-0 rounded-md border border-primary/15 bg-primary/5 px-2.5 py-1 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            All Birthday
          </button>
        </div>

        {isLoading && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-muted/35 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            Loading birthdays
          </div>
        )}

        {!isLoading && hasError && (
          <p className="mt-2 rounded-md bg-muted/35 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Birthdays are unavailable right now
          </p>
        )}

        {!isLoading && !hasError && birthdays.length === 0 && (
          <p className="mt-2 rounded-md bg-muted/35 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            No upcoming birthdays
          </p>
        )}

        {!isLoading && !hasError && visibleBirthdays.length > 0 && (
          <div className="mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {visibleBirthdays.map((birthday) => (
              <article
                key={birthday.id}
                className={`grid shrink-0 snap-start grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 rounded-md border border-border/50 bg-background/80 px-2 py-1.5 ${
                  visibleBirthdays.length === 1
                    ? "w-full"
                    : "w-[13.5rem] max-w-[85%]"
                }`}
              >
                <Avatar className="row-span-2 h-8 w-8">
                  {birthday.photo_url && (
                    <AvatarImage src={birthday.photo_url} alt="" />
                  )}

                  <AvatarFallback className="text-[10px]">
                    {initialsOf(birthday.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {birthday.name}
                  </p>

                  <p className="text-[10px] font-medium text-muted-foreground">
                    {dateLabelOf(birthday.birthday)}
                  </p>
                </div>

                <span className="w-fit max-w-full truncate rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
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
        onOpenChange={setIsBirthdayCelebrationOpen}
      />
    </>
  );
});

BirthdayList.displayName = "BirthdayList";

export default BirthdayList;
