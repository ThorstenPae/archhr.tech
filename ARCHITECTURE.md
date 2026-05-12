# HR-Webapp Architektur — Team: hr-webapp

> Architect: Claude Code | Datum: 2026-05-10

---

## 1. Tech-Stack

### Frontend

| Schicht | Technologie | Begründung |
|---|---|---|
| Framework | **Next.js 14** (App Router) | SSR/SSG, File-based Routing, API Routes |
| UI-Bibliothek | **React 18** | Komponentenmodell, breites Ökosystem |
| Styling | **Tailwind CSS + shadcn/ui** | Utility-first, konsistentes Design-System |
| State Management | **Zustand** | Leichtgewichtig, einfach skalierbar |
| Formulare | **React Hook Form + Zod** | Typsicheres Formular-Handling und Validierung |
| Datentabellen | **TanStack Table v8** | Headless, flexibel für HR-Listen |
| Datum/Zeit | **date-fns** | Modular, kein Overhead |
| HTTP-Client | **TanStack Query (React Query)** | Caching, Refetching, optimistische Updates |

### Backend

| Schicht | Technologie | Begründung |
|---|---|---|
| Runtime | **Node.js 20 LTS** | Stabile LTS-Version |
| Framework | **NestJS** | Strukturiert, DI-Container, Modules |
| API-Stil | **REST + OpenAPI (Swagger)** | Klar dokumentiert, einfach integrierbar |
| Authentifizierung | **Passport.js + JWT + Refresh Tokens** | Bewährt, flexibel erweiterbar |
| ORM | **Prisma** | Typsicher, Migrationen, gute DX |
| Datei-Uploads | **Multer + MinIO (S3-kompatibel)** | Lokaler Objektspeicher, S3-Swap möglich |
| E-Mail | **Nodemailer + MJML** | Transaktions-Mails (Onboarding, Einladungen) |
| Hintergrundaufgaben | **BullMQ + Redis** | Queues für Mails, Reports, Erinnerungen |
| Validierung | **class-validator + class-transformer** | Integriert in NestJS-Pipes |

### Datenbank & Infrastruktur

| Komponente | Technologie | Begründung |
|---|---|---|
| Hauptdatenbank | **PostgreSQL 16** | ACID, JSON-Support, bewährt für HR-Daten |
| Cache / Queue | **Redis 7** | Session-Cache, BullMQ-Queues |
| Objektspeicher | **MinIO** | Dokumente, Lebensläufe, Zertifikate |
| Suche | **PostgreSQL Full-Text Search** (Phase 1), **Meilisearch** (Phase 2) | Mitarbeiter- und Kandidatensuche |
| Containerisierung | **Docker + Docker Compose** | Reproduzierbare Entwicklungsumgebung |
| CI/CD | **GitHub Actions** | Automatische Tests und Deployments |
| Hosting (Prod) | **Kubernetes (k8s) oder Railway/Render** | Skalierbar, kosteneffizient |

---

## 2. Ordnerstruktur

```
hr-app/
├── apps/
│   ├── web/                          # Next.js Frontend
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── employees/        # Mitarbeiterverwaltung
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── [id]/
│   │   │   │   │   └── new/
│   │   │   │   ├── recruiting/       # Recruiting & Bewerbermanagement
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── jobs/
│   │   │   │   │   └── candidates/
│   │   │   │   ├── onboarding/       # Onboarding
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [taskId]/
│   │   │   │   ├── absences/         # Urlaub & Abwesenheiten
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── calendar/
│   │   │   │   └── documents/        # Dokumentenverwaltung
│   │   │   │       ├── page.tsx
│   │   │   │       └── [docId]/
│   │   │   └── api/                  # Next.js API Routes (BFF)
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui Basiskomponenten
│   │   │   ├── employees/
│   │   │   ├── recruiting/
│   │   │   ├── absences/
│   │   │   └── shared/
│   │   ├── lib/
│   │   │   ├── api/                  # API-Client (React Query hooks)
│   │   │   ├── auth/
│   │   │   └── utils/
│   │   └── public/
│   │
│   └── api/                          # NestJS Backend
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── config/               # Konfiguration (env, database)
│       │   ├── auth/                 # JWT, Passport Strategies
│       │   │   ├── auth.module.ts
│       │   │   ├── auth.service.ts
│       │   │   └── strategies/
│       │   ├── employees/            # Mitarbeiterverwaltung
│       │   │   ├── employees.module.ts
│       │   │   ├── employees.controller.ts
│       │   │   ├── employees.service.ts
│       │   │   └── dto/
│       │   ├── recruiting/           # Jobs & Kandidaten
│       │   │   ├── jobs/
│       │   │   └── candidates/
│       │   ├── onboarding/           # Onboarding-Workflows
│       │   ├── absences/             # Urlaub & Abwesenheiten
│       │   ├── documents/            # Datei-Upload & Verwaltung
│       │   ├── notifications/        # E-Mail & In-App-Benachrichtigungen
│       │   ├── queues/               # BullMQ Worker
│       │   └── prisma/               # Prisma Service & Migrationen
│       │       ├── prisma.service.ts
│       │       └── schema.prisma
│       └── test/
│
├── packages/                         # Shared Packages (Monorepo)
│   ├── shared-types/                 # TypeScript-Typen & Zod-Schemas
│   ├── ui/                           # Geteilte UI-Komponenten
│   └── config/                       # ESLint, Prettier, TS-Configs
│
├── infra/                            # Infrastruktur
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.prod.yml
│   │   └── Dockerfile.*
│   └── k8s/                          # Kubernetes Manifeste
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── package.json                      # Monorepo Root (pnpm workspaces)
├── pnpm-workspace.yaml
├── turbo.json                        # Turborepo Build-Pipeline
└── ARCHITECTURE.md
```

---

## 3. Datenbank-Entitäten (Prisma Schema)

### Kern-Entitäten

```prisma
// ─── ORGANISATION ────────────────────────────────────────────────────────────

model Company {
  id          String       @id @default(cuid())
  name        String
  slug        String       @unique
  logoUrl     String?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  departments Department[]
  employees   Employee[]
  jobs        Job[]
  documents   Document[]
}

model Department {
  id          String     @id @default(cuid())
  name        String
  companyId   String
  managerId   String?

  company     Company    @relation(fields: [companyId], references: [id])
  manager     Employee?  @relation("DepartmentManager", fields: [managerId], references: [id])
  employees   Employee[]
}

// ─── MITARBEITERVERWALTUNG ────────────────────────────────────────────────────

model Employee {
  id               String          @id @default(cuid())
  employeeNumber   String          @unique
  firstName        String
  lastName         String
  email            String          @unique
  phone            String?
  dateOfBirth      DateTime?
  startDate        DateTime
  endDate          DateTime?
  status           EmployeeStatus  @default(ACTIVE)
  role             Role            @default(EMPLOYEE)
  position         String?
  companyId        String
  departmentId     String?
  managerId        String?
  avatarUrl        String?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  company          Company         @relation(fields: [companyId], references: [id])
  department       Department?     @relation(fields: [departmentId], references: [id])
  manager          Employee?       @relation("EmployeeManager", fields: [managerId], references: [id])
  reports          Employee[]      @relation("EmployeeManager")
  absences         Absence[]
  documents        Document[]
  onboardingTasks  OnboardingTask[]
  managedDepts     Department[]    @relation("DepartmentManager")
}

enum EmployeeStatus {
  ACTIVE
  ON_LEAVE
  TERMINATED
  PROBATION
}

enum Role {
  ADMIN
  HR_MANAGER
  MANAGER
  EMPLOYEE
}

// ─── RECRUITING ───────────────────────────────────────────────────────────────

model Job {
  id            String        @id @default(cuid())
  title         String
  description   String        @db.Text
  department    String?
  location      String?
  type          JobType       @default(FULL_TIME)
  status        JobStatus     @default(DRAFT)
  salaryMin     Decimal?
  salaryMax     Decimal?
  companyId     String
  publishedAt   DateTime?
  closedAt      DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  company       Company       @relation(fields: [companyId], references: [id])
  candidates    Candidate[]
}

enum JobType {
  FULL_TIME
  PART_TIME
  CONTRACT
  INTERNSHIP
  FREELANCE
}

enum JobStatus {
  DRAFT
  PUBLISHED
  CLOSED
  ARCHIVED
}

model Candidate {
  id              String           @id @default(cuid())
  firstName       String
  lastName        String
  email           String
  phone           String?
  jobId           String
  stage           ApplicationStage @default(NEW)
  source          String?          // LinkedIn, Indeed, Referral, etc.
  cvUrl           String?
  coverLetterUrl  String?
  rating          Int?             // 1–5
  notes           String?          @db.Text
  appliedAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  job             Job              @relation(fields: [jobId], references: [id])
  interviews      Interview[]
  documents       Document[]
}

enum ApplicationStage {
  NEW
  SCREENING
  INTERVIEW
  OFFER
  HIRED
  REJECTED
  WITHDRAWN
}

model Interview {
  id           String          @id @default(cuid())
  candidateId  String
  scheduledAt  DateTime
  duration     Int             // Minuten
  type         InterviewType   @default(VIDEO)
  interviewers String[]        // Employee IDs
  notes        String?         @db.Text
  rating       Int?
  status       InterviewStatus @default(SCHEDULED)
  createdAt    DateTime        @default(now())

  candidate    Candidate       @relation(fields: [candidateId], references: [id])
}

enum InterviewType {
  PHONE
  VIDEO
  IN_PERSON
  TECHNICAL
}

enum InterviewStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
  NO_SHOW
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────

model OnboardingTemplate {
  id          String               @id @default(cuid())
  name        String
  description String?
  tasks       OnboardingTaskDef[]
  createdAt   DateTime             @default(now())
}

model OnboardingTaskDef {
  id           String             @id @default(cuid())
  templateId   String
  title        String
  description  String?
  dueAfterDays Int                @default(0)  // Tage nach Startdatum
  assigneeTo   OnboardingAssignee @default(EMPLOYEE)
  order        Int                @default(0)

  template     OnboardingTemplate @relation(fields: [templateId], references: [id])
}

enum OnboardingAssignee {
  EMPLOYEE
  MANAGER
  HR
  IT
}

model OnboardingTask {
  id          String           @id @default(cuid())
  employeeId  String
  title       String
  description String?
  dueDate     DateTime?
  completedAt DateTime?
  status      OnboardingStatus @default(PENDING)
  assignee    OnboardingAssignee
  createdAt   DateTime         @default(now())

  employee    Employee         @relation(fields: [employeeId], references: [id])
}

enum OnboardingStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  SKIPPED
}

// ─── URLAUB & ABWESENHEITEN ───────────────────────────────────────────────────

model AbsenceType {
  id           String    @id @default(cuid())
  name         String    // Urlaub, Krankheit, Elternzeit, etc.
  color        String    // Kalenderfarbe (hex)
  isPaid       Boolean   @default(true)
  requiresApproval Boolean @default(true)
  maxDaysPerYear Int?
  absences     Absence[]
}

model Absence {
  id           String         @id @default(cuid())
  employeeId   String
  typeId       String
  startDate    DateTime
  endDate      DateTime
  halfDay      Boolean        @default(false)
  status       AbsenceStatus  @default(PENDING)
  note         String?
  approvedById String?
  approvedAt   DateTime?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  employee     Employee       @relation(fields: [employeeId], references: [id])
  type         AbsenceType    @relation(fields: [typeId], references: [id])
}

enum AbsenceStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

model LeaveBalance {
  id           String   @id @default(cuid())
  employeeId   String   @unique
  year         Int
  totalDays    Decimal
  usedDays     Decimal  @default(0)
  remainingDays Decimal
  updatedAt    DateTime @updatedAt
}

// ─── DOKUMENTENVERWALTUNG ─────────────────────────────────────────────────────

model Document {
  id           String           @id @default(cuid())
  name         String
  description  String?
  fileUrl      String
  fileSize     Int              // Bytes
  mimeType     String
  category     DocumentCategory
  employeeId   String?
  candidateId  String?
  companyId    String?
  uploadedById String
  isPublic     Boolean          @default(false)
  expiresAt    DateTime?
  createdAt    DateTime         @default(now())

  employee     Employee?        @relation(fields: [employeeId], references: [id])
  candidate    Candidate?       @relation(fields: [candidateId], references: [id])
  company      Company?         @relation(fields: [companyId], references: [id])
}

enum DocumentCategory {
  CONTRACT
  CERTIFICATE
  ID_DOCUMENT
  PAYSLIP
  PERFORMANCE_REVIEW
  ONBOARDING
  OTHER
}
```

---

## 4. Systemarchitektur (Überblick)

```
┌─────────────────────────────────────────────────────┐
│                    Browser / Client                  │
│              Next.js 14 (App Router + SSR)           │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────┐
│              NestJS REST API (Port 3001)             │
│  ┌──────────┐ ┌───────────┐ ┌──────────────────┐   │
│  │   Auth   │ │ Business  │ │  File Upload     │   │
│  │  Module  │ │  Modules  │ │  (Multer+MinIO)  │   │
│  └──────────┘ └───────────┘ └──────────────────┘   │
│                     │                               │
│  ┌──────────────────▼──────────────────────────┐   │
│  │              Prisma ORM                      │   │
│  └──────────────────┬──────────────────────────┘   │
└─────────────────────┼───────────────────────────────┘
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│PostgreSQL│   │  Redis   │   │  MinIO   │
│  (Daten) │   │(Cache/Q) │   │  (Docs)  │
└──────────┘   └──────────┘   └──────────┘
```

---

## 5. Wichtige Architekturentscheidungen

| Entscheidung | Gewählt | Begründung |
|---|---|---|
| Monorepo | **Turborepo + pnpm workspaces** | Code-Sharing, einheitliche Builds |
| API-Design | **REST** (nicht GraphQL) | Einfacher einstieg, OpenAPI-Doku |
| Auth-Strategie | **JWT + Refresh Token Rotation** | Sicher, zustandslos |
| Mandantenfähigkeit | **Company-ID auf jeder Entität** | Einfache Multi-Tenancy |
| RBAC | **Role-based (Admin/HR/Manager/Employee)** | Ausreichend für Phase 1 |
| Datei-Storage | **MinIO (S3-API)** | Lokal und Cloud-kompatibel |

---

*Erstellt vom Architect — bereit zur Übergabe an das hr-webapp Team.*
