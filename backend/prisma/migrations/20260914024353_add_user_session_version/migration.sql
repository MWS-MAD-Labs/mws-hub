-- CreateTable
CREATE TABLE "user_sessions" (
    "email" TEXT NOT NULL,
    "session_version" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("email")
);
