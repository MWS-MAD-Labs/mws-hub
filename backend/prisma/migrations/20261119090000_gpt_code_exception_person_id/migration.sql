-- An exception follows the person, not the email: Central can change an email, and a BLOCK keyed only by the old one
-- would stop applying. Rows made before this have no person id and are tied when their email matches someone.

ALTER TABLE "gpt_code_access_exceptions" ADD COLUMN "person_id" TEXT;

CREATE UNIQUE INDEX "gpt_code_access_exceptions_person_id_key"
ON "gpt_code_access_exceptions"("person_id");
