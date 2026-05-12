-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_employees" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
    CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "employees_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_employees" ("createdAt", "departmentId", "email", "firstName", "id", "lastName", "position", "startDate", "status", "updatedAt") SELECT "createdAt", "departmentId", "email", "firstName", "id", "lastName", "position", "startDate", "status", "updatedAt" FROM "employees";
DROP TABLE "employees";
ALTER TABLE "new_employees" RENAME TO "employees";
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
