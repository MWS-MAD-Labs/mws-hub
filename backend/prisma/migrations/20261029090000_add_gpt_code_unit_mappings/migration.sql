CREATE TABLE "gpt_code_unit_mappings" (
    "id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "unit_name" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gpt_code_unit_mappings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gpt_code_unit_mappings_card_id_check"
      CHECK ("card_id" IN ('A1', 'A2', 'A3', 'A4', 'A5'))
);

CREATE UNIQUE INDEX "gpt_code_unit_mappings_unit_id_key"
ON "gpt_code_unit_mappings"("unit_id");

CREATE UNIQUE INDEX "gpt_code_unit_mappings_card_id_key"
ON "gpt_code_unit_mappings"("card_id");

CREATE INDEX "gpt_code_unit_mappings_is_active_idx"
ON "gpt_code_unit_mappings"("is_active");
