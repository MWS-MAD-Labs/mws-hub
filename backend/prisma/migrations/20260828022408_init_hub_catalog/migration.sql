-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'COMING_SOON', 'NEW');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'AppWindow',
    "description" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "href" TEXT,
    "external" BOOLEAN NOT NULL DEFAULT true,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'ACTIVE',
    "discoverable" BOOLEAN NOT NULL DEFAULT true,
    "allowed_sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sso_app_id" TEXT,
    "sso_entry_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_reports" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "reporter_email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_requests" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "requester_email" TEXT NOT NULL,
    "reason" TEXT,
    "status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decided_at" TIMESTAMP(3),
    "decided_by" TEXT,
    "decision_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "applications_sso_app_id_key" ON "applications"("sso_app_id");

-- CreateIndex
CREATE INDEX "applications_category_idx" ON "applications"("category");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE INDEX "applications_discoverable_idx" ON "applications"("discoverable");

-- CreateIndex
CREATE INDEX "applications_sort_order_idx" ON "applications"("sort_order");

-- CreateIndex
CREATE INDEX "app_reports_application_id_idx" ON "app_reports"("application_id");

-- CreateIndex
CREATE INDEX "app_reports_status_idx" ON "app_reports"("status");

-- CreateIndex
CREATE INDEX "app_reports_created_at_idx" ON "app_reports"("created_at");

-- CreateIndex
CREATE INDEX "access_requests_status_idx" ON "access_requests"("status");

-- CreateIndex
CREATE INDEX "access_requests_created_at_idx" ON "access_requests"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "access_requests_application_id_requester_email_status_key" ON "access_requests"("application_id", "requester_email", "status");

-- AddForeignKey
ALTER TABLE "app_reports" ADD CONSTRAINT "app_reports_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
