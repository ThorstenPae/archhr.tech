-- AlterTable
ALTER TABLE "job_postings" ADD COLUMN "address" TEXT;
ALTER TABLE "job_postings" ADD COLUMN "benefits" TEXT;
ALTER TABLE "job_postings" ADD COLUMN "employmentType" TEXT;
ALTER TABLE "job_postings" ADD COLUMN "location" TEXT;
ALTER TABLE "job_postings" ADD COLUMN "requirements" TEXT;
ALTER TABLE "job_postings" ADD COLUMN "salaryMax" REAL;
ALTER TABLE "job_postings" ADD COLUMN "salaryMin" REAL;
ALTER TABLE "job_postings" ADD COLUMN "salaryType" TEXT;
ALTER TABLE "job_postings" ADD COLUMN "shiftModel" TEXT;
ALTER TABLE "job_postings" ADD COLUMN "tasks" TEXT;
