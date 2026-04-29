# Architektur Haushaltsbuch / Fixkostenübersicht

## Zielbild
Die Anwendung ist eine lokale Fullstack-Webanwendung für den Desktop-PC. Sie erfasst regelmäßige, einmalige, befristete und unklare Haushaltskosten, rechnet Zahlungsrhythmen auf Monats- und Jahreswerte um und erzeugt Reports sowie Backups in OneDrive.

Zentrale Leitregel: Jeder Input wird gespeichert oder im Prüfeingang gehalten, aber erst nach Klassifikation und Prüfung auswertungswirksam.

## Systemarchitektur
- `Next.js App Router` stellt UI und API in einem Prozess bereit.
- `TypeScript` wird durchgehend für UI, API, Services und Skripte genutzt.
- `Prisma Client` ist das ORM für den Datenzugriff.
- `SQLite` liegt lokal im AppData-Ordner, nicht in OneDrive.
- `node:sqlite` initialisiert das lokale Schema idempotent, weil die Prisma-Migrate-Engine in dieser Node-24-Umgebung ohne Detailfehler aussteigt.
- Reports werden serverseitig als PDF und XLSX erzeugt.
- Backups kopieren die SQLite-Datei und erzeugen zusätzlich einen JSON-Gesamtexport.

## Laufzeitpfade
Standard lokal:

```text
C:\Users\<Benutzer>\AppData\Local\Haushaltsbuch
├─ Haushaltsbuch.sqlite
├─ logs
└─ temp
```

Standard OneDrive:

```text
C:\Users\<Benutzer>\OneDrive\Haushaltsbuch
├─ Reports
├─ Import
├─ Backup
├─ Export
└─ Dokumente_optional
```

Die Pfade werden in `AppSetting` gespeichert und sind über die Seite `Einstellungen` änderbar.

## Dateistruktur
```text
.
├─ docs/
│  └─ ARCHITEKTUR.md
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts
├─ scripts/
│  ├─ setup-runtime.mjs
│  └─ init-db.mjs
├─ src/
│  ├─ app/
│  │  ├─ api/
│  │  ├─ kostenpositionen/
│  │  ├─ einmalige-ausgaben/
│  │  ├─ befristete-kosten/
│  │  ├─ faelligkeiten/
│  │  ├─ zahlungen/
│  │  ├─ anbieter/
│  │  ├─ kategorien/
│  │  ├─ dokumente/
│  │  ├─ pruefeingang/
│  │  ├─ reports/
│  │  ├─ backup-export/
│  │  └─ einstellungen/
│  ├─ components/
│  ├─ features/
│  ├─ lib/
│  └─ server/
│     └─ services/
├─ package.json
├─ prisma.config.ts
└─ README.md
```

## Datenbankschema
Die technische Quelle ist `prisma/schema.prisma`. Geldbeträge werden in Cent gespeichert.

Wichtige Tabellen:
- `CostPosition`: Kostenposition mit Betrag, Wiederkehr, Befristung, Status, Prüfstatus, Monatswert und Jahreswert.
- `CostPositionVersion`: vorbereitete Historie für spätere Werte mit Gültigkeitszeitraum.
- `Payment`: konkrete oder erwartete Zahlung, optional mit Kostenposition, Anbieter und Quelldokument verknüpft.
- `Provider`: Anbieter/Zahlungsempfänger mit normalisiertem Namen und Aliasliste.
- `Category`: pflegbare Kategorien.
- `HouseholdScope`: optionaler Haushaltsbezug.
- `Document`: Beleg-/Quelldokument als Metadaten, nicht als Blob.
- `ImportSuggestion`: Prüfeingang für Vorschläge, Dubletten und unklare Inputs.
- `ReportRun`: erzeugte Reportdateien.
- `BackupRun`: erzeugte Sicherungen und Exporte.
- `AppSetting`: lokale Pfade und spätere Betriebseinstellungen.

## Berechnungslogik
`src/lib/calculations.ts` rechnet Originalbetrag und Zahlungsrhythmus um:
- monatlich: Betrag mal 12, Monatswert = Betrag
- zweimonatlich: Betrag mal 6
- quartalsweise: Betrag mal 4
- halbjährlich: Betrag mal 2
- jährlich: Betrag
- wöchentlich: Betrag mal 52
- vierwöchentlich: Betrag mal 13
- einmalig: Monatswert und Jahreswert für Fixkosten = 0
- benutzerdefiniert: JSON-Regel mit `paymentsPerYear`, `everyMonths` oder `everyWeeks`

Dashboard und Reports werten nur aktive regelmäßige Kosten mit `SAFE`, `ESTIMATED` oder `MANUALLY_CONFIRMED` als Fixkosten aus.

## API-Endpunkte
Alle Endpunkte liegen unter `src/app/api`.

| Methode | Pfad | Zweck |
| --- | --- | --- |
| `GET` | `/api/health` | Datenbankcheck |
| `GET` | `/api/dashboard` | Dashboard-Kennzahlen |
| `GET`/`POST` | `/api/cost-positions` | Kostenpositionen suchen und anlegen |
| `GET`/`PATCH` | `/api/cost-positions/[id]` | Detail laden und ändern |
| `GET`/`POST` | `/api/payments` | Zahlungen listen und erfassen |
| `PATCH` | `/api/payments/[id]` | Zahlung ändern |
| `GET`/`POST` | `/api/providers` | Anbieter listen und anlegen |
| `PATCH` | `/api/providers/[id]` | Anbieter ändern |
| `GET`/`POST` | `/api/categories` | Kategorien listen und anlegen |
| `PATCH` | `/api/categories/[id]` | Kategorie ändern |
| `GET` | `/api/household-scopes` | Haushaltsbezüge |
| `GET`/`POST` | `/api/documents` | Dokumentmetadaten listen und erfassen |
| `PATCH` | `/api/documents/[id]` | Dokumentmetadaten ändern |
| `GET`/`POST` | `/api/import-suggestions` | Prüfeingang listen und manuell ergänzen |
| `PATCH` | `/api/import-suggestions/[id]` | Prüfpunkt bearbeiten |
| `GET`/`PATCH` | `/api/settings` | Pfade lesen und speichern |
| `GET`/`POST` | `/api/reports` | Reportläufe listen und Reports erzeugen |
| `GET`/`POST` | `/api/backups` | Backupläufe listen und Backup erzeugen |

## UI-Architektur
Die UI ist ein arbeitsorientiertes Web-Fachsystem:
- `Dashboard`: wichtigste Zahlen, größte Kostenpositionen, Kategorien, Fälligkeiten und Betriebsstand.
- `Kostenpositionen`: zentrale Liste mit Suche, Sortierung und Erfassungs-/Bearbeitungsformular.
- `Einmalige Ausgaben`: dieselbe Fachkomponente mit Einmalig-Voreinstellung.
- `Befristete Kosten`: dieselbe Fachkomponente mit Befristungsfilter.
- `Fälligkeiten`: dieselbe Fachkomponente mit Fälligkeitsfokus.
- `Zahlungen`: Plan/Ist-Zahlungen getrennt von Kostenpositionen.
- `Anbieter`, `Kategorien`: Stammdatenpflege.
- `Dokumente / Belege`: Quellenmetadaten.
- `Prüfeingang`: Importvorschläge und unklare Inputs.
- `Reports`: PDF/XLSX-Erzeugung.
- `Backup / Export`: SQLite-Kopie und JSON-Gesamtexport.
- `Einstellungen`: lokale und OneDrive-Pfade.

## Qualität und Betrieb
Wichtige Kommandos:

```powershell
npm install
npm run app:prepare
npm run dev
npm run typecheck
npm run build
npm audit --omit=dev
```

Verifizierter Stand am 2026-04-28:
- TypeScript erfolgreich.
- Produktionsbuild erfolgreich.
- `npm audit --omit=dev` ohne Findings.
- `/api/health`, `/api/dashboard`, Stammdaten-API, Reportexport und Backupexport erfolgreich gegen lokale SQLite-Datei geprüft.
