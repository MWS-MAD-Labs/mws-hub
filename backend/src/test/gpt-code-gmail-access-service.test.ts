import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { HubUser } from "../type/central-type";
import { GptCodeGmailAccessService } from "../service/gpt-code-gmail-access-service";
import { GptCodeGmailService } from "../service/gpt-code-gmail-service";

const envNames = [
  "GPT_CODE_GMAIL_CLIENT_ID",
  "GPT_CODE_GMAIL_CLIENT_SECRET",
  "GPT_CODE_GMAIL_REFRESH_TOKEN",
  "GPT_CODE_GMAIL_MAILBOX",
] as const;
const originalEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));

function employee(email: string): HubUser {
  return {
    source: "employee",
    id: "employee-1",
    person_id: "person-1",
    employee_id: "E001",
    full_name: "Gmail Tester",
    nick_name: null,
    email,
    photo_url: null,
    unit: "MAD Lab",
    unit_id: "unit-mad-lab",
    unitId: "unit-mad-lab",
    job_position: null,
    job_level: null,
    status: "ACTIVE",
    employment_type: null,
  };
}

beforeEach(() => {
  process.env.GPT_CODE_GMAIL_CLIENT_ID = "client";
  process.env.GPT_CODE_GMAIL_CLIENT_SECRET = "secret";
  process.env.GPT_CODE_GMAIL_REFRESH_TOKEN = "refresh";
  process.env.GPT_CODE_GMAIL_MAILBOX = "asror@millennia21.id";
});

afterEach(() => {
  mock.restore();
  for (const name of envNames) {
    const value = originalEnv[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("GptCodeGmailAccessService", () => {
  it("allows only the fresh Central identity matching the configured mailbox", () => {
    expect(GptCodeGmailAccessService.assignmentFor(employee("asror@millennia21.id"))).toEqual({
      cardId: "GMAIL_TEST",
      email: "asror@millennia21.id",
      unitId: "unit-mad-lab",
      unitName: "MAD Lab",
    });
    expect(() => GptCodeGmailAccessService.assignmentFor(employee("other@millennia21.id")))
      .toThrow();
  });

  it("returns only the code and required metadata from the Gmail service", async () => {
    spyOn(GptCodeGmailService, "getCode").mockResolvedValue({
      code: "123456",
      timestamp: "2026-10-30T05:59:00.000Z",
    });
    await expect(GptCodeGmailAccessService.codeFor(employee("asror@millennia21.id")))
      .resolves.toEqual({
        assignment: {
          cardId: "GMAIL_TEST",
          email: "asror@millennia21.id",
          unitId: "unit-mad-lab",
          unitName: "MAD Lab",
        },
        result: {
          cardId: "GMAIL_TEST",
          code: "123456",
          timestamp: "2026-10-30T05:59:00.000Z",
        },
      });
  });
});
