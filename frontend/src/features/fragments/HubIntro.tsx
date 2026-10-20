import { memo } from "react";
import type { HubUser } from "@/model/hub-model";
import { getGreeting } from "@/mobile/utils/Greeting";

const HUB_TIME_ZONE = "Asia/Jakarta";

const hubDateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: HUB_TIME_ZONE,
});

type HubIntroProps = {
  user: HubUser;
};

const HubIntro = memo(({ user }: HubIntroProps) => {
  const now = new Date();

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {getGreeting(now)}, {user.name}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {hubDateFormatter.format(now)} · Your MWS applications, tools, and
        resources.
      </p>
    </div>
  );
});

HubIntro.displayName = "HubIntro";
export default HubIntro;
