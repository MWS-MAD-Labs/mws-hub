import { memo, useEffect, useState } from "react";
import { Cake, LoaderCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { hubApi } from "@/features/hub/api/hubApi";
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

const BirthdayList = memo(() => {
  const [birthdays, setBirthdays] = useState<HubBirthday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function loadBirthdays() {
      try {
        setIsLoading(true);
        setHasError(false);
        const data = await hubApi.listBirthdays(8);
        if (isCurrent) setBirthdays(data);
      } catch {
        if (isCurrent) setHasError(true);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    void loadBirthdays();

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
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

      {!isLoading && !hasError && birthdays.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {birthdays.map((birthday) => (
            <article
              key={birthday.id}
              className="flex min-w-[10rem] items-center gap-2 rounded-md border border-border/50 bg-background/80 px-2 py-1.5"
            >
              <Avatar className="h-8 w-8">
                {birthday.photo_url && (
                  <AvatarImage src={birthday.photo_url} alt="" />
                )}
                <AvatarFallback className="text-[10px]">
                  {initialsOf(birthday.name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">
                  {birthday.name}
                </p>
                <p className="text-[10px] font-medium text-muted-foreground">
                  {dateLabelOf(birthday.birthday)}
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                {relativeLabelOf(birthday)}
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
});

BirthdayList.displayName = "BirthdayList";

export default BirthdayList;
