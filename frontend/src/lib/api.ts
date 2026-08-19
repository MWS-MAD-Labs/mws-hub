import { env } from "@/config/env";

export class ApiError extends Error {
  status?: number;
  payload?: unknown;

  constructor(message: string, { status, payload }: { status?: number; payload?: unknown } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

type ApiRequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T | null> {
  const { body, headers, ...fetchOptions } = options;
  const shouldSerialize = isJsonBody(body);

  const response = await fetch(`${env.hubApiBaseUrl}${path}`, {
    ...fetchOptions,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(shouldSerialize ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: shouldSerialize ? JSON.stringify(body) : (body as BodyInit | undefined),
  });

  if (response.status === 204) {
    return null;
  }

  const payload = await readPayload(response);

  if (!response.ok) {
    throw new ApiError(getErrorMessage(payload) || response.statusText, {
      status: response.status,
      payload,
    });
  }

  return payload as T;
}

async function readPayload(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }
  return response.text().catch(() => null);
}

function isJsonBody(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  if (body instanceof FormData) return false;
  if (body instanceof URLSearchParams) return false;
  return true;
}

function getErrorMessage(payload: unknown): string {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  if (typeof payload === "object" && payload !== null && "errors" in payload) {
    return String((payload as { errors: unknown }).errors);
  }
  return "";
}
