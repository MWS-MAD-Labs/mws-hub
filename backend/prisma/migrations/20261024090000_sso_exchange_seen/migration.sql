-- CreateTable
CREATE TABLE "sso_exchange_seen" (
    "app_id" TEXT NOT NULL,
    "seen_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sso_exchange_seen_pkey" PRIMARY KEY ("app_id")
);
