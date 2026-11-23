import type { HubUser } from "./central-type";
import type { SessionPayload } from "../lib/session";

export type SessionVariables = {
  user: HubUser;
  session: SessionPayload;
};
