/*
  Warnings:

  - The primary key for the `user_sessions` table changes from `email` to
    `central_id` - Central's own Employee/Student id, not email, which
    Central allows editing (EmployeeValidation.UPDATE server-side). A row
    keyed by email would silently orphan itself the moment someone's email
    changes there.
  - This table is disposable session-revocation bookkeeping, not identity
    or audit data, so existing rows are cleared rather than backfilled -
    every currently signed-in person is asked to sign in again once after
    this deploys. `email` is kept as a plain, non-unique column for
    admin/debugging visibility only.

*/
-- Existing rows have no central_id to backfill without calling Central for
-- each one; clearing is deliberate, see above.
TRUNCATE TABLE "user_sessions";

-- AlterTable
ALTER TABLE "user_sessions" DROP CONSTRAINT "user_sessions_pkey",
ADD COLUMN     "central_id" TEXT NOT NULL,
ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("central_id");

-- CreateIndex
CREATE INDEX "user_sessions_email_idx" ON "user_sessions"("email");
