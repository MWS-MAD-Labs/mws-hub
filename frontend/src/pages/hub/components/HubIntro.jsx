import { memo } from "react";

// Two lines, no hero. This page gets opened several times a day; a large
// welcome block would only be something to scroll past every time.
const HubIntro = memo(() => (
    <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Support Hub
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
            Your MWS applications, tools, and resources.
        </p>
    </div>
));

HubIntro.displayName = "HubIntro";
export default HubIntro;
