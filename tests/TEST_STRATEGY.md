# Teststrategie HR-Webapp

**Projekt:** HR-Webapp (Personio-ähnlich)
**Team:** hr-webapp
**Stand:** Mai 2026
**Verantwortlich:** QA-Engineer

---

## 1. Zielsetzung

Diese Teststrategie definiert den Ansatz zur Qualitätssicherung der HR-Webapp. Ziel ist es,
kritische Geschäftsprozesse wie Mitarbeiterverwaltung, Recruiting und Abwesenheitsmanagement
zuverlässig und fehlerfrei bereitzustellen.

---

## 2. Testpyramide

```
        /‾‾‾‾‾‾‾‾‾‾‾‾‾\
       /   E2E-Tests    \        ~10%
      /  (Playwright)    \       Langsam, teuer, fragil
     /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
    /  Integrationstests   \     ~20%
   /  (Jest + Supertest)    \    Mittel schnell, API-Ebene
  /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
 /        Unit-Tests          \  ~70%
/ (Vitest / Jest + Supertest)  \ Schnell, isoliert, günstig
‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
```

### 2.1 Unit-Tests (70 %)

- **Ziel:** Einzelne Funktionen, Komponenten und Services isoliert testen
- **Frontend:** React-Komponenten, Custom Hooks, Utility-Funktionen
- **Backend:** Service-Layer, Validierungslogik, Helper-Funktionen
- **Laufzeit:** < 5 Sekunden für die gesamte Suite

### 2.2 Integrationstests (20 %)

- **Ziel:** Zusammenspiel von Modulen und API-Endpoints sicherstellen
- **Backend:** HTTP-Endpoints mit echter (Test-)Datenbank
- **Frontend:** Komponenten-Interaktion mit gemockten API-Calls
- **Laufzeit:** < 30 Sekunden für die gesamte Suite

### 2.3 End-to-End-Tests (10 %)

- **Ziel:** Vollständige Nutzerflows im echten Browser durchspielen
- **Scope:** Kritische Happy Paths und wichtigste Fehlerfälle
- **Laufzeit:** < 5 Minuten für die gesamte Suite

---

## 3. Kritische Module & Priorisierung

### Priorität 1 — KRITISCH (Vollständige Testabdeckung erforderlich)

| Modul | Begründung | Mindest-Coverage |
|---|---|---|
| **Recruiting** | Bewerberdaten, Datenschutz (DSGVO), komplexer Workflow | 90 % |
| **Abwesenheitsmanagement** | Lohnrelevant, gesetzliche Anforderungen | 90 % |
| **Mitarbeiterverwaltung** | Kerndaten, Basis aller anderen Module | 85 % |
| **Authentifizierung & Autorisierung** | Sicherheit, Rollensystem | 95 % |

### Priorität 2 — WICHTIG (Hohe Testabdeckung)

| Modul | Begründung | Mindest-Coverage |
|---|---|---|
| **Lohnabrechnung** | Finanzdaten, Compliance | 80 % |
| **Berichte & Exports** | Datenintegrität, Formate | 75 % |
| **Dokumentenverwaltung** | Dateihandling, Zugriffsrechte | 75 % |

### Priorität 3 — STANDARD (Normale Testabdeckung)

| Modul | Begründung | Mindest-Coverage |
|---|---|---|
| **Dashboard** | Aggregation, keine eigene Logik | 60 % |
| **Benachrichtigungen** | Komfort-Feature | 60 % |
| **Einstellungen** | Selten geändert | 60 % |

---

## 4. Testtools & Konfiguration

### 4.1 Frontend — Vitest

```bash
npm install -D vitest @testing-library/react @testing-library/user-event
npm install -D @testing-library/jest-dom jsdom
```

**Konfiguration** (`vitest.config.ts`):
```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: { lines: 80, functions: 80, branches: 75 }
    }
  }
})
```

**Einsatzbereich:**
- React-Komponenten (render, user interactions)
- Custom Hooks (via renderHook)
- Zustand-Management (Zustand/Redux Slices)
- Utility-Funktionen und Formatter

### 4.2 Backend — Jest + Supertest

```bash
npm install -D jest @types/jest ts-jest supertest @types/supertest
```

**Konfiguration** (`jest.config.ts`):
```typescript
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageThreshold: {
    global: { lines: 80, functions: 80, branches: 75 }
  }
}
```

**Einsatzbereich:**
- API-Endpoint-Tests (HTTP-Level via Supertest)
- Service-Layer-Tests
- Middleware-Tests (Auth, Validierung)
- Datenbankabfragen (mit Test-DB oder gemockt via jest.mock)

### 4.3 E2E — Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

**Konfiguration** (`playwright.config.ts`):
```typescript
export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } }
  ]
})
```

**Einsatzbereich:**
- Login / Logout Flow
- Mitarbeiter anlegen (vollständiger Workflow)
- Abwesenheit beantragen und genehmigen
- Bewerbungsprozess (Recruiting-Funnel)
- PDF-Export von Berichten

---

## 5. Testdaten-Strategie

### Test-Fixtures
- Zentrale Testdaten in `tests/fixtures/` als TypeScript-Konstanten
- Realistische aber anonymisierte Beispieldaten
- Separate Datensätze für Happy Path, Edge Cases und Error Cases

### Datenbankstrategie (Backend)
- **Unit-Tests:** Vollständige Mocks (`jest.mock`)
- **Integrationstests:** Dedizierte SQLite-Testdatenbank, wird vor jedem Test-Run zurückgesetzt
- **E2E-Tests:** Separates Staging-Environment mit bekanntem Seed-Zustand

### Mocking-Regeln
- Externe Services (E-Mail, PDF-Generator) immer mocken
- Drittanbieter-APIs (DATEV, Slack) immer mocken
- Interne APIs in E2E-Tests **nicht** mocken (echter Stack)

---

## 6. Definition of Done (DoD) pro Test-Level

### DoD — Unit-Test

Ein Unit-Test gilt als abgeschlossen, wenn:

- [ ] Der Testname beschreibt das erwartete Verhalten auf Deutsch in vollständigen Sätzen
- [ ] Alle Zweige der getesteten Funktion/Komponente sind abgedeckt (Branch Coverage)
- [ ] Happy Path und mindestens ein Fehlerfall sind getestet
- [ ] Keine echten HTTP-Aufrufe, Datenbankzugriffe oder Dateisystem-Operationen (alles gemockt)
- [ ] Test ist unabhängig von Ausführungsreihenfolge (kein Shared State)
- [ ] Laufzeit des Tests < 200 ms
- [ ] Kein `console.log` oder auskommentierter Code im Test
- [ ] Test ist im CI erfolgreich (kein "only"/"skip" ohne Ticket-Referenz)

### DoD — Integrationstest

Ein Integrationstest gilt als abgeschlossen, wenn:

- [ ] Alle Unit-Test-Kriterien erfüllt
- [ ] HTTP-Statuscodes werden explizit geprüft
- [ ] Response-Body wird gegen ein definiertes Schema validiert
- [ ] Fehlerszenarien (400, 401, 403, 404, 422, 500) sind abgedeckt
- [ ] Authentifizierung/Autorisierung ist Bestandteil des Tests (nicht umgangen)
- [ ] Datenbankzustand nach dem Test ist sauber (Teardown / Rollback)
- [ ] Laufzeit des Tests < 2 Sekunden

### DoD — E2E-Test

Ein E2E-Test gilt als abgeschlossen, wenn:

- [ ] Alle Integrations-Test-Kriterien erfüllt
- [ ] Test läuft stabil in mindestens 2 Browsern (Chromium + Firefox)
- [ ] Bei Fehlschlag wird ein Screenshot und ggf. Video gespeichert
- [ ] Selektoren nutzen `data-testid`-Attribute (keine CSS-Klassen oder XPath)
- [ ] Test nutzt das Page-Object-Pattern für Wiederverwendbarkeit
- [ ] Laufzeit des Tests < 60 Sekunden
- [ ] Test ist in der CI/CD-Pipeline als separater Stage eingebunden

---

## 7. CI/CD-Integration

```
┌─────────────┐    ┌─────────────────────┐    ┌──────────────────┐
│  git push   │───▶│  Unit + Integration  │───▶│   E2E auf        │
│             │    │  (bei jedem Push)    │    │   main/develop   │
└─────────────┘    └─────────────────────┘    └──────────────────┘
                           │                           │
                    Coverage-Report             Playwright-Report
                    (Codecov/SonarQube)         (HTML-Artefakt)
```

- **Bei jedem Push:** Unit-Tests + Integrationstests laufen durch
- **Bei PR/MR:** Coverage-Delta wird geprüft (darf nicht sinken)
- **Nightly:** Vollständige E2E-Suite auf Staging
- **Coverage-Schwelle unterschritten:** Build schlägt fehl

---

## 8. Testreporting

| Metrik | Ziel | Tool |
|---|---|---|
| Gesamt-Coverage | > 80 % Lines | Codecov |
| Kritische Module | > 90 % Lines | Codecov |
| Fehlgeschlagene Tests | 0 in main | CI-Dashboard |
| Flaky-Test-Rate | < 2 % | Playwright-Report |
| Durchschnittliche E2E-Laufzeit | < 5 min | Playwright |
