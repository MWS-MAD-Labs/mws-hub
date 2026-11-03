-- A GPT Code card can now be offered to several units, job levels, job
-- positions and buildings instead of exactly one unit.

CREATE TYPE "GptCodeTargetType" AS ENUM ('UNIT', 'JOB_LEVEL', 'JOB_POSITION', 'BUILDING');

CREATE TABLE "gpt_code_access_rules" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "target_type" "GptCodeTargetType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "target_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gpt_code_access_rules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gpt_code_access_rules_card_id_check"
      CHECK ("card_id" IN ('A1', 'A2', 'A3', 'A4', 'A5'))
);

CREATE UNIQUE INDEX "gpt_code_access_rules_card_id_target_type_target_id_key"
ON "gpt_code_access_rules"("card_id", "target_type", "target_id");

CREATE INDEX "gpt_code_access_rules_target_type_target_id_idx"
ON "gpt_code_access_rules"("target_type", "target_id");

CREATE INDEX "gpt_code_access_rules_is_active_idx"
ON "gpt_code_access_rules"("is_active");

-- Every existing unit mapping carries over unchanged, active flag included.
INSERT INTO "gpt_code_access_rules"
  ("id", "card_id", "target_type", "target_id", "target_name", "is_active", "created_at", "updated_at")
SELECT "id", "card_id", 'UNIT', "unit_id", "unit_name", "is_active", "created_at", "updated_at"
FROM "gpt_code_unit_mappings";

DROP TABLE "gpt_code_unit_mappings";
