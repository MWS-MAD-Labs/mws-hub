/*
  Existing Hub and refresh tokens do not carry a device session id. Session
  bookkeeping is disposable, so this migration deliberately signs everyone
  out once instead of guessing which browser owns an old token.
*/
TRUNCATE TABLE "refresh_tokens";
TRUNCATE TABLE "user_sessions";

CREATE TABLE "login_sessions" (
    "id" TEXT NOT NULL,
    "central_id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "account_version" INTEGER NOT NULL,
    "device_name" TEXT,
    "user_agent" TEXT,
    "trusted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,

    CONSTRAINT "login_sessions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "refresh_tokens" ADD COLUMN "session_id" TEXT NOT NULL;

CREATE INDEX "login_sessions_central_id_revoked_at_idx" ON "login_sessions"("central_id", "revoked_at");
CREATE INDEX "login_sessions_person_id_idx" ON "login_sessions"("person_id");
CREATE INDEX "login_sessions_expires_at_idx" ON "login_sessions"("expires_at");
CREATE INDEX "refresh_tokens_session_id_idx" ON "refresh_tokens"("session_id");
