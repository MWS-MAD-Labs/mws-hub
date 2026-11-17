-- Per-person exceptions to the GPT Code access rules, keyed by email:
-- ASSIGN gives one person one specific card, BLOCK keeps them out.

CREATE TYPE "GptCodeExceptionAction" AS ENUM ('ASSIGN', 'BLOCK');

CREATE TABLE "gpt_code_access_exceptions" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "action" "GptCodeExceptionAction" NOT NULL,
    "card_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gpt_code_access_exceptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gpt_code_access_exceptions_email_lower_check"
      CHECK ("email" = lower("email")),
    CONSTRAINT "gpt_code_access_exceptions_card_check"
      CHECK (
        ("action" = 'ASSIGN' AND "card_id" IN ('A1', 'A2', 'A3', 'A4', 'A5'))
        OR ("action" = 'BLOCK' AND "card_id" IS NULL)
      )
);

CREATE UNIQUE INDEX "gpt_code_access_exceptions_email_key"
ON "gpt_code_access_exceptions"("email");
