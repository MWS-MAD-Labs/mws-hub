import { describe, it, expect, afterEach } from "bun:test";
import {
  listActiveEmployees,
  lookupApplicationEntitlement,
  resolveCentralIdentity,
  resolveCentralIdentityById,
} from "../lib/central-client";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("lookupApplicationEntitlement", () => {
  const entitlement = {
    id: "ent-1",
    person_id: "person-1",
    application_id: "exima",
    organization_id: "org-1",
    role: "resource-admin",
    permissions: ["inventory:read", "inventory:write"],
    version: 3,
    is_active: true,
    granted_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-29T00:00:00.000Z",
  };

  it("looks up by person_id/application_id and strictly returns valid data", async () => {
    let requestedUrl = "";
    global.fetch = (async (input: string | URL | Request) => {
      requestedUrl = String(input);
      return jsonResponse(200, { data: entitlement });
    }) as unknown as typeof fetch;

    expect(await lookupApplicationEntitlement("person-1", "exima")).toEqual(entitlement);
    const url = new URL(requestedUrl);
    expect(url.pathname).toEndWith("/application-entitlements/lookup");
    expect(url.searchParams.get("person_id")).toBe("person-1");
    expect(url.searchParams.get("application_id")).toBe("exima");
  });

  it("returns null only for a 404", async () => {
    global.fetch = (async () =>
      jsonResponse(404, { errors: "Not found" })) as unknown as typeof fetch;
    expect(await lookupApplicationEntitlement("person-1", "exima")).toBeNull();
  });

  it("fails closed for mismatched identifiers, malformed data, and non-404 errors", async () => {
    global.fetch = (async () =>
      jsonResponse(200, {
        data: { ...entitlement, application_id: "other" },
      })) as unknown as typeof fetch;
    await expect(lookupApplicationEntitlement("person-1", "exima")).rejects.toThrow(
      "Central entitlement response data is invalid",
    );

    global.fetch = (async () =>
      jsonResponse(200, {
        data: { ...entitlement, permissions: ["ok", 1] },
      })) as unknown as typeof fetch;
    await expect(lookupApplicationEntitlement("person-1", "exima")).rejects.toThrow(
      "Central entitlement response data is invalid",
    );

    global.fetch = (async () =>
      jsonResponse(503, { errors: "down" })) as unknown as typeof fetch;
    await expect(lookupApplicationEntitlement("person-1", "exima")).rejects.toThrow(
      "Central lookup failed with status 503",
    );
  });
});

// A slow-but-not-erroring Central must not hang Hub's sign-in/launch/admin
// flows forever - both the id/email-based lookup() and the paginated
// listPage() helper need their own abort budget, not just an error handler
// for a request that actually fails outright. Checking a signal is attached
// (rather than actually waiting out a real timeout) keeps this test fast.
describe("central-client request timeouts", () => {
  it("attaches an abort signal to a single lookup() call", async () => {
    let capturedInit: RequestInit | undefined;
    global.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      capturedInit = init;
      return jsonResponse(200, {
        data: { source: "employee", id: "emp-1", email: "a@millennia21.id" },
      });
    }) as unknown as typeof fetch;

    await resolveCentralIdentity("a@millennia21.id");
    expect(capturedInit?.signal).toBeInstanceOf(AbortSignal);
  });

  it("attaches an abort signal to a paginated listPage() call", async () => {
    let capturedInit: RequestInit | undefined;
    global.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      capturedInit = init;
      return jsonResponse(200, {
        success: true,
        data: [],
        paging: { current_page: 1, total_page: 1 },
      });
    }) as unknown as typeof fetch;

    await listActiveEmployees();
    expect(capturedInit?.signal).toBeInstanceOf(AbortSignal);
  });
});

describe("resolveCentralIdentity", () => {
  it("returns an employee identity when Central's combined lookup says source: employee", async () => {
    global.fetch = (async () =>
      jsonResponse(200, {
        data: { source: "employee", id: "emp-1", email: "a@millennia21.id" },
      })) as unknown as typeof fetch;

    const user = await resolveCentralIdentity("a@millennia21.id");
    expect(user?.source).toBe("employee");
  });

  it("normalizes Central's unit_id and nested unit object into unitId plus unit name", async () => {
    global.fetch = (async () =>
      jsonResponse(200, {
        data: {
          source: "employee",
          id: "emp-1",
          email: "a@millennia21.id",
          unit: { id: "unit-1", name: "MAD Lab" },
        },
      })) as unknown as typeof fetch;

    const user = await resolveCentralIdentity("a@millennia21.id");
    expect(user?.source).toBe("employee");
    if (user?.source !== "employee") throw new Error("Expected employee user");
    expect(user?.unit_id).toBe("unit-1");
    expect(user?.unitId).toBe("unit-1");
    expect(user?.unit).toBe("MAD Lab");
  });

  it("does not invent a unitId from the Central unit display name", async () => {
    global.fetch = (async () =>
      jsonResponse(200, {
        data: {
          source: "employee",
          id: "emp-1",
          email: "a@millennia21.id",
          unit: "MAD Lab",
          unit_id: null,
        },
      })) as unknown as typeof fetch;

    const user = await resolveCentralIdentity("a@millennia21.id");
    expect(user?.source).toBe("employee");
    if (user?.source !== "employee") throw new Error("Expected employee user");
    expect(user.unit).toBe("MAD Lab");
    expect(user.unit_id).toBeNull();
    expect(user.unitId).toBeNull();
  });

  it("returns a student identity when Central's combined lookup says source: student", async () => {
    const calls: string[] = [];
    global.fetch = (async (input: string | URL | Request) => {
      calls.push(String(input));
      return jsonResponse(200, {
        data: { source: "student", id: "stu-1", email: "b@millennia21.id" },
      });
    }) as unknown as typeof fetch;

    const user = await resolveCentralIdentity("b@millennia21.id");
    expect(user?.source).toBe("student");
    expect(calls).toEqual([expect.stringContaining("/persons/lookup")]);
  });

  // The whole point of the combined endpoint: a student sign-in used to cost
  // an employee-lookup 404 before falling through - this is now always
  // exactly one HTTP round-trip to Central, employee or student alike.
  it("resolves in a single Central call, never falling back to /employees or /students/lookup", async () => {
    let callCount = 0;
    global.fetch = (async (input: string | URL | Request) => {
      callCount += 1;
      const url = String(input);
      expect(url).toContain("/persons/lookup");
      expect(url).not.toContain("/employees/lookup");
      expect(url).not.toContain("/students/lookup");
      return jsonResponse(200, {
        data: { source: "student", id: "stu-1", email: "b@millennia21.id" },
      });
    }) as unknown as typeof fetch;

    await resolveCentralIdentity("b@millennia21.id");
    expect(callCount).toBe(1);
  });

  it("returns null when Central's combined lookup has no match", async () => {
    global.fetch = (async () =>
      jsonResponse(404, { errors: "Not found" })) as unknown as typeof fetch;

    const user = await resolveCentralIdentity("nobody@millennia21.id");
    expect(user).toBeNull();
  });

  // Regression check for the exact failure this backend hit in the wild:
  // Central's api_clients/api_scopes tables were empty, so every lookup came
  // back 401 instead of 404 - and that must surface as a loud error, not a
  // silent "user not found".
  it("throws instead of treating a 401 as 'not found', so an auth misconfiguration is never silent", async () => {
    global.fetch = (async () =>
      jsonResponse(401, { errors: "Unauthorized" })) as unknown as typeof fetch;

    await expect(resolveCentralIdentity("anyone@millennia21.id")).rejects.toThrow(
      "Central lookup failed with status 401",
    );
  });

  it("throws on an unexpected 5xx from Central rather than returning null", async () => {
    global.fetch = (async () =>
      jsonResponse(500, { errors: "Internal error" })) as unknown as typeof fetch;

    await expect(resolveCentralIdentity("anyone@millennia21.id")).rejects.toThrow(
      "Central lookup failed with status 500",
    );
  });

  it("resolves an employee by id without ever sending email", async () => {
    let requestedUrl = "";
    global.fetch = (async (input: string | URL | Request) => {
      requestedUrl = String(input);
      return jsonResponse(200, { data: { id: "emp-1", email: "current@millennia21.id" } });
    }) as unknown as typeof fetch;

    const user = await resolveCentralIdentityById("emp-1", "employee");
    expect(user?.source).toBe("employee");
    expect(requestedUrl).toContain("/employees/lookup?id=emp-1");
    expect(requestedUrl).not.toContain("email");
  });

  it("resolves a student by id, hitting only the students endpoint (source is already known)", async () => {
    const calls: string[] = [];
    global.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      return jsonResponse(200, { data: { id: "stu-1", email: "current@millennia21.id" } });
    }) as unknown as typeof fetch;

    const user = await resolveCentralIdentityById("stu-1", "student");
    expect(user?.source).toBe("student");
    expect(calls).toEqual([expect.stringContaining("/students/lookup?id=stu-1")]);
    // Unlike resolveCentralIdentity's email-based fresh-sign-in path, this
    // never needs the employee-then-student fallback - the caller already
    // knows which one from the session it's re-checking.
    expect(calls.some((url) => url.includes("/employees/lookup"))).toBe(false);
  });

  // The actual regression this exists for: Central's email is editable
  // (EmployeeValidation.UPDATE), so re-resolving by id must keep working
  // even when the email on file has moved on from whatever a stale session
  // snapshot remembers - that's the whole point of preferring this over
  // resolveCentralIdentity for an already-known person.
  it("still resolves correctly after the person's email has changed in Central, since id never moves", async () => {
    global.fetch = (async () =>
      jsonResponse(200, {
        data: { id: "emp-1", email: "new.email@millennia21.id" },
      })) as unknown as typeof fetch;

    const user = await resolveCentralIdentityById("emp-1", "employee");
    expect(user?.source).toBe("employee");
    expect(user?.email).toBe("new.email@millennia21.id");
  });

  it("returns null when the id has no matching active record", async () => {
    global.fetch = (async () =>
      jsonResponse(404, { errors: "Not found" })) as unknown as typeof fetch;

    const user = await resolveCentralIdentityById("nobody", "employee");
    expect(user).toBeNull();
  });

  it("lists active employees from Central and preserves unit ids", async () => {
    const calls: string[] = [];
    global.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      return jsonResponse(200, {
        success: true,
        data: [
          {
            id: "emp-1",
            employee_id: "22.22.222",
            full_name: "Dummy Staff",
            nick_name: "Staff",
            email: "dummystaff@millennia21.id",
            photo_url: null,
            unit: "Junior High",
            unit_id: "unit-junior-high",
            job_position: "Homeroom Teacher",
            job_level: "Teacher",
            status: "ACTIVE",
            employment_type: "CONTRACT",
          },
        ],
        paging: { current_page: 1, total_page: 1 },
      });
    }) as unknown as typeof fetch;

    const employees = await listActiveEmployees();
    expect(calls[0]).toContain("/employees?page=1&size=100&status=ACTIVE");
    expect(employees[0]?.unit).toBe("Junior High");
    expect(employees[0]?.unit_id).toBe("unit-junior-high");
  });
});
