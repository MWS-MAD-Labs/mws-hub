// Why a call to Central did not work, in the three ways that matter to what comes next:
//   unreachable  the network, a timeout or a 5xx: it may work a minute later, so ask again
//   missing      404: Central does not have the endpoint yet (it is deployed before Hub)
//   rejected     the answer was no (token, scope, a list that is not allowed): asking again changes nothing
export type CentralFailureKind = "unreachable" | "missing" | "rejected";

export class CentralFailure extends Error {
  constructor(
    message: string,
    public readonly kind: CentralFailureKind,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "CentralFailure";
  }
}

export function kindForStatus(status: number): CentralFailureKind {
  if (status === 404) return "missing";
  if (status >= 500 || status === 408 || status === 429) return "unreachable";
  return "rejected";
}

function describe(kind: CentralFailureKind, detail?: string | null): string {
  if (kind === "unreachable") return "Central could not be reached";
  if (kind === "missing") return "Central does not have this yet, deploy Central first";
  return detail ? `Central said no: ${detail}` : "Central said no";
}

export function failureForResponse(status: number, serverMessage?: string | null): CentralFailure {
  const kind = kindForStatus(status);
  return new CentralFailure(describe(kind, serverMessage), kind, status);
}

export function failureForNetwork(error: unknown): CentralFailure {
  const detail = error instanceof Error ? error.message : String(error);
  return new CentralFailure(`${describe("unreachable")} (${detail})`, "unreachable");
}

export function asFailure(error: unknown): CentralFailure {
  return error instanceof CentralFailure ? error : failureForNetwork(error);
}
