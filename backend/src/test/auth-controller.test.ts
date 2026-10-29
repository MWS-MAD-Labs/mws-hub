import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { AuthController } from "../controller/auth-controller";
import type { HubUser } from "../type/central-type";
import type { SessionVariables } from "../type/hono-context";

const admin: HubUser = {
  source: "admin",
  id: "cmv09qj5j0000r17blfdr8xfq",
  admin_no: "ADM-00001",
  email: "asror@millennia21.id",
  full_name: "asror",
  role: "SUPER_ADMIN",
  avatar_url:
    "http://localhost:9010/mws-data-center/admin-avatars/admin/avatar.avif",
  unit_id: "cmv09q4zg000a7w7bm8yyr537",
  job_position: "Junior Full Stack Web Developer",
  job_position_id: "cmv09q50l000s7w7bropx35tm",
  job_level: "Staff",
  job_level_id: "cmv09q526001m7w7b3n7tderl",
  building: "Millennia 21 Building",
  building_id: "cmv09q52g001p7w7bbbr8q7e6",
  education_level: null,
  is_active: true,
  last_login: "2026-10-28T03:19:13.025Z",
  created_at: "2026-10-09T01:10:16.951Z",
  type: "admin",
  is_protected: true,
  is_identifier_change_approver: false,
  is_employee_identifier_change_approver: false,
  is_head_of_care: false,
  person_id: "cmv0aisvt000p7i7bolfjklwn",
};

describe("AuthController.me", () => {
  async function getMeResponse(user: HubUser) {
    const app = new Hono<{ Variables: SessionVariables }>();
    app.get("/auth/me", (c) => {
      c.set("user", user);
      return AuthController.me(c);
    });

    const response = await app.request("/auth/me");
    expect(response.status).toBe(200);
    return response.json();
  }

  it("returns Central admin fields without Hub-only identity properties", async () => {
    expect(await getMeResponse(admin)).toEqual({
      data: {
        id: "cmv09qj5j0000r17blfdr8xfq",
        admin_no: "ADM-00001",
        email: "asror@millennia21.id",
        full_name: "asror",
        role: "SUPER_ADMIN",
        avatar_url:
          "http://localhost:9010/mws-data-center/admin-avatars/admin/avatar.avif",
        unit_id: "cmv09q4zg000a7w7bm8yyr537",
        job_position: "Junior Full Stack Web Developer",
        job_position_id: "cmv09q50l000s7w7bropx35tm",
        job_level: "Staff",
        job_level_id: "cmv09q526001m7w7b3n7tderl",
        building: "Millennia 21 Building",
        building_id: "cmv09q52g001p7w7bbbr8q7e6",
        education_level: null,
        is_active: true,
        last_login: "2026-10-28T03:19:13.025Z",
        created_at: "2026-10-09T01:10:16.951Z",
        type: "admin",
        is_protected: true,
        is_identifier_change_approver: false,
        is_employee_identifier_change_approver: false,
        is_head_of_care: false,
        person_id: "cmv0aisvt000p7i7bolfjklwn",
      },
    });
  });

  it("keeps building and job_level keys when Central only supplies their IDs", async () => {
    const user: HubUser = {
      ...admin,
      building: undefined,
      job_level: undefined,
    };

    const response = await getMeResponse(user);
    expect(response.data).toMatchObject({
      job_position: "Junior Full Stack Web Developer",
      job_position_id: "cmv09q50l000s7w7bropx35tm",
      job_level: null,
      job_level_id: "cmv09q526001m7w7b3n7tderl",
      building: null,
      building_id: "cmv09q52g001p7w7bbbr8q7e6",
      education_level: null,
    });
  });
});
