import type { EmployeeLookupResponse } from "../type/central-type";

// Dummy employees with November birthdays, for testing the "Birthday This
// Month" widget without touching Central. Turn on with BIRTHDAY_SEED=true;
// it is ignored when NODE_ENV=production.
//
// The dates cover every state the widget shows (as of mid-November):
// already passed, today-ish, tomorrow-ish, later this month, plus one
// December birthday that must NOT show up.
export function birthdaySeedEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.BIRTHDAY_SEED === "true" && env.NODE_ENV !== "production";
}

function seedEmployee(
  id: string,
  fullName: string,
  nickName: string,
  birthDate: string,
  unit: string,
): EmployeeLookupResponse {
  return {
    id: `seed-${id}`,
    person_id: `seed-person-${id}`,
    employee_id: `SEED.${id}`,
    full_name: fullName,
    nick_name: nickName,
    email: `seed.${id}@example.test`,
    photo_url: null,
    avatar_url: null,
    unit,
    unit_id: null,
    job_position: "Teacher",
    job_level: "Teacher",
    birth_date: birthDate,
    status: "ACTIVE",
    employment_type: "CONTRACT",
  };
}

export function seedBirthdayEmployees(): EmployeeLookupResponse[] {
  return [
    seedEmployee("01", "Andi Pratama Wijaya", "Andi", "1988-11-02", "Junior High"),
    seedEmployee("02", "Siti Nurhaliza Rahman", "Siti", "1992-11-09", "Elementary"),
    seedEmployee("03", "Budi Santoso", "Budi", "1985-11-15", "Senior High"),
    seedEmployee("04", "Dewi Lestari Putri", "Dewi", "1990-11-17", "Kindergarten"),
    seedEmployee("05", "Rizky Maulana Hakim", "Rizky", "1995-11-17", "Junior High"),
    seedEmployee("06", "Putri Ayu Kusuma", "Putri", "1993-11-18", "Elementary"),
    seedEmployee("07", "Fajar Nugroho", "Fajar", "1987-11-21", "Senior High"),
    seedEmployee("08", "Maya Anggraini Sari", "Maya", "1991-11-25", "Operations"),
    seedEmployee("09", "Hendra Gunawan Saputra", "Hendra", "1984-11-30", "Finance"),
    // December: must be filtered out in November.
    seedEmployee("10", "Lina Marlina", "Lina", "1994-12-01", "Elementary"),
  ];
}
