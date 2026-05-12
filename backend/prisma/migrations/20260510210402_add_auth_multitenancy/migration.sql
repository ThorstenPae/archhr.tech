/*
  Warnings:

  - Added the required column `companyId` to the `absence_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `candidates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `departments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `employees` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `job_postings` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "companies" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'HR_MANAGER',
    "companyId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_absence_requests" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "absence_requests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "absence_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_absence_requests" ("createdAt", "employeeId", "endDate", "id", "reason", "startDate", "status", "type", "updatedAt") SELECT "createdAt", "employeeId", "endDate", "id", "reason", "startDate", "status", "type", "updatedAt" FROM "absence_requests";
DROP TABLE "absence_requests";
ALTER TABLE "new_absence_requests" RENAME TO "absence_requests";
CREATE TABLE "new_candidates" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "jobPostingId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "candidates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "candidates_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "job_postings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_candidates" ("appliedAt", "createdAt", "email", "firstName", "id", "jobPostingId", "lastName", "notes", "status", "updatedAt") SELECT "appliedAt", "createdAt", "email", "firstName", "id", "jobPostingId", "lastName", "notes", "status", "updatedAt" FROM "candidates";
DROP TABLE "candidates";
ALTER TABLE "new_candidates" RENAME TO "candidates";
CREATE TABLE "new_departments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "managerId" INTEGER,
    "companyId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "departments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_departments" ("createdAt", "id", "managerId", "name", "updatedAt") SELECT "createdAt", "id", "managerId", "name", "updatedAt" FROM "departments";
DROP TABLE "departments";
ALTER TABLE "new_departments" RENAME TO "departments";
CREATE TABLE "new_employees" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "dateOfBirth" DATETIME,
    "gender" TEXT,
    "street" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'Deutschland',
    "emergencyName" TEXT,
    "emergencyPhone" TEXT,
    "departmentId" INTEGER,
    "position" TEXT NOT NULL,
    "managerId" INTEGER,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "employmentType" TEXT NOT NULL DEFAULT 'FULL_TIME',
    "weeklyHours" REAL DEFAULT 40,
    "salary" REAL,
    "salaryGrade" TEXT,
    "bio" TEXT,
    "skills" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "employees_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "employees_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_employees" ("bio", "city", "country", "createdAt", "dateOfBirth", "departmentId", "email", "emergencyName", "emergencyPhone", "employmentType", "endDate", "firstName", "gender", "id", "lastName", "managerId", "phone", "position", "postalCode", "salary", "salaryGrade", "skills", "startDate", "status", "street", "updatedAt", "weeklyHours") SELECT "bio", "city", "country", "createdAt", "dateOfBirth", "departmentId", "email", "emergencyName", "emergencyPhone", "employmentType", "endDate", "firstName", "gender", "id", "lastName", "managerId", "phone", "position", "postalCode", "salary", "salaryGrade", "skills", "startDate", "status", "street", "updatedAt", "weeklyHours" FROM "employees";
DROP TABLE "employees";
ALTER TABLE "new_employees" RENAME TO "employees";
CREATE TABLE "new_job_postings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "departmentId" INTEGER,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "job_postings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "job_postings_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_job_postings" ("createdAt", "departmentId", "description", "id", "status", "title", "updatedAt") SELECT "createdAt", "departmentId", "description", "id", "status", "title", "updatedAt" FROM "job_postings";
DROP TABLE "job_postings";
ALTER TABLE "new_job_postings" RENAME TO "job_postings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
