/**
 * Integrationstests: Employee-API Endpoints
 *
 * Testet alle CRUD-Operationen der Mitarbeiter-Schnittstelle
 * via HTTP (Jest + Supertest).
 *
 * Voraussetzung: Test-Datenbankverbindung wird in beforeAll aufgebaut
 * und nach allen Tests bereinigt.
 */

import request from 'supertest';
import { app } from '../../src/app';
import { db } from '../../src/database';
import { EmployeeStatus, Department } from '../../src/types/employee';

// ---------------------------------------------------------------------------
// Typen & Fixtures
// ---------------------------------------------------------------------------

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  department: Department;
  position: string;
  startDate: string;
  status: EmployeeStatus;
  salary?: number;
}

const GUELTIGE_MITARBEITER_DATEN = {
  firstName: 'Anna',
  lastName: 'Müller',
  email: 'anna.mueller@beispiel.de',
  department: Department.Engineering,
  position: 'Senior Entwicklerin',
  startDate: '2024-01-15',
  status: EmployeeStatus.Active,
  salary: 72000,
};

const ADMIN_TOKEN = 'Bearer test-admin-jwt-token';
const HR_TOKEN = 'Bearer test-hr-jwt-token';
const MITARBEITER_TOKEN = 'Bearer test-employee-jwt-token';

// ---------------------------------------------------------------------------
// Setup & Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await db.migrate.latest();
  await db.seed.run({ specific: 'test_employees.ts' });
});

afterAll(async () => {
  await db.migrate.rollback();
  await db.destroy();
});

beforeEach(async () => {
  await db('employees').del();
  await db.seed.run({ specific: 'test_employees.ts' });
});

// ---------------------------------------------------------------------------
// GET /employees — Mitarbeiterliste abrufen
// ---------------------------------------------------------------------------

describe('GET /employees — Mitarbeiterliste abrufen', () => {
  it('gibt alle Mitarbeiter für HR-Benutzer zurück', async () => {
    const antwort = await request(app)
      .get('/api/employees')
      .set('Authorization', HR_TOKEN);

    expect(antwort.status).toBe(200);
    expect(antwort.body).toHaveProperty('data');
    expect(Array.isArray(antwort.body.data)).toBe(true);
    expect(antwort.body.data.length).toBeGreaterThan(0);
  });

  it('gibt die korrekte Mitarbeiterstruktur mit allen Pflichtfeldern zurück', async () => {
    const antwort = await request(app)
      .get('/api/employees')
      .set('Authorization', HR_TOKEN);

    const ersterMitarbeiter: Employee = antwort.body.data[0];
    expect(ersterMitarbeiter).toHaveProperty('id');
    expect(ersterMitarbeiter).toHaveProperty('firstName');
    expect(ersterMitarbeiter).toHaveProperty('lastName');
    expect(ersterMitarbeiter).toHaveProperty('email');
    expect(ersterMitarbeiter).toHaveProperty('department');
    expect(ersterMitarbeiter).toHaveProperty('status');
    expect(ersterMitarbeiter).not.toHaveProperty('salary'); // Gehalt nicht öffentlich
  });

  it('enthält Paginierungsinformationen im Response', async () => {
    const antwort = await request(app)
      .get('/api/employees?page=1&limit=10')
      .set('Authorization', HR_TOKEN);

    expect(antwort.status).toBe(200);
    expect(antwort.body).toHaveProperty('meta');
    expect(antwort.body.meta).toMatchObject({
      page: 1,
      limit: 10,
      total: expect.any(Number),
      totalPages: expect.any(Number),
    });
  });

  it('filtert Mitarbeiter korrekt nach Abteilung', async () => {
    const antwort = await request(app)
      .get('/api/employees?department=Engineering')
      .set('Authorization', HR_TOKEN);

    expect(antwort.status).toBe(200);
    antwort.body.data.forEach((mitarbeiter: Employee) => {
      expect(mitarbeiter.department).toBe(Department.Engineering);
    });
  });

  it('gibt nur aktive Mitarbeiter zurück wenn status=active gesetzt ist', async () => {
    const antwort = await request(app)
      .get('/api/employees?status=active')
      .set('Authorization', HR_TOKEN);

    expect(antwort.status).toBe(200);
    antwort.body.data.forEach((mitarbeiter: Employee) => {
      expect(mitarbeiter.status).toBe(EmployeeStatus.Active);
    });
  });

  it('verweigert den Zugriff ohne Authentifizierungstoken', async () => {
    const antwort = await request(app).get('/api/employees');

    expect(antwort.status).toBe(401);
    expect(antwort.body).toHaveProperty('error');
    expect(antwort.body.error).toMatch(/nicht autorisiert|unauthorized/i);
  });

  it('gibt leere Liste zurück wenn keine Mitarbeiter vorhanden sind', async () => {
    await db('employees').del();

    const antwort = await request(app)
      .get('/api/employees')
      .set('Authorization', HR_TOKEN);

    expect(antwort.status).toBe(200);
    expect(antwort.body.data).toEqual([]);
    expect(antwort.body.meta.total).toBe(0);
  });

  it('sortiert Mitarbeiter standardmäßig nach Nachname aufsteigend', async () => {
    const antwort = await request(app)
      .get('/api/employees')
      .set('Authorization', HR_TOKEN);

    const nachnamen: string[] = antwort.body.data.map((m: Employee) => m.lastName);
    const sortiertNachnamen = [...nachnamen].sort();
    expect(nachnamen).toEqual(sortiertNachnamen);
  });
});

// ---------------------------------------------------------------------------
// POST /employees — Neuen Mitarbeiter anlegen
// ---------------------------------------------------------------------------

describe('POST /employees — Neuen Mitarbeiter anlegen', () => {
  it('legt einen neuen Mitarbeiter mit gültigen Daten erfolgreich an', async () => {
    const antwort = await request(app)
      .post('/api/employees')
      .set('Authorization', HR_TOKEN)
      .send(GUELTIGE_MITARBEITER_DATEN);

    expect(antwort.status).toBe(201);
    expect(antwort.body).toHaveProperty('data');
    expect(antwort.body.data).toMatchObject({
      firstName: GUELTIGE_MITARBEITER_DATEN.firstName,
      lastName: GUELTIGE_MITARBEITER_DATEN.lastName,
      email: GUELTIGE_MITARBEITER_DATEN.email,
      department: GUELTIGE_MITARBEITER_DATEN.department,
    });
    expect(antwort.body.data.id).toBeDefined();
  });

  it('gibt die ID des neu angelegten Mitarbeiters im Response zurück', async () => {
    const antwort = await request(app)
      .post('/api/employees')
      .set('Authorization', HR_TOKEN)
      .send(GUELTIGE_MITARBEITER_DATEN);

    expect(antwort.status).toBe(201);
    expect(typeof antwort.body.data.id).toBe('number');
    expect(antwort.body.data.id).toBeGreaterThan(0);
  });

  it('setzt den Status eines neuen Mitarbeiters automatisch auf "aktiv"', async () => {
    const datenOhneStatus = { ...GUELTIGE_MITARBEITER_DATEN };
    delete (datenOhneStatus as Partial<typeof GUELTIGE_MITARBEITER_DATEN>).status;

    const antwort = await request(app)
      .post('/api/employees')
      .set('Authorization', HR_TOKEN)
      .send(datenOhneStatus);

    expect(antwort.status).toBe(201);
    expect(antwort.body.data.status).toBe(EmployeeStatus.Active);
  });

  it('gibt Validierungsfehler zurück wenn Pflichtfelder fehlen', async () => {
    const unvollstaendige_daten = {
      firstName: 'Max',
      // lastName fehlt
      // email fehlt
      department: Department.Engineering,
    };

    const antwort = await request(app)
      .post('/api/employees')
      .set('Authorization', HR_TOKEN)
      .send(unvollstaendige_daten);

    expect(antwort.status).toBe(422);
    expect(antwort.body).toHaveProperty('errors');
    expect(antwort.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'lastName' }),
        expect.objectContaining({ field: 'email' }),
      ])
    );
  });

  it('verhindert das Anlegen eines Mitarbeiters mit bereits vorhandener E-Mail-Adresse', async () => {
    // Ersten Mitarbeiter anlegen
    await request(app)
      .post('/api/employees')
      .set('Authorization', HR_TOKEN)
      .send(GUELTIGE_MITARBEITER_DATEN);

    // Zweiten Mitarbeiter mit gleicher E-Mail versuchen
    const antwort = await request(app)
      .post('/api/employees')
      .set('Authorization', HR_TOKEN)
      .send({ ...GUELTIGE_MITARBEITER_DATEN, firstName: 'Andere' });

    expect(antwort.status).toBe(409);
    expect(antwort.body.error).toMatch(/e-mail.*bereits.*vergeben|duplicate/i);
  });

  it('validiert das Format der E-Mail-Adresse', async () => {
    const antwort = await request(app)
      .post('/api/employees')
      .set('Authorization', HR_TOKEN)
      .send({ ...GUELTIGE_MITARBEITER_DATEN, email: 'keine-gueltige-email' });

    expect(antwort.status).toBe(422);
    expect(antwort.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
      ])
    );
  });

  it('verweigert das Anlegen eines Mitarbeiters durch einfache Mitarbeiter (fehlende Berechtigung)', async () => {
    const antwort = await request(app)
      .post('/api/employees')
      .set('Authorization', MITARBEITER_TOKEN)
      .send(GUELTIGE_MITARBEITER_DATEN);

    expect(antwort.status).toBe(403);
    expect(antwort.body.error).toMatch(/keine berechtigung|forbidden/i);
  });

  it('speichert das Einstellungsdatum korrekt in der Datenbank', async () => {
    const antwort = await request(app)
      .post('/api/employees')
      .set('Authorization', HR_TOKEN)
      .send(GUELTIGE_MITARBEITER_DATEN);

    expect(antwort.status).toBe(201);
    expect(antwort.body.data.startDate).toBe(GUELTIGE_MITARBEITER_DATEN.startDate);
  });
});

// ---------------------------------------------------------------------------
// GET /employees/:id — Einzelnen Mitarbeiter abrufen
// ---------------------------------------------------------------------------

describe('GET /employees/:id — Einzelnen Mitarbeiter abrufen', () => {
  let angelegterMitarbeiterId: number;

  beforeEach(async () => {
    const antwort = await request(app)
      .post('/api/employees')
      .set('Authorization', HR_TOKEN)
      .send(GUELTIGE_MITARBEITER_DATEN);
    angelegterMitarbeiterId = antwort.body.data.id;
  });

  it('gibt die vollständigen Daten eines vorhandenen Mitarbeiters zurück', async () => {
    const antwort = await request(app)
      .get(`/api/employees/${angelegterMitarbeiterId}`)
      .set('Authorization', HR_TOKEN);

    expect(antwort.status).toBe(200);
    expect(antwort.body.data).toMatchObject({
      id: angelegterMitarbeiterId,
      firstName: GUELTIGE_MITARBEITER_DATEN.firstName,
      lastName: GUELTIGE_MITARBEITER_DATEN.lastName,
      email: GUELTIGE_MITARBEITER_DATEN.email,
    });
  });

  it('gibt Gehaltsdaten nur für HR-Benutzer und Admins zurück', async () => {
    const hrAntwort = await request(app)
      .get(`/api/employees/${angelegterMitarbeiterId}`)
      .set('Authorization', HR_TOKEN);

    const mitarbeiterAntwort = await request(app)
      .get(`/api/employees/${angelegterMitarbeiterId}`)
      .set('Authorization', MITARBEITER_TOKEN);

    expect(hrAntwort.body.data).toHaveProperty('salary');
    expect(mitarbeiterAntwort.body.data).not.toHaveProperty('salary');
  });

  it('gibt 404 zurück wenn der Mitarbeiter nicht existiert', async () => {
    const nichtVorhandeneId = 999999;

    const antwort = await request(app)
      .get(`/api/employees/${nichtVorhandeneId}`)
      .set('Authorization', HR_TOKEN);

    expect(antwort.status).toBe(404);
    expect(antwort.body.error).toMatch(/nicht gefunden|not found/i);
  });

  it('gibt 400 zurück wenn die ID kein gültiger Zahlentyp ist', async () => {
    const antwort = await request(app)
      .get('/api/employees/keine-zahl')
      .set('Authorization', HR_TOKEN);

    expect(antwort.status).toBe(400);
    expect(antwort.body.error).toMatch(/ungültige id|invalid id/i);
  });

  it('erlaubt Mitarbeitern den Abruf der eigenen Daten', async () => {
    // Simuliert: eingeloggter Mitarbeiter hat die ID angelegterMitarbeiterId
    const antwort = await request(app)
      .get(`/api/employees/${angelegterMitarbeiterId}`)
      .set('Authorization', MITARBEITER_TOKEN)
      .set('X-User-Id', String(angelegterMitarbeiterId));

    expect(antwort.status).toBe(200);
  });

  it('verweigert Mitarbeitern den Abruf von Daten anderer Mitarbeiter', async () => {
    const andererMitarbeiterId = angelegterMitarbeiterId + 1;

    const antwort = await request(app)
      .get(`/api/employees/${andererMitarbeiterId}`)
      .set('Authorization', MITARBEITER_TOKEN)
      .set('X-User-Id', String(angelegterMitarbeiterId)); // Anderer User

    expect(antwort.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// PUT /employees/:id — Mitarbeiter aktualisieren
// ---------------------------------------------------------------------------

describe('PUT /employees/:id — Mitarbeiter aktualisieren', () => {
  let vorhandenerMitarbeiterId: number;

  beforeEach(async () => {
    const antwort = await request(app)
      .post('/api/employees')
      .set('Authorization', HR_TOKEN)
      .send(GUELTIGE_MITARBEITER_DATEN);
    vorhandenerMitarbeiterId = antwort.body.data.id;
  });

  it('aktualisiert die Stammdaten eines Mitarbeiters erfolgreich', async () => {
    const aktualisierungsData = {
      position: 'Lead Entwicklerin',
      department: Department.ProductManagement,
    };

    const antwort = await request(app)
      .put(`/api/employees/${vorhandenerMitarbeiterId}`)
      .set('Authorization', HR_TOKEN)
      .send(aktualisierungsData);

    expect(antwort.status).toBe(200);
    expect(antwort.body.data).toMatchObject({
      id: vorhandenerMitarbeiterId,
      position: aktualisierungsData.position,
      department: aktualisierungsData.department,
    });
  });

  it('behält nicht übermittelte Felder beim partiellen Update unverändert', async () => {
    const antwort = await request(app)
      .put(`/api/employees/${vorhandenerMitarbeiterId}`)
      .set('Authorization', HR_TOKEN)
      .send({ position: 'Neue Position' });

    expect(antwort.status).toBe(200);
    // Ursprüngliche Werte bleiben erhalten
    expect(antwort.body.data.firstName).toBe(GUELTIGE_MITARBEITER_DATEN.firstName);
    expect(antwort.body.data.email).toBe(GUELTIGE_MITARBEITER_DATEN.email);
  });

  it('verhindert das Ändern der E-Mail auf eine bereits vergebene Adresse', async () => {
    // Zweiten Mitarbeiter anlegen
    await request(app)
      .post('/api/employees')
      .set('Authorization', HR_TOKEN)
      .send({ ...GUELTIGE_MITARBEITER_DATEN, email: 'zweiter@beispiel.de', firstName: 'Zweiter' });

    // Erste Mitarbeiterin versucht E-Mail des Zweiten anzunehmen
    const antwort = await request(app)
      .put(`/api/employees/${vorhandenerMitarbeiterId}`)
      .set('Authorization', HR_TOKEN)
      .send({ email: 'zweiter@beispiel.de' });

    expect(antwort.status).toBe(409);
  });

  it('gibt 404 zurück beim Aktualisieren eines nicht existierenden Mitarbeiters', async () => {
    const antwort = await request(app)
      .put('/api/employees/999999')
      .set('Authorization', HR_TOKEN)
      .send({ position: 'Neue Position' });

    expect(antwort.status).toBe(404);
  });

  it('gibt 422 zurück wenn aktualisierte Daten das Validierungsschema verletzen', async () => {
    const antwort = await request(app)
      .put(`/api/employees/${vorhandenerMitarbeiterId}`)
      .set('Authorization', HR_TOKEN)
      .send({ salary: -1000 }); // Negatives Gehalt ist ungültig

    expect(antwort.status).toBe(422);
    expect(antwort.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'salary' }),
      ])
    );
  });

  it('protokolliert Gehaltsänderungen im Audit-Log', async () => {
    await request(app)
      .put(`/api/employees/${vorhandenerMitarbeiterId}`)
      .set('Authorization', HR_TOKEN)
      .send({ salary: 80000 });

    const auditAntwort = await request(app)
      .get(`/api/employees/${vorhandenerMitarbeiterId}/audit-log`)
      .set('Authorization', ADMIN_TOKEN);

    expect(auditAntwort.status).toBe(200);
    expect(auditAntwort.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'salary',
          action: 'UPDATE',
        }),
      ])
    );
  });

  it('verweigert einfachen Mitarbeitern das Aktualisieren fremder Profile', async () => {
    const antwort = await request(app)
      .put(`/api/employees/${vorhandenerMitarbeiterId}`)
      .set('Authorization', MITARBEITER_TOKEN)
      .set('X-User-Id', String(vorhandenerMitarbeiterId + 99))
      .send({ position: 'Selbst ernannt' });

    expect(antwort.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// DELETE /employees/:id — Mitarbeiter löschen (Soft-Delete)
// ---------------------------------------------------------------------------

describe('DELETE /employees/:id — Mitarbeiter löschen', () => {
  let zuLoeschenderMitarbeiterId: number;

  beforeEach(async () => {
    const antwort = await request(app)
      .post('/api/employees')
      .set('Authorization', HR_TOKEN)
      .send(GUELTIGE_MITARBEITER_DATEN);
    zuLoeschenderMitarbeiterId = antwort.body.data.id;
  });

  it('deaktiviert einen Mitarbeiter erfolgreich (Soft-Delete)', async () => {
    const antwort = await request(app)
      .delete(`/api/employees/${zuLoeschenderMitarbeiterId}`)
      .set('Authorization', ADMIN_TOKEN);

    expect(antwort.status).toBe(200);
    expect(antwort.body.message).toMatch(/erfolgreich deaktiviert|successfully deactivated/i);
  });

  it('ist nach dem Löschen nicht mehr in der aktiven Mitarbeiterliste sichtbar', async () => {
    await request(app)
      .delete(`/api/employees/${zuLoeschenderMitarbeiterId}`)
      .set('Authorization', ADMIN_TOKEN);

    const listAntwort = await request(app)
      .get('/api/employees?status=active')
      .set('Authorization', HR_TOKEN);

    const ids = listAntwort.body.data.map((m: Employee) => m.id);
    expect(ids).not.toContain(zuLoeschenderMitarbeiterId);
  });

  it('bleibt nach dem Löschen in archivierten Abfragen sichtbar (Datenpersistenz)', async () => {
    await request(app)
      .delete(`/api/employees/${zuLoeschenderMitarbeiterId}`)
      .set('Authorization', ADMIN_TOKEN);

    const archivAntwort = await request(app)
      .get(`/api/employees/${zuLoeschenderMitarbeiterId}?includeInactive=true`)
      .set('Authorization', ADMIN_TOKEN);

    expect(archivAntwort.status).toBe(200);
    expect(archivAntwort.body.data.status).toBe(EmployeeStatus.Inactive);
  });

  it('gibt 404 zurück beim Versuch einen nicht existierenden Mitarbeiter zu löschen', async () => {
    const antwort = await request(app)
      .delete('/api/employees/999999')
      .set('Authorization', ADMIN_TOKEN);

    expect(antwort.status).toBe(404);
  });

  it('verhindert das Löschen von Mitarbeitern mit offenen Abwesenheitsanträgen', async () => {
    // Offenen Abwesenheitsantrag simulieren
    await db('absences').insert({
      employeeId: zuLoeschenderMitarbeiterId,
      status: 'pending',
      startDate: '2026-06-01',
      endDate: '2026-06-05',
    });

    const antwort = await request(app)
      .delete(`/api/employees/${zuLoeschenderMitarbeiterId}`)
      .set('Authorization', ADMIN_TOKEN);

    expect(antwort.status).toBe(409);
    expect(antwort.body.error).toMatch(/offene anträge|pending requests/i);
  });

  it('verweigert HR-Benutzern das Löschen (nur Admins dürfen löschen)', async () => {
    const antwort = await request(app)
      .delete(`/api/employees/${zuLoeschenderMitarbeiterId}`)
      .set('Authorization', HR_TOKEN);

    expect(antwort.status).toBe(403);
  });

  it('verweigert das Löschen ohne Authentifizierungstoken', async () => {
    const antwort = await request(app)
      .delete(`/api/employees/${zuLoeschenderMitarbeiterId}`);

    expect(antwort.status).toBe(401);
  });
});
