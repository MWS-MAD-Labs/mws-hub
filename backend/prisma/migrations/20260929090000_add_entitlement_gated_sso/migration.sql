-- AlterTable
ALTER TABLE "applications"
ADD COLUMN "sso_central_entitlement_app_id" TEXT;

-- CreateTable
CREATE TABLE "sso_codes" (
    "code" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "state" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sso_codes_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE INDEX "sso_codes_expires_at_idx" ON "sso_codes"("expires_at");

-- Existing installations may already have Exima in the catalog. Configure it
-- in-place only when doing so cannot violate the unique SSO app-id constraint.
UPDATE "applications"
SET
    "sso_app_id" = 'exima',
    "sso_entry_url" = 'https://exima.mws.web.id/auth/sso',
    "sso_logout_url" = 'https://exima.mws.web.id/auth/logout-silent'
WHERE "id" = 'exima'
  AND NOT EXISTS (
      SELECT 1
      FROM "applications" AS conflict
      WHERE conflict."sso_app_id" = 'exima'
        AND conflict."id" <> 'exima'
  );
