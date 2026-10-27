-- The catalog lives in Central. Reports and access requests keep the application id as plain text.
ALTER TABLE "app_reports" DROP CONSTRAINT "app_reports_application_id_fkey";
ALTER TABLE "access_requests" DROP CONSTRAINT "access_requests_application_id_fkey";

-- DropTable
DROP TABLE "applications";

-- DropEnum
DROP TYPE "ApplicationStatus";
