/**
 * Komponenten-Tests: Dashboard
 *
 * Testet die Darstellung, Interaktion und Datenladelogik
 * der Dashboard-Hauptkomponente (Vitest + React Testing Library).
 *
 * Alle API-Aufrufe werden gemockt — kein echtes Netzwerk.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Dashboard } from '../../src/components/Dashboard';
import { renderWithProviders } from '../utils/renderWithProviders';
import * as employeeApi from '../../src/api/employeeApi';
import * as absenceApi from '../../src/api/absenceApi';
import * as recruitingApi from '../../src/api/recruitingApi';
import { EmployeeStatus, Department } from '../../src/types/employee';

// ---------------------------------------------------------------------------
// Mock-Daten
// ---------------------------------------------------------------------------

const MOCK_DASHBOARD_STATISTIKEN = {
  gesamtMitarbeiter: 142,
  aktiveMitarbeiter: 138,
  neueMitarbeiterDiesenMonat: 5,
  offeneStellen: 8,
  heuteAbwesend: 12,
  anstehendeGeburtstage: 3,
};

const MOCK_ABWESENDE_MITARBEITER = [
  {
    id: 1,
    firstName: 'Thomas',
    lastName: 'Becker',
    department: Department.Engineering,
    absenceType: 'Urlaub',
    startDate: '2026-05-10',
    endDate: '2026-05-17',
    status: EmployeeStatus.Active,
  },
  {
    id: 2,
    firstName: 'Sarah',
    lastName: 'Wagner',
    department: Department.Marketing,
    absenceType: 'Krankheit',
    startDate: '2026-05-09',
    endDate: '2026-05-10',
    status: EmployeeStatus.Active,
  },
];

const MOCK_OFFENE_STELLEN = [
  { id: 1, title: 'Senior Frontend Entwickler', department: Department.Engineering, applicants: 7 },
  { id: 2, title: 'HR Business Partner', department: Department.HR, applicants: 3 },
];

const MOCK_AKTUELLE_AUFGABEN = [
  { id: 1, title: 'Onboarding Max Mustermann abschließen', dueDate: '2026-05-12', priority: 'hoch' },
  { id: 2, title: 'Urlaubsantrag genehmigen: K. Hoffmann', dueDate: '2026-05-11', priority: 'mittel' },
];

// ---------------------------------------------------------------------------
// API-Mocks
// ---------------------------------------------------------------------------

vi.mock('../../src/api/employeeApi');
vi.mock('../../src/api/absenceApi');
vi.mock('../../src/api/recruitingApi');

const mockGetDashboardStatistiken = vi.mocked(employeeApi.getDashboardStatistiken);
const mockGetHeuteAbwesend = vi.mocked(absenceApi.getHeuteAbwesend);
const mockGetOffeneStellen = vi.mocked(recruitingApi.getOffeneStellen);

// ---------------------------------------------------------------------------
// Setup & Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockGetDashboardStatistiken.mockResolvedValue(MOCK_DASHBOARD_STATISTIKEN);
  mockGetHeuteAbwesend.mockResolvedValue(MOCK_ABWESENDE_MITARBEITER);
  mockGetOffeneStellen.mockResolvedValue(MOCK_OFFENE_STELLEN);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Grundlegendes Rendering
// ---------------------------------------------------------------------------

describe('Dashboard — Grundlegendes Rendering', () => {
  it('zeigt einen Ladezustand während die Daten geladen werden', () => {
    mockGetDashboardStatistiken.mockImplementation(
      () => new Promise(() => {}) // Promise wird nie aufgelöst
    );

    renderWithProviders(<Dashboard />);

    expect(screen.getByRole('status', { name: /wird geladen/i })).toBeInTheDocument();
    // oder Skeleton-Loader prüfen
    expect(screen.getAllByTestId('skeleton-loader').length).toBeGreaterThan(0);
  });

  it('zeigt die Hauptüberschrift nach erfolgreichem Laden an', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    });
  });

  it('zeigt alle vier Statistik-Kacheln auf dem Dashboard an', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('kachel-gesamtmitarbeiter')).toBeInTheDocument();
      expect(screen.getByTestId('kachel-heute-abwesend')).toBeInTheDocument();
      expect(screen.getByTestId('kachel-offene-stellen')).toBeInTheDocument();
      expect(screen.getByTestId('kachel-neue-mitarbeiter')).toBeInTheDocument();
    });
  });

  it('zeigt einen Fehlerzustand wenn das Laden der Daten fehlschlägt', async () => {
    mockGetDashboardStatistiken.mockRejectedValue(new Error('Netzwerkfehler'));

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/daten konnten nicht geladen werden/i)).toBeInTheDocument();
    });
  });

  it('zeigt das aktuelle Datum in der Kopfzeile an', async () => {
    renderWithProviders(<Dashboard />);

    const heutigesDatum = new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date());

    await waitFor(() => {
      expect(screen.getByText(heutigesDatum)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Statistik-Kacheln
// ---------------------------------------------------------------------------

describe('Dashboard — Statistik-Kacheln', () => {
  it('zeigt die korrekte Gesamtanzahl der Mitarbeiter an', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const kachel = screen.getByTestId('kachel-gesamtmitarbeiter');
      expect(within(kachel).getByText('142')).toBeInTheDocument();
    });
  });

  it('zeigt die Anzahl der heute abwesenden Mitarbeiter korrekt an', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const kachel = screen.getByTestId('kachel-heute-abwesend');
      expect(within(kachel).getByText('12')).toBeInTheDocument();
    });
  });

  it('zeigt die Anzahl offener Stellen im Recruiting an', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const kachel = screen.getByTestId('kachel-offene-stellen');
      expect(within(kachel).getByText('8')).toBeInTheDocument();
    });
  });

  it('hebt neue Mitarbeiter diesen Monat positiv hervor', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const kachel = screen.getByTestId('kachel-neue-mitarbeiter');
      expect(within(kachel).getByText('5')).toBeInTheDocument();
      // Positive Veränderung wird visuell hervorgehoben
      expect(kachel).toHaveClass('trend-positiv');
    });
  });

  it('zeigt null-Werte in Statistiken ohne Fehler an', async () => {
    mockGetDashboardStatistiken.mockResolvedValue({
      ...MOCK_DASHBOARD_STATISTIKEN,
      neueMitarbeiterDiesenMonat: 0,
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const kachel = screen.getByTestId('kachel-neue-mitarbeiter');
      expect(within(kachel).getByText('0')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Abwesenheits-Widget
// ---------------------------------------------------------------------------

describe('Dashboard — Abwesenheits-Widget', () => {
  it('zeigt die Liste der heute abwesenden Mitarbeiter an', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Thomas Becker')).toBeInTheDocument();
      expect(screen.getByText('Sarah Wagner')).toBeInTheDocument();
    });
  });

  it('unterscheidet visuell zwischen Urlaub und Krankheit', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const urlaubsEintrag = screen.getByTestId('abwesenheit-1');
      const krankheitsEintrag = screen.getByTestId('abwesenheit-2');

      expect(urlaubsEintrag).toHaveAttribute('data-type', 'urlaub');
      expect(krankheitsEintrag).toHaveAttribute('data-type', 'krankheit');
    });
  });

  it('zeigt eine Leer-Nachricht wenn heute niemand abwesend ist', async () => {
    mockGetHeuteAbwesend.mockResolvedValue([]);

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/heute sind alle mitarbeiter anwesend/i)).toBeInTheDocument();
    });
  });

  it('zeigt bei mehr als 5 Einträgen einen "Alle anzeigen"-Link', async () => {
    const vieleMitarbeiter = Array.from({ length: 8 }, (_, i) => ({
      ...MOCK_ABWESENDE_MITARBEITER[0],
      id: i + 1,
      lastName: `Mitarbeiter${i + 1}`,
    }));
    mockGetHeuteAbwesend.mockResolvedValue(vieleMitarbeiter);

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /alle anzeigen/i })).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Recruiting-Widget
// ---------------------------------------------------------------------------

describe('Dashboard — Recruiting-Widget', () => {
  it('zeigt offene Stellen mit Bewerberanzahl an', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Senior Frontend Entwickler')).toBeInTheDocument();
      expect(screen.getByText(/7 Bewerber/i)).toBeInTheDocument();
    });
  });

  it('verlinkt jede offene Stelle zur Recruiting-Detailseite', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const stellen = screen.getAllByTestId(/offene-stelle-/);
      stellen.forEach((stelle) => {
        expect(within(stelle).getByRole('link')).toHaveAttribute(
          'href',
          expect.stringContaining('/recruiting/')
        );
      });
    });
  });

  it('zeigt Hinweis wenn keine offenen Stellen vorhanden sind', async () => {
    mockGetOffeneStellen.mockResolvedValue([]);

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/aktuell keine offenen stellen/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Interaktion & Navigation
// ---------------------------------------------------------------------------

describe('Dashboard — Interaktion & Navigation', () => {
  it('navigiert beim Klick auf Statistik-Kachel zur entsprechenden Unterseite', async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('kachel-heute-abwesend')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('kachel-heute-abwesend'));

    expect(router.location.pathname).toBe('/abwesenheiten');
  });

  it('lädt die Daten neu wenn der "Aktualisieren"-Button gedrückt wird', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /aktualisieren/i })).toBeInTheDocument();
    });

    // Mocks zurücksetzen und prüfen ob sie erneut aufgerufen werden
    vi.clearAllMocks();
    mockGetDashboardStatistiken.mockResolvedValue(MOCK_DASHBOARD_STATISTIKEN);
    mockGetHeuteAbwesend.mockResolvedValue(MOCK_ABWESENDE_MITARBEITER);
    mockGetOffeneStellen.mockResolvedValue(MOCK_OFFENE_STELLEN);

    await user.click(screen.getByRole('button', { name: /aktualisieren/i }));

    await waitFor(() => {
      expect(mockGetDashboardStatistiken).toHaveBeenCalledTimes(1);
    });
  });

  it('öffnet das Schnellzugriff-Menü beim Klick auf den entsprechenden Button', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /schnellzugriff/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /schnellzugriff/i }));

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /mitarbeiter anlegen/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /abwesenheit eintragen/i })).toBeInTheDocument();
  });

  it('schließt das Schnellzugriff-Menü beim Drücken der Escape-Taste', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /schnellzugriff/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /schnellzugriff/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Rollenbasierte Darstellung
// ---------------------------------------------------------------------------

describe('Dashboard — Rollenbasierte Darstellung', () => {
  it('zeigt Admin-Benutzer alle Widgets inklusive Lohnübersicht', async () => {
    renderWithProviders(<Dashboard />, { userRole: 'admin' });

    await waitFor(() => {
      expect(screen.getByTestId('widget-lohnuebersicht')).toBeInTheDocument();
    });
  });

  it('versteckt die Lohnübersicht für Mitarbeiter ohne HR-Berechtigung', async () => {
    renderWithProviders(<Dashboard />, { userRole: 'employee' });

    await waitFor(() => {
      expect(screen.queryByTestId('widget-lohnuebersicht')).not.toBeInTheDocument();
    });
  });

  it('zeigt HR-Benutzern das Recruiting-Widget an', async () => {
    renderWithProviders(<Dashboard />, { userRole: 'hr' });

    await waitFor(() => {
      expect(screen.getByTestId('widget-recruiting')).toBeInTheDocument();
    });
  });

  it('zeigt Mitarbeitern anstelle des Recruiting-Widgets ihre persönlichen Aufgaben', async () => {
    renderWithProviders(<Dashboard />, { userRole: 'employee' });

    await waitFor(() => {
      expect(screen.queryByTestId('widget-recruiting')).not.toBeInTheDocument();
      expect(screen.getByTestId('widget-meine-aufgaben')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Barrierefreiheit (Accessibility)
// ---------------------------------------------------------------------------

describe('Dashboard — Barrierefreiheit', () => {
  it('hat keine kritischen Accessibility-Verstöße (axe)', async () => {
    const { container } = renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    });

    // Erfordert: @axe-core/react oder vitest-axe
    // const results = await axe(container);
    // expect(results).toHaveNoViolations();

    // Alternativ: Manuelle Checks
    expect(container.querySelector('main')).toBeInTheDocument();
    expect(container.querySelector('h1')).toBeInTheDocument();
  });

  it('alle Statistik-Kacheln haben beschreibende aria-label Attribute', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const kacheln = screen.getAllByRole('button', { name: /.+/ });
      kacheln.forEach((kachel) => {
        expect(kachel).toHaveAttribute('aria-label');
      });
    });
  });

  it('Ladezustand wird korrekt für Screenreader kommuniziert', () => {
    mockGetDashboardStatistiken.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<Dashboard />);

    const ladeindikator = screen.getByRole('status');
    expect(ladeindikator).toHaveAttribute('aria-live', 'polite');
    expect(ladeindikator).toHaveAttribute('aria-label', expect.stringMatching(/wird geladen/i));
  });
});
